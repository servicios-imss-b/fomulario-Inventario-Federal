/**
 * Assets e imágenes institucionales para el Instrumento INEGI
 * Fondos temáticos de Equipamiento Médico, Unidades de Salud y Personal de Captura
 */

import fondoInicio from '../../imagenes/inicio.jpg';
import fondoUsuario from '../../imagenes/usuario.jpg';
import fondoFormulario from '../../imagenes/formulario.png';

export const ASSET_IMAGES = {
  inicio: fondoInicio,
  usuario: fondoUsuario,
  formulario: fondoFormulario,
  equipoMedico: fondoFormulario,
  unidadSalud: fondoFormulario,
  tecnologiaMedica: fondoFormulario,
  personalSalud: fondoUsuario,
  capturaInformacion: fondoInicio,
  documentacionMedica: fondoFormulario,
};

// Fallback en SVG Data URI para modo offline o error de red
export const SVG_FALLBACK_EQUIPO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" opacity="0.08"><path d="M50 20 L50 80 M20 50 L80 50" stroke="%23A57F2C" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="50" r="40" stroke="%23A57F2C" stroke-width="4" fill="none"/></svg>`;
