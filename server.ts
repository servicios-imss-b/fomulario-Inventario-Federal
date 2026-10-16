import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-Memory store for fast responses & demo fallback (can sync with Supabase when credentials exist)
interface StoredRespuesta {
  id: string;
  pregunta_id: string;
  seccion_id: string;
  pregunta: string;
  respuesta: any;
  fuente?: string;
  fecha_actualizacion: string;
}

const memoryDb = {
  usuario: null as any,
  respuestas: new Map<string, StoredRespuesta>(),
  archivos: new Map<string, any>(),
  formulariosFinalizados: new Map<string, any>(),
};

const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '1VxUTlq70YT5dqpD3HmM5IOmb69_Y6Mj9';
const GOOGLE_DRIVE_TOKEN_PATH = path.resolve(process.env.GOOGLE_DRIVE_TOKEN_PATH || '.drive-token.json');
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';
const driveOAuthStates = new Map<string, number>();
let cachedDriveAccessToken: { value: string; expiresAt: number } | null = null;

const getDriveRedirectUri = (req: Request) =>
  process.env.GOOGLE_DRIVE_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/drive/oauth/callback`;

const getDriveRefreshToken = (): string => {
  if (process.env.GOOGLE_DRIVE_REFRESH_TOKEN) return process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  try {
    if (!fs.existsSync(GOOGLE_DRIVE_TOKEN_PATH)) return '';
    const saved = JSON.parse(fs.readFileSync(GOOGLE_DRIVE_TOKEN_PATH, 'utf8')) as { refresh_token?: string };
    return saved.refresh_token || '';
  } catch {
    return '';
  }
};

const getDriveConfigStatus = () => ({
  clientConfigured: Boolean(process.env.GOOGLE_DRIVE_CLIENT_ID && process.env.GOOGLE_DRIVE_CLIENT_SECRET),
  folderConfigured: Boolean(GOOGLE_DRIVE_FOLDER_ID),
  authorized: Boolean(getDriveRefreshToken()),
});

async function getGoogleDriveAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = getDriveRefreshToken();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Drive no está autorizado. Configura el cliente OAuth y visita /api/drive/auth.');
  }
  if (cachedDriveAccessToken && cachedDriveAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedDriveAccessToken.value;
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const tokenData = await tokenResponse.json() as { access_token?: string; expires_in?: number; error?: string };
  if (!tokenResponse.ok || !tokenData.access_token) {
    cachedDriveAccessToken = null;
    throw new Error('No se pudo renovar la autorización de Google Drive. Revisa el OAuth en /api/drive/auth.');
  }

  cachedDriveAccessToken = {
    value: tokenData.access_token,
    expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
  };
  return cachedDriveAccessToken.value;
}

async function uploadFileToGoogleDrive(payload: {
  nombre: string;
  tipo?: string;
  tamanio?: number;
  extension?: string;
  dataBase64?: string;
  id?: string;
}) {
  const extension = (payload.extension || path.extname(payload.nombre)).toLowerCase();
  const mimeTypeByExtension: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  const mimeType = mimeTypeByExtension[extension];
  if (!mimeType) throw new Error('Solo se aceptan archivos PDF, XLS o XLSX.');
  if (!payload.dataBase64) throw new Error('El contenido del archivo no está disponible para subir a Drive.');

  const base64Content = payload.dataBase64.includes(',')
    ? payload.dataBase64.slice(payload.dataBase64.indexOf(',') + 1)
    : payload.dataBase64;
  const fileBuffer = Buffer.from(base64Content, 'base64');
  const maxUploadSizeBytes = 15 * 1024 * 1024;
  if (fileBuffer.length === 0 || fileBuffer.length > maxUploadSizeBytes) {
    throw new Error('El archivo debe pesar más de 0 y máximo 15 MB.');
  }
  if (payload.tamanio && Math.abs(payload.tamanio - fileBuffer.length) > 2) {
    throw new Error('El tamaño recibido no coincide con el contenido del archivo.');
  }

  const accessToken = await getGoogleDriveAccessToken();
  const boundary = `drive_upload_${randomBytes(12).toString('hex')}`;
  const safeName = path.basename(payload.nombre).replace(/[\u0000-\u001f]/g, '_').slice(0, 255);
  const metadata = {
    name: safeName,
    mimeType,
    parents: [GOOGLE_DRIVE_FOLDER_ID],
    appProperties: payload.id ? { formularioArchivoId: payload.id } : undefined,
  };
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    fileBuffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,parents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const driveFile = await response.json() as { id?: string; name?: string; webViewLink?: string; error?: { message?: string } };
  if (!response.ok || !driveFile.id) {
    throw new Error(`Google Drive no pudo guardar el archivo${driveFile.error?.message ? `: ${driveFile.error.message}` : '.'}`);
  }

  return {
    nombre: driveFile.name || safeName,
    tipo: mimeType,
    tamanio: fileBuffer.length,
    extension,
    driveFileId: driveFile.id,
    url: driveFile.webViewLink || `https://drive.google.com/open?id=${driveFile.id}`,
    proveedorAlmacenamiento: 'google_drive',
  };
}

