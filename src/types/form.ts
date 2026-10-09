export type TipoPregunta =
  | 'texto_corto'
  | 'texto_largo'
  | 'numero'
  | 'select'
  | 'multiple'
  | 'radio'
  | 'fecha'
  | 'grilla_cuantificacion'
  | 'tabla_cuantificacion';

export interface PreguntaConfig {
  id: string; // ej: "1", "10", "10.1", "16.1", "20.1"
  seccionId: string;
  subseccion?: string;
  pregunta: string;
  tipo: TipoPregunta;
  opciones?: string[];
  opcionesPorValor?: {
    preguntaId: string;
    opciones: Record<string, string[]>;
  };
  requerida?: boolean;
  maxCaracteres?: number; // 300 para abiertas
  instruccion?: string;
  avisoAntes?: string;
  placeholder?: string;
  capturarFuente?: boolean;
  fuenteEtiqueta?: string;
  dependeDe?: {
    preguntaId: string;
    valor: string | string[];
  };
  sugerenciaUnidades?: string[];
}

export interface SeccionConfig {
  id: string;
  numero: number;
  titulo: string;
  subtitulo?: string;
  descripcion?: string;
  temaPresupuesto?: string;
  imagenFondo?: string;
  preguntas: PreguntaConfig[];
}

export interface DatosUsuario {
  nombre: string;
  puesto: string;
  correo: string;
  telefono: string;
  entidadDependencia: string;
  fechaCaptura: string;
}

export interface RespuestaItem {
  preguntaId: string;
  seccionId: string;
  pregunta: string;
  valor: any; // string | string[] | number | object
  fuente?: string;
  notaPrellenado?: string;
  prellenada?: boolean;
  prefillScope?: string;
  prefillDisagreed?: boolean;
  prefillEdited?: boolean;
  fechaActualizacion: string;
  estado: 'guardado' | 'pendiente_sync' | 'error';
}

export interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamanio: number; // en bytes
  tamanioLegible: string;
  extension: string;
  fechaCarga: string;
  estado: 'sincronizado' | 'pendiente_sync' | 'error';
  url?: string;
  dataBase64?: string;
}

export interface EstadoConexion {
  online: boolean;
  apiDisponible: boolean;
  sincronizando: boolean;
  ultimoSync: string | null;
  elementosPendientes: number;
}

export interface FormularioRegistro {
  id: string;
  folio?: string;
  usuario: DatosUsuario;
  respuestas: Record<string, RespuestaItem>;
  archivos: ArchivoAdjunto[];
  seccionActualIndex: number;
  finalizado: boolean;
  fechaInicio: string;
  fechaFinalizacion?: string;
}
