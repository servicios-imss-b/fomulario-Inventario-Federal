import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleRequest } from './index.ts';

const accessId = '12345678-1234-1234-1234-123456789abc';
const environment: Record<string, string> = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
};
const archivo = { id: 'arch_test_1', nombre: 'informe.pdf', extension: '.pdf', tipo: 'application/pdf', tamanio: 4 };

function request(action: string, file = archivo, origin = 'https://servicios-imss-b.github.io') {
  return new Request('https://example.supabase.co/functions/v1/archivos-storage', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, accessId, password: 'test-password', archivo: file }),
  });
}

function mockFetch(responses: Array<{ body: unknown; status?: number }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchRequest: typeof fetch = (input, init) => {
    calls.push({ url: String(input), init });
    const response = responses.shift();
    if (!response) throw new Error('Unexpected request');
    return Promise.resolve(new Response(JSON.stringify(response.body), { status: response.status ?? 200 }));
  };
  return { calls, fetchRequest };
}

const authorized = { body: { success: true, assignments: [{ id: accessId }] } };
const getEnv = (key: string) => environment[key];

test('Pages preflight accepts POST without credentials', async () => {
  const response = await handleRequest(new Request('https://example.test', {
    method: 'OPTIONS',
    headers: { origin: 'https://servicios-imss-b.github.io' },
  }));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://servicios-imss-b.github.io');
});

test('untrusted origins cannot create signed URLs', async () => {
  const response = await handleRequest(request('create-upload', archivo, 'https://evil.example'));
  assert.equal(response.status, 403);
});

test('missing server configuration is not reported as success', async () => {
  const response = await handleRequest(request('create-upload'), fetch, () => undefined);
  assert.equal(response.status, 503);
});

test('invalid file types are rejected before access or storage calls', async () => {
  const mock = mockFetch([]);
  const response = await handleRequest(request('create-upload', { ...archivo, nombre: 'macro.exe' }), mock.fetchRequest, getEnv);
  assert.equal(response.status, 400);
  assert.equal(mock.calls.length, 0);
});

test('upload URLs are scoped to the authorized access and use a private bucket', async () => {
  const mock = mockFetch([authorized, {
    body: { url: '/object/upload/sign/ipads-archivos/file?token=signed-upload-token' },
  }]);
  const response = await handleRequest(request('create-upload'), mock.fetchRequest, getEnv);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.proveedorAlmacenamiento, 'supabase_storage');
  assert.equal(body.data.storagePath, `${accessId}/${archivo.id}/${archivo.nombre}`);
  assert.equal(body.data.uploadToken, 'signed-upload-token');
  assert.match(mock.calls[1].url, /\/storage\/v1\/object\/upload\/sign\/ipads-archivos\//);
  assert.equal(mock.calls[1].init?.method, 'POST');
  const headers = mock.calls[1].init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer test-service-role');
  assert.equal(headers['x-upsert'], 'true');
});

test('another assignment cannot create a signed URL', async () => {
  const mock = mockFetch([{ body: { success: true, assignments: [{ id: 'other-access' }] } }]);
  const response = await handleRequest(request('create-upload'), mock.fetchRequest, getEnv);
  assert.equal(response.status, 401);
  assert.equal(mock.calls.length, 1);
});

test('downloads return a short-lived URL only after access verification', async () => {
  const mock = mockFetch([authorized, { body: { signedURL: '/object/sign/ipads-archivos/file?token=short-lived' } }]);
  const response = await handleRequest(request('create-download'), mock.fetchRequest, getEnv);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data.url, 'https://example.supabase.co/storage/v1/object/sign/ipads-archivos/file?token=short-lived&download=informe.pdf');
  assert.match(mock.calls[1].url, /\/storage\/v1\/object\/sign\/ipads-archivos\//);
  assert.equal(String(mock.calls[1].init?.body), JSON.stringify({ expiresIn: 60 }));
});