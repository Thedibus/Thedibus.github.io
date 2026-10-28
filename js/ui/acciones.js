/** Acciones de tirada compartidas por el panel, las fichas y el menú del token. */

import { ejecutar } from "../dice.js";
import { anunciar, registrarTirada } from "../store.js";
import { toast } from "../util.js";

/**
 * Tira, guarda en el registro y anuncia. Devuelve el resultado o null.
 */
export async function tirar(tipo, pj, opciones = {}) {
  const resultado = ejecutar(tipo, pj, opciones);
  if (!resultado.ok) {
    toast(resultado.error, "aviso");
    return null;
  }
  await publicar(resultado);
  return resultado;
}

/**
 * Publica un resultado ya calculado (registro + notificación + evento).
 * @param {object} resultado
 * @param {"dados"|"ficha"|"token"|"externo"} origen  quién lanzó la tirada
 */
export async function publicar(resultado, origen = "externo") {
  await registrarTirada(resultado);
  anunciar(resultado);
  document.dispatchEvent(new CustomEvent("mdh:tirada", { detail: { resultado, origen } }));
}
