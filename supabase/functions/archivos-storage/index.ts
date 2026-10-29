const BUCKET = 'ipads-archivos';
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_REQUEST_BYTES = 64 * 1024;
const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const failedAttempts = new Map<string, { count: number; until: number }>();
const denoRuntime = (globalThis as typeof globalThis & {
  Deno?: {
    env: { get(name: string): string | undefined };
    serve(handler: (request: Request) => Promise<Response>): unknown;
  };
}).Deno;

function allowedOrigin(origin: string): boolean {
  if (origin === 'https://servicios-imss-b.github.io') return true;
  try {
    const url = new URL(origin);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function safeFileName(name: string): string {
  return (name.split(/[\\/]/).pop() || 'archivo')
    .replace(/[\u0000-\u001f]/g, '_')
    .slice(0, 180);
}

function encodedPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

function absoluteStorageUrl(url: string, supabaseUrl: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const path = url.startsWith('/storage/v1/') ? url : `/storage/v1${url.startsWith('/') ? url : `/${url}`}`;
  return `${supabaseUrl.replace(/\/+$/, '')}${path}`;
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
    return reply({ error: 'El servicio privado de archivos no esta configurado.' }, 503);
  }

  const identity = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  const attempt = failedAttempts.get(identity);
  if (attempt && attempt.until > Date.now() && attempt.count >= 8) {
    return reply({ error: 'Demasiados intentos. Espera un minuto.' }, 429);
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

    const { action, accessId, password, archivo } = payload ?? {};
    if (!['create-upload', 'create-download'].includes(action)
      || typeof accessId !== 'string' || !/^[0-9a-f-]{36}$/i.test(accessId)
      || typeof password !== 'string' || !password || password.length > 300
      || !archivo || typeof archivo.id !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(archivo.id)
      || typeof archivo.nombre !== 'string' || !archivo.nombre.trim()) {
      return reply({ error: 'Faltan el acceso o los datos del archivo.' }, 400);
    }

    const fileName = safeFileName(archivo.nombre);
    const extension = `.${fileName.split('.').pop()}`.toLowerCase();
    const mimeType = MIME_TYPES[extension];
    if (!mimeType) return reply({ error: 'Tipo de archivo no permitido.' }, 400);
    if (action === 'create-upload'
      && (!Number.isInteger(archivo.tamanio) || archivo.tamanio <= 0 || archivo.tamanio > MAX_FILE_BYTES)) {
      return reply({ error: 'El archivo debe ser menor o igual a 15 MB.' }, 400);
    }

    const accessResponse = await fetchRequest(`${supabaseUrl}/rest/v1/rpc/iniciar_captura_formulario`, {
      method: 'POST',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_password: password }),
    });
    if (!accessResponse.ok) return reply({ error: 'No se pudo verificar el acceso. Intenta de nuevo.' }, 503);
    const access = await accessResponse.json();
    if (!access?.success || !Array.isArray(access.assignments)
      || !access.assignments.some((assignment: { id: string }) => assignment.id === accessId)) {
      const current = attempt && attempt.until > Date.now() ? attempt : { count: 0, until: Date.now() + 60_000 };
      current.count++;
      failedAttempts.set(identity, current);
      return reply({ error: 'Contrasena o asignacion no valida.' }, 401);
    }
    failedAttempts.delete(identity);

    const path = `${accessId}/${archivo.id}/${fileName}`;
    const storageHeaders = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    };
    const storagePath = encodedPath(path);

    if (action === 'create-upload') {
      const uploadHeaders = { ...storageHeaders, 'x-upsert': 'true' };
      const signResponse = await fetchRequest(
        `${supabaseUrl}/storage/v1/object/upload/sign/${BUCKET}/${storagePath}`,
        { method: 'POST', headers: uploadHeaders, body: '{}' },
      );
      const signed = await signResponse.json().catch(() => ({}));
      const signedUploadUrl = signed.url || signed.signedUrl;
      const uploadToken = typeof signed.token === 'string'
        ? signed.token
        : typeof signedUploadUrl === 'string'
          ? new URL(signedUploadUrl, supabaseUrl).searchParams.get('token')
          : null;
      if (!signResponse.ok || !uploadToken) {
        return reply({ error: 'Supabase Storage no pudo preparar la carga.' }, 502);
      }
      return reply({ success: true, data: {
        almacenamientoId: archivo.id,
        storagePath: path,
        uploadToken,
        proveedorAlmacenamiento: 'supabase_storage',
      } });
    }

    const signResponse = await fetchRequest(
      `${supabaseUrl}/storage/v1/object/sign/${BUCKET}/${storagePath}`,
      { method: 'POST', headers: storageHeaders, body: JSON.stringify({ expiresIn: 60 }) },
    );
    const signed = await signResponse.json().catch(() => ({}));
    const signedUrl = signed.signedURL || signed.signedUrl;
    if (!signResponse.ok || typeof signedUrl !== 'string') {
      return reply({ error: 'No se pudo generar la descarga. Verifica que el archivo este sincronizado.' }, 404);
    }
    const downloadUrl = new URL(absoluteStorageUrl(signedUrl, supabaseUrl));
    downloadUrl.searchParams.set('download', fileName);
    return reply({ success: true, data: { url: downloadUrl.toString() } });
  } catch {
    return reply({ error: 'No se pudo completar la solicitud de archivo.' }, 502);
  }
}

if (denoRuntime && import.meta.main) denoRuntime.serve((request) => handleRequest(request));