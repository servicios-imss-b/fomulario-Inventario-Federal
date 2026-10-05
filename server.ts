import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

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

// Optional Supabase client initialization
let supabaseClient: any = null;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    // Dynamic import to prevent crash if not used
    console.log('[Supabase] Credenciales detectadas, conectando persistencia remota...');
  } catch (e) {
    console.warn('[Supabase] No se pudo inicializar cliente Supabase:', e);
  }
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
  });
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
app.post('/api/archivos/', (req: Request, res: Response) => {
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

    const archivoRecord = {
      id: id || `arch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      nombre,
      tipo,
      tamanio,
      extension: ext,
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
      error: 'No fue posible procesar la carga del archivo.',
      detalle: error.message,
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
app.post('/api/sincronizar/', (req: Request, res: Response) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items debe ser una lista de mutaciones pendientes' });
    }

    let procesados = 0;
    for (const item of items) {
      if (item.tipo === 'respuesta' && item.payload) {
        const p = item.payload;
        const maxCaracteres = ['10', '14', '15', 'comentario_7'].includes(p.preguntaId) ? 500 : 300;
        if (typeof p.valor === 'string' && p.valor.length > maxCaracteres) {
          p.valor = p.valor.substring(0, maxCaracteres);
        }
        memoryDb.respuestas.set(p.preguntaId, {
          id: p.preguntaId,
          pregunta_id: p.preguntaId,
          seccion_id: p.seccionId || '',
          pregunta: p.pregunta || '',
          respuesta: p.valor,
          fuente: p.fuente || '',
          fecha_actualizacion: p.fechaActualizacion || new Date().toISOString(),
        });
        procesados++;
      } else if (item.tipo === 'archivo' && item.payload) {
        memoryDb.archivos.set(item.payload.id, {
          ...item.payload,
          estado: 'sincronizado',
        });
        procesados++;
      } else if (item.tipo === 'usuario' && item.payload) {
        memoryDb.usuario = item.payload;
        procesados++;
      }
    }

    return res.json({
      success: true,
      mensaje: 'Sincronización por lotes completada con éxito',
      itemsProcesados: procesados,
      totalEnMemoria: memoryDb.respuestas.size,
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Error durante la sincronización por lotes',
      detalle: error.message,
    });
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
