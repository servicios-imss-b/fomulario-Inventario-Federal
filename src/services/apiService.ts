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
type FormAccessCredential = { accessId: string; password: string };

export class ApiService {
  private static formAccess: FormAccessCredential | null = null;
  private static isApiAvailable: boolean = true;
  private static lastCheckTime: number = 0;
  private static checkInterval: number = 10000; // 10s
  private static lastSyncError: string | null = null;

  public static getLastSyncError(): string | null {
    return this.lastSyncError;
  }

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

  public static setFormAccess(access: FormAccessCredential | null): void {
    this.formAccess = access;
  }

  public static async saveRespuesta(respuesta: RespuestaItem): Promise<{ synced: boolean; error?: string }> {
    if (supabaseClient) {
      await saveRespuestaLocal({ ...respuesta, estado: 'pendiente_sync' });
      const access = this.formAccess;
      if (!access) return { synced: false, error: 'Vuelve a validar la contraseÃ±a de acceso.' };

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        await enqueueSync({ tipo: 'respuesta', payload: respuesta, fecha: new Date().toISOString() });
        return { synced: false };
      }

      try {
        const { error } = await supabaseClient.rpc('guardar_avance_formulario', {
          p_password: access.password,
          p_access_id: access.accessId,
          p_respuesta: respuesta,
        });
        if (error) throw error;
        await saveRespuestaLocal({ ...respuesta, estado: 'guardado' });
        return { synced: true };
      } catch (error) {
        await enqueueSync({ tipo: 'respuesta', payload: respuesta, fecha: new Date().toISOString() });
        return { synced: false, error: error instanceof Error ? error.message : 'Guardado localmente; pendiente de sincronizaciÃ³n.' };
      }
    }

    await saveRespuestaLocal({ ...respuesta, estado: 'guardado' });

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

  public static async saveSubmittedSections(sections: string[]): Promise<{ synced: boolean; error?: string }> {
    if (!supabaseClient) return { synced: false, error: 'No hay una conexión de Supabase configurada.' };
    const access = this.formAccess;
    if (!access) return { synced: false, error: 'Vuelve a validar la contraseña de acceso.' };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await enqueueSync({
        tipo: 'progreso',
        payload: { submittedSections: sections },
        fecha: new Date().toISOString(),
      });
      return { synced: false };
    }

    const { error } = await supabaseClient.rpc('guardar_progreso_formulario', {
      p_password: access.password,
      p_access_id: access.accessId,
      p_submitted_sections: sections,
    });
    if (error) {
      await enqueueSync({
        tipo: 'progreso',
        payload: { submittedSections: sections },
        fecha: new Date().toISOString(),
      });
      return { synced: false, error: error.message };
    }
    return { synced: true };
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

