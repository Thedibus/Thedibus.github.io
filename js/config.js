/**
 * Constantes compartidas por todas las ventanas de la extensión.
 * Cambiar EXT_ID obliga a reinstalar la extensión y pierde los datos
 * guardados con el identificador anterior.
 */
export const EXT_ID = "com.mesadeheroes";

export const KEYS = {
  /** Biblioteca de PJs, compartida en los metadatos de la sala. */
  characters: `${EXT_ID}/characters`,
  /** Registro de tiradas, compartido en los metadatos de la sala. */
  rolls: `${EXT_ID}/rolls`,
  /** Preferencias de la mesa. */
  settings: `${EXT_ID}/settings`,
  /** Datos del PJ guardados dentro del token seleccionado. */
  token: `${EXT_ID}/token`,
};

export const SETTINGS_DEFAULT = {
  /** Anunciar cada tirada a toda la mesa con una notificación. */
  anunciar: true,
  /** Rellenar el registro compartido. */
  registro: true,
};

export const MAX_TIRADAS = 40;

export const ROL_ETIQUETA = { GM: "Director", PLAYER: "Jugador" };
