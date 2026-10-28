/** Pestaña «Token»: vincula el PJ al token seleccionado y ajusta PG/CA. */

import OBR from "../../vendor/owlbear-sdk.js";
import { derivar, estadoVida, personajeNuevo, resumenClase } from "../model.js";
import {
  buscarPersonaje,
  cambiarVida,
  contextoToken,
  desvincularToken,
  fijarVida,
  guardarPersonaje,
  store,
  vincularToken,
} from "../store.js";
import { clamp, esc, toast } from "../util.js";
import { tirar } from "./acciones.js";
import { mensajeEstado } from "./pjs.js";

let raiz = null;
let version = 0;
let programado = null;

export function montarToken(contenedor) {
  raiz = contenedor;
  raiz.addEventListener("click", alHacerClic);
  raiz.addEventListener("change", alCambiar);

  try {
    OBR.scene.items.onChange(() => {
      if (!raiz || !raiz.closest(".panel.es-activa")) return;
      clearTimeout(programado);
      programado = setTimeout(() => pintarToken(), 180);
    });
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudo escuchar la escena", error);
  }}

export async function pintarToken() {
  if (!raiz) return;
  const miVersion = ++version;
  const contexto = await contextoToken();
  if (miVersion !== version || !raiz) return;
  raiz.innerHTML = vista(contexto);
}

