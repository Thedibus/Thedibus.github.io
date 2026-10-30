/**
 * Estado compartido de la extensión.
 *
 * - La biblioteca de PJs vive en los metadatos de la SALA.
 * - El vínculo token ↔ PJ vive en los metadatos del TOKEN.
 * - Los PG y la CA viven en los metadatos de «Stat Bubbles», dentro del token,
 *   para que las burbujas del mapa y esta ficha sean siempre el mismo dato.
 */

import OBR from "../vendor/owlbear-sdk.js?v=2.7.0";
import { escribirBurbujas, leerBurbujas } from "./bubbles.js?v=2.7.0";
import { CLAVE_LOCAL_ACTIVO, KEYS } from "./config.js?v=2.7.0";
import { normalizar } from "./model.js?v=2.7.0";
import { clamp, uid } from "./util.js?v=2.7.0";

export const store = {
  listo: false,
  escenaLista: false,
  rol: "PLAYER",
  personajes: [],
  activoId: null,
  /** personajeId → tokenId */
  vinculos: new Map(),
  /** tokenId → personajeId */
  porToken: new Map(),
  /** tokenId → { id, nombre, datos de Bubbles, capa, imagen } */
  tokens: new Map(),
  seleccion: [],
  oyentes: new Set(),

  alCambiar(oyente) {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  },

  avisar() {
    for (const oyente of [...this.oyentes]) {
      try {
        oyente(this);
      } catch (error) {
        console.error("[Mesa de Héroes] fallo en un oyente", error);
      }
    }
  },
};

/* --------------------------------------------------------------- arranque */

function aplicarPersonajes(metadatos) {
  const crudos = metadatos?.[KEYS.characters];
  store.personajes = Array.isArray(crudos) ? crudos.map(normalizar) : [];
}

function recordarActivo(id) {
  try {
    if (id) localStorage.setItem(CLAVE_LOCAL_ACTIVO, id);
    else localStorage.removeItem(CLAVE_LOCAL_ACTIVO);
  } catch {
    /* almacenamiento no disponible */
  }
}

function leerActivoLocal() {
  try {
    return localStorage.getItem(CLAVE_LOCAL_ACTIVO);
  } catch {
    return null;
  }
}

let programado = null;
let firmaEscena = "";

function programarItems(items) {
  if (programado) clearTimeout(programado);
  programado = setTimeout(() => {
    programado = null;
    refrescarItems(items);
  }, 100);
}

export async function iniciarTienda() {
  const [rol, metaSala, metaJugador, seleccion] = await Promise.all([
    OBR.player.getRole(),
    OBR.room.getMetadata(),
    OBR.player.getMetadata(),
    OBR.player.getSelection(),
  ]);

  store.rol = rol;
  aplicarPersonajes(metaSala);
  store.seleccion = seleccion ?? [];

  const guardado = metaJugador?.[KEYS.activo]?.personajeId ?? leerActivoLocal();
  if (guardado && store.personajes.some((pj) => pj.id === guardado)) store.activoId = guardado;

  OBR.room.onMetadataChange((metadatos) => {
    aplicarPersonajes(metadatos);
    asegurarActivo();
    store.avisar();
  });

  OBR.player.onChange((jugador) => {
    store.seleccion = jugador.selection ?? [];
    const activo = jugador.metadata?.[KEYS.activo]?.personajeId;
    if (activo && store.personajes.some((pj) => pj.id === activo)) store.activoId = activo;
    asegurarActivo();
    store.avisar();
  });

  store.escenaLista = await OBR.scene.isReady();
  OBR.scene.onReadyChange(async (listo) => {
    store.escenaLista = listo;
    if (!listo) {
      store.vinculos.clear();
      store.porToken.clear();
      store.tokens.clear();
      firmaEscena = "";
      store.avisar();
      return;
    }
    try {
      const items = await OBR.scene.items.getItems();
      await migrarTokens(items);
      refrescarItems(await OBR.scene.items.getItems());
    } catch (error) {
      console.warn("[Mesa de Héroes] no se pudo cargar la escena", error);
    }
  });

  OBR.scene.items.onChange(programarItems);

  if (store.escenaLista) {
    try {
      const items = await OBR.scene.items.getItems();
      await migrarTokens(items);
      refrescarItems(await OBR.scene.items.getItems());
    } catch (error) {
      console.warn("[Mesa de Héroes] no se pudo leer la escena inicial", error);
    }
  }

  asegurarActivo();
  store.listo = true;
  store.avisar();
}

/**
 * Versiones anteriores guardaban una copia de PG/CA dentro del vínculo.
 * Si un token tiene esa copia y todavía no tiene datos de Bubbles, los
 * sembramos para no perder la vida actual al actualizar la extensión.
 */
