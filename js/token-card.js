/** Tarjeta compacta que aparece en el menú contextual del token. */

import OBR from "../vendor/owlbear-sdk.js";
import { resumenClase } from "./model.js";
import { buscarPersonaje, contextoToken, estadisticasDe, iniciarTienda, store } from "./store.js";
import { esc } from "./util.js";
import { bloqueRasgos, bloqueRetrato, bloqueStats, bloqueVida, chipsHabilidades } from "./ui/comun.js";

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
  store.alCambiar(pintar);
  pintar();
}

async function pintar() {
  if (!raiz) return;
  const miVersion = ++version;
  const contexto = await contextoToken();
  if (miVersion !== version || !raiz) return;

  if (contexto.estado !== "ok") {
    raiz.innerHTML = sinToken();
    return;
  }

  const pj = contexto.personajeId ? buscarPersonaje(contexto.personajeId) : null;
  if (!pj) {
    raiz.innerHTML = sinPj(contexto);
    return;
  }

  const est = estadisticasDe(pj);
  const oculto = Boolean(est.oculto && store.rol === "PLAYER");

  raiz.innerHTML = `
    <div class="token-ficha">
      ${bloqueRetrato(pj, est)}
      <div class="token-datos">
        <h3>${esc(pj.nombre)}</h3>
        <p>${esc(resumenClase(pj)) || "sin clase"}</p>
      </div>
      ${est.tokenId ? `<span class="chip chip-ok chip-mini">🔗</span>` : ""}
    </div>

    ${bloqueVida(pj, est, { oculto })}

    ${bloqueStats(pj)}

    ${
      chipsHabilidades(pj, 3)
        ? `<div class="ficha-rasgos">
            <span class="etiqueta">Habilidades</span>
            ${chipsHabilidades(pj, 3)}
          </div>`
        : ""
    }

    <div class="ficha-rasgos">
      <span class="etiqueta">Rasgos</span>
      ${bloqueRasgos(pj, 2)}
    </div>

    <button class="btn primario grande" data-accion="abrir">Abrir Mesa de Héroes</button>`;
}

function sinToken() {
  return `<div class="vacio">
    <strong>Selecciona un token</strong>
    <p>Haz clic en un token del mapa y vuelve a abrir este panel.</p>
  </div>`;
}

function sinPj(contexto) {
  return `<div class="token-ficha">
      <div class="token-datos">
        <h3>${esc(contexto.token?.nombre ?? "Token")}</h3>
        <p>Sin PJ vinculado</p>
      </div>
    </div>
    <p class="ayuda">Abre Mesa de Héroes y vincula este token a una ficha para ver aquí sus estadísticas.</p>
    <button class="btn primario grande" data-accion="abrir">Abrir Mesa de Héroes</button>`;
}

async function alHacerClic(evento) {
  if (evento.target.closest("[data-accion='abrir']")) {
    await OBR.action.open();
  }
}

OBR.onReady(arrancar);
