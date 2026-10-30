/** Pestaña «PJs»: biblioteca de personajes de la mesa. */

import { resumenClase } from "../model.js";
import {
  borrarPersonaje,
  buscarPersonaje,
  contextoToken,
  estadisticasDe,
  setActivo,
  store,
  vincularToken,
} from "../store.js";
import { confirmar, esc, toast } from "../util.js";
import { mensajeEstado, bloqueVida } from "./comun.js";
import { abrirEditor } from "./editor.js";
import { abrirFichaCompleta } from "./ficha.js";
import { exportarPersonaje } from "../transferencia.js";

let raiz = null;

export function montarPjs(contenedor) {
  raiz = contenedor;
  contenedor.addEventListener("click", alHacerClic);
}

export function pintarPjs() {
  if (!raiz) return;

  if (store.personajes.length === 0) {
    raiz.innerHTML = `<div class="vacio">
      <strong>Todavía no hay héroes</strong>
      <p>Crea una ficha con sus PG, CA y características. Después podrás vincularla a cualquier token del mapa.</p>
      <button class="btn primario" data-accion="nuevo">+ Crear el primer PJ</button>
      <button class="btn sutil" data-accion="ejemplo">Cargar una mesa de ejemplo</button>
    </div>`;
    return;
  }

  raiz.innerHTML = store.personajes
    .map((pj) => {
      const est = estadisticasDe(pj);
      const oculto = Boolean(est.oculto && store.rol === "PLAYER");
      const activo = pj.id === store.activoId;

      return `<article class="pc ${activo ? "es-activo" : ""}" data-id="${esc(pj.id)}" title="Abrir ficha completa">
        <header class="pc-cabecera">
          <h3 class="pc-nombre">${esc(pj.nombre)}</h3>
          <span class="pc-clase">${esc(resumenClase(pj)) || "sin clase"}</span>
          ${activo ? `<span class="chip chip-ok chip-mini">Activo</span>` : ""}
        </header>

        ${bloqueVida(pj, est, { oculto })}

        <div class="pc-acciones">
          <button class="btn" data-accion="abrir" data-id="${esc(pj.id)}">Abrir</button>
          ${
            est.tokenId
              ? `<span class="chip chip-ok chip-mini" title="Token vinculado">🔗 ${esc(est.tokenNombre ?? "Token")}</span>`
              : `<button class="btn" data-accion="vincular" data-id="${esc(pj.id)}">Vincular</button>`
          }
          <button class="btn icono" data-accion="exportar" data-id="${esc(pj.id)}" title="Exportar este PJ" aria-label="Exportar este PJ">⬇</button>
          <button class="btn icono" data-accion="editar" data-id="${esc(pj.id)}" title="Editar ficha" aria-label="Editar ficha">✎</button>
          <button class="btn icono" data-accion="borrar" data-id="${esc(pj.id)}" title="Borrar PJ" aria-label="Borrar PJ">🗑</button>
        </div>
      </article>`;
    })
    .join("");
}

async function alHacerClic(evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) {
    const tarjeta = evento.target.closest(".pc");
    if (tarjeta) abrirFichaCompleta(tarjeta.dataset.id);
    return;
  }

  const accion = boton.dataset.accion;
  const id = boton.dataset.id;

  if (accion === "nuevo") return abrirEditor(null);
  if (accion === "ejemplo") {
    document.dispatchEvent(new CustomEvent("mdh:ejemplo"));
    return;
  }

  const pj = buscarPersonaje(id);
  if (!pj) return;

  switch (accion) {
    case "abrir":
      await setActivo(pj.id);
      document.dispatchEvent(new CustomEvent("mdh:abrir-ficha", { detail: { id: pj.id } }));
      return;
    case "completa":
      return abrirFichaCompleta(pj.id);
    case "exportar":
      return exportarPersonaje(pj.id);
    case "editar":
      return abrirEditor(pj);
    case "borrar":
      return borrar(pj);
    case "vincular":
      return vincular(pj);
    default:
      return undefined;
  }
}

async function borrar(pj) {
  const seguro = await confirmar(
    `¿Borrar la ficha de «${pj.nombre}»? Los tokens vinculados quedarán sin PJ, pero sus burbujas se conservan.`,
    { titulo: "Borrar personaje", boton: "Sí, borrar" }
  );
  if (!seguro) return;
  try {
    await borrarPersonaje(pj.id);
    toast("Ficha borrada", "ok");
  } catch (error) {
    console.error(error);
    toast("No se pudo borrar la ficha", "error");
  }
}

async function vincular(pj) {
  const contexto = await contextoToken();
  if (contexto.estado !== "ok") {
    toast(mensajeEstado(contexto), "aviso");
    return;
  }
  try {
    await vincularToken(contexto.item.id, pj.id);
    toast(`«${pj.nombre}» vinculado a «${contexto.item.name || "token"}»`, "ok");
  } catch (error) {
    console.error(error);
    toast("No se pudo vincular el token", "error");
  }
}
