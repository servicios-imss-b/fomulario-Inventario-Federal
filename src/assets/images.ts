/**
 * Assets e imágenes institucionales para el Instrumento INEGI
 * Fondos temáticos de Equipamiento Médico, Unidades de Salud y Personal de Captura
 */

import fondoSalud from '../../imagenes/Que-son-los-Presupuestos-en-Salud.jpg';
import fondoCaptura from '../../imagenes/69fbbc3241cf5.webp';

export const ASSET_IMAGES = {
  // Formulario: fondo relacionado con equipo médico o unidades de salud
  equipoMedico: fondoSalud,
  unidadSalud: fondoSalud,
  tecnologiaMedica: fondoSalud,

  // Instrucciones y bienvenida: fondo relacionado con captura de información o personal de salud
  personalSalud: fondoCaptura,
  capturaInformacion: fondoCaptura,
  documentacionMedica: fondoSalud,
};

// Fallback en SVG Data URI para modo offline o error de red
export const SVG_FALLBACK_EQUIPO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" opacity="0.08"><path d="M50 20 L50 80 M20 50 L80 50" stroke="%23A57F2C" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="50" r="40" stroke="%23A57F2C" stroke-width="4" fill="none"/></svg>`;