function vista(contexto) {
  if (contexto.estado === "sin-escena") {
    return `<div class="vacio">
      <strong>Sin escena abierta</strong>
      <p>Abre un mapa para poder vincular tus PJs a los tokens.</p>
    </div>`;
  }

  if (contexto.estado !== "ok") {
    return `<div class="vacio">
      <strong>Selecciona un token</strong>
      <p>${esc(mensajeEstado(contexto))}: haz clic sobre la ficha de un personaje en el mapa y vuelve aquí.</p>
    </div>`;
  }

  const { item, vinculo } = contexto;
  const pj = vinculo ? buscarPersonaje(vinculo.personajeId) : null;
  const imagen = item.image?.url;

  const cabecera = `
    <div class="token-ficha">
      ${imagen ? `<img class="token-mini" src="${esc(imagen)}" alt="" onerror="this.style.display='none'" />` : `<div class="token-mini"></div>`}
      <div class="token-datos">
        <h3>${esc(item.name || "Token sin nombre")}</h3>
        <p>${pj ? `PJ: ${esc(pj.nombre)} · ${esc(resumenClase(pj)) || "sin clase"}` : vinculo ? "PJ no encontrado" : "Sin PJ vinculado"}</p>
      </div>
    </div>`;

  if (vinculo && !pj) {
    return `<div class="token-caja">
      ${cabecera}
      <p class="ayuda">El token recuerda a <strong>${esc(vinculo.nombre ?? "un PJ")}</strong> (${vinculo.hp ?? "?"}/${vinculo.hpMax ?? "?"} PG, CA ${vinculo.ac ?? "?"}), pero su ficha ya no existe.</p>
      <div class="btn-fila">
        <button class="btn primario" data-accion="recrear" data-id="${esc(item.id)}">Recrear ficha</button>
        <button class="btn" data-accion="desvincular" data-id="${esc(item.id)}">Desvincular</button>
      </div>
    </div>`;
  }

  if (!pj) {
    const opciones = store.personajes
      .map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)} (${p.hp}/${p.hpMax} PG · CA ${p.ac})</option>`)
      .join("");

    return `<div class="token-caja">
      ${cabecera}
      <div class="campo">
        <span class="etiqueta">Vincular a un PJ</span>
        <select id="token-pj">${opciones || `<option value="">— crea un PJ primero —</option>`}</select>
      </div>
      <div class="btn-fila">
        <button class="btn primario" data-accion="vincular" data-id="${esc(item.id)}" ${opciones ? "" : "disabled"}>🔗 Vincular</button>
        <button class="btn" data-accion="crear" data-id="${esc(item.id)}">Crear PJ desde el token</button>
      </div>
      <p class="ayuda">Al vincular, los PG y la CA se copian dentro del token y se mantienen sincronizados con la ficha.</p>
    </div>`;
  }

  const d = derivar(pj);
  const estado = estadoVida(pj);
  const pct = Math.round(clamp((pj.hp / Math.max(1, pj.hpMax)) * 100, 0, 100));

  return `<div class="token-caja">
    ${cabecera}

    <div class="pc-cuerpo">
      <div class="pv">
        <div class="pv-texto"><span>Puntos de golpe</span><b>${pj.hp} / ${pj.hpMax}</b></div>
        <div class="pv-barra" data-estado="${estado}"><i style="width:${pct}%"></i></div>
      </div>
      <div class="ca"><b>${pj.ac}</b><span>CA</span></div>
    </div>

    <div class="ajuste-pv">
      <button class="btn" data-accion="vida" data-id="${pj.id}" data-delta="-5">−5</button>
      <button class="btn" data-accion="vida" data-id="${pj.id}" data-delta="-1">−1</button>
      <input id="token-hp" type="number" min="0" max="${pj.hpMax}" value="${pj.hp}" aria-label="PG actuales" />
      <button class="btn" data-accion="vida" data-id="${pj.id}" data-delta="1">+1</button>
      <button class="btn" data-accion="vida" data-id="${pj.id}" data-delta="5">+5</button>
    </div>

    <div class="btn-fila">
      <button class="btn" data-accion="ataque" data-id="${pj.id}">⚔ Ataque ${d.ataque >= 0 ? "+" : ""}${d.ataque}</button>
      <button class="btn" data-accion="dano" data-id="${pj.id}">🩸 ${esc(pj.dano)}</button>
      <button class="btn sutil" data-accion="desvincular" data-id="${item.id}">Desvincular</button>
    </div>

    <p class="ayuda">También puedes ajustar los PG desde el menú del token, en el mapa.
    Los cambios se guardan en la ficha y en el token.</p>
  </div>`;
}

async function alHacerClic(evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;

  const accion = boton.dataset.accion;
  const id = boton.dataset.id;

  try {
    if (accion === "vida") {
      const delta = Number(boton.dataset.delta);
      const pj = await cambiarVida(id, delta);
      if (pj) {
        toast(`${pj.nombre}: ${pj.hp}/${pj.hpMax} PG${pj.hp <= 0 ? " · caído" : ""}`, pj.hp <= 0 ? "aviso" : "ok");
        pintarToken();
      }
      return;
    }

    if (accion === "vincular") {
      const seleccion = raiz.querySelector("#token-pj");
      const personajeId = seleccion?.value;
      if (!personajeId) {
        toast("Elige un PJ", "aviso");
        return;
      }
      const pj = await vincularToken(id, personajeId);
      toast(`«${pj.nombre}» vinculado al token`, "ok");
      pintarToken();
      return;
    }

    if (accion === "crear") {
      const contexto = await contextoToken();
      const nombre = contexto.estado === "ok" ? contexto.item.name || "Nuevo PJ" : "Nuevo PJ";
      const pj = await guardarPersonaje(personajeNuevo({ nombre, hp: 10, hpMax: 10, ac: 10 }));
      await vincularToken(id, pj.id);
      toast(`Ficha «${pj.nombre}» creada y vinculada`, "ok");
      pintarToken();
      return;
    }

    if (accion === "recrear") {
      const contexto = await contextoToken();
      const datos = contexto.estado === "ok" ? contexto.vinculo : null;
      const pj = await guardarPersonaje(
        personajeNuevo({
          nombre: datos?.nombre || contexto.item?.name || "PJ recuperado",
          hp: datos?.hp ?? 10,
          hpMax: datos?.hpMax ?? 10,
          ac: datos?.ac ?? 10,
        })
      );
      await vincularToken(id, pj.id);
      toast("Ficha recreada con los datos del token", "ok");
      pintarToken();
      return;
    }

    if (accion === "desvincular") {
      await desvincularToken(id);
      toast("Token desvinculado (los datos de la ficha se conservan)", "ok");
      pintarToken();
      return;
    }

    if (accion === "ataque") {
      const pj = buscarPersonaje(id);
      if (pj) await tirar("attack", pj);
      return;
    }

    if (accion === "dano") {
      const pj = buscarPersonaje(id);
      if (pj) await tirar("damage", pj);
    }
  } catch (error) {
    console.error(error);
    toast("No se pudo completar la acción (¿permisos?)", "error");
  }
}

async function alCambiar(evento) {
  if (evento.target.id !== "token-hp") return;
  const valor = Number(evento.target.value);
  const contexto = await contextoToken();
  if (contexto.estado !== "ok" || !contexto.vinculo) return;
  const pj = await fijarVida(contexto.vinculo.personajeId, valor);
  if (pj) {
    toast(`PG fijados: ${pj.hp}/${pj.hpMax}`, "ok");
    pintarToken();
  }
}
