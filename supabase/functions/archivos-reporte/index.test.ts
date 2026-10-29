import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleRequest } from './index.ts';

const storagePath = '12345678-1234-1234-1234-123456789abc/arch_test_1/informe.pdf';
const environment: Record<string, string> = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'test-anon',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
};

function request(path = storagePath, origin = 'https://servicios-imss-b.github.io') {
  return new Request('https://example.supabase.co/functions/v1/archivos-reporte', {
    method: 'POST',
    headers: { origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'report-user', password: 'report-password', storagePath: path }),
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

const validAccess = { body: { success: true } };
const getEnv = (key: string) => environment[key];

test('invalid paths are rejected before checking credentials', async () => {
  const mock = mockFetch([]);
  const response = await handleRequest(request('../private.pdf'), mock.fetchRequest, getEnv);
  assert.equal(response.status, 400);
  assert.equal(mock.calls.length, 0);
});

test('invalid report credentials never query file metadata', async () => {
  const mock = mockFetch([{ body: { success: false }, status: 200 }]);
  const response = await handleRequest(request(), mock.fetchRequest, getEnv);
  assert.equal(response.status, 401);
  assert.equal(mock.calls.length, 1);
});

test('unregistered storage paths cannot be signed', async () => {
  const mock = mockFetch([validAccess, { body: [] }]);
  const response = await handleRequest(request(), mock.fetchRequest, getEnv);
  assert.equal(response.status, 404);
  assert.equal(mock.calls.length, 2);
});

test('report users receive a short-lived download only for a registered storage object', async () => {
  const mock = mockFetch([
    validAccess,
    { body: [{ nombre: 'informe.pdf', ruta_almacenamiento: storagePath }] },
    { body: { signedURL: '/object/sign/ipads-archivos/file?token=short-lived' } },
  ]);
  const response = await handleRequest(request(), mock.fetchRequest, getEnv);
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.url, 'https://example.supabase.co/storage/v1/object/sign/ipads-archivos/file?token=short-lived&download=informe.pdf');
  assert.match(mock.calls[0].url, /rpc\/validar_reporte_relacional$/);
  assert.match(mock.calls[1].url, /proveedor_almacenamiento=eq\.supabase_storage/);
  assert.match(mock.calls[2].url, /storage\/v1\/object\/sign\/ipads-archivos/);
  assert.equal(String(mock.calls[2].init?.body), JSON.stringify({ expiresIn: 60 }));
});