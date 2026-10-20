/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DatosUsuario,
  RespuestaItem,
  ArchivoAdjunto,
  EstadoConexion,
} from './types/form';
import { SECCIONES_CUESTIONARIO, IMAGENES_SALUD_PRESUPUESTO } from './data/cuestionarioInegi';
import { Header } from './components/Header';
import { ProgressBar } from './components/ProgressBar';
import { LandingView } from './components/LandingView';
import { LoadingOverlay } from './components/LoadingOverlay';
import { IntroVideo } from './components/IntroVideo';
import { FormSectionView } from './components/FormSectionView';
import { FileUploadSection } from './components/FileUploadSection';
import { ConfirmationModal } from './components/ConfirmationModal';
import { SuccessView } from './components/SuccessView';
import { ToastContainer, ToastMessage } from './components/ToastContainer';
import { ApiService } from './services/apiService';
import {
  getAllRespuestasLocal,
  saveRespuestaLocal,
  getDatosUsuarioLocal,
  saveDatosUsuarioLocal,
  getArchivosLocal,
  deleteArchivoLocal,
  getMetaFormulario,
  saveMetaFormulario,
  getSyncQueue,
  clearAllLocalData,
  setIndexedDbScope,
} from './services/indexedDb';

import { SectionBackground } from './components/SectionBackground';
import { ASSET_IMAGES } from './assets/images';
import { FrontValidationAccess } from './components/FrontValidationAccess';
import { FormAccessGate, type FormAccessSession } from './components/FormAccessGate';
import preguntasPrellenadasData from './data/preguntasPrellenadas.json';

export type AppStep = 'landing' | 'section' | 'archivos' | 'success';
type ActiveFormAccess = FormAccessSession;

const getCaptureScope = (programKey: string, programYear: string) =>
  programKey && programYear ? `${programKey.trim()}::${programYear.trim()}` : '';

type PrefilledAnswer = { valor: unknown; nota?: string };
type PrefilledAnswers = Record<string, Record<string, Record<string, PrefilledAnswer>>>;

const getQuestionById = (questionId: string) =>
  SECCIONES_CUESTIONARIO.flatMap((section) => section.preguntas).find((question) => question.id === questionId);

const reconcilePrefilledAnswers = (
  current: Record<string, RespuestaItem>,
  programKey: string,
  programYear: string
) => {
  const scope = getCaptureScope(programKey, programYear);
  const source = preguntasPrellenadasData as PrefilledAnswers;
  const scopedAnswers = scope ? source[programYear]?.[programKey] ?? {} : {};
  const next = { ...current };

  Object.entries(next).forEach(([questionId, answer]) => {
    if (answer.prellenada && !answer.prefillEdited && answer.prefillScope !== scope) {
      next[questionId] = {
        ...answer,
        valor: '',
        notaPrellenado: undefined,
        prefillScope: '',
        prefillDisagreed: false,
        prefillConfirmed: false,
        fechaActualizacion: new Date().toISOString(),
      };
    }
  });

  Object.entries(scopedAnswers).forEach(([questionId, prefill]) => {
    const existing = next[questionId];
    if (existing && (!existing.prellenada || existing.prefillEdited)) return;
    if (existing?.prefillScope === scope) return;

    const question = getQuestionById(questionId);
    if (!question) return;
    next[questionId] = {
      preguntaId: questionId,
      seccionId: question.seccionId,
      pregunta: question.pregunta,
      valor: prefill.valor,
      notaPrellenado: prefill.nota,
      prellenada: true,
      prefillScope: scope,
      prefillDisagreed: false,
      prefillConfirmed: false,
      prefillEdited: false,
      fechaActualizacion: new Date().toISOString(),
      estado: 'guardado',
    };
  });

  return next;
};