// Optional Supabase client initialization
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const supabaseAdmin = SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;
const reportFailedAttempts = new Map<string, { count: number; resetsAt: number }>();

const secretMatches = (provided: string, expected: string) => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

async function readAllPages<T>(loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await loadPage(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

const toDisplayText = (value: unknown) =>
  value === null || value === undefined || value === '' ? '' : typeof value === 'string' ? value : JSON.stringify(value);

if (supabaseAdmin) {
  console.log('[Supabase] Clave de servidor detectada; /api/reporte-relacional habilitado.');
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check
app.get('/api/health/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    institucion: 'INEGI',
    instrumento: 'Inventario Federal de Programas y Acciones de Desarrollo Social 2024 y 2025',
    tiempo: new Date().toISOString(),
    supabaseConectado: Boolean(SUPABASE_URL && SUPABASE_KEY),
    googleDriveConfigurado: getDriveConfigStatus().authorized,
  });
});

app.get('/api/drive/status', (_req: Request, res: Response) => {
  res.json({
    ...getDriveConfigStatus(),
    folderId: GOOGLE_DRIVE_FOLDER_ID,
  });
});

app.get('/api/drive/auth', (req: Request, res: Response) => {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(503).send('Configura GOOGLE_DRIVE_CLIENT_ID y GOOGLE_DRIVE_CLIENT_SECRET en el archivo local .env antes de autorizar Drive.');
  }

  const state = randomBytes(24).toString('hex');
  driveOAuthStates.set(state, Date.now());
  const redirectUri = getDriveRedirectUri(req);
  const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_DRIVE_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  }).toString();

  return res.redirect(authorizationUrl.toString());
});

app.get('/api/drive/oauth/callback', async (req: Request, res: Response) => {
  const state = String(req.query.state || '');
  const stateCreatedAt = driveOAuthStates.get(state);
  if (!stateCreatedAt || Date.now() - stateCreatedAt > 10 * 60 * 1000) {
    return res.status(400).send('La autorización expiró o no es válida. Vuelve a iniciar /api/drive/auth.');
  }
  driveOAuthStates.delete(state);

  const code = String(req.query.code || '');
  if (!code) return res.status(400).send('Google no devolvió el código de autorización.');

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
        redirect_uri: getDriveRedirectUri(req),
        grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenResponse.json() as { refresh_token?: string };
    if (!tokenResponse.ok || !tokenData.refresh_token) {
      return res.status(400).send('Google no devolvió un refresh token. Revisa el OAuth Client y vuelve a autorizar.');
    }

    await fs.promises.writeFile(
      GOOGLE_DRIVE_TOKEN_PATH,
      JSON.stringify({ refresh_token: tokenData.refresh_token }, null, 2),
      { encoding: 'utf8', mode: 0o600 },
    );
    cachedDriveAccessToken = null;
    return res.type('html').send('<!doctype html><html lang="es"><meta charset="utf-8"><title>Drive autorizado</title><body style="font-family:sans-serif;background:#062d28;color:#f4f7f5;padding:3rem"><h1>Google Drive autorizado</h1><p>Ya puedes cerrar esta pestaña y volver al formulario.</p></body></html>');
  } catch (error) {
    console.error('[Google Drive OAuth] No se pudo completar la autorización.');
    return res.status(500).send('No se pudo guardar la autorización local de Drive. Revisa la consola del servidor.');
  }
});