  private static async sendArchivo(archivo: ArchivoAdjunto): Promise<Partial<ArchivoAdjunto>> {
    if (supabaseClient) {
      if (!this.formAccess) throw new Error('Vuelve a validar la contrasena de acceso.');
      const { data, error } = await supabaseClient.functions.invoke('archivos-storage', {
        body: {
          action: 'create-upload',
          archivo: { id: archivo.id, nombre: archivo.nombre, tamanio: archivo.tamanio },
          accessId: this.formAccess.accessId,
          password: this.formAccess.password,
        },
      });
      if (error?.context instanceof Response) {
        const failure = await error.context.clone().json().catch(() => ({}));
        throw new Error(failure.error || 'El servicio de archivos no esta disponible. El archivo sigue pendiente en este navegador.');
      }
      if (error || !data?.success || !data?.data?.storagePath || !data?.data?.uploadToken) {
        throw new Error(data?.error || 'No se pudo preparar la carga en Supabase Storage.');
      }
      if (typeof archivo.dataBase64 !== 'string') {
        throw new Error('No se encontro el contenido local del archivo. Selecciona el original.');
      }
      const encoded = archivo.dataBase64.includes(',')
        ? archivo.dataBase64.slice(archivo.dataBase64.indexOf(',') + 1)
        : archivo.dataBase64;
      const binary = atob(encoded);
      if (binary.length !== archivo.tamanio) throw new Error('El tamano no coincide con el contenido del archivo.');
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const blob = new Blob([bytes.buffer as ArrayBuffer], { type: archivo.tipo || 'application/octet-stream' });
      const { error: uploadError } = await supabaseClient.storage
        .from('ipads-archivos')
        .uploadToSignedUrl(data.data.storagePath, data.data.uploadToken, blob, {
          contentType: archivo.tipo || 'application/octet-stream',
          upsert: true,
        });
      if (uploadError) throw new Error(`Supabase Storage no recibio el archivo: ${uploadError.message}`);
      return {
        almacenamientoId: data.data.almacenamientoId,
        storagePath: data.data.storagePath,
        proveedorAlmacenamiento: 'supabase_storage',
      };
    }

    const response = await fetch(`${API_BASE}/archivos/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(archivo),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success || !body.data?.driveFileId || !body.data?.url) {
      throw new Error(body.error || `El servidor de archivos respondio HTTP ${response.status}.`);
    }
    return body.data;
  }

  public static async getArchivoDownloadUrl(archivo: ArchivoAdjunto): Promise<string> {
    if (archivo.proveedorAlmacenamiento === 'google_drive' || (archivo.url && !archivo.storagePath)) {
      if (!archivo.url) throw new Error('El enlace de descarga de Drive no esta disponible.');
      return archivo.url;
    }
    if (!supabaseClient || !this.formAccess) {
      throw new Error('Vuelve a validar el acceso para descargar este archivo.');
    }
    const { data, error } = await supabaseClient.functions.invoke('archivos-storage', {
      body: {
        action: 'create-download',
        accessId: this.formAccess.accessId,
        password: this.formAccess.password,
        archivo: { id: archivo.id, nombre: archivo.nombre },
      },
    });
    if (error?.context instanceof Response) {
      const failure = await error.context.clone().json().catch(() => ({}));
      throw new Error(failure.error || 'No se pudo generar la descarga.');
    }
    if (error || !data?.success || typeof data?.data?.url !== 'string') {
      throw new Error(data?.error || 'No se pudo generar la descarga.');
    }
    return data.data.url;
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
      const data = await this.sendArchivo(archivo);
      const syncedArch: ArchivoAdjunto = {
        ...archivo,
        ...data,
        estado: 'sincronizado',
        dataBase64: undefined,
      };
      await saveArchivoLocal(syncedArch);
      return { synced: true, archivo: syncedArch };
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
    this.lastSyncError = null;
    const online = await this.checkConnection();
    if (!online) {
      this.lastSyncError = 'Supabase no responde o el navegador está sin conexión.';
      return 0;
    }

    const queue = await getSyncQueue();
    if (queue.length === 0) return 0;

    if (supabaseClient) {
      const access = this.formAccess;
      if (!access) {
        this.lastSyncError = 'La sesión de captura expiró. Vuelve a validar la contraseña.';
        return 0;
      }
      let syncedCount = 0;
      for (const item of queue) {
        try {
          if (item.tipo === 'archivo') {
            const data = await this.sendArchivo(item.payload);
            await saveArchivoLocal({
              ...item.payload,
              ...data,
              estado: 'sincronizado',
              dataBase64: undefined,
            });
            await removeSyncItem(item.id);
            syncedCount++;
            continue;
          }

          const result = item.tipo === 'respuesta'
            ? await supabaseClient.rpc('guardar_avance_formulario', {
                p_password: access.password,
                p_access_id: access.accessId,
                p_respuesta: item.payload,
              })
            : item.tipo === 'progreso'
              ? await supabaseClient.rpc('guardar_progreso_formulario', {
                  p_password: access.password,
                    p_access_id: access.accessId,
                  p_submitted_sections: item.payload.submittedSections,
                })
              : null;
          if (!result || result.error) {
            if (result?.error) {
              this.lastSyncError ??= result.error.code === '42501'
                ? 'Supabase rechazó la sesión o el cuestionario ya está cerrado.'
                : result.error.message || 'Supabase rechazó una respuesta pendiente.';
              console.warn('No se pudo sincronizar una respuesta pendiente.', {
                preguntaId: item.tipo === 'respuesta' ? item.payload.preguntaId : undefined,
                code: result.error.code,
                message: result.error.message,
              });
            }
            if (!result) this.lastSyncError ??= `Tipo de elemento local no compatible: ${item.tipo}.`;
            continue;
          }
          if (item.tipo === 'respuesta') {
            await saveRespuestaLocal({ ...item.payload, estado: 'guardado' });
          }
          await removeSyncItem(item.id);
          syncedCount++;
        } catch (error) {
          this.lastSyncError ??= error instanceof Error ? error.message : 'Error inesperado al sincronizar.';
          continue;
        }
      }
      return syncedCount;
    }

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
    submittedSections?: string[];
  }): Promise<{ success: boolean; folio: string; fecha: string }> {
    const timestamp = new Date().toISOString();
    const fallbackFolio = `INEGI-IFPADS-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    if (supabaseClient) {
      const access = this.formAccess;
      if (!access) throw new Error('La sesiÃ³n de captura expirÃ³. Vuelve a ingresar la contraseÃ±a.');
      const archivosMetadata = payload.archivos.map(({ dataBase64: _dataBase64, ...archivo }) => archivo);
      const respuestasGuardadas = Object.fromEntries(
        Object.entries(payload.respuestas).map(([id, respuesta]) => [id, { ...respuesta, estado: 'guardado' as const }]),
      );
      const { data, error } = await supabaseClient.rpc('registrar_formulario', {
        p_password: access.password,
        p_access_id: access.accessId,
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

      const queuedItems = await getSyncQueue();
      const submittedSections = payload.submittedSections ?? [];
      for (const item of queuedItems) {
        if (item.tipo === 'respuesta') {
          const questionId = item.payload?.preguntaId;
          const submittedAnswer = payload.respuestas[questionId];
          const queuedTimestamp = Date.parse(item.payload?.fechaActualizacion ?? '');
          const submittedTimestamp = Date.parse(submittedAnswer?.fechaActualizacion ?? '');
          if (!submittedAnswer || !Number.isFinite(queuedTimestamp)
            || !Number.isFinite(submittedTimestamp) || submittedTimestamp < queuedTimestamp) continue;
          await saveRespuestaLocal({ ...item.payload, estado: 'guardado' });
          await removeSyncItem(item.id);
        } else if (item.tipo === 'progreso') {
          const queuedSections = item.payload?.submittedSections;
          if (!Array.isArray(queuedSections) || !queuedSections.every((section: string) => submittedSections.includes(section))) continue;
          await removeSyncItem(item.id);
        }
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
