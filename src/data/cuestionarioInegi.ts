import { SeccionConfig } from '../types/form';

export const CUESTIONARIO_TITULO =
  'Instrumento de captación del Inventario Federal de Programas y Acciones de Desarrollo Social 2024 y 2025';

export const CUESTIONARIO_SUBTITULO =
  'Captura institucional de programas y acciones de desarrollo social';

import { ASSET_IMAGES } from '../assets/images';

// Imágenes temáticas especializadas: Equipamiento Médico, Unidades de Salud y Personal de Captura
export const IMAGENES_SALUD_PRESUPUESTO = {
  general: ASSET_IMAGES.capturaInformacion, // Personal de salud e instrucciones de captura
  instrucciones: ASSET_IMAGES.personalSalud, // Personal médico y de captura institucional
  datosGenerales: ASSET_IMAGES.personalSalud, // Personal institucional de salud
  normatividad: ASSET_IMAGES.unidadSalud, // Unidad de salud e infraestructura médica
  poblacion: ASSET_IMAGES.tecnologiaMedica, // Tecnología y equipamiento médico diagnóstico
  priorizacion: ASSET_IMAGES.unidadSalud, // Unidades de salud y clínicas territoriales
  padron: ASSET_IMAGES.documentacionMedica, // Registros médicos y expedientes
  apoyos: ASSET_IMAGES.equipoMedico, // Equipamiento médico clínico y suministros
  archivos: ASSET_IMAGES.documentacionMedica, // Comprobación y archivos técnicos
};

