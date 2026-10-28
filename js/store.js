/**
 * Estado compartido de la extensión.
 *
 * - La biblioteca de PJs y el registro de tiradas viven en los metadatos de
 *   la SALA, así que se sincronizan entre el director y los jugadores.
 * - Cada token guarda una instantánea del PJ (PG, CA, nombre) en sus propios
 *   metadatos, para que el dato viaje "pegado" al token.
 */

import OBR from "../vendor/owlbear-sdk.js";
import { KEYS, MAX_TIRADAS, SETTINGS_DEFAULT } from "./config.js";
import { entradaRegistro } from "./dice.js";
import { normalizar } from "./model.js";
import { clamp, uid } from "./util.js";

export const store = {
  listo: false,
  escenaLista: false,
  rol: "PLAYER",
  personajes: [],
  tiradas: [],
  ajustes: { ...SETTINGS_DEFAULT },
  seleccion: [],
  oyentes: new Set(),

  /** Suscribirse a cualquier cambio de estado. Devuelve la función para desuscribirse. */
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

function aplicarMetadatos(metadatos) {
  const crudos = metadatos?.[KEYS.characters];
  store.personajes = Array.isArray(crudos) ? crudos.map(normalizar) : [];

  const tiradas = metadatos?.[KEYS.rolls];
  store.tiradas = Array.isArray(tiradas) ? tiradas : [];

  store.ajustes = { ...SETTINGS_DEFAULT, ...(metadatos?.[KEYS.settings] ?? {}) };
  store.avisar();
}

export async function iniciarTienda() {
  const [rol, metadatos] = await Promise.all([OBR.player.getRole(), OBR.room.getMetadata()]);
  store.rol = rol;
  aplicarMetadatos(metadatos);

  OBR.room.onMetadataChange(aplicarMetadatos);

  OBR.player.onChange((jugador) => {
    store.seleccion = jugador.selection ?? [];
    store.avisar();
  });

  store.seleccion = (await OBR.player.getSelection()) ?? [];
  store.escenaLista = await OBR.scene.isReady();
  OBR.scene.onReadyChange((listo) => {
    store.escenaLista = listo;
    store.avisar();
  });

  store.listo = true;
  store.avisar();
}

/* ------------------------------------------------------------- biblioteca */

export const buscarPersonaje = (id) => store.personajes.find((pj) => pj.id === id) ?? null;

async function escribirPersonajes(lista) {
  store.personajes = lista;
  store.avisar();
  await OBR.room.setMetadata({ [KEYS.characters]: lista });
}

/** Crea o actualiza un PJ y sincroniza los tokens vinculados. */
export async function guardarPersonaje(bruto) {
  const pj = normalizar(bruto);
  const existe = store.personajes.some((p) => p.id === pj.id);
  const lista = existe
    ? store.personajes.map((p) => (p.id === pj.id ? pj : p))
    : [...store.personajes, pj];
  await escribirPersonajes(lista);
  await sincronizarTokens(pj);
  return pj;
}

export async function borrarPersonaje(id) {
  await escribirPersonajes(store.personajes.filter((pj) => pj.id !== id));
  await desvincularPorPersonaje(id);
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

export async function cambiarVida(id, delta) {
  const pj = buscarPersonaje(id);
  if (!pj) return null;
  const hp = clamp(pj.hp + Number(delta || 0), 0, pj.hpMax);
  return guardarPersonaje({ ...pj, hp });
}

export async function fijarVida(id, valor) {
  const pj = buscarPersonaje(id);
  if (!pj) return null;
  return guardarPersonaje({ ...pj, hp: clamp(valor, 0, pj.hpMax) });
}

/* ---------------------------------------------------------------- tokens */

const instantanea = (pj) => ({
  personajeId: pj.id,
  nombre: pj.nombre,
  hp: pj.hp,
  hpMax: pj.hpMax,
  ac: pj.ac,
  actualizado: Date.now(),
});

export const leerVinculo = (item) => item?.metadata?.[KEYS.token] ?? null;

/** Copia el estado del PJ a todos los tokens vinculados a él. */
export async function sincronizarTokens(pj) {
  if (!store.escenaLista) return;
  try {
    const items = await OBR.scene.items.getItems(
      (item) => item.metadata?.[KEYS.token]?.personajeId === pj.id
    );
    if (items.length === 0) return;
    await OBR.scene.items.updateItems(items, (borradores) => {
      for (const borrador of borradores) {
        const datos = borrador.metadata[KEYS.token];
        if (!datos) continue;
        borrador.metadata[KEYS.token] = { ...datos, ...instantanea(pj) };
      }
    });
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudieron sincronizar los tokens", error);
  }
}

/** Guarda la instantánea del PJ dentro del token seleccionado. */
export async function vincularToken(tokenId, personajeId) {
  const pj = buscarPersonaje(personajeId);
  if (!pj) throw new Error("Ese PJ ya no existe");
  await OBR.scene.items.updateItems(
    (item) => item.id === tokenId,
    (items) => {
      for (const item of items) item.metadata[KEYS.token] = instantanea(pj);
    }
  );
  return pj;
}

export async function desvincularToken(tokenId) {
  await OBR.scene.items.updateItems(
    (item) => item.id === tokenId,
    (items) => {
      for (const item of items) delete item.metadata[KEYS.token];
    }
  );
}

async function desvincularPorPersonaje(personajeId) {
  if (!store.escenaLista) return;
  try {
    const items = await OBR.scene.items.getItems(
      (item) => item.metadata?.[KEYS.token]?.personajeId === personajeId
    );
    if (items.length === 0) return;
    await OBR.scene.items.updateItems(items, (borradores) => {
      for (const borrador of borradores) delete borrador.metadata[KEYS.token];
    });
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudieron desvincular los tokens", error);
  }
}

/** Estado del token seleccionado ahora mismo por este jugador. */
export async function contextoToken() {
  if (!store.escenaLista) return { estado: "sin-escena" };
  if (store.seleccion.length === 0) return { estado: "sin-seleccion" };
  if (store.seleccion.length > 1) return { estado: "multiple", ids: store.seleccion };
  let item = null;
  try {
    [item] = await OBR.scene.items.getItems([store.seleccion[0]]);
  } catch {
    return { estado: "sin-seleccion" };
  }
  if (!item) return { estado: "sin-seleccion" };
  return { estado: "ok", item, vinculo: leerVinculo(item) };
}

/* ----------------------------------------------------------------- registro */

export async function registrarTirada(resultado) {
  if (!store.ajustes.registro) return null;
  let autor = "";
  try {
    autor = await OBR.player.getName();
  } catch {
    autor = "";
  }
  const entrada = {
    id: uid("tirada"),
    momento: Date.now(),
    autor,
    ...entradaRegistro(resultado),
  };
  const lista = [entrada, ...store.tiradas].slice(0, MAX_TIRADAS);
  store.tiradas = lista;
  store.avisar();
  try {
    await OBR.room.setMetadata({ [KEYS.rolls]: lista });
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudo guardar el registro", error);
  }
  return entrada;
}

export async function limpiarRegistro() {
  store.tiradas = [];
  store.avisar();
  try {
    await OBR.room.setMetadata({ [KEYS.rolls]: [] });
  } catch (error) {
    console.warn(error);
  }
}

export function anunciar(resultado) {
  if (!store.ajustes.anunciar) return;
  OBR.notification.show(resultado.resumen, "DEFAULT").catch(() => {});
}

/* ----------------------------------------------------------------- ajustes */

export async function guardarAjustes(parcial) {
  store.ajustes = { ...store.ajustes, ...parcial };
  store.avisar();
  try {
    await OBR.room.setMetadata({ [KEYS.settings]: store.ajustes });
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudieron guardar los ajustes", error);
  }
}
