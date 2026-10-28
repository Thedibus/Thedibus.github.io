/** Pestaña «PJs»: biblioteca de personajes. */

import { derivar, estadoVida, resumenClase } from "../model.js";
import { borrarPersonaje, buscarPersonaje, contextoToken, store, vincularToken } from "../store.js";
import { clamp, confirmar, conSigno, esc, toast } from "../util.js";
import { tirar } from "./acciones.js";
import { abrirEditor } from "./editor.js";

let raiz = null;

export function montarPjs(contenedor) {
  raiz = contenedor;
  contenedor.addEventListener("click", alHacerClic);
}

export function pintarPjs() {
  if (!raiz) return;
  const personajes = store.personajes;
  raiz.innerHTML = personajes.length === 0 ? vacio() : personajes.map(tarjeta).join("");
}

function vacio() {
  return `
    <div class="vacio">
      <strong>Todavía no hay héroes</strong>
      <p>Crea una ficha con sus PG, CA y modificadores. Después podrás vincularla a cualquier token del mapa.</p>
      <button class="btn primario" data-accion="nuevo">+ Crear el primer PJ</button>
      <button class="btn sutil" data-accion="ejemplo">Cargar una mesa de ejemplo</button>
    </div>`;
}

function tarjeta(pj) {
  const d = derivar(pj);
  const estado = estadoVida(pj);
  const pct = Math.round(clamp((pj.hp / Math.max(1, pj.hpMax)) * 100, 0, 100));
  const caido = pj.hp <= 0 ? `<span class="insignia-mini">Caído</span>` : "";

  return `
  <article class="pc" data-id="${esc(pj.id)}">
    <header class="pc-cabecera">
      <h3 class="pc-nombre">${esc(pj.nombre)}</h3>
      <span class="pc-clase">${esc(resumenClase(pj)) || "sin clase"}</span>
      ${caido}
    </header>

    <div class="pc-cuerpo">
      <div class="pv">
        <div class="pv-texto"><span>PG</span><b>${pj.hp} / ${pj.hpMax}</b></div>
        <div class="pv-barra" data-estado="${estado}"><i style="width:${pct}%"></i></div>
      </div>
      <div class="ca"><b>${pj.ac}</b><span>CA</span></div>
    </div>

    <div class="pc-acciones">
      <button class="btn" data-accion="ataque" data-id="${esc(pj.id)}" title="Tirar ataque">⚔ ${conSigno(d.ataque)}</button>
      <button class="btn" data-accion="dano" data-id="${esc(pj.id)}" title="Tirar daño">🩸 ${esc(pj.dano)}</button>
      <button class="btn" data-accion="vincular" data-id="${esc(pj.id)}" title="Vincular al token seleccionado">🔗 Vincular</button>
      <button class="btn icono" data-accion="editar" data-id="${esc(pj.id)}" title="Editar ficha" aria-label="Editar ficha">✎</button>
      <button class="btn icono" data-accion="borrar" data-id="${esc(pj.id)}" title="Borrar PJ" aria-label="Borrar PJ">🗑</button>
    </div>
  </article>`;
}

async function alHacerClic(evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;

  const accion = boton.dataset.accion;
  if (accion === "nuevo") return abrirEditor(null);
  if (accion === "ejemplo") {
    document.dispatchEvent(new CustomEvent("mdh:ejemplo"));
    return;
  }

  const pj = buscarPersonaje(boton.dataset.id);
  if (!pj) return;

  switch (accion) {
    case "editar":
      return abrirEditor(pj);
    case "borrar":
      return borrar(pj);
    case "vincular":
      return vincular(pj);
    case "ataque":
      return tirar("attack", pj);
    case "dano":
      return tirar("damage", pj);
    default:
      return undefined;
  }
}

async function borrar(pj) {
  const seguro = await confirmar(
    `¿Borrar la ficha de «${pj.nombre}»? Los tokens vinculados quedarán sin PJ, pero sus datos se conservan.`,
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
    toast("No se pudo vincular el token (¿permisos?)", "error");
  }
}

export function mensajeEstado(contexto) {
  switch (contexto.estado) {
    case "sin-escena":
      return "Abre una escena para usar los tokens";
    case "multiple":
      return "Selecciona un solo token";
    case "sin-seleccion":
      return "Selecciona un token en el mapa";
    default:
      return "No hay ningún token seleccionado";
  }
}