async function migrarTokens(items) {
  const tareas = [];
  for (const item of items) {
    const vinculo = item.metadata?.[KEYS.token];
    if (!vinculo?.personajeId || leerBurbujas(item)) continue;
    const hp = Number(vinculo.hp);
    const hpMax = Number(vinculo.hpMax);
    const ac = Number(vinculo.ac);
    if (!Number.isFinite(hp) || !Number.isFinite(hpMax) || hpMax <= 0) continue;
    tareas.push(escribirBurbujas(item.id, { hp, hpMax, ac: Number.isFinite(ac) ? ac : 10 }));
  }
  if (tareas.length > 0) await Promise.all(tareas);
}

/** Huella corta para comparar URLs largas (data URLs) sin cargar el string entero. */
function huella(valor) {
  const texto = String(valor ?? "");
  let hash = 0;
  for (let i = 0; i < texto.length; i++) hash = (hash * 31 + texto.charCodeAt(i)) | 0;
  return hash;
}

function refrescarItems(items) {
  const vinculos = new Map();
  const porToken = new Map();
  const tokens = new Map();

  for (const item of items) {
    const datos = leerBurbujas(item);
    const personajeId = item.metadata?.[KEYS.token]?.personajeId;
    const imagenUrl = item.type === "IMAGE" ? item.image?.url ?? null : null;
    if (datos || personajeId) {
      tokens.set(item.id, {
        id: item.id,
        nombre: item.name || "Token",
        capa: item.layer,
        esImagen: item.type === "IMAGE",
        imagenUrl,
        imagenHuella: huella(imagenUrl),
        datos,
      });
    }
    if (typeof personajeId === "string" && personajeId) {
      vinculos.set(personajeId, item.id);
      porToken.set(item.id, personajeId);
    }
  }

  const firma = JSON.stringify({
    tokens: [...tokens].map(([id, token]) => [id, token.nombre, token.capa, token.esImagen, token.imagenHuella, token.datos]),
    vinculos: [...vinculos].sort((a, b) => a[0].localeCompare(b[0])),
  });
  const activoAntes = store.activoId;

  store.vinculos = vinculos;
  store.porToken = porToken;
  store.tokens = tokens;
  asegurarActivo();

  // Arrastrar un token no cambia sus datos: evitamos repintar la interfaz.
  if (firma === firmaEscena && activoAntes === store.activoId) return;
  firmaEscena = firma;
  store.avisar();
}

/* ------------------------------------------------------------ PJ activo */

export function personajeActivo() {
  return store.personajes.find((pj) => pj.id === store.activoId) ?? null;
}

function asegurarActivo() {
  if (store.activoId && store.personajes.some((pj) => pj.id === store.activoId)) return;
  const porSeleccion = store.seleccion.map((tokenId) => store.porToken.get(tokenId)).find(Boolean);
  store.activoId = porSeleccion ?? store.personajes[0]?.id ?? null;
}

export async function setActivo(id) {
  if (!store.personajes.some((pj) => pj.id === id)) return;
  store.activoId = id;
  recordarActivo(id);
  store.avisar();
  try {
    await OBR.player.setMetadata({ [KEYS.activo]: { personajeId: id } });
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudo guardar el PJ activo", error);
  }
}

/* ------------------------------------------------------ estadísticas vivas */

/**
 * Devuelve los PG/CA que hay que enseñar para un PJ.
 * Si está vinculado a un token con Bubbles, mandan los valores del token.
 */
export function estadisticasDe(pj) {
  if (!pj) return null;
  const tokenId = store.vinculos.get(pj.id) ?? null;
  const token = tokenId ? store.tokens.get(tokenId) : null;
  const datos = token?.datos ?? null;

  return {
    hp: datos ? datos.hp : pj.hp,
    hpMax: datos ? datos.hpMax : pj.hpMax,
    temp: datos ? datos.temp : 0,
    ac: datos ? datos.ac : pj.ac,
    oculto: datos ? datos.oculto : false,
    tokenId,
    tokenNombre: token?.nombre ?? null,
    tokenImagen: token?.imagenUrl ?? null,
    puedeBurbujas: token ? token.esImagen && (token.capa === "CHARACTER" || token.capa === "MOUNT") : false,
    desdeToken: Boolean(datos),
  };
}

/** Escribe PG/CA en Bubbles (si hay token) o en la ficha (si no lo hay). */
export async function escribirEstadisticas(pjId, cambios = {}) {
  const pj = buscarPersonaje(pjId);
  if (!pj) return null;

  const est = estadisticasDe(pj);
  const hpMax = clamp(cambios.hpMax ?? est.hpMax, 1, 9999);
  const hp = clamp(cambios.hp ?? est.hp, 0, hpMax);
  const ac = clamp(cambios.ac ?? est.ac, 1, 99);

  if (est.tokenId) {
    await escribirBurbujas(est.tokenId, { hp, hpMax, ac });
    // Reflejo inmediato mientras llega el evento de la escena.
    const token = store.tokens.get(est.tokenId);
    if (token?.datos) {
      token.datos = { ...token.datos, hp, hpMax, ac };
      store.avisar();
    }
  } else {
    await guardarPersonaje({ ...pj, hp, hpMax, ac });
  }
  return { hp, hpMax, ac, tokenId: est.tokenId };
}

