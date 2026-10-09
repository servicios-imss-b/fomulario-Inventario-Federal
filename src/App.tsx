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
} from './services/indexedDb';

import { SectionBackground } from './components/SectionBackground';
import { ASSET_IMAGES } from './assets/images';
import { FrontValidationAccess } from './components/FrontValidationAccess';
import preguntasPrellenadasData from './data/preguntasPrellenadas.json';

export type AppStep = 'landing' | 'section' | 'archivos' | 'success';

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
      prefillEdited: false,
      fechaActualizacion: new Date().toISOString(),
      estado: 'guardado',
    };
  });

  return next;
};

export default function App() {
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

  const [folioGenerado, setFolioGenerado] = useState<string>('');
  const [fechaFinalizacion, setFechaFinalizacion] = useState<string>('');

  const saveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const accessLoadingTimeoutRef = useRef<number | null>(null);
  const claveProgramaActual = String(respuestas['clave_programa']?.valor ?? '').trim();
  const anioProgramaActual = String(respuestas['anio_captura']?.valor ?? '').trim();
  const captureScope = getCaptureScope(claveProgramaActual, anioProgramaActual);
  const submittedSections = captureScope ? submittedSectionsByScope[captureScope] ?? [] : [];
  const allSectionsSubmitted = submittedSections.length === SECCIONES_CUESTIONARIO.length;

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

  // 1. Cargar datos locales desde IndexedDB al inicio
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const [savedUser, savedResp, savedArch, meta, pendingQueue] = await Promise.all([
          getDatosUsuarioLocal(),
          getAllRespuestasLocal(),
          getArchivosLocal(),
          getMetaFormulario(),
          getSyncQueue(),
        ]);

        if (savedUser) {
          setUsuario(savedUser);
        }

        if (savedResp && Object.keys(savedResp).length > 0) {
          const respuestasGuardadas = { ...savedResp };
          if (respuestasGuardadas['10.1'] && !respuestasGuardadas['11']) {
            respuestasGuardadas['11'] = {
              ...respuestasGuardadas['10.1'],
              preguntaId: '11',
              pregunta: '11. Durante año reportado, ¿qué otras dependencias participaron como responsables en la operación del programa?',
            };
          }
          delete respuestasGuardadas['10.1'];
          setClaveProgramaBloqueada(Boolean(respuestasGuardadas['clave_programa']?.valor));
          const reconciledAnswers = reconcilePrefilledAnswers(
            respuestasGuardadas,
            String(respuestasGuardadas['clave_programa']?.valor ?? '').trim(),
            String(respuestasGuardadas['anio_captura']?.valor ?? '').trim()
          );
          setRespuestas(reconciledAnswers);
          Object.entries(reconciledAnswers).forEach(([questionId, answer]) => {
            if (JSON.stringify(answer) !== JSON.stringify(respuestasGuardadas[questionId])) {
              void ApiService.saveRespuesta(answer);
            }
          });

          // Sincronizar datos de capturista con las preguntas 1 a 5 si existen
          if (savedResp['1']?.valor) setUsuario((u) => ({ ...u, nombre: savedResp['1'].valor }));
          if (savedResp['2']?.valor) setUsuario((u) => ({ ...u, puesto: savedResp['2'].valor }));
          if (savedResp['3']?.valor) setUsuario((u) => ({ ...u, correo: savedResp['3'].valor }));
          if (savedResp['4']?.valor) setUsuario((u) => ({ ...u, telefono: savedResp['4'].valor }));
          if (savedResp['5']?.valor) setUsuario((u) => ({ ...u, fechaCaptura: savedResp['5'].valor }));
        }

        if (savedArch && savedArch.length > 0) {
          setArchivos(savedArch);
        }

        if (meta) {
          if (meta.submittedSectionsByScope) setSubmittedSectionsByScope(meta.submittedSectionsByScope);
          if (meta.folio) setFolioGenerado(meta.folio);
          if (meta.fechaFinalizacion) setFechaFinalizacion(meta.fechaFinalizacion);
        }

        setEstadoConexion((prev) => ({
          ...prev,
          elementosPendientes: pendingQueue.length,
        }));
      } catch (err) {
        console.warn('Error al cargar datos desde IndexedDB', err);
      }
    };

    loadStoredData();
  }, []);

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
    if (isOnline && queue.length > 0 && !estadoConexion.sincronizando) {
      setEstadoConexion((prev) => ({ ...prev, sincronizando: true }));
      try {
        const count = await ApiService.syncPendingQueue();
        if (count > 0) {
          addToast(`Sincronización completada (${count} elementos)`, 'success');
        }
      } catch (e) {
        console.warn('Error durante auto-sync', e);
      } finally {
        const remainingQueue = await getSyncQueue();
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
      addToast('Conexión reestablecida. Sincronizando datos...', 'info');
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
    fuente?: string
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
        prefillEdited: previousAnswer.prefillEdited || previousAnswer.prefillDisagreed,
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
    setClaveProgramaBloqueada(Boolean(clave));
    handleRespuestaChange('clave_programa', 'datos_generales', 'Clave del programa', clave);
  };

  const handlePrefillAgreement = (questionId: string, disagreed: boolean) => {
    const existing = respuestas[questionId];
    if (!existing?.prellenada) return;
    const updated: RespuestaItem = {
      ...existing,
      prefillDisagreed: disagreed,
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
      addToast('Archivo cargado correctamente.', 'success');
    } else {
      addToast('Archivo conservado localmente en IndexedDB.', 'warning');
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
    setEstadoConexion((prev) => ({ ...prev, sincronizando: true }));
    try {
      const count = await ApiService.syncPendingQueue();
      addToast(`Sincronización manual: ${count} elementos procesados.`, 'success');
    } catch {
      addToast('No fue posible sincronizar en este momento.', 'error');
    } finally {
      const queue = await getSyncQueue();
      setEstadoConexion((prev) => ({
        ...prev,
        sincronizando: false,
        ultimoSync: new Date().toLocaleTimeString(),
        elementosPendientes: queue.length,
      }));
    }
  };

  const beginQuestionnaire = (resume = false) => {
    const firstOpenIndex = SECCIONES_CUESTIONARIO.findIndex((section) => !submittedSections.includes(section.id));
    const canResumeCurrent = resume && currentSectionIndex >= 0 &&
      !submittedSections.includes(SECCIONES_CUESTIONARIO[currentSectionIndex]?.id);
    const sectionIndex = canResumeCurrent ? currentSectionIndex : firstOpenIndex;
    const nextStep = sectionIndex < 0 ? 'archivos' : 'section';
    if (window.matchMedia('(min-width: 1024px)').matches) {
      const currentState = window.history.state;
      const state = currentState && typeof currentState === 'object' ? currentState : {};
      if (state.questionnaireFlow !== 'active') {
        window.history.pushState(
          {
            ...state,
            questionnaireFlow: 'active',
            questionnaireStep: nextStep,
            currentSectionIndex: Math.max(sectionIndex, 0),
          },
          '',
          window.location.href
        );
      }
    }

    setIsAccessLoading(true);
    accessLoadingTimeoutRef.current = window.setTimeout(() => {
      if (sectionIndex < 0) {
        setStep('archivos');
      } else {
        setCurrentSectionIndex(sectionIndex);
        setStep('section');
      }
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

  const handleJumpToSection = (idx: number) => {
    if (idx < SECCIONES_CUESTIONARIO.length) {
      if (submittedSections.includes(SECCIONES_CUESTIONARIO[idx].id)) return;
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

  const handleSubmitSection = async (sectionId: string) => {
    if (!captureScope) {
      addToast('Selecciona la clave del programa y el año antes de enviar esta sección.', 'error');
      setCurrentSectionIndex(0);
      return;
    }

    const updatedSections = [...new Set([...(submittedSectionsByScope[captureScope] ?? []), sectionId])];
    const updatedByScope = { ...submittedSectionsByScope, [captureScope]: updatedSections };
    const nextOpenIndex = SECCIONES_CUESTIONARIO.findIndex((section) => !updatedSections.includes(section.id));

    const sectionAnswers = Object.values(respuestas).filter((answer) => answer.seccionId === sectionId);
    for (const answer of sectionAnswers) {
      const pendingSave = saveTimeoutRef.current[answer.preguntaId];
      if (pendingSave) clearTimeout(pendingSave);
      await saveRespuestaLocal({ ...answer, estado: 'guardado' });
      delete saveTimeoutRef.current[answer.preguntaId];
    }

    setSubmittedSectionsByScope(updatedByScope);

    if (nextOpenIndex < 0) {
      pushQuestionnaireHistory('archivos');
      setStep('archivos');
      void saveMetaFormulario({ step: 'archivos', submittedSectionsByScope: updatedByScope });
    } else {
      pushQuestionnaireHistory('section', nextOpenIndex);
      setCurrentSectionIndex(nextOpenIndex);
      setStep('section');
      void saveMetaFormulario({
        step: 'section',
        currentSectionIndex: nextOpenIndex,
        submittedSectionsByScope: updatedByScope,
      });
    }

    addToast('Sección enviada y bloqueada para esta clave y año.', 'success');
  };

  // 8. Finalizar formulario
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await ApiService.finalizarFormulario({
        usuario,
        respuestas,
        archivos,
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
    if (window.confirm('¿Está seguro de iniciar una nueva captura? Se limpiará la memoria local para un nuevo registro.')) {
      await clearAllLocalData();
      setRespuestas({});
      setSubmittedSectionsByScope({});
      setClaveProgramaBloqueada(false);
      setArchivos([]);
      setCurrentSectionIndex(0);
      setFolioGenerado('');
      setStep('landing');
    }
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
        onAdminAccess={() => setIsAdminView(true)}
        isLanding={step === 'landing' && !isAdminView}
      />

      {/* Navegación por secciones y archivos */}
      {!isAdminView && step !== 'landing' && step !== 'success' && (
        <ProgressBar
          seccionActualIndex={step === 'archivos' ? SECCIONES_CUESTIONARIO.length : currentSectionIndex}
          totalSecciones={totalPasos}
          nombreSeccionActual={step === 'archivos' ? 'Documentación / Archivos' : seccionActual.titulo}
          porcentaje={porcentajeProgreso}
          maxSeccionAlcanzada={totalPasos - 1}
          seccionesBloqueadas={[
            ...submittedSections.map((sectionId) => SECCIONES_CUESTIONARIO.findIndex((section) => section.id === sectionId)),
          ]}
          onSelectSeccion={handleJumpToSection}
        />
      )}

      {/* Contenido Principal con Card Transparente sobre Fondo Opacado */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto">
        {isAdminView ? (
          <FrontValidationAccess onClose={() => setIsAdminView(false)} />
        ) : (
          <>
        {step === 'landing' && (
          <LandingView
            onStart={() => beginQuestionnaire()}
          />
        )}

        {step === 'section' && seccionActual && (
          <FormSectionView
            key={seccionActual.id}
            seccion={seccionActual}
            respuestas={respuestas}
            clavePrograma={String(respuestas['clave_programa']?.valor ?? '')}
            anioPrograma={String(respuestas['anio_captura']?.valor ?? '')}
            claveBloqueada={claveProgramaBloqueada}
            isSubmitted={submittedSections.includes(seccionActual.id)}
            onToggleClaveBloqueada={() => setClaveProgramaBloqueada((bloqueada) => !bloqueada)}
            onClaveProgramaChange={handleClaveProgramaChange}
            onAnioProgramaChange={(valor) =>
              handleRespuestaChange('anio_captura', 'datos_generales', 'Año del programa', valor)
            }
            onPrefillAgreement={handlePrefillAgreement}
            onRespuestaChange={handleRespuestaChange}
            onSubmitSection={() => handleSubmitSection(seccionActual.id)}
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
