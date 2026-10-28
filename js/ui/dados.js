/** Pestaña «Dados»: elige PJ, tipo de tirada y lanza. */

import { TIPOS, ejecutar, tipoPorId, vistaPrevia } from "../dice.js";
import { CARACTERISTICAS, derivar } from "../model.js";
import { buscarPersonaje, cambiarVida, contextoToken, store } from "../store.js";
import { esc, toast } from "../util.js";
import { publicar } from "./acciones.js";

let raiz = null;
let idsPintados = "";
let tipoPintado = "";
let personajesPintados = "";

const estado = {
  tipo: "attack",
  habilidad: "str",
  modo: "normal",
  critico: false,
  competente: false,
  formulas: { heal: "1d8", free: "1d20" },
  personajeId: null,
  resultado: null,
  girando: false,
};

export function montarDados(contenedor) {
  raiz = contenedor;
  raiz.innerHTML = estructura();
  raiz.addEventListener("change", alCambiar);
  raiz.addEventListener("input", alEscribir);
  raiz.addEventListener("click", alHacerClic);
  preseleccionar();
}

export function pintarDados() {
  if (!raiz) return;
  pintarPersonajes();
  pintarTipos();
  pintarOpciones();
  pintarModo();
  pintarLectura();
}

/** Muestra un resultado llegado de otra ventana (ficha, menú del token…). */
export function mostrarResultado(resultado, personajeId = null) {
  if (!raiz || !resultado) return;
  estado.resultado = resultado;
  if (personajeId) estado.personajeId = personajeId;
  estado.tipo = resultado.tipo;
  tipoPintado = "";
  pintarDados();
  pintarResultado();
}

async function preseleccionar() {
  try {
    const contexto = await contextoToken();
    if (contexto.estado === "ok" && contexto.vinculo) {
      estado.personajeId = contexto.vinculo.personajeId;
    }
  } catch {
    /* sin escena o sin selección: se usa el primer PJ */
  }
  if (!estado.personajeId && store.personajes.length > 0) {
    estado.personajeId = store.personajes[0].id;
  }
  pintarDados();
}

function estructura() {
  return `
  <div class="dados">
    <label class="campo">
      <span class="etiqueta">Personaje</span>
      <select id="dados-pj"></select>
    </label>

    <div class="campo">
      <span class="etiqueta">Tipo de tirada</span>
      <div class="segmentado" id="dados-tipos">
        ${TIPOS.map(
          (t) => `<button class="btn" data-tipo="${t.id}" title="${esc(t.ayuda)}">
                    <span class="simbolo">${t.simbolo}</span>${t.nombre}
                  </button>`
        ).join("")}
      </div>
    </div>

    <div id="dados-opciones"></div>

    <div class="lectura">
      <span class="lectura-formula" id="dados-formula">—</span>
      <span class="lectura-nota" id="dados-nota"></span>
    </div>

    <div class="opciones-extra" id="dados-modo">
      <span class="ayuda">d20:</span>
      <button class="btn" data-modo="normal">Normal</button>
      <button class="btn" data-modo="ventaja">Ventaja</button>
      <button class="btn" data-modo="desventaja">Desventaja</button>
    </div>

    <button id="dados-tirar" class="btn primario grande">Tirar</button>

    <div id="dados-resultado"></div>
  </div>`;
}

/* ------------------------------------------------------------------ pintado */

function pintarPersonajes() {
  const selector = raiz.querySelector("#dados-pj");
  const firma = store.personajes.map((pj) => `${pj.id}:${pj.nombre}`).join("|");
  if (firma !== personajesPintados) {
    personajesPintados = firma;
    selector.innerHTML = store.personajes.length
      ? store.personajes.map((pj) => `<option value="${esc(pj.id)}">${esc(pj.nombre)}</option>`).join("")
      : `<option value="">— sin personajes —</option>`;
  }

  if (estado.personajeId && !store.personajes.some((pj) => pj.id === estado.personajeId)) {
    estado.personajeId = null;
  }
  if (!estado.personajeId && store.personajes.length > 0) {
    estado.personajeId = store.personajes[0].id;
  }
  selector.value = estado.personajeId ?? "";
  selector.disabled = store.personajes.length === 0;
}

function pintarTipos() {
  for (const boton of raiz.querySelectorAll("[data-tipo]")) {
    boton.classList.toggle("es-activo", boton.dataset.tipo === estado.tipo);
  }
}