/* ------------------------------------------------------------- biblioteca */

export const buscarPersonaje = (id) => store.personajes.find((pj) => pj.id === id) ?? null;

async function escribirPersonajes(lista) {
  store.personajes = lista;
  asegurarActivo();
  store.avisar();
  await OBR.room.setMetadata({ [KEYS.characters]: lista });
}

export async function guardarPersonaje(bruto) {
  const pj = normalizar(bruto);
  const existe = store.personajes.some((p) => p.id === pj.id);
  const lista = existe ? store.personajes.map((p) => (p.id === pj.id ? pj : p)) : [...store.personajes, pj];
  await escribirPersonajes(lista);
  return pj;
}

export async function borrarPersonaje(id) {
  await escribirPersonajes(store.personajes.filter((pj) => pj.id !== id));
  await desvincularTokensDe(id);
}

/** Quita el vínculo de todos los tokens apuntados a un PJ (o a todos). */
async function desvincularTokensDe(personajeId, exceptoTokenId = null) {
  if (!store.escenaLista) return;
  try {
    const items = await OBR.scene.items.getItems(
      (item) =>
        item.metadata?.[KEYS.token]?.personajeId === personajeId &&
        item.id !== exceptoTokenId
    );
    if (items.length === 0) return;
    await OBR.scene.items.updateItems(items, (borradores) => {
      for (const borrador of borradores) delete borrador.metadata[KEYS.token];
    });
    await refrescarEscena();
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudieron desvincular los tokens", error);
  }
}

/** Limpia los vínculos antes de vaciar la biblioteca. */
export async function desvincularTodosLosTokens() {
  if (!store.escenaLista) return;
  try {
    const items = await OBR.scene.items.getItems((item) => Boolean(item.metadata?.[KEYS.token]));
    if (items.length === 0) return;
    await OBR.scene.items.updateItems(items, (borradores) => {
      for (const borrador of borradores) delete borrador.metadata[KEYS.token];
    });
    await refrescarEscena();
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudieron limpiar los vínculos", error);
  }
}

export async function reemplazarBiblioteca(lista) {
  const vistos = new Set();
  const limpia = [];
  for (const bruto of lista) {
    const pj = normalizar(bruto);
    if (vistos.has(pj.id)) pj.id = uid("pj");
    vistos.add(pj.id);
    limpia.push(pj);
  }
  await escribirPersonajes(limpia);
  return limpia;
}

/* ------------------------------------------------------------------ tokens */

export async function vincularToken(tokenId, personajeId) {
  const pj = buscarPersonaje(personajeId);
  if (!pj) throw new Error("Ese PJ ya no existe");

  // Un PJ se juega con un token: si estaba en otro, lo desvinculamos.
  await desvincularTokensDe(personajeId, tokenId);

  await OBR.scene.items.updateItems(
    (item) => item.id === tokenId,
    (items) => {
      for (const item of items) item.metadata[KEYS.token] = { personajeId };
    }
  );

  const [item] = await OBR.scene.items.getItems([tokenId]);
  const datos = item ? leerBurbujas(item) : null;
  if (pj && (!datos || datos.hpMax <= 0)) {
    await escribirBurbujas(tokenId, { hp: pj.hp, hpMax: pj.hpMax, ac: pj.ac });
  }

  if (!store.activoId) await setActivo(pj.id);
  await refrescarEscena();
  return pj;
}

export async function desvincularToken(tokenId) {
  await OBR.scene.items.updateItems(
    (item) => item.id === tokenId,
    (items) => {
      for (const item of items) delete item.metadata[KEYS.token];
    }
  );
  await refrescarEscena();
}

async function refrescarEscena() {
  try {
    refrescarItems(await OBR.scene.items.getItems());
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudo refrescar la escena", error);
  }
}

/** Token seleccionado ahora mismo por este jugador. */
export async function contextoToken() {
  if (!store.escenaLista) return { estado: "sin-escena" };
  if (store.seleccion.length === 0) return { estado: "sin-seleccion" };
  if (store.seleccion.length > 1) return { estado: "multiple" };
  const tokenId = store.seleccion[0];
  const token = store.tokens.get(tokenId) ?? null;
  try {
    const [item] = await OBR.scene.items.getItems([tokenId]);
    if (!item) return { estado: "sin-seleccion" };
    return {
      estado: "ok",
      item,
      token: token ?? {
        id: item.id,
        nombre: item.name || "Token",
        capa: item.layer,
        esImagen: item.type === "IMAGE",
        imagenUrl: item.type === "IMAGE" ? item.image?.url ?? null : null,
        datos: leerBurbujas(item),
      },
      personajeId: item.metadata?.[KEYS.token]?.personajeId ?? null,
    };
  } catch {
    return { estado: "sin-seleccion" };
  }
}