export default function App() {
  const [introCompleted, setIntroCompleted] = useState(false);
  const [step, setStep] = useState<AppStep>('landing');
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);

  const [usuario, setUsuario] = useState<DatosUsuario>({
    nombre: '',
    puesto: '',
    correo: '',
    telefono: '',
    entidadDependencia: '',
    fechaCaptura: new Date().toISOString().split('T')[0],
  });

  const [respuestas, setRespuestas] = useState<Record<string, RespuestaItem>>({});
  const [submittedSectionsByScope, setSubmittedSectionsByScope] = useState<Record<string, string[]>>({});
  const [claveProgramaBloqueada, setClaveProgramaBloqueada] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [archivos, setArchivos] = useState<ArchivoAdjunto[]>([]);

  const [estadoConexion, setEstadoConexion] = useState<EstadoConexion>({
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    apiDisponible: true,
    sincronizando: false,
    ultimoSync: null,
    elementosPendientes: 0,
  });

  const [estadoGuardado, setEstadoGuardado] = useState<'guardando' | 'guardado' | 'pendiente' | 'error'>('guardado');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccessLoading, setIsAccessLoading] = useState(false);
  const [formAccess, setFormAccess] = useState<ActiveFormAccess | null>(null);
  const [isScopeLoading, setIsScopeLoading] = useState(false);
  const [isAccessPromptOpen, setIsAccessPromptOpen] = useState(false);

  const [folioGenerado, setFolioGenerado] = useState<string>('');
  const [fechaFinalizacion, setFechaFinalizacion] = useState<string>('');

  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const accessLoadingTimeoutRef = useRef<number | null>(null);
  const syncInProgressRef = useRef(false);
  const syncRetryDelayRef = useRef(15_000);
  const nextAutoSyncAttemptRef = useRef(0);
  const claveProgramaActual = String(respuestas['clave_programa']?.valor ?? '').trim();
  const anioProgramaActual = String(respuestas['anio_captura']?.valor ?? '').trim();
  const captureScope = getCaptureScope(claveProgramaActual, anioProgramaActual);

  useEffect(() => {
    const currentState = window.history.state;
    const landingState =
      currentState && typeof currentState === 'object' ? currentState : {};
    window.history.replaceState(
      { ...landingState, questionnaireFlow: 'landing', questionnaireStep: 'landing' },
      '',
      window.location.href
    );

    const handleQuestionnaireHistory = (event: PopStateEvent) => {
      if (accessLoadingTimeoutRef.current !== null) {
        window.clearTimeout(accessLoadingTimeoutRef.current);
        accessLoadingTimeoutRef.current = null;
        setIsAccessLoading(false);
      }

      if (!window.matchMedia('(min-width: 1024px)').matches) return;

      if (event.state?.questionnaireFlow === 'landing') {
        setCurrentSectionIndex(0);
        setStep('landing');
      } else if (event.state?.questionnaireFlow === 'active') {
        const restoredIndex = event.state.currentSectionIndex;
        if (Number.isInteger(restoredIndex)) {
          setCurrentSectionIndex(Math.max(0, Math.min(restoredIndex, SECCIONES_CUESTIONARIO.length - 1)));
        }
        const restoredStep = event.state.questionnaireStep;
        if (restoredStep === 'archivos') {
          setStep(restoredStep);
        } else {
          setStep('section');
        }
      }
    };

    window.addEventListener('popstate', handleQuestionnaireHistory);
    return () => window.removeEventListener('popstate', handleQuestionnaireHistory);
  }, []);

  // Función para agregar Toast
  const addToast = useCallback((mensaje: string, tipo: ToastMessage['tipo'] = 'success') => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    setToasts((prev) => [...prev, { id, tipo, mensaje }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Cargar solo el borrador de la asignación autenticada.
  useEffect(() => {
    if (!formAccess) return;
    setIndexedDbScope(formAccess.accessId, formAccess.clave, formAccess.anio);
    let isMounted = true;

    const loadStoredData = async () => {
      try {
        const [savedUser, savedResp, savedArch, meta, pendingQueue] = await Promise.all([
          getDatosUsuarioLocal(),
          getAllRespuestasLocal(),
          getArchivosLocal(),
          getMetaFormulario(),
          getSyncQueue(),
        ]);

        if (!isMounted) return;
        setUsuario(savedUser ?? {
          nombre: '',
          puesto: '',
          correo: '',
          telefono: '',
          entidadDependencia: '',
          fechaCaptura: new Date().toISOString().split('T')[0],
        });

        const respuestasGuardadas = { ...savedResp };
        Object.entries(formAccess.answers).forEach(([questionId, remoteAnswer]) => {
          const localAnswer = respuestasGuardadas[questionId];
          const localTimestamp = Date.parse(localAnswer?.fechaActualizacion ?? '');
          const remoteTimestamp = Date.parse(remoteAnswer.fechaActualizacion ?? '');
          if (!localAnswer || !Number.isFinite(localTimestamp) || remoteTimestamp >= localTimestamp) {
            respuestasGuardadas[questionId] = remoteAnswer;
          }
        });
        if (respuestasGuardadas['10.1'] && !respuestasGuardadas['11']) {
          respuestasGuardadas['11'] = {
            ...respuestasGuardadas['10.1'],
            preguntaId: '11',
            pregunta: '11. Durante año reportado, ¿qué otras dependencias participaron como responsables en la operación del programa?',
          };
        }
        delete respuestasGuardadas['10.1'];
        const timestamp = new Date().toISOString();
        const respuestasAsignadas = {
          ...respuestasGuardadas,
          clave_programa: {
            preguntaId: 'clave_programa',
            seccionId: 'datos_generales',
            pregunta: 'Clave del programa',
            valor: formAccess.clave,
            fechaActualizacion: timestamp,
            estado: 'guardado' as const,
          },
          anio_captura: {
            preguntaId: 'anio_captura',
            seccionId: 'datos_generales',
            pregunta: 'Año del programa',
            valor: formAccess.anio,
            fechaActualizacion: timestamp,
            estado: 'guardado' as const,
          },
        };
        const reconciledAnswers = reconcilePrefilledAnswers(
          respuestasAsignadas,
          formAccess.clave,
          formAccess.anio,
        );
        setRespuestas(reconciledAnswers);
        Object.entries(reconciledAnswers).forEach(([questionId, answer]) => {
          if (questionId !== 'clave_programa' && questionId !== 'anio_captura'
            && JSON.stringify(answer) !== JSON.stringify(respuestasGuardadas[questionId])) {
            void ApiService.saveRespuesta(answer);
          }
        });
        await Promise.all(Object.values(reconciledAnswers).map(saveRespuestaLocal));

        // Sincronizar datos de capturista con las preguntas 1 a 5 si existen
        if (savedResp['1']?.valor) setUsuario((u) => ({ ...u, nombre: savedResp['1'].valor }));
        if (savedResp['2']?.valor) setUsuario((u) => ({ ...u, puesto: savedResp['2'].valor }));
        if (savedResp['3']?.valor) setUsuario((u) => ({ ...u, correo: savedResp['3'].valor }));
        if (savedResp['4']?.valor) setUsuario((u) => ({ ...u, telefono: savedResp['4'].valor }));
        if (savedResp['5']?.valor) setUsuario((u) => ({ ...u, fechaCaptura: savedResp['5'].valor }));

        if (savedArch && savedArch.length > 0) {
          setArchivos(savedArch);
        }

        if (meta) {
          if (meta.submittedSectionsByScope) setSubmittedSectionsByScope(meta.submittedSectionsByScope);
          if (meta.folio) setFolioGenerado(meta.folio);
          if (meta.fechaFinalizacion) setFechaFinalizacion(meta.fechaFinalizacion);
        }
        setSubmittedSectionsByScope({
          [getCaptureScope(formAccess.clave, formAccess.anio)]: formAccess.submittedSections,
        });

        setEstadoConexion((prev) => ({
          ...prev,
          elementosPendientes: pendingQueue.length,
        }));
        setIsScopeLoading(false);
      } catch (err) {
        console.warn('Error al cargar datos desde IndexedDB', err);
        if (isMounted) setIsScopeLoading(false);
      }
    };

    void loadStoredData();
    return () => {
      isMounted = false;
    };
  }, [formAccess]);

  // 2. Monitoreo de conectividad real
  const checkConnectivity = useCallback(async () => {
    const isOnline = await ApiService.checkConnection();
    const queue = await getSyncQueue();

    setEstadoConexion((prev) => ({
      ...prev,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      apiDisponible: isOnline,
      elementosPendientes: queue.length,
    }));

    // Auto-sync al volver la red
    if (isOnline && queue.length > 0 && !syncInProgressRef.current && Date.now() >= nextAutoSyncAttemptRef.current) {
      syncInProgressRef.current = true;
      setEstadoConexion((prev) => ({ ...prev, sincronizando: true }));
      let syncedCount = 0;
      try {
        syncedCount = await ApiService.syncPendingQueue();
        if (syncedCount > 0) {
          setArchivos(await getArchivosLocal());
          addToast(`Sincronización completada (${syncedCount} elementos)`, 'success');
        }
      } catch (e) {
        console.warn('Error durante auto-sync', e);
      } finally {
        const remainingQueue = await getSyncQueue();
        if (remainingQueue.length === 0) {
          syncRetryDelayRef.current = 15_000;
          nextAutoSyncAttemptRef.current = 0;
          if (syncedCount > 0) setEstadoGuardado('guardado');
        } else {
          nextAutoSyncAttemptRef.current = Date.now() + syncRetryDelayRef.current;
          syncRetryDelayRef.current = Math.min(syncRetryDelayRef.current * 2, 5 * 60_000);
        }
        syncInProgressRef.current = false;
        setEstadoConexion((prev) => ({
          ...prev,
          sincronizando: false,
          ultimoSync: new Date().toLocaleTimeString(),
          elementosPendientes: remainingQueue.length,
        }));
      }
    }
  }, [addToast, estadoConexion.sincronizando]);

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 12000);

    const handleOnline = () => {
      nextAutoSyncAttemptRef.current = 0;
      addToast('Conexión reestablecida.', 'info');
      checkConnectivity();
    };

    const handleOffline = () => {
      addToast('Sin conexión. Los cambios se conservarán en IndexedDB.', 'warning');
      setEstadoConexion((prev) => ({ ...prev, online: false, apiDisponible: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnectivity, addToast]);

  // 3. Manejador para cambio de respuesta con debounce y autosave
  const handleRespuestaChange = (
    preguntaId: string,
    seccionId: string,
    pregunta: string,
    valor: any,
    fuente?: string,
    correoPersonalPorBaja?: boolean
  ) => {
    const fechaActualizacion = new Date().toISOString();
    const previousAnswer = respuestas[preguntaId];
    const item: RespuestaItem = {
      preguntaId,
      seccionId,
      pregunta,
      valor,
      fuente,
      ...(previousAnswer?.prellenada ? {
        notaPrellenado: previousAnswer.notaPrellenado,
        prellenada: true,
        prefillScope: previousAnswer.prefillScope,
        prefillDisagreed: previousAnswer.prefillDisagreed,
        prefillConfirmed: previousAnswer.prefillDisagreed ? true : previousAnswer.prefillConfirmed,
        prefillEdited: previousAnswer.prefillEdited || previousAnswer.prefillDisagreed,
      } : {}),
      ...(correoPersonalPorBaja !== undefined || previousAnswer?.correoPersonalPorBaja !== undefined ? {
        correoPersonalPorBaja: correoPersonalPorBaja ?? previousAnswer?.correoPersonalPorBaja,
      } : {}),
      fechaActualizacion,
      estado: 'guardado',
    };

    // Actualización inmediata del estado React
    const updatedAnswers = { ...respuestas, [preguntaId]: item };
    const answersToSave = preguntaId === 'clave_programa' || preguntaId === 'anio_captura'
      ? reconcilePrefilledAnswers(
          updatedAnswers,
          String(updatedAnswers['clave_programa']?.valor ?? '').trim(),
          String(updatedAnswers['anio_captura']?.valor ?? '').trim()
        )
      : updatedAnswers;
    setRespuestas(answersToSave);
    if (captureScope && submittedSectionsByScope[captureScope]?.includes(seccionId)) {
      const updatedSectionsByScope = {
        ...submittedSectionsByScope,
        [captureScope]: (submittedSectionsByScope[captureScope] ?? []).filter((id) => id !== seccionId),
      };
      setSubmittedSectionsByScope(updatedSectionsByScope);
      void saveMetaFormulario({
        step,
        currentSectionIndex,
        submittedSectionsByScope: updatedSectionsByScope,
      });
    }
    if (answersToSave !== updatedAnswers) {
      Object.entries(answersToSave).forEach(([answerId, answer]) => {
        if (answerId !== preguntaId && JSON.stringify(answer) !== JSON.stringify(respuestas[answerId])) {
          void ApiService.saveRespuesta(answer);
        }
      });
    }
    setEstadoGuardado('guardando');

    // Sincronizar automáticamente datos de usuario si corresponde a preguntas 1 a 5
    if (preguntaId === '1') setUsuario((u) => ({ ...u, nombre: valor }));
    else if (preguntaId === '2') setUsuario((u) => ({ ...u, puesto: valor }));
    else if (preguntaId === '3') setUsuario((u) => ({ ...u, correo: valor }));
    else if (preguntaId === '4') setUsuario((u) => ({ ...u, telefono: valor }));
    else if (preguntaId === '5') setUsuario((u) => ({ ...u, fechaCaptura: valor }));

    // Debounce de guardado
    if (saveTimeoutRef.current[preguntaId]) {
      clearTimeout(saveTimeoutRef.current[preguntaId]);
    }

    saveTimeoutRef.current[preguntaId] = setTimeout(async () => {
      const res = await ApiService.saveRespuesta(item);
      if (res.synced) {
        setEstadoGuardado('guardado');
      } else {
        setEstadoGuardado('pendiente');
      }

      // Guardar también usuario actualizado
      if (['1', '2', '3', '4', '5'].includes(preguntaId)) {
        setUsuario((currentU) => {
          saveDatosUsuarioLocal(currentU);
          ApiService.saveUsuario(currentU);
          return currentU;
        });
      }

      // Actualizar conteo de pendientes
      const queue = await getSyncQueue();
      setEstadoConexion((prev) => ({ ...prev, elementosPendientes: queue.length }));
    }, 400);
  };

  const handleClaveProgramaChange = (clave: string) => {
    handleRespuestaChange('clave_programa', 'datos_generales', 'Clave del programa', clave);
  };

  const handleFormAccessSelect = (access: FormAccessSession) => {
    ApiService.setFormAccess({ accessId: access.accessId, password: access.password });
    setIsScopeLoading(true);
    setRespuestas({});
    setArchivos([]);
    setUsuario({
      nombre: '',
      puesto: '',
      correo: '',
      telefono: '',
      entidadDependencia: '',
      fechaCaptura: new Date().toISOString().split('T')[0],
    });
    setSubmittedSectionsByScope({});
    setFolioGenerado('');
    setFechaFinalizacion('');
    setCurrentSectionIndex(0);
    setStep('section');
    setIsAdminView(false);
    setFormAccess(access);
    setIsAccessPromptOpen(false);
  };

  const handleFormSignOut = async () => {
    if (!formAccess || !window.confirm('¿Cerrar sesión? El borrador de esta clave y año quedará guardado para tu cuenta.')) return;

    Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    saveTimeoutRef.current = {};
    await Promise.all([
      ...Object.values(respuestas).map((answer) => saveRespuestaLocal(answer)),
      saveDatosUsuarioLocal(usuario),
    ]);
    ApiService.setFormAccess(null);
    setFormAccess(null);
    setIsScopeLoading(false);
    setIsAccessPromptOpen(false);
    setIsAdminView(false);
    setRespuestas({});
    setArchivos([]);
    setUsuario({
      nombre: '',
      puesto: '',
      correo: '',
      telefono: '',
      entidadDependencia: '',
      fechaCaptura: new Date().toISOString().split('T')[0],
    });
    setSubmittedSectionsByScope({});
    setCurrentSectionIndex(0);
    setStep('landing');
  };

  const handleResetProgramSelection = async () => {
    if (!window.confirm('Restablecer la selección borrará las respuestas y archivos asociados al programa actual. Se conservarán los datos del capturista. ¿Deseas continuar?')) {
      return;
    }

    Object.values(saveTimeoutRef.current).forEach(clearTimeout);
    saveTimeoutRef.current = {};

    const capturistaAnswerIds = new Set(['1', '2', '3', '4', '5']);
    const capturistaAnswers = Object.fromEntries(
      Object.entries(respuestas).filter(([questionId]) => capturistaAnswerIds.has(questionId)),
    );

    await clearAllLocalData();
    await Promise.all([
      ...Object.values(capturistaAnswers).map((answer) => saveRespuestaLocal(answer)),
      saveDatosUsuarioLocal(usuario),
    ]);

    setRespuestas(capturistaAnswers);
    setArchivos([]);
    setSubmittedSectionsByScope({});
    setCurrentSectionIndex(0);
    setIsConfirmationOpen(false);
    setEstadoGuardado('guardado');
    setEstadoConexion((previous) => ({ ...previous, elementosPendientes: 0, sincronizando: false }));
    setStep('section');
    await saveMetaFormulario({ step: 'section', currentSectionIndex: 0, submittedSectionsByScope: {} });
    addToast('Selección restablecida. Elige la clave y el ejercicio correctos.', 'info');
  };

  const handlePrefillAgreement = (questionId: string, disagreed: boolean) => {
    const existing = respuestas[questionId];
    if (!existing?.prellenada) return;
    const updated: RespuestaItem = {
      ...existing,
      prefillDisagreed: disagreed,
      prefillConfirmed: !disagreed,
      fechaActualizacion: new Date().toISOString(),
    };
    setRespuestas((previous) => ({ ...previous, [questionId]: updated }));
    void ApiService.saveRespuesta(updated);
  };

  // 4. Carga de archivo
  const handleFileUpload = async (archivo: ArchivoAdjunto) => {
    const updated = [...archivos, archivo];
    setArchivos(updated);
    const res = await ApiService.uploadArchivo(archivo);
    if (res.synced) {
      setArchivos((prev) => prev.map((item) => item.id === archivo.id
        ? { ...item, ...res.archivo, estado: 'sincronizado' }
        : item));
      addToast('Archivo cargado correctamente.', 'success');
    } else {
      addToast(res.error || 'Archivo conservado localmente en IndexedDB.', 'warning');
    }
    const queue = await getSyncQueue();
    setEstadoConexion((prev) => ({ ...prev, elementosPendientes: queue.length }));
  };

  // 5. Eliminar archivo
  const handleFileDelete = async (id: string) => {
    await deleteArchivoLocal(id);
    setArchivos((prev) => prev.filter((a) => a.id !== id));
    addToast('Archivo eliminado.', 'info');
  };

  // 6. Sincronización manual
  const handleManualSync = async () => {
    if (syncInProgressRef.current) return;
    syncInProgressRef.current = true;
    nextAutoSyncAttemptRef.current = 0;
    setEstadoConexion((prev) => ({ ...prev, sincronizando: true }));
    let count = 0;
    try {
      count = await ApiService.syncPendingQueue();
      if (count > 0) setArchivos(await getArchivosLocal());
      const remainingQueue = await getSyncQueue();
      if (remainingQueue.length === 0) {
        addToast(`Sincronización completada: ${count} elementos procesados.`, 'success');
        if (count > 0) setEstadoGuardado('guardado');
      } else {
        const syncError = ApiService.getLastSyncError();
        addToast(syncError
          ? `Quedan ${remainingQueue.length} elementos locales. ${syncError}`
          : `Quedan ${remainingQueue.length} elementos locales. Revisa la conexión y vuelve a intentar.`, 'warning');
      }
    } catch {
      addToast('No fue posible sincronizar en este momento.', 'error');
    } finally {
      const queue = await getSyncQueue();
      if (queue.length === 0) {
        syncRetryDelayRef.current = 15_000;
        nextAutoSyncAttemptRef.current = 0;
        if (count > 0) setEstadoGuardado('guardado');
      } else {
        nextAutoSyncAttemptRef.current = Date.now() + syncRetryDelayRef.current;
        syncRetryDelayRef.current = Math.min(syncRetryDelayRef.current * 2, 5 * 60_000);
      }
      syncInProgressRef.current = false;
      setEstadoConexion((prev) => ({
        ...prev,
        sincronizando: false,
        ultimoSync: new Date().toLocaleTimeString(),
        elementosPendientes: queue.length,
      }));
    }
  };

  const beginQuestionnaire = () => {
    const sectionIndex = Math.min(Math.max(currentSectionIndex, 0), SECCIONES_CUESTIONARIO.length - 1);
    const nextStep = 'section';
    if (window.matchMedia('(min-width: 1024px)').matches) {
      const currentState = window.history.state;
      const state = currentState && typeof currentState === 'object' ? currentState : {};
      if (state.questionnaireFlow !== 'active') {
        window.history.pushState(
          {
            ...state,
            questionnaireFlow: 'active',
            questionnaireStep: nextStep,
            currentSectionIndex: sectionIndex,
          },
          '',
          window.location.href
        );
      }
    }

    setIsAccessLoading(true);
    accessLoadingTimeoutRef.current = window.setTimeout(() => {
      setCurrentSectionIndex(sectionIndex);
      setStep('section');
      setIsAccessLoading(false);
      accessLoadingTimeoutRef.current = null;
    }, 2000);
  };

  const pushQuestionnaireHistory = (nextStep: 'section' | 'archivos', sectionIndex = currentSectionIndex) => {
    if (!window.matchMedia('(min-width: 1024px)').matches) return;
    const currentState = window.history.state;
    const state = currentState && typeof currentState === 'object' ? currentState : {};
    window.history.pushState(
      {
        ...state,
        questionnaireFlow: 'active',
        questionnaireStep: nextStep,
        currentSectionIndex: sectionIndex,
      },
      '',
      window.location.href
    );
  };

  const persistSectionAnswers = async (sectionId: string) => {
    const sectionAnswers = Object.values(respuestas).filter((answer) => answer.seccionId === sectionId);
    const saveResults = await Promise.all(sectionAnswers.map(async (answer) => {
      const pendingSave = saveTimeoutRef.current[answer.preguntaId];
      if (pendingSave) clearTimeout(pendingSave);
      delete saveTimeoutRef.current[answer.preguntaId];
      return ApiService.saveRespuesta(answer);
    }));
    const queue = await getSyncQueue();
    setEstadoGuardado(queue.length > 0 || saveResults.some((result) => !result.synced) ? 'pendiente' : 'guardado');
    setEstadoConexion((previous) => ({ ...previous, elementosPendientes: queue.length }));
  };

  const handlePreviousSection = async () => {
    if (seccionActual) await persistSectionAnswers(seccionActual.id);
    if (currentSectionIndex === 0) {
      setStep('landing');
      void saveMetaFormulario({ step: 'landing', currentSectionIndex: 0, submittedSectionsByScope });
      return;
    }

    const previousIndex = currentSectionIndex - 1;
    pushQuestionnaireHistory('section', previousIndex);
    setCurrentSectionIndex(previousIndex);
    setStep('section');
    void saveMetaFormulario({ step: 'section', currentSectionIndex: previousIndex, submittedSectionsByScope });
  };

  const handleJumpToSection = async (idx: number) => {
    if (step === 'section' && seccionActual) await persistSectionAnswers(seccionActual.id);
    if (idx < SECCIONES_CUESTIONARIO.length) {
      pushQuestionnaireHistory('section', idx);
      setCurrentSectionIndex(idx);
      setStep('section');
      void saveMetaFormulario({ step: 'section', currentSectionIndex: idx, submittedSectionsByScope });
    } else {
      pushQuestionnaireHistory('archivos');
      setStep('archivos');
      void saveMetaFormulario({ step: 'archivos', submittedSectionsByScope });
    }
  };

  const handleSaveAndNext = async (sectionId: string, sectionComplete: boolean) => {
    if (!captureScope) {
      addToast('Selecciona la clave del programa y el año antes de continuar.', 'error');
      setCurrentSectionIndex(0);
      return;
    }

    await persistSectionAnswers(sectionId);
    const completedSections = submittedSectionsByScope[captureScope] ?? [];
    const updatedSections = sectionComplete
      ? [...new Set([...completedSections, sectionId])]
      : completedSections.filter((id) => id !== sectionId);
    const updatedSectionsByScope = { ...submittedSectionsByScope, [captureScope]: updatedSections };
    setSubmittedSectionsByScope(updatedSectionsByScope);
    const progressResult = await ApiService.saveSubmittedSections(updatedSections);
    if (progressResult.error) {
      addToast('El avance se guardó localmente; se reintentará la sincronización.', 'warning');
    }
    const nextIndex = currentSectionIndex + 1;

    if (nextIndex >= SECCIONES_CUESTIONARIO.length) {
      const firstIncompleteIndex = SECCIONES_CUESTIONARIO.findIndex((section) => !updatedSections.includes(section.id));
      if (firstIncompleteIndex >= 0) {
        pushQuestionnaireHistory('section', firstIncompleteIndex);
        setCurrentSectionIndex(firstIncompleteIndex);
        setStep('section');
        void saveMetaFormulario({
          step: 'section',
          currentSectionIndex: firstIncompleteIndex,
          submittedSectionsByScope: updatedSectionsByScope,
        });
        addToast('Completa las secciones pendientes antes de continuar a la documentación.', 'warning');
        return;
      }

      pushQuestionnaireHistory('archivos');
      setStep('archivos');
      void saveMetaFormulario({ step: 'archivos', submittedSectionsByScope: updatedSectionsByScope });
    } else {
      pushQuestionnaireHistory('section', nextIndex);
      setCurrentSectionIndex(nextIndex);
      setStep('section');
      void saveMetaFormulario({
        step: 'section',
        currentSectionIndex: nextIndex,
        submittedSectionsByScope: updatedSectionsByScope,
      });
    }

    addToast(
      sectionComplete
        ? 'Avance guardado. Puedes volver a editar cualquier sección.'
        : 'Avance guardado. Puedes regresar a completar esta sección después.',
      'success',
    );
  };

  // 8. Finalizar formulario
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await ApiService.finalizarFormulario({
        usuario,
        respuestas,
        archivos,
        submittedSections: submittedSectionsByScope[captureScope] ?? [],
      });

      setFolioGenerado(result.folio);
      setFechaFinalizacion(result.fecha);
      setIsConfirmationOpen(false);
      setStep('success');

      await saveMetaFormulario({
        finalizado: true,
        folio: result.folio,
        fechaFinalizacion: result.fecha,
      });

      addToast('Formulario enviado correctamente.', 'success');
    } catch (err) {
      addToast('No fue posible finalizar el registro. Intente nuevamente.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. Reiniciar captura
  const handleRestart = async () => {
    await handleFormSignOut();
  };

  // Progreso para las seis secciones y archivos.
  const totalPasos = SECCIONES_CUESTIONARIO.length + 1;
  let pasoActual = 0;
  if (step === 'landing') pasoActual = 0;
  else if (step === 'section') pasoActual = currentSectionIndex + 1;
  else if (step === 'archivos') pasoActual = SECCIONES_CUESTIONARIO.length + 1;
  else if (step === 'success') pasoActual = totalPasos;

  const porcentajeProgreso = Math.min(100, Math.round((pasoActual / totalPasos) * 100));

  const seccionActual = SECCIONES_CUESTIONARIO[currentSectionIndex];

  // Determinación de la imagen de fondo: Equipamiento médico para formulario / Personal de salud para instrucciones
  let currentBackground = ASSET_IMAGES.capturaInformacion;
  let bgMode: 'form' | 'instructions' = 'form';
  let bgAlt = 'Equipamiento Médico y Unidades de Salud - INEGI';

  if (step === 'landing') {
    currentBackground = ASSET_IMAGES.inicio;
    bgMode = 'instructions';
    bgAlt = 'Instrucciones de Captura y Personal de Salud - INEGI';
  } else if (step === 'section') {
    currentBackground = seccionActual?.imagenFondo || ASSET_IMAGES.equipoMedico;
    bgMode = 'form';
    bgAlt = `Formulario Sección ${currentSectionIndex + 1}: Equipamiento Médico y Unidades de Salud`;
  } else if (step === 'archivos') {
    currentBackground = ASSET_IMAGES.documentacionMedica;
    bgMode = 'form';
    bgAlt = 'Documentación y Archivos de Equipamiento en Salud';
  } else if (step === 'success') {
    currentBackground = ASSET_IMAGES.unidadSalud;
    bgMode = 'form';
    bgAlt = 'Unidad de Salud - Registro Concluido';
  }

  return (
    <div className="relative min-h-screen bg-[#020c0b] text-stone-100 flex flex-col font-sans selection:bg-[#A57F2C]/40 selection:text-white">
      {!introCompleted && <IntroVideo onComplete={() => setIntroCompleted(true)} />}

      {/* CAPA DE FONDO REAL: Con manejo de carga, error y capa oscura semitransparente */}
      <SectionBackground
        imageUrl={isAdminView ? ASSET_IMAGES.formulario : step === 'landing' ? currentBackground : ASSET_IMAGES.usuario}
        alt={isAdminView ? 'Fondo de validación de datos' : bgAlt}
        mode={isAdminView ? 'form' : bgMode}
        overlayOpacity={0.08}
      />

      {/* Header Institucional */}
      <Header
        estadoConexion={estadoConexion}
        estadoGuardado={estadoGuardado}
        seccionActualTitulo={step === 'section' ? seccionActual?.titulo : undefined}
        onManualSync={handleManualSync}
        usesSupabase={ApiService.usesSupabase()}
        onAdminAccess={formAccess ? undefined : () => setIsAdminView(true)}
        onFormSignOut={formAccess && !isAdminView ? handleFormSignOut : undefined}
        isLanding={step === 'landing' && !isAdminView}
        showInstructions={Boolean(formAccess) && !isAdminView && step === 'section'}
      />

      {/* Navegación por secciones y archivos */}
      {!isAdminView && formAccess && step !== 'landing' && step !== 'success' && (
        <ProgressBar
          seccionActualIndex={step === 'archivos' ? SECCIONES_CUESTIONARIO.length : currentSectionIndex}
          totalSecciones={totalPasos}
          nombreSeccionActual={step === 'archivos' ? 'Documentación / Archivos' : seccionActual.titulo}
          porcentaje={porcentajeProgreso}
          maxSeccionAlcanzada={totalPasos - 1}
          seccionesBloqueadas={[]}
          seccionesCompletadas={(
            submittedSectionsByScope[captureScope] ?? []
          ).map((sectionId) => SECCIONES_CUESTIONARIO.findIndex((section) => section.id === sectionId))}
          onSelectSeccion={handleJumpToSection}
        />
      )}

      {/* Contenido Principal con Card Transparente sobre Fondo Opacado */}
      <main className={`relative ${isAdminView ? 'z-[100]' : 'z-10'} flex-1 w-full max-w-7xl mx-auto`}>
        {isAdminView ? (
          <FrontValidationAccess onClose={() => setIsAdminView(false)} />
        ) : !formAccess ? (
          isAccessPromptOpen ? (
            <FormAccessGate
              onSelect={handleFormAccessSelect}
              onCancel={() => setIsAccessPromptOpen(false)}
            />
          ) : (
            <LandingView
              onStart={() => setIsAccessPromptOpen(true)}
              onDataAccess={() => setIsAdminView(true)}
            />
          )
        ) : isScopeLoading ? (
          <LoadingOverlay title="Preparando captura" message="Cargando el borrador de esta asignación" />
        ) : (
          <>
        {step === 'landing' && (
          <LandingView
            onStart={() => beginQuestionnaire()}
            onDataAccess={() => setIsAdminView(true)}
          />
        )}

        {step === 'section' && seccionActual && (
          <FormSectionView
            key={seccionActual.id}
            seccion={seccionActual}
            respuestas={respuestas}
            clavePrograma={String(respuestas['clave_programa']?.valor ?? '')}
            anioPrograma={String(respuestas['anio_captura']?.valor ?? '')}
            onClaveProgramaChange={handleClaveProgramaChange}
            onAnioProgramaChange={(valor) =>
              handleRespuestaChange('anio_captura', 'datos_generales', 'Año del programa', valor)
            }
            canResetProgramSelection={false}
            onResetProgramSelection={handleResetProgramSelection}
            onSaveAndNext={(sectionComplete) => handleSaveAndNext(seccionActual.id, sectionComplete)}
            onPreviousSection={handlePreviousSection}
            onPrefillAgreement={handlePrefillAgreement}
            onRespuestaChange={handleRespuestaChange}
          />
        )}

        {step === 'archivos' && (
          <FileUploadSection
            archivos={archivos}
            isOnline={estadoConexion.online && estadoConexion.apiDisponible}
            onUpload={handleFileUpload}
            onDelete={handleFileDelete}
            onSubmit={() => setIsConfirmationOpen(true)}
          />
        )}


        {step === 'success' && (
          <SuccessView
            folio={folioGenerado}
            fechaEnvio={fechaFinalizacion}
            usuario={usuario}
            respuestas={respuestas}
            archivos={archivos}
            onRestart={handleRestart}
          />
        )}
          </>
        )}
      </main>

      {/* Modal de Confirmación Final */}
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        isSubmitting={isSubmitting}
        onCancel={() => setIsConfirmationOpen(false)}
        onConfirm={handleConfirmSubmit}
      />

      {/* Notificaciones Toast flotantes */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {isAccessLoading && (
        <LoadingOverlay title="Iniciando formulario" message="Preparando formulario" />
      )}
    </div>
  );
}
