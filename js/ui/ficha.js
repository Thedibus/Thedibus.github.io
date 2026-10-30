/** Pestaña «Ficha»: la hoja de consulta del personaje activo. */

import { CARACTERISTICAS, derivar, resumenClase } from "../model.js";
import { escribirBurbujas } from "../bubbles.js";
import {
  buscarPersonaje,
  contextoToken,
  desvincularToken,
  escribirEstadisticas,
  estadisticasDe,
  personajeActivo,
  setActivo,
  store,
  vincularToken,
} from "../store.js";
import { conSigno, esc, toast } from "../util.js";
import { bloqueRasgos, bloqueRetrato, bloqueStats, bloqueVida, chipsHabilidades, listaInventario, listaNotas, mensajeEstado, rejillaHabilidades } from "./comun.js";
import { abrirEditor } from "./editor.js";
import { exportarPersonaje } from "../transferencia.js";
import { ajustarVentana, controlesVentana, manejarVentana } from "./ventana.js";

let raiz = null;
let fichaAbiertaId = null;

export function montarFicha(contenedor) {
  raiz = contenedor;
  raiz.addEventListener("click", alHacerClic);
}

export function montarDialogoFicha() {
  const dialogo = document.getElementById("dialogo-ficha");
  if (!dialogo) return;
  dialogo.addEventListener("click", alClicDialogo);
  dialogo.addEventListener("change", alCambiarDialogo);
  dialogo.addEventListener("close", () => {
    fichaAbiertaId = null;
  });
}

/* --------------------------------------------------------------- compacta */

export function pintarFicha() {
  if (!raiz) return;

  if (store.personajes.length === 0) {
    raiz.innerHTML = `<div class="vacio">
      <strong>Tu ficha, siempre a mano</strong>
      <p>Crea un personaje con sus PG, CA y características. Después podrás vincularlo a tu token y compartir la vida con las burbujas.</p>
      <button class="btn primario" data-accion="nuevo">+ Crear PJ</button>
      <button class="btn sutil" data-accion="ejemplo">Cargar la mesa de ejemplo</button>
    </div>`;
    return;
  }

  const pj = personajeActivo() ?? store.personajes[0];
  const est = estadisticasDe(pj);
  const oculto = Boolean(est.oculto && store.rol === "PLAYER");
  const chipsHab = chipsHabilidades(pj, 6);

  raiz.innerHTML = `
    ${cambiador(pj)}
    <article class="ficha-card" data-id="${esc(pj.id)}">
      <header class="ficha-cab">
        ${bloqueRetrato(pj, est)}
        <div class="ficha-id">
          <h2>${esc(pj.nombre)}</h2>
          <p>${esc(resumenClase(pj)) || "sin clase"}</p>
          <div class="ficha-token">
            ${
              est.tokenId
                ? `<span class="chip chip-ok" title="Vinculado a un token">🔗 ${esc(est.tokenNombre ?? "Token")}</span>`
                : `<span class="chip chip-tenue">Sin token</span>`
            }
            ${pj.inventario.length > 0 ? `<span class="chip chip-tenue">🎒 ${pj.inventario.length}</span>` : ""}
          </div>
        </div>
      </header>

      ${bloqueVida(pj, est, { oculto })}

      ${bloqueStats(pj)}

      ${
        chipsHab
          ? `<div class="ficha-rasgos">
              <span class="etiqueta">Habilidades</span>
              ${chipsHab}
            </div>`
          : ""
      }

      <div class="ficha-rasgos">
        <span class="etiqueta">Rasgos</span>
        ${bloqueRasgos(pj)}
      </div>

      <div class="ficha-acciones">
        <button class="btn primario" data-accion="completa" data-id="${esc(pj.id)}">Ver ficha entera</button>
        <button class="btn" data-accion="editar" data-id="${esc(pj.id)}">✎ Editar</button>
      </div>

      <div class="ficha-acciones">
        ${
          est.tokenId
            ? `<button class="btn sutil" data-accion="desvincular" data-id="${esc(est.tokenId)}">Desvincular token</button>`
            : `<button class="btn" data-accion="vincular" data-id="${esc(pj.id)}">🔗 Vincular token seleccionado</button>`
        }
      </div>

      ${
        est.tokenId && !est.puedeBurbujas
          ? `<p class="ayuda aviso-inline">Las burbujas solo se dibujan sobre imágenes de las capas Personaje o Montura.</p>`
          : ""
      }
      ${
        est.tokenId && !est.desdeToken
          ? `<p class="ayuda aviso-inline">Este token aún no tiene burbujas. Puedes crearlas con los PG y la CA de la ficha.</p>
             <button class="btn" data-accion="burbujas" data-id="${esc(pj.id)}">Crear burbujas con estos PG/CA</button>`
          : ""
      }
    </article>`;
}