export const SECCIONES_CUESTIONARIO: SeccionConfig[] = [
  // =========================================================================
  // 1) Datos generales
  //    - Datos del capturista
  //    - Datos del responsable del programa
  //    - Información de unidades y dependencias responsables
  // =========================================================================
  {
    id: 'datos_generales',
    numero: 1,
    titulo: '1) Datos generales',
    subtitulo: 'Datos del capturista, responsable del programa y dependencias responsables',
    descripcion: 'Capture los datos institucionales del capturista, titular responsable y entidades coordinadoras.',
    temaPresupuesto: 'Presupuesto de Operación y Administración del Programa de Salud',
    imagenFondo: IMAGENES_SALUD_PRESUPUESTO.datosGenerales,
    preguntas: [
      // Subsección: Datos del capturista
      {
        id: '1',
        seccionId: 'datos_generales',
        subseccion: 'Datos del capturista',
        pregunta: '1. Nombre de la persona que captura la información:',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'Nombre y apellidos completos',
      },
      {
        id: '2',
        seccionId: 'datos_generales',
        subseccion: 'Datos del capturista',
        pregunta: '2. Puesto:',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'Cargo o puesto institucional',
      },
      {
        id: '3',
        seccionId: 'datos_generales',
        subseccion: 'Datos del capturista',
        pregunta: '3. Correo institucional :',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'ejemplo@dependencia.gob.mx',
      },
      {
        id: '4',
        seccionId: 'datos_generales',
        subseccion: 'Datos del capturista',
        pregunta: '4. Teléfono de contacto :',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'Clave lada y número (10 dígitos)',
      },
      {
        id: '5',
        seccionId: 'datos_generales',
        subseccion: 'Datos del capturista',
        pregunta: '5. Selecione la fecha de captura:',
        tipo: 'fecha',
        requerida: true,
        instruccion: 'Selecciona una fecha',
      },

      // Subsección: Datos del responsable del programa
      {
        id: '6',
        seccionId: 'datos_generales',
        subseccion: 'Datos del responsable del programa',
        pregunta: '6. Capture el nombre de la persona responsable del programa durante año reportado.',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'Nombre completo de la persona responsable',
      },
      {
        id: '7',
        seccionId: 'datos_generales',
        subseccion: 'Datos del responsable del programa',
        pregunta: '7. Cargo de la persona responsable del programa durante año reportado.',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'Denominación oficial del cargo',
      },
      {
        id: '8',
        seccionId: 'datos_generales',
        subseccion: 'Datos del responsable del programa',
        pregunta: '8. Teléfono de contacto',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'Teléfono con extensión oficial',
      },
      {
        id: '9',
        seccionId: 'datos_generales',
        subseccion: 'Datos del responsable del programa',
        pregunta: '9. Correo electrónico de contacto',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'correo.responsable@dependencia.gob.mx',
      },

      // Subsección: Información de unidades y dependencias responsables
      {
        id: '10',
        seccionId: 'datos_generales',
        subseccion: 'Información de unidades y dependencias responsables',
        pregunta: '10. Durante año reportado, ¿qué otras dependencias participaron como responsables en la operación del programa?',
        tipo: 'texto_largo',
        maxCaracteres: 500,
        requerida: true,
      },
      {
        id: '11',
        seccionId: 'datos_generales',
        subseccion: 'Información de unidades y dependencias responsables',
        pregunta: '11. Durante año reportado, ¿qué otras dependencias participaron como responsables en la operación del programa?',
        tipo: 'texto_largo',
        maxCaracteres: 300,
        instruccion: 'Capture nombres completos. Separar con punto y coma ";" en caso de que sean más de una.',
        placeholder: 'Secretaría de Salud; IMSS-Bienestar; ISSSTE; ...',
      },
    ],
  },

  // =========================================================================
  // 2) Normatividad y objetivo del programa
  //    - Normatividad que regula al programa
  //    - Objetivo de la intervención
  // =========================================================================
  {
    id: 'normatividad_objetivo',
    numero: 2,
    titulo: '2) Normatividad y objetivo del programa',
    subtitulo: 'Normatividad que regula al programa y objetivo de la intervención',
    descripcion: 'Instrumentos jurídicos de soporte presupuestal y definición del objetivo primordial del programa.',
    temaPresupuesto: 'Reglas de Operación y Asignación Presupuestaria',
    imagenFondo: IMAGENES_SALUD_PRESUPUESTO.normatividad,
    preguntas: [
      // Subsección: Normatividad que regula al programa
      {
        id: '12',
        seccionId: 'normatividad_objetivo',
        subseccion: 'Normatividad que regula al programa',
        pregunta: '12. ¿Cuál es el nombre del instrumento normativo que reguló la operación del programa en año reportado?',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        instruccion: 'Capture el nombre completo, sin abreviaturas.',
        placeholder: 'Reglas de Operación del Programa de Atención Médica...',
      },
      {
        id: '13',
        seccionId: 'normatividad_objetivo',
        subseccion: 'Normatividad que regula al programa',
        pregunta: '13. Proporcione el enlace web oficial donde se pueda consultar o descargar el documento normativo mencionado en la pregunta anterior.',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        instruccion: 'Solo se pueden capturar sitios web oficiales completos. No abreviados. No bit.ly. Sin espacios. En caso de que no esté público este documento, colocar "No disponible"',
        placeholder: 'https://www.gob.mx/salud/... o "No disponible"',
      },

      // Subsección: Objetivo de la intervención
      {
        id: '14',
        seccionId: 'normatividad_objetivo',
        subseccion: 'Objetivo de la intervención',
        pregunta: '14. Proporcione el Objetivo General del Programa durante año reportado.',
        tipo: 'texto_largo',
        requerida: true,
        maxCaracteres: 500,
        capturarFuente: true,
        instruccion: 'Capture el objetivo con base en el instrumento normativo.',
        placeholder: 'Garantizar el acceso universal a servicios de salud y medicamentos gratuitos...',
      },
    ],
  },

  // =========================================================================
  // 3) Población potencial y objetivo
  //    - Definición, unidad de medida y cuantificación
  // =========================================================================
  {
    id: 'poblacion_potencial_objetivo',
    numero: 3,
    titulo: '3) Población potencial y objetivo',
    subtitulo: 'Definición, unidad de medida y cuantificación',
    descripcion: 'Población sin derechohabiencia o población que presenta la necesidad de salud cuantificada.',
    temaPresupuesto: 'Cálculo de Demanda y Asignación de Recursos Sanitarios',
    imagenFondo: IMAGENES_SALUD_PRESUPUESTO.poblacion,
    preguntas: [
      {
        id: '15',
        seccionId: 'poblacion_potencial_objetivo',
        subseccion: 'Definición, unidad de medida y cuantificación',
        pregunta: '15. ¿Cuál fue la definición de la Población Potencial del programa durante año reportado?',
        tipo: 'texto_largo',
        requerida: true,
        maxCaracteres: 500,
        capturarFuente: true,
        instruccion: 'Capture la definición completa. No síntesis.',
        placeholder: 'Población sin seguridad social que requiere intervenciones en salud...',
      },
      {
        id: '16',
        seccionId: 'poblacion_potencial_objetivo',
        subseccion: 'Definición, unidad de medida y cuantificación',
        pregunta: '16. Registre cada unidad de medida utilizada para cuantificar la población potencial y la cantidad correspondiente.',
        tipo: 'texto_corto',
        requerida: false,
        instruccion: 'Complete la unidad de medida general y su respectiva estimación cuantificada:',
      },
      {
        id: '16.1',
        seccionId: 'poblacion_potencial_objetivo',
        subseccion: 'Definición, unidad de medida y cuantificación',
        pregunta: '16.1. Columna de unidad de medida',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        instruccion: 'Capture la Unidad de medida en categoría general (personas, hogares, instituciones, localidades, etc.). Evite capturar características o requisitos específicos.',
        placeholder: 'Personas / Pacientes / Familias',
      },
      {
        id: '16.2',
        seccionId: 'poblacion_potencial_objetivo',
        subseccion: 'Definición, unidad de medida y cuantificación',
        pregunta: '16.2. Columna de cuantificación',
        tipo: 'numero',
        requerida: true,
        instruccion: 'Capture la cantidad estimada de población potencial. Debe coincidir con la unidad(es) de medida de la pregunta anterior.',
        placeholder: '0',
      },
      {
        id: '17',
        seccionId: 'poblacion_potencial_objetivo',
        subseccion: 'Definición, unidad de medida y cuantificación',
        pregunta: '17. ¿Cuál fue la definición de la Población Objetivo del programa durante año reportado?',
        tipo: 'texto_largo',
        requerida: true,
        maxCaracteres: 300,
        capturarFuente: true,
        instruccion: 'Capture la definición completa. No síntesis.',
        placeholder: 'Población que el programa tiene programado atender conforme al presupuesto anual...',
      },
      {
        id: '18',
        seccionId: 'poblacion_potencial_objetivo',
        subseccion: 'Definición, unidad de medida y cuantificación',
        pregunta: '18. Registre cada unidad de medida utilizada para cuantificar la población objetivo y la cantidad correspondiente.',
        tipo: 'texto_corto',
        requerida: false,
        instruccion: 'Complete la unidad de medida y cantidad para la población objetivo:',
      },
      {
        id: '18.2',
        seccionId: 'poblacion_potencial_objetivo',
        subseccion: 'Definición, unidad de medida y cuantificación',
        pregunta: '18.2. Columna unidad de medida',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        instruccion: 'Capture la Unidad de medida en categoría general (personas, hogares, instituciones, localidades, etc.). Evite características o requisitos específicos.',
        placeholder: 'Personas / Pacientes / Hogares',
      },
      {
        id: '18.1',
        seccionId: 'poblacion_potencial_objetivo',
        subseccion: 'Definición, unidad de medida y cuantificación',
        pregunta: '18.1. Columna de de cuantificación',
        tipo: 'numero',
        requerida: true,
        instruccion: 'Capture la cantidad estimada de unidades de la población objetivo en año reportado. Debe coincidir con la unidad de medida de la pregunta anterior.',
        placeholder: '0',
      },
    ],
  },

  // =========================================================================
  // 4) Criterios de priorización y ámbito de atención
  //    - Identifica si el programa cuenta con criterios de priorización y de qué tipo son
  //    - También se registra si el ámbito de su atención es urbana, rural o ambas
  // =========================================================================
  {
    id: 'criterios_priorizacion',
    numero: 4,
    titulo: '4) Criterios de priorización y ámbito de atención',
    subtitulo: 'Criterios de priorización territoriales y ámbito de atención (urbana, rural o ambas)',
    descripcion: 'Identificación de reglas de prelación y delimitación geográfica de la cobertura.',
    temaPresupuesto: 'Focalización Presupuestal en Zonas de Vulnerabilidad y Salud',
    imagenFondo: IMAGENES_SALUD_PRESUPUESTO.priorizacion,
    preguntas: [
      // Subsección: Identifica si el programa cuenta con criterios de priorización y de qué tipo son
      {
        id: '20',
        seccionId: 'criterios_priorizacion',
        subseccion: 'Criterios de priorización',
        pregunta: '20. ¿El programa contó con criterios de priorización para la entrega de los apoyos durante año reportado?',
        tipo: 'select',
        opciones: ['Seleccione una opción', 'Sí', 'No'],
        requerida: true,
        capturarFuente: true,
        instruccion: 'Una vez que seleccionó "Sí", debe seleccionar al menos uno de todos los criterios habilitados.',
      },
      {
        id: '20.1',
        seccionId: 'criterios_priorizacion',
        subseccion: 'Criterios de priorización',
        pregunta: '20.1. ¿Qué criterios territoriales se utilizaron para priorizar la entrega de apoyos?',
        tipo: 'multiple',
        requerida: true,
        opciones: [
          'Grado de marginación (localidad, AGEB o municipio)',
          'Grado de rezago social (localidad, AGEB o municipio)',
          'Zona de Atención Prioritaria (ZAP)',
          'Pueblos y comunidades indígenas',
          'Población afromexicana y afrodescendiente.',
          'Situación de riesgo, desastre o emergencia',
          'Otra(s)',
          'No aplica',
        ],
        dependeDe: {
          preguntaId: '20',
          valor: 'Sí',
        },
      },
      {
        id: '20.1.1',
        seccionId: 'criterios_priorizacion',
        subseccion: 'Criterios de priorización',
        pregunta: '20.1.1. Especifique los otros criterios territoriales:',
        tipo: 'texto_largo',
        requerida: true,
        maxCaracteres: 300,
        instruccion: 'Separar con punto y coma " ; " en caso de que sean más de uno.',
        placeholder: 'Criterio territorial adicional...',
        dependeDe: {
          preguntaId: '20.1',
          valor: 'Otra(s)',
        },
      },

      // Subsección: Ámbito de atención (urbana, rural o ambas)
      {
        id: '21',
        seccionId: 'criterios_priorizacion',
        subseccion: 'Ámbito de atención (urbana, rural o ambas)',
        pregunta: '21. ¿En qué ámbitos territoriales operó el programa durante año reportado?',
        tipo: 'select',
        opciones: ['Seleccione una opción', 'Rural', 'Urbano', 'Mixto (Rural y Urbano)'],
        requerida: true,
      },
    ],
  },

  // =========================================================================
  // 5) Padrón de beneficiarios y contraloría social
  //    - Tipo de padrón, información que reporta y frecuencia de actualización
  //    - Existencia de contraloría social
  // =========================================================================
  {
    id: 'padron_beneficiarios',
    numero: 5,
    titulo: '5) Padrón de beneficiarios y contraloría social',
    subtitulo: 'Tipo de padrón, información que reporta, actualización y contraloría social',
    descripcion: 'Padrón de derechohabientes o beneficiarios de salud, mecanismos de registro y comités ciudadanos.',
    temaPresupuesto: 'Transparencia, Rendición de Cuentas y Control Social del Gasto en Salud',
    imagenFondo: IMAGENES_SALUD_PRESUPUESTO.padron,
    preguntas: [
      // Subsección: Tipo de padrón, información que reporta y frecuencia de actualización
      {
        id: '22',
        seccionId: 'padron_beneficiarios',
        subseccion: 'Tipo de padrón, información que reporta y frecuencia de actualización',
        pregunta: '22. ¿En año reportado el programa contó con un padrón de beneficiarios?',
        tipo: 'select',
        opciones: ['Seleccione una opción', 'Sí', 'No'],
        requerida: true,
      },
      {
        id: '22.1',
        seccionId: 'padron_beneficiarios',
        subseccion: 'Tipo de padrón, información que reporta y frecuencia de actualización',
        pregunta: '22.1. Si el padrón se encuentra publicado, registre el enlace al sitio web oficial.',
        tipo: 'texto_corto',
        maxCaracteres: 300,
        instruccion: 'Solo se pueden capturar sitios web oficiales completos. No abreviados. No bit.ly. Sin espacios. En caso de no contar con él, capture "No disponible"',
        placeholder: 'https://... o "No disponible"',
        dependeDe: {
          preguntaId: '22',
          valor: 'Sí',
        },
      },
      {
        id: '22.2',
        seccionId: 'padron_beneficiarios',
        subseccion: 'Tipo de padrón, información que reporta y frecuencia de actualización',
        pregunta: '22.2. ¿Con qué frecuencia se actualizó el padrón durante año reportado?',
        tipo: 'select',
        opciones: ['Seleccione una opción', 'Anual', 'Semestral', 'Trimestral', 'Bimestral', 'Mensual', 'Otra'],
        dependeDe: {
          preguntaId: '22',
          valor: 'Sí',
        },
      },
      {
        id: '22.2.1',
        seccionId: 'padron_beneficiarios',
        subseccion: 'Tipo de padrón, información que reporta y frecuencia de actualización',
        pregunta: '22.2.1. Especifique la otra frecuencia de actualización:',
        tipo: 'texto_corto',
        maxCaracteres: 300,
        placeholder: 'Indique la frecuencia específica',
      },
      {
        id: '22.3',
        seccionId: 'padron_beneficiarios',
        subseccion: 'Tipo de padrón, información que reporta y frecuencia de actualización',
        pregunta: '22.3. ¿Mediante qué mecanismo se sistematizó la información del padrón?',
        tipo: 'select',
        opciones: [
          'Seleccione una opción',
          'Sistema informático institucional (con base de datos estructurada)',
          'Hoja de cálculo (Excel, CSV o similar)',
          'Documento de texto o procesador',
          'Registro físico / papel',
          'Otro',
        ],
        dependeDe: {
          preguntaId: '22',
          valor: 'Sí',
        },
      },
      {
        id: '22.3.1',
        seccionId: 'padron_beneficiarios',
        subseccion: 'Tipo de padrón, información que reporta y frecuencia de actualización',
        pregunta: '22.3.1. Especifique la otra forma de sistematización:',
        tipo: 'texto_corto',
        maxCaracteres: 300,
        placeholder: 'Especifique la forma de sistematización',
      },
      {
        id: '22.4',
        seccionId: 'padron_beneficiarios',
        subseccion: 'Tipo de padrón, información que reporta y frecuencia de actualización',
        pregunta: '22.4. Seleccione el tipo o los tipos de información que se registran en el padrón.',
        tipo: 'multiple',
        opciones: [
          'Características demográficas',
          'Estatus del beneficiario en el programa',
          'Características del apoyo otorgado',
          'Mecanismo de entrega del apoyo',
          'Condiciones asociadas al beneficio (corresponsabilidad)',
          'Información geoestadística (Nombre y clave de Entidad, Municipio, localidad, AGEB y/o manzana)',
          'Georreferenciación (altitud, latitud)',
          'Otro',
        ],
        dependeDe: {
          preguntaId: '22',
          valor: 'Sí',
        },
      },
      {
        id: '22.4.1',
        seccionId: 'padron_beneficiarios',
        subseccion: 'Tipo de padrón, información que reporta y frecuencia de actualización',
        pregunta: '22.4.1. Especifique los otros tipos de información:',
        tipo: 'texto_corto',
        maxCaracteres: 300,
        placeholder: 'Describa otros campos de información',
      },

      // Subsección: Existencia de contraloría social
      {
        id: '23',
        seccionId: 'padron_beneficiarios',
        subseccion: 'Existencia de contraloría social',
        pregunta: '23. Durante año reportado, ¿el programa contó con Contraloría Social?',
        tipo: 'select',
        opciones: ['Seleccione una opción', 'Sí', 'No'],
        requerida: true,
      },
    ],
  },

  // =========================================================================
  // 6) Apoyos otorgados y población atendida
  //    - Tipo de apoyo, monto, modalidad y frecuencia de entrega.
  //    - Definición y cuantificación de la población atendida; grupos de atención y nivel de 
  //      desagregación de la cuantificación (plantillas de población atendida).
  // =========================================================================
  {
    id: 'apoyos_poblacion_atendida',
    numero: 6,
    titulo: '6) Apoyos otorgados y población atendida',
    subtitulo: 'Tipo de apoyo, monto, modalidad, frecuencia, definición y plantillas de población atendida',
    descripcion: 'Para cada uno de los tipos de apoyo que registre el programa se llenará toda la siguiente batería de preguntas:',
    temaPresupuesto: 'Ejecución Presupuestaria, Medicamentos, Servicios Clínicos y Cobertura Efectiva',
    imagenFondo: IMAGENES_SALUD_PRESUPUESTO.apoyos,
    preguntas: [
      // Subsección: Tipo de apoyo, monto, modalidad y frecuencia de entrega
      {
        id: '24',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '24. Nombre o denominación del apoyo',
        tipo: 'texto_corto',
        requerida: true,
        maxCaracteres: 300,
        capturarFuente: true,
        placeholder: 'Denominación oficial del apoyo (ej. Medicamentos gratuitos, Consultas especializadas, Equipamiento)',
      },
      {
        id: '25',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '25. Describa las principales características de este apoyo: (nombre de apoyo)',
        tipo: 'texto_largo',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'Descripción puntual de los bienes, subsidios o servicios que integran el apoyo',
      },
      {
        id: '26',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '26. En términos generales, este tipo de apoyo es:',
        tipo: 'select',
        opciones: ['Seleccione una opción', 'Monetario', 'En especie', 'Servicios', 'Mixto'],
        requerida: true,
      },
      {
        id: '27',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '27. Seleccione una clasificación para este tipo de apoyo',
        tipo: 'select',
        opciones: [
          'Seleccione una opción',
          'Subsidio',
          'Transferencia directa',
          'Beca',
          'Capacitación',
          'Asistencia técnica',
          'Infraestructura',
          'Paquete alimentario',
          'Insumos productivos',
          'Otro',
        ],
        requerida: true,
      },
      {
        id: '27.1',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '27.1. Especifique la otra clasificación:',
        tipo: 'texto_corto',
        maxCaracteres: 300,
        placeholder: 'Indique la clasificación correspondiente',
      },
      {
        id: '28',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '28. ¿Cuál fue la modalidad de entrega del apoyo?',
        tipo: 'select',
        opciones: [
          'Seleccione una opción',
          'Directa al beneficiario',
          'A través de comités comunitarios',
          'Transferencia bancaria/tarjeta',
          'Mesa de atención',
          'Ventanilla institucional',
          'Otra',
        ],
        requerida: true,
      },
      {
        id: '28.1',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '28.1. Especifique la otra modalidad de entrega:',
        tipo: 'texto_corto',
        maxCaracteres: 300,
        placeholder: 'Indique la modalidad de entrega',
      },
      {
        id: '29',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '29. ¿Con qué frecuencia se entregó este apoyo?',
        tipo: 'select',
        opciones: [
          'Seleccione una opción',
          'Única exhibición',
          'Mensual',
          'Bimestral',
          'Trimestral',
          'Semestral',
          'Anual',
          'Por demanda / Eventual',
          'Otra',
        ],
        requerida: true,
      },
      {
        id: '29.1',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '29.1. Especifique la otra frecuencia de entrega:',
        tipo: 'texto_corto',
        maxCaracteres: 300,
        placeholder: 'Indique la frecuencia de entrega',
      },
      {
        id: '30',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '30. De acuerdo con la frecuencia seleccionada, ¿cuál fue el monto del apoyo otorgado?',
        tipo: 'numero',
        requerida: true,
        instruccion: 'Monto en pesos mexicanos (MXN). Consulta apoyo.',
        placeholder: '0.00',
      },
      {
        id: '31',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Tipo de apoyo, monto, modalidad y frecuencia de entrega',
        pregunta: '31. En caso de que aplique, ¿a qué componente de la MIR año reportado corresponde (nombre de apoyo)?',
        tipo: 'select',
        opciones: [
          'Seleccione una opción',
          'Componente 1',
          'Componente 2',
          'Componente 3',
          'Componente 4',
          'No aplica',
          'Otro',
        ],
        requerida: false,
      },

      // Subsección: Definición y cuantificación de la población atendida; grupos de atención y nivel de desagregación (plantillas)
      {
        id: '32',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Definición, cuantificación de la población atendida, grupos de atención y nivel de desagregación',
        pregunta: '32. Seleccione la unidad de medida utilizada por el programa para cuantificar a la población atendida de (nombre de apoyo) durante año reportado.',
        tipo: 'select',
        opciones: [
          'Seleccione una opción',
          'Personas',
          'Hogares',
          'Familias',
          'Localidades',
          'Instituciones',
          'Productores',
          'Escuelas',
          'Otra',
        ],
        requerida: true,
      },
      {
        id: '33',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Definición, cuantificación de la población atendida, grupos de atención y nivel de desagregación',
        pregunta: '33. Capture la definición de la Población Atendida que corresponda para (nombre de apoyo)',
        tipo: 'texto_largo',
        requerida: true,
        maxCaracteres: 300,
        placeholder: 'Población que efectivamente recibió los apoyos o atenciones médicas del programa en el periodo...',
      },
      {
        id: '34',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Definición, cuantificación de la población atendida, grupos de atención y nivel de desagregación',
        pregunta: '34. Para el tipo de apoyo (nombre de apoyo) ¿Cuáles de los siguientes grupos etarios fueron atendidos durante año reportado?',
        tipo: 'multiple',
        requerida: true,
        opciones: [
          'Primera Infancia (0 a 5 años)',
          'Niñas y Niños ( 6 a 11 años)',
          'Jóvenes (12 y 29 años)',
          'Personas adultas (30 a 64 años)',
          'Personas adultas mayores ( 65 años y más)',
          'No aplica',
        ],
      },
      {
        id: '35',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Definición, cuantificación de la población atendida, grupos de atención y nivel de desagregación',
        pregunta: '35. Para el tipo de apoyo (nombre de apoyo) ¿Cuáles de los siguientes grupos o características de pobreza y carencia fueron atendidos durante año reportado?',
        tipo: 'multiple',
        requerida: true,
        opciones: [
          'Lactantes',
          'Mujeres',
          'Personas con discapacidad',
          'Población en contexto de movilidad',
          'Población afromexicana o afrodescendiente',
          'Población de la diversidad sexual',
          'Personas que viven con VIH',
          'Personas que viven con adicciones',
          'Personas en situación de calle',
          'Personas periodistas',
          'Personas defensoras de derechos humanos',
          'Personas sindicalistas',
          'Personas privadas de la libertad',
          'Víctimas de delitos',
          'Minorías religiosas',
          'Pueblos y comunidades indígenas',
          'Pueblos y barrios originarios',
          'Población en situación de pobreza moderada',
          'Población en situación de pobreza extrema',
          'Población con carencia por acceso a los servicios de salud',
          'Población con carencia por acceso a la seguridad social',
          'Población con carencia por calidad y espacios de la vivienda',
          'Población con carencia por acceso a la alimentación nutritiva y de calidad',
          'Población en rezago educativo',
          'Población con carencia por acceso a los servicios básicos en la vivienda',
          'Zona de desastre natural o emergencia',
          'Zonas con grado de marginación alto o muy alto',
          'Zonas con grado de rezago social alto o muy alto',
          'Otro tipo de población',
          'No aplica',
        ],
      },
      {
        id: '35.1',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Definición, cuantificación de la población atendida, grupos de atención y nivel de desagregación',
        pregunta: '35.1. Capture la información de otro u otros grupos atendidos durante año reportado.',
        tipo: 'texto_largo',
        maxCaracteres: 300,
        placeholder: 'Especifique otros grupos poblacionales atendidos...',
      },
      {
        id: '36',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Definición, cuantificación de la población atendida, grupos de atención y nivel de desagregación',
        pregunta: '36. Para el apoyo (nombre de apoyo): Indique el nivel de desagregación geográfica más detallado con el que el programa cuantificó a su población atendida durante año reportado.',
        tipo: 'select',
        opciones: ['Seleccione una opción', 'Nacional', 'Estatal', 'Municipal', 'Localidad', 'AGEB', 'Manzana'],
        requerida: true,
      },
      {
        id: '37',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Definición, cuantificación de la población atendida, grupos de atención y nivel de desagregación',
        pregunta: '37. La cuantificación de la población atendida puede reportarse de forma:',
        tipo: 'radio',
        opciones: ['Agregada', 'Desagregada por sexo'],
        requerida: true,
      },
      {
        id: '37.1',
        seccionId: 'apoyos_poblacion_atendida',
        subseccion: 'Definición, cuantificación de la población atendida, grupos de atención y nivel de desagregación',
        pregunta: 'CAPTURA DE LA CUANTIFICACIÓN DE LA POBLACIÓN ATENDIDA YA SEA A NIVEL ESTATAL O MUNICIPAL',
        tipo: 'grilla_cuantificacion',
        requerida: true,
        instruccion: 'Ingrese los valores cuantificados conforme al nivel de desagregación y forma seleccionada:',
      },
    ],
  },
];
