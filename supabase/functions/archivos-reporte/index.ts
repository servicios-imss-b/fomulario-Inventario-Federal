const BUCKET = 'ipads-archivos';
const MAX_REQUEST_BYTES = 16 * 1024;
const PATH_PATTERN = /^[0-9a-f-]{36}\/[a-zA-Z0-9_-]{1,120}\/[^/\\]{1,180}$/i;

type DenoRuntime = {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Promise<Response>): unknown;
};
const denoRuntime = (globalThis as typeof globalThis & { Deno?: DenoRuntime }).Deno;

function allowedOrigin(origin: string): boolean {
  if (origin === 'https://servicios-imss-b.github.io') return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function encodedPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function absoluteStorageUrl(url: string, supabaseUrl: string, filename: string): string {
  const path = url.startsWith('/storage/v1/') ? url : `/storage/v1${url.startsWith('/') ? url : `/${url}`}`;
  const signedUrl = new URL(/^https?:\/\//i.test(url) ? url : `${supabaseUrl.replace(/\/+$/, '')}${path}`);
  signedUrl.searchParams.set('download', filename);
  return signedUrl.toString();
}

export async function handleRequest(
  request: Request,
  fetchRequest: typeof fetch = fetch,
  getEnv: (name: string) => string | undefined = (name) => denoRuntime?.env.get(name),
): Promise<Response> {
  const origin = request.headers.get('origin') ?? '';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowedOrigin(origin)) return reply({ error: 'Origen no autorizado.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ error: 'Metodo no permitido.' }, 405);

  const supabaseUrl = getEnv('SUPABASE_URL');
  const anonKey = getEnv('SUPABASE_ANON_KEY');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return reply({ error: 'El servicio privado de descargas no esta configurado.' }, 503);
  }

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
      return reply({ error: 'La solicitud excede el limite permitido.' }, 413);
    }
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch {
      return reply({ error: 'Solicitud JSON no valida.' }, 400);
    }

    const username = typeof payload?.username === 'string' ? payload.username : '';
    const password = typeof payload?.password === 'string' ? payload.password : '';
    const storagePath = typeof payload?.storagePath === 'string' ? payload.storagePath : '';
    if (!username || username.length > 200 || !password || password.length > 300 || !PATH_PATTERN.test(storagePath)) {
      return reply({ error: 'Credenciales o ruta de archivo no validas.' }, 400);
    }

    const validationResponse = await fetchRequest(`${supabaseUrl}/rest/v1/rpc/validar_reporte_relacional`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_usuario: username, p_password: password }),
    });
    if (!validationResponse.ok) return reply({ error: 'No se pudo validar el acceso al reporte.' }, 503);
    const validation = await validationResponse.json();
    if (!validation?.success) return reply({ error: validation?.error || 'Acceso al reporte no autorizado.' }, 401);

    const fileQuery = new URLSearchParams({
      select: 'nombre,ruta_almacenamiento',
      proveedor_almacenamiento: 'eq.supabase_storage',
      ruta_almacenamiento: `eq.${storagePath}`,
      limit: '1',
    });
    const fileResponse = await fetchRequest(`${supabaseUrl}/rest/v1/archivos?${fileQuery}`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });
    if (!fileResponse.ok) return reply({ error: 'No se pudo verificar el registro del archivo.' }, 502);
    const files = await fileResponse.json();
    const file = Array.isArray(files) ? files[0] : null;
    if (!file || file.ruta_almacenamiento !== storagePath || typeof file.nombre !== 'string') {
      return reply({ error: 'El archivo no existe o no esta disponible para descarga.' }, 404);
    }

    const storageResponse = await fetchRequest(
      `${supabaseUrl}/storage/v1/object/sign/${BUCKET}/${encodedPath(storagePath)}`,
      {
        method: 'POST',
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expiresIn: 60 }),
      },
    );
    const signed = await storageResponse.json().catch(() => ({}));
    const signedUrl = signed.signedURL || signed.signedUrl;
    if (!storageResponse.ok || typeof signedUrl !== 'string') {
      return reply({ error: 'Supabase Storage no pudo generar la descarga.' }, 502);
    }
    return reply({ success: true, url: absoluteStorageUrl(signedUrl, supabaseUrl, file.nombre) });
  } catch {
    return reply({ error: 'No se pudo completar la descarga.' }, 502);
  }
}

if (denoRuntime && import.meta.main) denoRuntime.serve((request) => handleRequest(request));