function pintarModo() {
  const tipo = tipoPorId(estado.tipo);
  const contenedor = raiz.querySelector("#dados-modo");
  contenedor.classList.toggle("oculto", !tipo.d20);
  for (const boton of contenedor.querySelectorAll("[data-modo]")) {
    boton.classList.toggle("es-activo", boton.dataset.modo === estado.modo);
  }
}

function pintarOpciones() {
  const firma = `${estado.tipo}|${estado.personajeId ?? ""}`;
  if (tipoPintado === firma) return;
  tipoPintado = firma;
  const tipo = tipoPorId(estado.tipo);
  const contenedor = raiz.querySelector("#dados-opciones");

  if (tipo.habilidad) {
    contenedor.innerHTML = `
      <div class="grid-2">
        <label class="campo">
          <span class="etiqueta">Característica</span>
          <select id="dados-habilidad">
            ${CARACTERISTICAS.map(
              (c) => `<option value="${c.clave}" ${c.clave === estado.habilidad ? "selected" : ""}>${c.nombre}</option>`
            ).join("")}
          </select>
        </label>
        ${
          tipo.competencia
            ? `<div class="campo">
                 <span class="etiqueta">Competencia</span>
                 <div class="opciones-extra">
                   <button class="btn ${estado.competente ? "es-activo" : ""}" id="dados-competente">Sumar +${2}…</button>
                 </div>
               </div>`
            : ""
        }
      </div>`;
    const boton = contenedor.querySelector("#dados-competente");
    if (boton) {
      const pj = buscarPersonaje(estado.personajeId);
      const bono = pj ? derivar(pj).competencia : 2;
      boton.textContent = `Sumar competencia (${bono >= 0 ? "+" : ""}${bono})`;
      boton.classList.toggle("es-activo", estado.competente);
    }
  } else if (estado.tipo === "damage") {
    contenedor.innerHTML = `
      <div class="opciones-extra">
        <button class="btn ${estado.critico ? "es-activo" : ""}" id="dados-critico">
          ${estado.critico ? "✓ " : ""}Crítico (duplica dados)
        </button>
      </div>`;
  } else if (tipo.formula) {
    const valor = estado.formulas[estado.tipo] ?? "";
    contenedor.innerHTML = `
      <label class="campo">
        <span class="etiqueta">Fórmula</span>
        <input id="dados-formula-libre" value="${esc(valor)}" placeholder="2d6+3" autocomplete="off" spellcheck="false" />
      </label>`;
  } else {
    contenedor.innerHTML = "";
  }
}

function pintarLectura() {
  const pj = buscarPersonaje(estado.personajeId);
  const tipo = tipoPorId(estado.tipo);
  const vista = vistaPrevia(estado.tipo, pj, opciones());
  let nota = vista.nota;
  if (tipo.d20 && estado.modo !== "normal") {
    nota = `${nota} · ${estado.modo === "ventaja" ? "con ventaja" : "con desventaja"}`;
  }
  raiz.querySelector("#dados-formula").textContent = vista.formula;
  raiz.querySelector("#dados-nota").textContent = nota;

  const boton = raiz.querySelector("#dados-tirar");
  boton.disabled = !pj;
  boton.textContent = tipo.d20 ? "Tirar d20" : "Tirar dados";
}

/* -------------------------------------------------------------------- eventos */

function opciones() {
  return {
    modo: estado.modo,
    habilidad: estado.habilidad,
    critico: estado.critico,
    competente: estado.competente,
    formula: estado.formulas[estado.tipo],
  };
}

function alCambiar(evento) {
  const objetivo = evento.target;

  if (objetivo.id === "dados-pj") {
    estado.personajeId = objetivo.value || null;
    pintarDados();
    return;
  }
  if (objetivo.id === "dados-habilidad") {
    estado.habilidad = objetivo.value;
    pintarLectura();
    return;
  }
  if (objetivo.id === "dados-formula-libre") {
    estado.formulas[estado.tipo] = objetivo.value;
    pintarLectura();
  }
}

function alEscribir(evento) {
  if (evento.target.id === "dados-formula-libre") {
    estado.formulas[estado.tipo] = evento.target.value;
    pintarLectura();
  }
}