function cambiador(pj) {
  if (store.personajes.length <= 1) return "";
  return `<div class="cambiador">
    <span class="etiqueta">Personaje activo</span>
    <div class="cambiador-lista">
      ${store.personajes
        .map((p) => {
          const inicial = (p.nombre || "?").trim().charAt(0).toUpperCase();
          return `<button type="button" class="cambiador-pj ${p.id === pj.id ? "es-activo" : ""}"
                          data-activo="${esc(p.id)}" title="${esc(p.nombre)}">
            <span class="cambiador-inicial">${esc(inicial)}</span>
            <span class="cambiador-nombre">${esc(p.nombre)}</span>
          </button>`;
        })
        .join("")}
    </div>
  </div>`;
}

/* ------------------------------------------------------------- ficha entera */

export function abrirFichaCompleta(id) {
  const pj = buscarPersonaje(id);
  const dialogo = document.getElementById("dialogo-ficha");
  if (!pj || !dialogo) return;
  fichaAbiertaId = pj.id;
  dialogo.innerHTML = plantillaCompleta(pj);
  if (!dialogo.open) dialogo.showModal();
  ajustarVentana(dialogo);
}

export function pintarFichaCompleta() {
  const dialogo = document.getElementById("dialogo-ficha");
  if (!fichaAbiertaId || !dialogo?.open) return;
  const activo = document.activeElement;
  if (activo && activo.tagName === "INPUT" && dialogo.contains(activo)) return;

  const pj = buscarPersonaje(fichaAbiertaId);
  if (!pj) {
    dialogo.close();
    fichaAbiertaId = null;
    return;
  }
  dialogo.innerHTML = plantillaCompleta(pj);
}

function plantillaCompleta(pj) {
  const est = estadisticasDe(pj);
  const d = derivar(pj);
  const oculto = Boolean(est.oculto && store.rol === "PLAYER");

  return `
  <header class="dialogo-cabecera">
    ${bloqueRetrato(pj, est, { grande: true })}
    <div>
      <h2>${esc(pj.nombre)}</h2>
      <p class="ayuda">${esc(resumenClase(pj)) || "sin clase"}</p>
    </div>
    ${controlesVentana()}
  </header>

  <div class="dialogo-cuerpo">
    <div class="ficha-token ancho-completo">
      ${
        est.tokenId
          ? `<span class="chip chip-ok">🔗 ${esc(est.tokenNombre ?? "Token")}</span>
             <button type="button" class="btn sutil" data-desvincular="${esc(est.tokenId)}">Desvincular</button>`
          : `<span class="chip chip-tenue">Sin token vinculado</span>
             <button type="button" class="btn sutil" data-vincular="${esc(pj.id)}">Vincular token</button>`
      }
    </div>

    <div class="ancho-completo">${bloqueVida(pj, est, { oculto })}</div>

    ${
      oculto
        ? `<p class="ayuda ancho-completo">El director ha ocultado estas estadísticas a los jugadores.</p>`
        : `<div class="ancho-completo">
            <div class="grid-edit">
              <label class="campo"><span class="etiqueta">PG actuales</span>
                <input type="number" data-campo="hp" min="0" max="${est.hpMax}" value="${est.hp}" />
              </label>
              <label class="campo"><span class="etiqueta">PG máximos</span>
                <input type="number" data-campo="hpMax" min="1" max="9999" value="${est.hpMax}" />
              </label>
              <label class="campo"><span class="etiqueta">CA</span>
                <input type="number" data-campo="ac" min="1" max="99" value="${est.ac}" />
              </label>
            </div>
            <p class="ayuda">Los mismos PG y CA que muestran las burbujas del token.</p>
          </div>`
    }

    <fieldset class="ancho-completo">
      <legend>Salvaciones</legend>
      <div class="salvaciones-panel">
        <div class="mini-grid">
          <div><span>Competencia</span><b>${conSigno(d.competencia)}</b></div>
          <div><span>Iniciativa</span><b>${conSigno(d.iniciativa)}</b></div>
          <div><span>Velocidad</span><b>${pj.velocidad} pies</b></div>
        </div>
        <div class="saves">
          ${CARACTERISTICAS.map(
            (c) => `<div class="save" title="${c.nombre}">
              <span>${c.abrev}</span>
              <b>${conSigno(d.salvaciones[c.clave])}</b>
              ${pj.salvaciones[c.clave] ? `<i class="punto" title="Competente"></i>` : ""}
            </div>`
          ).join("")}
        </div>
      </div>
    </fieldset>

    <fieldset class="ancho-completo">
      <legend>Características</legend>
      ${bloqueStats(pj)}
    </fieldset>

    <fieldset class="ancho-completo">
      <legend>Habilidades</legend>
      ${rejillaHabilidades(pj)}
    </fieldset>

    <fieldset class="ancho-completo">
      <legend>Rasgos</legend>
      ${bloqueRasgos(pj)}
    </fieldset>

    <fieldset class="ancho-completo">
      <legend>Inventario</legend>
      ${listaInventario(pj.inventario)}
    </fieldset>

    <fieldset class="ancho-completo">
      <legend>Notas</legend>
      ${listaNotas(pj.notas)}
    </fieldset>
  </div>

  <footer class="dialogo-pie">
    <button type="button" class="btn" data-exportar="${esc(pj.id)}">Exportar</button>
    <button type="button" class="btn" data-cerrar>Cerrar</button>
    <button type="button" class="btn primario" data-editar="${esc(pj.id)}">Editar</button>
  </footer>`;
}

