const serviciosAtencionPrimaria = 'Servicios de Atención Primaria a la Salud otorgados a la población que habita en localidades menores a 2500 personas, aisladas sin acceso físico a servicios de salud . (Definición de la OMS: asistencia sanitaria esencial accesible a todos los individuos y familias de la comunidad a través de medios aceptables para ellos, con su plena participación y a un costo asequible para la comunidad y el país. Esta asistencia enmarca acciones de salud pública, sean de diagnóstico, prevención, curación y control de enfermedades, que deben realizarse desde un nivel primario y local en beneficio de la comunidad. Además, de ser el nivel básico e integrante de cualquier sistema de salud).';

const componentesE001 = [
  'Servicios de promoción de la salud y prevención de enfermedades otorgados.',
  'Servicios de atención médica otorgados',
  'Servicios comunitarios para la mejora de la salud otorgados',
];

export const COMPONENTES_MIR: Record<string, Record<string, string[]>> = {
  '2024': {
    E001: componentesE001,
    S200: [serviciosAtencionPrimaria],
    S313: [serviciosAtencionPrimaria],
    U013: [serviciosAtencionPrimaria],
    E003: [],
    E004: [],
    E006: [],
  },
  '2025': {
    E001: componentesE001,
    S200: [serviciosAtencionPrimaria],
    S313: [serviciosAtencionPrimaria],
    U013: [serviciosAtencionPrimaria],
    E003: [
      'Atención hospitalaria especializada otorgada',
      'Consultas de alta especialidad otorgadas',
      'Atención ambulatoria especializada otorgada',
      'Suministro de medicamentos y otros insumos asociados a la salud',
    ],
    E004: [
      'Cursos de capacitación a profesionales de la salud y servidores públicos en el Centro y Hospitales Regionales de Alta Especialidad, impartidos',
      'Servicios de formación para la mejora de las competencias otorgados',
    ],
    E006: [
      'Investigadores acreedores al estimulo, otorgados',
      'Evidencia científica y tecnológica en temas prioritarios para la salud, desarrollada.',
    ],
  },
};

export function obtenerComponentesMir(clave: string, anio: string): string[] {
  return COMPONENTES_MIR[anio]?.[clave] ?? [];
}