// GET /api/formulario/
app.get('/api/formulario/', (_req: Request, res: Response) => {
  res.json({
    titulo: 'Instrumento de captación del Inventario Federal de Programa y Acciones de Desarrollo Social 2024 y 2025',
    institucion: 'INSTITUTO NACIONAL DE ESTADÍSTICA Y GEOGRAFÍA (INEGI)',
    maxCaracteresAbiertas: 300,
    archivosPermitidos: ['.pdf', '.xls', '.xlsx'],
    tamanioMaximoArchivoMB: 15,
  });
});

// POST /api/formulario/
app.post('/api/formulario/', (req: Request, res: Response) => {
  const { usuario } = req.body;
  if (usuario) {
    memoryDb.usuario = {
      ...usuario,
      updatedAt: new Date().toISOString(),
    };
  }
  res.json({ success: true, message: 'Usuario registrado correctamente', usuario: memoryDb.usuario });
});

// POST /api/respuestas/
app.post('/api/respuestas/', (req: Request, res: Response) => {
  try {
    const { pregunta_id, seccion_id, pregunta, respuesta, fuente, fecha_actualizacion } = req.body;

    if (!pregunta_id) {
      return res.status(400).json({ error: 'pregunta_id es requerido' });
    }

    const maxCaracteres = ['10', '14', '15', 'comentario_7'].includes(pregunta_id) ? 500 : 300;
    if (typeof respuesta === 'string' && respuesta.length > maxCaracteres) {
      return res.status(400).json({
        error: `La respuesta excede el límite máximo de ${maxCaracteres} caracteres.`,
        longitudActual: respuesta.length,
      });
    }

    const item: StoredRespuesta = {
      id: pregunta_id,
      pregunta_id,
      seccion_id: seccion_id || '',
      pregunta: pregunta || '',
      respuesta,
      fuente: fuente || '',
      fecha_actualizacion: fecha_actualizacion || new Date().toISOString(),
    };

    memoryDb.respuestas.set(pregunta_id, item);

    return res.status(200).json({
      success: true,
      mensaje: 'Respuesta guardada correctamente',
      data: item,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'No fue posible guardar la respuesta. Intenta nuevamente.',
      detalle: error.message,
    });
  }
});

// PUT /api/respuestas/:id/
app.put('/api/respuestas/:id/', (req: Request, res: Response) => {
  const { id } = req.params;
  const { respuesta, fuente } = req.body;
  const maxCaracteres = ['10', '14', '15', 'comentario_7'].includes(id) ? 500 : 300;

  if (typeof respuesta === 'string' && respuesta.length > maxCaracteres) {
    return res.status(400).json({
      error: `La respuesta excede el límite máximo de ${maxCaracteres} caracteres.`,
    });
  }

  const existing = memoryDb.respuestas.get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Respuesta no encontrada' });
  }

  existing.respuesta = respuesta;
  if (fuente !== undefined) existing.fuente = fuente;
  existing.fecha_actualizacion = new Date().toISOString();

  memoryDb.respuestas.set(id, existing);
  return res.json({ success: true, data: existing });
});

// GET /api/respuestas/
app.get('/api/respuestas/', (_req: Request, res: Response) => {
  const all = Array.from(memoryDb.respuestas.values());
  res.json({ count: all.length, resultados: all });
});

