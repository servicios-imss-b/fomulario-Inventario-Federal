import { createClient } from 'npm:@supabase/supabase-js@2';

const PAGE_SIZE = 1000;
const PAGE_ORIGINS = new Set([
  'https://servicios-imss-b.github.io',
  'http://localhost:3010',
  'http://127.0.0.1:3010',
  'http://localhost:3012',
  'http://127.0.0.1:3012',
]);
const failedAttempts = new Map<string, { count: number; resetsAt: number }>();

type FormRecord = {
  id: string;
  folio: string;
  usuario_nombre: string | null;
  usuario_puesto: string | null;
  usuario_correo: string | null;
  usuario_telefono: string | null;
  usuario_entidad: string | null;
  fecha_captura: string | null;
  fecha_creacion: string;
  fecha_finalizacion: string | null;
  estado: string;
};

type AnswerRecord = {
  formulario_id: string;
  pregunta_id: string;
  seccion_id: string;
  pregunta: string;
  respuesta: unknown;
  fuente: string | null;
  fecha_actualizacion: string;
};

type FileRecord = {
  formulario_id: string;
  nombre: string;
  tipo: string;
  tamanio: number;
  extension: string;
  proveedor_almacenamiento: string;
  almacenamiento_id: string | null;
  ruta_almacenamiento: string | null;
  fecha_carga: string;
  estado: string;
};

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

function responseHeaders(origin: string): HeadersInit {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

function isAllowedOrigin(origin: string): boolean {
  if (PAGE_ORIGINS.has(origin)) return true;
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function jsonResponse(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders(origin) });
}

async function readAllPages<T>(
  loadPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await loadPage(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

function toDisplayText(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  return typeof value === 'string' ? value : JSON.stringify(value);
}

function matchesSecret(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < provided.length; index += 1) {
    mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return mismatch === 0;
}

function allowAttempt(identity: string): boolean {
  const now = Date.now();
  const current = failedAttempts.get(identity);
  if (!current || current.resetsAt <= now) {
    failedAttempts.set(identity, { count: 1, resetsAt: now + 60_000 });
    return true;
  }
  if (current.count >= 8) return false;
  current.count += 1;
  return true;
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin') ?? '';
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: responseHeaders(origin) });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405, origin);
  }
  if (origin && !isAllowedOrigin(origin)) {
    return jsonResponse({ error: 'Origen no autorizado.' }, 403, origin);
  }

  const accessUsername = Deno.env.get('REPORT_ACCESS_USER') ?? '';
  const accessPassword = Deno.env.get('REPORT_ACCESS_PASSWORD') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!accessUsername || !accessPassword || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'El servicio seguro de reportes no está configurado.' }, 503, origin);
  }

  let credentials: { username?: unknown; password?: unknown };
  try {
    credentials = await request.json();
  } catch {
    return jsonResponse({ error: 'Solicitud no válida.' }, 400, origin);
  }

  const username = typeof credentials.username === 'string' ? credentials.username : '';
  const password = typeof credentials.password === 'string' ? credentials.password : '';
  const identity = request.headers.get('cf-connecting-ip')
    ?? request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? 'unknown';

  if (!matchesSecret(username, accessUsername) || !matchesSecret(password, accessPassword)) {
    if (!allowAttempt(identity)) {
      return jsonResponse({ error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' }, 429, origin);
    }
    return jsonResponse({ error: 'Usuario o contraseña incorrectos.' }, 401, origin);
  }
  failedAttempts.delete(identity);

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const forms = await readAllPages<FormRecord>((from, to) => supabase
      .from('formularios')
      .select('id, folio, usuario_nombre, usuario_puesto, usuario_correo, usuario_telefono, usuario_entidad, fecha_captura, fecha_creacion, fecha_finalizacion, estado')
      .order('fecha_creacion', { ascending: false })
      .range(from, to));

    const answers: AnswerRecord[] = [];
    const files: FileRecord[] = [];
    const formIds = forms.map((form) => form.id);

    for (let offset = 0; offset < formIds.length; offset += 100) {
      const idBatch = formIds.slice(offset, offset + 100);
      const [answerBatch, fileBatch] = await Promise.all([
        readAllPages<AnswerRecord>((from, to) => supabase
          .from('respuestas')
          .select('formulario_id, pregunta_id, seccion_id, pregunta, respuesta, fuente, fecha_actualizacion')
          .in('formulario_id', idBatch)
          .order('pregunta_id', { ascending: true })
          .range(from, to)),
        readAllPages<FileRecord>((from, to) => supabase
          .from('archivos')
          .select('formulario_id, nombre, tipo, tamanio, extension, proveedor_almacenamiento, almacenamiento_id, ruta_almacenamiento, fecha_carga, estado')
          .in('formulario_id', idBatch)
          .order('fecha_carga', { ascending: true })
          .range(from, to)),
      ]);
      answers.push(...answerBatch);
      files.push(...fileBatch);
    }

    const answersByForm = new Map<string, AnswerRecord[]>();
    for (const answer of answers) {
      const rows = answersByForm.get(answer.formulario_id) ?? [];
      rows.push(answer);
      answersByForm.set(answer.formulario_id, rows);
    }

    const filesByForm = new Map<string, FileRecord[]>();
    for (const file of files) {
      const rows = filesByForm.get(file.formulario_id) ?? [];
      rows.push(file);
      filesByForm.set(file.formulario_id, rows);
    }

    const rows = forms.flatMap((form) => {
      const formAnswers = answersByForm.get(form.id) ?? [];
      const formFiles = filesByForm.get(form.id) ?? [];
      const program = formAnswers.find((answer) => answer.pregunta_id === 'clave_programa');
      const year = formAnswers.find((answer) => answer.pregunta_id === 'anio_captura');
      const filesSummary = formFiles.map((file) => ({
        nombre: file.nombre,
        tipo: file.tipo,
        tamanio: file.tamanio,
        extension: file.extension,
        proveedor: file.proveedor_almacenamiento,
        almacenamiento_id: file.almacenamiento_id,
        ruta: file.ruta_almacenamiento,
        fecha_carga: file.fecha_carga,
        estado: file.estado,
      }));
      const answersToReturn: Array<AnswerRecord | null> = formAnswers.length > 0 ? formAnswers : [null];

      return answersToReturn.map((answer) => ({
        formulario_id: form.id,
        folio: form.folio,
        programa: toDisplayText(program?.respuesta),
        anio: toDisplayText(year?.respuesta),
        usuario_nombre: form.usuario_nombre ?? '',
        usuario_puesto: form.usuario_puesto ?? '',
        usuario_correo: form.usuario_correo ?? '',
        usuario_telefono: form.usuario_telefono ?? '',
        usuario_entidad: form.usuario_entidad ?? '',
        fecha_captura: form.fecha_captura ?? '',
        fecha_creacion: form.fecha_creacion,
        fecha_finalizacion: form.fecha_finalizacion ?? '',
        estado: form.estado,
        pregunta_id: answer?.pregunta_id ?? '',
        seccion_id: answer?.seccion_id ?? '',
        pregunta: answer?.pregunta ?? '',
        respuesta: toDisplayText(answer?.respuesta),
        fuente: answer?.fuente ?? '',
        fecha_actualizacion: answer?.fecha_actualizacion ?? '',
        archivos: JSON.stringify(filesSummary),
      }));
    });

    return jsonResponse({ success: true, rows }, 200, origin);
  } catch {
    return jsonResponse({ error: 'No fue posible consultar los registros de Supabase.' }, 500, origin);
  }
});