/* ------------------------------------------------------------------ eventos */

async function alHacerClic(evento) {
  const activo = evento.target.closest("[data-activo]");
  if (activo) {
    await setActivo(activo.dataset.activo);
    pintarFicha();
    return;
  }

  const boton = evento.target.closest("[data-accion]");
  if (!boton) return;

  const accion = boton.dataset.accion;
  const id = boton.dataset.id;

  if (accion === "nuevo") return abrirEditor(null);
  if (accion === "ejemplo") {
    document.dispatchEvent(new CustomEvent("mdh:ejemplo"));
    return;
  }

  const pj = buscarPersonaje(id);
  if (accion === "completa") return abrirFichaCompleta(id);
  if (accion === "editar" && pj) return abrirEditor(pj);
  if (accion === "vincular") return vincular(id);
  if (accion === "desvincular") return desvincular(id);
  if (accion === "burbujas") return crearBurbujas(id);
  return undefined;
}

async function alClicDialogo(evento) {
  const dialogo = document.getElementById("dialogo-ficha");
  if (manejarVentana(evento, dialogo)) return;

  if (evento.target.closest("[data-cerrar]")) {
    dialogo?.close();
    return;
  }

  const editar = evento.target.closest("[data-editar]");
  if (editar) {
    const pj = buscarPersonaje(editar.dataset.editar);
    if (pj) {
      dialogo?.close();
      abrirEditor(pj);
    }
    return;
  }

  const exportarBoton = evento.target.closest("[data-exportar]");
  if (exportarBoton) {
    exportarPersonaje(exportarBoton.dataset.exportar);
    return;
  }

  const vincularBoton = evento.target.closest("[data-vincular]");
  if (vincularBoton) return vincular(vincularBoton.dataset.vincular);

  const desvincularBoton = evento.target.closest("[data-desvincular]");
  if (desvincularBoton) return desvincular(desvincularBoton.dataset.desvincular);
  return undefined;
}

async function alCambiarDialogo(evento) {
  const campo = evento.target.closest("[data-campo]");
  if (!campo || !fichaAbiertaId) return;

  const valor = Number(campo.value);
  if (!Number.isFinite(valor)) return;

  const pj = buscarPersonaje(fichaAbiertaId);
  const est = estadisticasDe(pj);
  if (est && Number(est[campo.dataset.campo]) === valor) return;

  try {
    const resultado = await escribirEstadisticas(fichaAbiertaId, { [campo.dataset.campo]: valor });
    if (!resultado) return;
    toast(campo.dataset.campo === "ac" ? `CA: ${resultado.ac}` : `PG: ${resultado.hp}/${resultado.hpMax}`, "ok", 1400);
    pintarFicha();
    pintarFichaCompleta();
  } catch (error) {
    console.error(error);
    toast("No se pudieron guardar los cambios (¿permisos del token?)", "error");
  }
}

async function vincular(pjId) {
  const contexto = await contextoToken();
  if (contexto.estado !== "ok") {
    toast(mensajeEstado(contexto), "aviso");
    return;
  }
  try {
    const pj = await vincularToken(contexto.item.id, pjId);
    toast(`«${pj.nombre}» vinculado a «${contexto.item.name || "token"}»`, "ok");
    pintarFicha();
    pintarFichaCompleta();
  } catch (error) {
    console.error(error);
    toast("No se pudo vincular el token", "error");
  }
}

async function desvincular(tokenId) {
  try {
    await desvincularToken(tokenId);
    toast("Token desvinculado (los datos de la ficha se conservan)", "ok");
    pintarFicha();
    pintarFichaCompleta();
  } catch (error) {
    console.error(error);
    toast("No se pudo desvincular el token", "error");
  }
}

async function crearBurbujas(pjId) {
  const pj = buscarPersonaje(pjId);
  if (!pj) return;
  const est = estadisticasDe(pj);
  if (!est.tokenId) return;
  try {
    await escribirBurbujas(est.tokenId, { hp: pj.hp, hpMax: pj.hpMax, ac: pj.ac });
    toast("Burbujas creadas en el token", "ok");
    pintarFicha();
    pintarFichaCompleta();
  } catch (error) {
    console.error(error);
    toast("No se pudieron crear las burbujas", "error");
  }
}