// POST /api/archivos/
app.post('/api/archivos/', async (req: Request, res: Response) => {
  try {
    const { id, nombre, tipo, tamanio, extension, dataBase64 } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El archivo debe tener un nombre válido.' });
    }

    // Validation: Allowed extensions
    const ext = (extension || path.extname(nombre)).toLowerCase();
    const allowedExtensions = ['.pdf', '.xls', '.xlsx'];
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        error: 'Este tipo de archivo no está permitido. Solo se aceptan documentos PDF (.pdf) y hojas de cálculo Excel (.xls, .xlsx).',
      });
    }

    // Max 15MB
    const MAX_SIZE = 15 * 1024 * 1024;
    if (tamanio && tamanio > MAX_SIZE) {
      return res.status(400).json({
        error: 'El archivo supera el tamaño máximo permitido de 15 MB.',
      });
    }

    const driveStatus = getDriveConfigStatus();
    if (!driveStatus.clientConfigured || !driveStatus.authorized || !driveStatus.folderConfigured) {
      return res.status(503).json({
        error: 'Google Drive aún no está autorizado. Configura el OAuth Client y abre /api/drive/auth en este servidor.',
        driveConfigurado: false,
      });
    }

    const driveFile = await uploadFileToGoogleDrive({
      id,
      nombre: path.basename(nombre),
      tipo,
      tamanio,
      extension: ext,
      dataBase64,
    });

    const archivoRecord = {
      id: id || `arch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...driveFile,
      fechaCarga: new Date().toISOString(),
      estado: 'sincronizado',
    };

    memoryDb.archivos.set(archivoRecord.id, archivoRecord);

    return res.status(201).json({
      success: true,
      mensaje: 'Archivo cargado y validado correctamente',
      data: archivoRecord,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'No fue posible cargar el archivo en Google Drive.',
    });
  }
});

// DELETE /api/archivos/:id/
app.delete('/api/archivos/:id/', (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = memoryDb.archivos.delete(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Archivo no encontrado' });
  }
  return res.json({ success: true, message: 'Archivo eliminado' });
});

// GET /api/archivos/
app.get('/api/archivos/', (_req: Request, res: Response) => {
  res.json({
    count: memoryDb.archivos.size,
    archivos: Array.from(memoryDb.archivos.values()),
  });
});

// POST /api/sincronizar/ (Batch offline queue processing)
app.post('/api/sincronizar/', async (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items debe ser una lista de mutaciones pendientes' });
    }

    const resultados: Array<{ id: number | undefined; success: boolean; data?: any; error?: string }> = [];
    for (const item of items) {
      try {
        let data;
        if (item.tipo === 'respuesta' && item.payload) {
          const payload = item.payload;
          const maxCaracteres = ['10', '14', '15', 'comentario_7'].includes(payload.preguntaId) ? 500 : 300;
          if (typeof payload.valor === 'string' && payload.valor.length > maxCaracteres) {
            payload.valor = payload.valor.substring(0, maxCaracteres);
          }
          memoryDb.respuestas.set(payload.preguntaId, {
            id: payload.preguntaId,
            pregunta_id: payload.preguntaId,
            seccion_id: payload.seccionId || '',
            pregunta: payload.pregunta || '',
            respuesta: payload.valor,
            fuente: payload.fuente || '',
            fecha_actualizacion: payload.fechaActualizacion || new Date().toISOString(),
          });
        } else if (item.tipo === 'archivo' && item.payload) {
          const driveFile = await uploadFileToGoogleDrive(item.payload);
          data = {
            ...driveFile,
            id: item.payload.id,
            fechaCarga: new Date().toISOString(),
            estado: 'sincronizado',
          };
          memoryDb.archivos.set(item.payload.id, data);
        } else if (item.tipo === 'usuario' && item.payload) {
          memoryDb.usuario = item.payload;
        } else {
          throw new Error('Tipo de elemento pendiente no válido.');
        }
        resultados.push({ id: item.id, success: true, data });
      } catch (error) {
        resultados.push({
          id: item.id,
          success: false,
          error: error instanceof Error ? error.message : 'No fue posible sincronizar este elemento.',
        });
      }
    }

    const procesados = resultados.filter((resultado) => resultado.success).length;
    return res.json({
      success: procesados === items.length,
      mensaje: 'Sincronización por lotes procesada',
      itemsProcesados: procesados,
      resultados,
      totalEnMemoria: memoryDb.respuestas.size,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Error durante la sincronización por lotes.' });
  }
});

// POST /api/formulario/finalizar/
app.post('/api/formulario/finalizar/', (req: Request, res: Response) => {
  try {
    const { usuario, respuestas, archivos } = req.body;
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(100000 + Math.random() * 900000);
    const folio = `INEGI-IFPADS-${year}-${randomSeq}`;
    const timestamp = new Date().toISOString();

    const registroFinal = {
      folio,
      fechaEnvio: timestamp,
      usuario: usuario || memoryDb.usuario,
      totalRespuestas: Object.keys(respuestas || {}).length,
      totalArchivos: Array.isArray(archivos) ? archivos.length : memoryDb.archivos.size,
      respuestas: respuestas || Object.fromEntries(memoryDb.respuestas),
      estado: 'CONCLUIDO_Y_REGISTRADO',
    };

    memoryDb.formulariosFinalizados.set(folio, registroFinal);

    return res.status(200).json({
      success: true,
      folio,
      fecha: timestamp,
      mensaje: 'Formulario enviado y registrado satisfactoriamente en el Inventario Federal.',
      registro: registroFinal,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'No fue posible finalizar el registro del formulario.',
      detalle: error.message,
    });
  }
});

// POST /api/reporte-relacional
app.post('/api/reporte-relacional', async (req: Request, res: Response) => {
  const accessUser = process.env.REPORT_ACCESS_USER || '';
  const accessPassword = process.env.REPORT_ACCESS_PASSWORD || '';
  if (!supabaseAdmin || !accessUser || !accessPassword) {
    return res.status(503).json({ error: 'Configura SUPABASE_SERVICE_ROLE_KEY, REPORT_ACCESS_USER y REPORT_ACCESS_PASSWORD en .env.' });
  }

  const identity = req.ip || 'unknown';
  const now = Date.now();
  const attempts = reportFailedAttempts.get(identity);
  if (attempts && attempts.resetsAt > now && attempts.count >= 8) {
    return res.status(429).json({ error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' });
  }

  const username = typeof req.body?.username === 'string' ? req.body.username : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!secretMatches(username, accessUser) || !secretMatches(password, accessPassword)) {
    const current = attempts && attempts.resetsAt > now ? attempts : { count: 0, resetsAt: now + 60_000 };
    current.count += 1;
    reportFailedAttempts.set(identity, current);
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
  reportFailedAttempts.delete(identity);

  try {
    const forms = await readAllPages<any>((from, to) => supabaseAdmin
      .from('formularios')
      .select('id, folio, usuario_nombre, usuario_puesto, usuario_correo, usuario_telefono, usuario_entidad, fecha_captura, fecha_creacion, fecha_finalizacion, estado')
      .order('fecha_creacion', { ascending: false })
      .range(from, to));
    const answers = await readAllPages<any>((from, to) => supabaseAdmin
      .from('respuestas')
      .select('formulario_id, pregunta_id, seccion_id, pregunta, respuesta, fuente, fecha_actualizacion')
      .order('pregunta_id', { ascending: true })
      .range(from, to));
    const files = await readAllPages<any>((from, to) => supabaseAdmin
      .from('archivos')
      .select('formulario_id, nombre, tipo, tamanio, extension, proveedor_almacenamiento, almacenamiento_id, ruta_almacenamiento, fecha_carga, estado')
      .order('fecha_carga', { ascending: true })
      .range(from, to));

    const group = (items: any[]) => items.reduce((map, item) => {
      map.set(item.formulario_id, [...(map.get(item.formulario_id) ?? []), item]);
      return map;
    }, new Map<string, any[]>());
    const answersByForm = group(answers);
    const filesByForm = group(files);

    const rows = forms.flatMap((form) => {
      const formAnswers: any[] = answersByForm.get(form.id) ?? [];
      const program = formAnswers.find((answer) => answer.pregunta_id === 'clave_programa');
      const year = formAnswers.find((answer) => answer.pregunta_id === 'anio_captura');
      const archivos = JSON.stringify((filesByForm.get(form.id) ?? []).map((file: any) => ({
        nombre: file.nombre,
        tipo: file.tipo,
        tamanio: file.tamanio,
        extension: file.extension,
        proveedor: file.proveedor_almacenamiento,
        almacenamiento_id: file.almacenamiento_id,
        ruta: file.ruta_almacenamiento,
        fecha_carga: file.fecha_carga,
        estado: file.estado,
      })));
      return (formAnswers.length > 0 ? formAnswers : [null]).map((answer) => ({
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
        archivos,
      }));
    });

    return res.json({ success: true, rows });
  } catch (error) {
    console.error('[Supabase] Error al consultar el reporte:', error instanceof Error ? error.message : error);
    return res.status(500).json({ error: 'No fue posible consultar los registros de Supabase.' });
  }
});

// -------------------------------------------------------------
// Vite middleware & Production static serving
// -------------------------------------------------------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[INEGI Servidor] Ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
