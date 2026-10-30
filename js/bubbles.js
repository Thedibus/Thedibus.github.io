/**
 * Puente con la extensión «Stat Bubbles for D&D».
 *
 * Bubbles guarda los valores en los metadatos del token, no en items aparte:
 *   item.metadata["com.owlbear-rodeo-bubbles-extension/metadata"] = {
 *     "health": 18, "max health": 24, "temporary health": 0,
 *     "armor class": 15, "hide": false
 *   }
 *
 * Escribir ahí hace que su script de fondo vuelva a dibujar las burbujas,
 * y leer de ahí nos da los valores que el jugador acaba de tocar en el mapa.
 */

import OBR from "../vendor/owlbear-sdk.js?v=2.6.1";
import { BURBUJAS } from "./config.js?v=2.6.1";

const numero = (valor, respaldo = 0) =>
  typeof valor === "number" && Number.isFinite(valor) ? valor : respaldo;

/** Lee las estadísticas de Bubbles de un item. Devuelve null si no tiene. */
export function leerBurbujas(item) {
  const datos = item?.metadata?.[BURBUJAS.clave];
  if (!datos || typeof datos !== "object") return null;
  return {
    hp: numero(datos[BURBUJAS.hp], 0),
    hpMax: numero(datos[BURBUJAS.hpMax], 0),
    temp: numero(datos[BURBUJAS.temp], 0),
    ac: numero(datos[BURBUJAS.ac], 0),
    oculto: Boolean(datos[BURBUJAS.oculto]),
  };
}

/** Escribe PG, PG máximos y CA conservando el resto de claves de Bubbles. */
export async function escribirBurbujas(tokenId, { hp, hpMax, ac }) {
  const salud = Math.trunc(Math.min(9999, Math.max(-999, Number(hp) || 0)));
  const saludMax = Math.trunc(Math.min(9999, Math.max(0, Number(hpMax) || 0)));
  const armadura = Math.trunc(Math.min(99, Math.max(0, Number(ac) || 0)));

  await OBR.scene.items.updateItems(
    (item) => item.id === tokenId,
    (items) => {
      for (const item of items) {
        const previo = item.metadata[BURBUJAS.clave];
        const base = previo && typeof previo === "object" ? previo : {};
        item.metadata[BURBUJAS.clave] = {
          ...base,
          [BURBUJAS.hp]: salud,
          [BURBUJAS.hpMax]: saludMax,
          [BURBUJAS.ac]: armadura,
        };
      }
    }
  );
}