async function alHacerClic(evento) {
  const tipoBoton = evento.target.closest("[data-tipo]");
  if (tipoBoton) {
    estado.tipo = tipoBoton.dataset.tipo;
    tipoPintado = "";
    pintarDados();
    return;
  }

  const modoBoton = evento.target.closest("[data-modo]");
  if (modoBoton) {
    estado.modo = modoBoton.dataset.modo;
    pintarModo();
    pintarLectura();
    return;
  }

  if (evento.target.closest("#dados-critico")) {
    estado.critico = !estado.critico;
    const boton = raiz.querySelector("#dados-critico");
    boton.classList.toggle("es-activo", estado.critico);
    boton.textContent = `${estado.critico ? "✓ " : ""}Crítico (duplica dados)`;
    pintarLectura();
    return;
  }

  if (evento.target.closest("#dados-competente")) {
    estado.competente = !estado.competente;
    raiz.querySelector("#dados-competente").classList.toggle("es-activo", estado.competente);
    pintarLectura();
    return;
  }

  if (evento.target.closest("#dados-tirar")) {
    await tirarAhora();
    return;
  }

  const aplicar = evento.target.closest("[data-aplicar]");
  if (aplicar) {
    await aplicarTirada(aplicar);
  }
}

/* -------------------------------------------------------------------- tirada */

async function tirarAhora() {
  if (estado.girando) return;
  const pj = buscarPersonaje(estado.personajeId);
  if (!pj) {
    toast("Elige un personaje", "aviso");
    return;
  }

  const resultado = ejecutar(estado.tipo, pj, opciones());
  if (!resultado.ok) {
    toast(resultado.error, "error");
    return;
  }

  estado.girando = true;
  const salida = raiz.querySelector("#dados-resultado");
  salida.innerHTML = `
    <div class="rodando">
      <div class="d20-girando">🎲</div>
      <span>Tirando ${esc(resultado.formula)}…</span>
    </div>`;

  await new Promise((resolver) => setTimeout(resolver, 620));

  estado.girando = false;
  estado.resultado = resultado;
  pintarResultado();
  await publicar(resultado, "dados");
}

function pintarResultado() {
  const salida = raiz.querySelector("#dados-resultado");
  if (!salida) return;
  if (!estado.resultado) {
    salida.innerHTML = "";
    return;
  }
  salida.innerHTML = htmlResultado(estado.resultado);
}

function htmlResultado(resultado) {
  const tono = resultado.critico ? "critico" : resultado.pifia ? "pifia" : "normal";
  const etiqueta = resultado.critico
    ? `<span class="etiqueta-critico">¡Crítico!</span>`
    : resultado.pifia
      ? `<span class="etiqueta-pifia">Pifia</span>`
      : "";

  const dados = (resultado.dados ?? [])
    .map(
      (dado) =>
        `<span class="dado ${dado.caras === 20 ? "d20" : ""}${dado.descartado ? " descartado" : ""}" title="d${dado.caras}">${dado.valor}</span>`
    )
    .join("");

  const aplicar =
    resultado.puedeAplicar === "dano"
      ? `<button class="btn peligro" data-aplicar="dano" data-id="${esc(resultado.personaje.id)}" data-total="${resultado.total}">
           Aplicar ${resultado.total} de daño a ${esc(resultado.personaje.nombre)}
         </button>`
      : resultado.puedeAplicar === "cura"
        ? `<button class="btn" data-aplicar="cura" data-id="${esc(resultado.personaje.id)}" data-total="${resultado.total}">
             Curar ${resultado.total} PG a ${esc(resultado.personaje.nombre)}
           </button>`
        : "";

  return `
  <div class="resultado" data-tono="${tono}">
    <div class="resultado-cabecera">
      <div>
        <div class="resultado-titulo">${esc(resultado.etiqueta)}</div>
        <div class="resultado-total">${resultado.total}${etiqueta}</div>
      </div>
      <div class="dados-tirados">${dados}</div>
    </div>
    <div class="resultado-desglose">${esc(resultado.formula)} · <b>${esc(resultado.desglose)}</b></div>
    ${aplicar}
  </div>`;
}

async function aplicarTirada(boton) {
  const total = Number(boton.dataset.total) || 0;
  const esDano = boton.dataset.aplicar === "dano";
  try {
    const pj = await cambiarVida(boton.dataset.id, esDano ? -total : total);
    if (!pj) return;
    boton.disabled = true;
    boton.textContent = esDano ? "Daño aplicado" : "Curación aplicada";
    toast(
      `${pj.nombre}: ${pj.hp}/${pj.hpMax} PG${pj.hp <= 0 ? " · ¡caído!" : ""}`,
      pj.hp <= 0 ? "aviso" : "ok"
    );
  } catch (error) {
    console.error(error);
    toast("No se pudo aplicar (¿permisos del token?)", "error");
  }
}
