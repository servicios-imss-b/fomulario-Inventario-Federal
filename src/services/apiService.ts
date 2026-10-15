import { RespuestaItem, ArchivoAdjunto, DatosUsuario } from '../types/form';
import {
  saveRespuestaLocal,
  saveArchivoLocal,
  enqueueSync,
  getSyncQueue,
  removeSyncItem,
} from './indexedDb';
import { supabaseClient } from './supabaseClient';

const API_BASE = '/api';

export class ApiService {
  private static isApiAvailable: boolean = true;
  private static lastCheckTime: number = 0;
  private static checkInterval: number = 10000; // 10s

  public static async checkConnection(): Promise<boolean> {
    const now = Date.now();
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      this.isApiAvailable = false;
      this.lastCheckTime = now;
      return false;
    }
    if (now - this.lastCheckTime < this.checkInterval) return this.isApiAvailable;

    try {
      if (supabaseClient) {
        const { data, error } = await supabaseClient.rpc('verificar_supabase');
        this.isApiAvailable = !error && data === true;
      } else {
        const response = await fetch(`${API_BASE}/health/`);
        this.isApiAvailable = response.ok;
      }
    } catch {
      this.isApiAvailable = false;
    }
    this.lastCheckTime = Date.now();
    return this.isApiAvailable;
  }

  public static usesSupabase(): boolean {
    return Boolean(supabaseClient);
  }

  public static async saveRespuesta(respuesta: RespuestaItem): Promise<{ synced: boolean; error?: string }> {
    // 1. Siempre guardar en IndexedDB primero
    await saveRespuestaLocal({ ...respuesta, estado: supabaseClient ? 'pendiente_sync' : 'guardado' });

    if (supabaseClient) {
      return { synced: false, error: 'Se enviará a Supabase al finalizar el formulario.' };
    }

    // 2. Comprobar si hay conexión con el backend
    const online = await this.checkConnection();
    if (!online) {
      await saveRespuestaLocal({ ...respuesta, estado: 'pendiente_sync' });
      await enqueueSync({
        tipo: 'respuesta',
        payload: respuesta,
        fecha: new Date().toISOString(),
      });
      return { synced: false };
    }

    // 3. Intentar POST /api/respuestas/
    try {
      const res = await fetch(`${API_BASE}/respuestas/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          pregunta_id: respuesta.preguntaId,
          seccion_id: respuesta.seccionId,
          pregunta: respuesta.pregunta,
          respuesta: respuesta.valor,
          fuente: respuesta.fuente || '',
          fecha_actualizacion: respuesta.fechaActualizacion,
        }),
      });

      if (!res.ok) {
        throw new Error(`Error en servidor (${res.status})`);
      }

      await saveRespuestaLocal({ ...respuesta, estado: 'guardado' });
      return { synced: true };
    } catch (err: any) {
      console.warn('Error al guardar en API, encolando para sincronización:', err.message);
      await saveRespuestaLocal({ ...respuesta, estado: 'pendiente_sync' });
      await enqueueSync({
        tipo: 'respuesta',
        payload: respuesta,
        fecha: new Date().toISOString(),
      });
      return { synced: false, error: 'Guardado localmente. Pendiente de sincronización.' };
    }
  }

  public static async saveUsuario(usuario: DatosUsuario): Promise<{ synced: boolean; error?: string }> {
    if (supabaseClient) return { synced: false };

    const online = await this.checkConnection();
    if (!online) {
      await enqueueSync({
        tipo: 'usuario',
        payload: usuario,
        fecha: new Date().toISOString(),
      });
      return { synced: false };
    }

    try {
      const res = await fetch(`${API_BASE}/formulario/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario }),
      });
      return { synced: res.ok };
    } catch {
      await enqueueSync({
        tipo: 'usuario',
        payload: usuario,
        fecha: new Date().toISOString(),
      });
      return { synced: false };
    }
  }

  public static async uploadArchivo(archivo: ArchivoAdjunto): Promise<{ synced: boolean; error?: string; archivo?: ArchivoAdjunto }> {
    const pendingFile = { ...archivo, estado: 'pendiente_sync' as const };
    await saveArchivoLocal(pendingFile);

    const online = await this.checkConnection();
    if (!online) {
      await enqueueSync({
        tipo: 'archivo',
        payload: pendingFile,
        fecha: new Date().toISOString(),
      });
      return { synced: false };
    }

    try {
      const res = await fetch(`${API_BASE}/archivos/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(archivo),
      });

      const responseBody = await res.json().catch(() => ({}));
      if (res.ok) {
        const syncedArch: ArchivoAdjunto = {
          ...archivo,
          ...responseBody.data,
          estado: 'sincronizado',
          dataBase64: undefined,
        };
        await saveArchivoLocal(syncedArch);
        return { synced: true, archivo: syncedArch };
      }
      throw new Error(responseBody.error || 'No se pudo guardar el archivo en Google Drive.');
    } catch (error) {
      await enqueueSync({
        tipo: 'archivo',
        payload: pendingFile,
        fecha: new Date().toISOString(),
      });
      return { synced: false, error: error instanceof Error ? error.message : 'Archivo conservado localmente.' };
    }
  }

  public static async syncPendingQueue(): Promise<number> {
    if (supabaseClient) return 0;

    const online = await this.checkConnection();
    if (!online) return 0;

    const queue = await getSyncQueue();
    if (queue.length === 0) return 0;

    let syncedCount = 0;
    try {
      const res = await fetch(`${API_BASE}/sincronizar/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: queue }),
      });

      const responseBody = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(responseBody.resultados)) {
        for (const item of queue) {
          const result = responseBody.resultados.find((entry: { id: number; success: boolean }) => entry.id === item.id);
          if (!result?.success) continue;

          if (item.tipo === 'archivo' && result.data) {
            await saveArchivoLocal({
              ...item.payload,
              ...result.data,
              estado: 'sincronizado',
              dataBase64: undefined,
            });
          }
          await removeSyncItem(item.id);
          syncedCount++;
        }
      }
    } catch (err) {
      console.warn('Fallo en sincronización batch', err);
    }

    return syncedCount;
  }

  public static async finalizarFormulario(payload: {
    usuario: DatosUsuario;
    respuestas: Record<string, RespuestaItem>;
    archivos: ArchivoAdjunto[];
  }): Promise<{ success: boolean; folio: string; fecha: string }> {
    const timestamp = new Date().toISOString();
    const fallbackFolio = `INEGI-IFPADS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    if (supabaseClient) {
      const archivosMetadata = payload.archivos.map(({ dataBase64: _dataBase64, ...archivo }) => archivo);
      const respuestasGuardadas = Object.fromEntries(
        Object.entries(payload.respuestas).map(([id, respuesta]) => [id, { ...respuesta, estado: 'guardado' as const }]),
      );
      const { data, error } = await supabaseClient.rpc('registrar_formulario', {
        p_payload: {
          ...payload,
          respuestas: respuestasGuardadas,
          archivos: archivosMetadata,
          folio: fallbackFolio,
          fechaFinalizacion: timestamp,
        },
      });

      if (error) {
        throw new Error(`No se pudo registrar en Supabase: ${error.message}`);
      }

      return {
        success: true,
        folio: data?.folio || fallbackFolio,
        fecha: data?.fecha || timestamp,
      };
    }

    return {
      success: true,
      folio: fallbackFolio,
      fecha: timestamp,
    };
  }
}
