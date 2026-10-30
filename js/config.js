/**
 * Constantes compartidas por todas las ventanas de la extensión.
 * Cambiar EXT_ID obliga a reinstalar la extensión y pierde los datos
 * guardados con el identificador anterior.
 */
export const EXT_ID = "com.mesadeheroes";

/** Se muestra en Ajustes para saber qué versión está cargada. */
export const VERSION = "2.7.0";

export const KEYS = {
  /** Biblioteca de PJs, compartida en los metadatos de la sala. */
  characters: `${EXT_ID}/characters`,
  /** Identificador del PJ vinculado, dentro de los metadatos del token. */
  token: `${EXT_ID}/token`,
  /** PJ activo de este jugador, en sus metadatos de jugador. */
  activo: `${EXT_ID}/activo`,
};

/**
 * Claves de la extensión «Stat Bubbles for D&D» (Seamus Finlayson).
 * Son las que dibujan la vida y la CA sobre el token, así que Mesa de Héroes
 * lee y escribe exactamente ahí para que ambos paneles muestren lo mismo.
 */
export const BURBUJAS = {
  clave: "com.owlbear-rodeo-bubbles-extension/metadata",
  hp: "health",
  hpMax: "max health",
  temp: "temporary health",
  ac: "armor class",
  oculto: "hide",
};

export const ROL_ETIQUETA = { GM: "Director", PLAYER: "Jugador" };

/** Clave de localStorage para recordar el PJ activo entre recargas. */
export const CLAVE_LOCAL_ACTIVO = "mesadeheroes:activo";
