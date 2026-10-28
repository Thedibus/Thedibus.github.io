/** Tarjeta compacta que aparece en el menú contextual del token. */

import OBR from "../vendor/owlbear-sdk.js";
import { derivar, estadoVida, personajeNuevo, resumenClase } from "./model.js";
import {
  buscarPersonaje,
  cambiarVida,
  contextoToken,
  desvincularToken,
  guardarPersonaje,
  iniciarTienda,
  store,
  vincularToken,
} from "./store.js";
import { clamp, esc, toast } from "./util.js";
import { tirar } from "./ui/acciones.js";

let raiz = null;
let version = 0;

async function arrancar() {
  if (!OBR.isAvailable) return;

  try {
    await iniciarTienda();
  } catch (error) {
    console.error(error);
    const aviso = document.getElementById("aviso-entorno");
    if (aviso) {
      aviso.hidden = false;
      aviso.textContent = "No se pudo conectar con la sala.";
    }
    return;
  }

  raiz = document.getElementById("tarjeta");
  raiz.hidden = false;
  raiz.addEventListener("click", alHacerClic);
  OBR.scene.items.onChange(() => pintar());

  await pintar();
}

async function pintar() {
  if (!raiz) return;
  const miVersion = ++version;
  const contexto = await contextoToken();
  if (miVersion !== version || !raiz) return;
  raiz.innerHTML = vista(contexto);
}

function vista(contexto) {
  if (contexto.estado !== "ok") {
    return `<div class="vacio">
      <strong>Sin token seleccionado</strong>
      <p>Haz clic en un token del mapa y vuelve a abrir este panel.</p>
    </div>`;
  }

  const { item, vinculo } = contexto;
  const pj = vinculo ? buscarPersonaje(vinculo.personajeId) : null;
  const imagen = item.image?.url;

  const cabecera = `
    <div class="token-ficha">
      ${imagen ? `<img class="token-mini" src="${esc(imagen)}" alt="" onerror="this.style.display='none'" />` : `<div class="token-mini"></div>`}
      <div class="token-datos">
        <h3>${esc(pj?.nombre ?? item.name ?? "Token")}</h3>
        <p>${pj ? esc(resumenClase(pj)) || "sin clase" : vinculo ? "PJ no encontrado" : "Sin PJ vinculado"}</p>
      </div>
      ${pj ? `<div class="ca"><b>${pj.ac}</b><span>CA</span></div>` : ""}
    </div>`;

  if (pj) {
    const d = derivar(pj);
    const estado = estadoVida(pj);
    const pct = Math.round(clamp((pj.hp / Math.max(1, pj.hpMax)) * 100, 0, 100));

    return `${cabecera}
      <div class="pv">
        <div class="pv-texto"><span>PG</span><b>${pj.hp} / ${pj.hpMax}</b></div>
        <div class="pv-barra" data-estado="${estado}"><i style="width:${pct}%"></i></div>
      </div>

      <div class="ajuste-pv">
        <button class="btn" data-accion="vida" data-id="${pj.id}" data-delta="-5">−5</button>
        <button class="btn" data-accion="vida" data-id="${pj.id}" data-delta="-1">−1</button>
        <button class="btn" data-accion="vida" data-id="${pj.id}" data-delta="1">+1</button>
        <button class="btn" data-accion="vida" data-id="${pj.id}" data-delta="5">+5</button>
        <button class="btn" data-accion="abrir" title="Abrir la ficha completa">↗</button>
      </div>

      <div class="fila-doble">
        <button class="btn" data-accion="ataque" data-id="${pj.id}">⚔ Ataque ${d.ataque >= 0 ? "+" : ""}${d.ataque}</button>
        <button class="btn" data-accion="dano" data-id="${pj.id}">🩸 ${esc(pj.dano)}</button>
      </div>`;
  }

  const opciones = store.personajes
    .map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)}</option>`)
    .join("");

  return `${cabecera}
    <div class="campo">
      <span class="etiqueta">Vincular a</span>
      <select id="tarjeta-pj">${opciones || `<option value="">— sin PJs —</option>`}</select>
    </div>
    <div class="fila-doble">
      <button class="btn primario" data-accion="vincular" data-id="${item.id}" ${opciones ? "" : "disabled"}>🔗 Vincular</button>
      <button class="btn" data-accion="crear" data-id="${item.id}">Crear PJ</button>
    </div>
    ${vinculo ? `<button class="btn sutil" data-accion="desvincular" data-id="${item.id}">Desvincular</button>` : ""}`;
}

async function alHacerClic(evento) {
  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;
  const { accion, id } = boton.dataset;

  try {
    if (accion === "vida") {
      const pj = await cambiarVida(id, Number(boton.dataset.delta));
      if (pj) toast(`${pj.nombre}: ${pj.hp}/${pj.hpMax} PG`, pj.hp <= 0 ? "aviso" : "ok", 1400);
      return;
    }

    if (accion === "ataque" || accion === "dano") {
      const pj = buscarPersonaje(id);
      if (pj) await tirar(accion === "ataque" ? "attack" : "damage", pj);
      return;
    }

    if (accion === "abrir") {
      await OBR.action.open();
      return;
    }

    if (accion === "vincular") {
      const seleccion = raiz.querySelector("#tarjeta-pj");
      if (!seleccion?.value) {
        toast("Elige un PJ", "aviso");
        return;
      }
      const pj = await vincularToken(id, seleccion.value);
      toast(`«${pj.nombre}» vinculado`, "ok", 1400);
      return;
    }

    if (accion === "crear") {
      const contexto = await contextoToken();
      const nombre = contexto.estado === "ok" ? contexto.item.name || "Nuevo PJ" : "Nuevo PJ";
      const pj = await guardarPersonaje(personajeNuevo({ nombre }));
      await vincularToken(id, pj.id);
      toast(`Ficha «${pj.nombre}» creada`, "ok", 1400);
      return;
    }

    if (accion === "desvincular") {
      await desvincularToken(id);
      toast("Token desvinculado", "ok", 1400);
    }
  } catch (error) {
    console.error(error);
    toast("No se pudo completar la acción", "error");
  }
}

OBR.onReady(arrancar);
