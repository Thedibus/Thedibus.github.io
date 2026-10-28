/** Arranque del popover: pestañas, ajustes, importación y registro. */

import OBR from "../vendor/owlbear-sdk.js";
import { ROL_ETIQUETA } from "./config.js";
import { normalizar, personajeNuevo } from "./model.js";
import {
  guardarAjustes,
  iniciarTienda,
  limpiarRegistro,
  reemplazarBiblioteca,
  store,
} from "./store.js";
import { $, $$, confirmar, descargarJson, esc, horaCorta, leerArchivo, toast } from "./util.js";
import { mostrarResultado, montarDados, pintarDados } from "./ui/dados.js";
import { abrirEditor } from "./ui/editor.js";
import { montarPjs, pintarPjs } from "./ui/pjs.js";
import { montarToken, pintarToken } from "./ui/token.js";

let panelActivo = "pjs";
let renderPendiente = false;

/* ------------------------------------------------------------------- ejemplo */

const EJEMPLO = [
  {
    nombre: "Aria Ventisca",
    clase: "Pícara",
    nivel: 3,
    hp: 21,
    hpMax: 24,
    ac: 15,
    velocidad: 30,
    caracteristicas: { str: 8, dex: 17, con: 12, int: 13, wis: 10, cha: 14 },
    bonoAtaque: 5,
    dano: "1d8+3",
    salvaciones: { str: false, dex: true, con: false, int: true, wis: false, cha: false },
    notas: "Ataque furtivo 2d6 si tiene ventaja.",
  },
  {
    nombre: "Borin Martillode Hierro",
    clase: "Clérigo enano",
    nivel: 4,
    hp: 31,
    hpMax: 31,
    ac: 18,
    velocidad: 25,
    caracteristicas: { str: 14, dex: 8, con: 16, int: 10, wis: 15, cha: 12 },
    bonoAtaque: 5,
    dano: "1d8+2",
    salvaciones: { str: false, dex: false, con: true, int: false, wis: true, cha: false },
    notas: "Curación con palabra curativa: 1d8+3.",
  },
  {
    nombre: "Sella Estrella",
    clase: "Maga elfa",
    nivel: 5,
    hp: 24,
    hpMax: 24,
    ac: 12,
    velocidad: 30,
    caracteristicas: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
    bonoAtaque: 7,
    dano: "1d10",
    salvaciones: { str: false, dex: false, con: false, int: true, wis: true, cha: false },
    notas: "Rayo de fuego: 2d6. Escudo arcano: +5 CA.",
  },
];

/* -------------------------------------------------------------------- arranque */

async function arrancar() {
  if (!OBR.isAvailable) {
    $("#aviso-entorno").hidden = false;
    return;
  }

  try {
    await iniciarTienda();
  } catch (error) {
    console.error(error);
    const aviso = $("#aviso-entorno");
    aviso.hidden = false;
    aviso.textContent = "No se pudo conectar con Owlbear Rodeo. Vuelve a abrir la extensión.";
    return;
  }

  $("#aviso-entorno").hidden = true;
  $("#app").hidden = false;

  montarPjs($("#lista-pjs"));
  montarDados($("#panel-dados"));
  montarToken($("#panel-token"));

  conectarControles();
  store.alCambiar(programarRender);

  $("#rol").textContent = ROL_ETIQUETA[store.rol] ?? store.rol;
  $("#rol").dataset.rol = store.rol;

  renderizar();
}

function programarRender() {
  if (renderPendiente) return;
  renderPendiente = true;
  requestAnimationFrame(() => {
    renderPendiente = false;
    renderizar();
  });
}

function renderizar() {
  const subtitulo = $("#subtitulo");
  if (subtitulo) {
    const cantidad = store.personajes.length;
    const tiradas = store.tiradas.length;
    subtitulo.textContent = `${cantidad} PJ${cantidad === 1 ? "" : "s"} · ${tiradas} tirada${tiradas === 1 ? "" : "s"}`;
  }
  pintarPjs();
  pintarDados();
  pintarToken();
  pintarRegistro();
  if (panelActivo === "ajustes") pintarAjustes();
}

/* --------------------------------------------------------------- pestañas */

function activarPanel(nombre) {
  panelActivo = nombre;
  for (const panel of $$(".panel")) {
    panel.classList.toggle("es-activa", panel.dataset.panel === nombre);
  }
  for (const pestana of $$(".pestana")) {
    const activa = pestana.dataset.panel === nombre;
    pestana.classList.toggle("es-activa", activa);
    pestana.setAttribute("aria-selected", activa ? "true" : "false");
  }
  if (nombre === "token") pintarToken();
  if (nombre === "ajustes") pintarAjustes();
  if (nombre === "registro") pintarRegistro();
}

/* ------------------------------------------------------------------ registro */

function pintarRegistro() {
  const lista = $("#lista-registro");
  if (!lista) return;

  if (store.tiradas.length === 0) {
    lista.innerHTML = `<li class="vacio"><strong>Sin tiradas todavía</strong><p>Las tiradas de toda la mesa aparecerán aquí.</p></li>`;
    return;
  }

  lista.innerHTML = store.tiradas
    .map((t) => {
      const tono = t.critico ? "critico" : t.pifia ? "pifia" : "normal";
      const autor = t.autor ? ` · ${esc(t.autor)}` : "";
      return `<li data-tono="${tono}">
        <span class="hora">${horaCorta(t.momento)}</span>
        <span class="quien">${esc(t.personaje)}</span>
        <span class="que">${esc(t.etiqueta)} · ${esc(t.desglose)}${autor}</span>
        <span class="total">${t.total}</span>
      </li>`;
    })
    .join("");
}

/* ------------------------------------------------------------------- ajustes */

function pintarAjustes() {
  const contenedor = $("#panel-ajustes");
  if (!contenedor) return;

  const { anunciar, registro } = store.ajustes;
  contenedor.innerHTML = `
    <div class="ajustes">
      <fieldset>
        <legend>Tiradas</legend>
        <label class="interruptor">
          <input type="checkbox" data-ajuste="anunciar" ${anunciar ? "checked" : ""} />
          <div><strong>Anunciar a la mesa</strong><span>Avisa a todos los jugadores del resultado de cada tirada.</span></div>
        </label>
        <label class="interruptor">
          <input type="checkbox" data-ajuste="registro" ${registro ? "checked" : ""} />
          <div><strong>Registro compartido</strong><span>Guarda las últimas 40 tiradas en la sala.</span></div>
        </label>
      </fieldset>

      <fieldset>
        <legend>Biblioteca de PJs</legend>
        <div class="btn-fila">
          <button class="btn" data-aj="exportar">Exportar</button>
          <button class="btn" data-aj="importar">Importar</button>
          <button class="btn" data-aj="ejemplo">Cargar ejemplo</button>
        </div>
        <p class="ayuda">Los PJs se guardan en la sala y los ve todo el mundo. Exporta de vez en cuando para tener copia.</p>
      </fieldset>

      <fieldset>
        <legend>Información</legend>
        <p class="ayuda">
          Rol: ${esc(ROL_ETIQUETA[store.rol] ?? store.rol)}<br />
          Sala: ${esc(OBR.room.id)}<br />
          PJs: ${store.personajes.length} · Tiradas guardadas: ${store.tiradas.length}
        </p>
      </fieldset>

      <fieldset>
        <legend>Zona peligrosa</legend>
        <div class="btn-fila">
          <button class="btn peligro" data-aj="borrar-todo">Borrar todos los PJs</button>
        </div>
        <p class="ayuda">Los tokens vinculados quedarán sin ficha. Esta acción no se puede deshacer.</p>
      </fieldset>
    </div>`;
}

function alCambiarAjustes(evento) {
  const casilla = evento.target.closest("[data-ajuste]");
  if (!casilla) return;
  guardarAjustes({ [casilla.dataset.ajuste]: casilla.checked });
}

async function alClicAjustes(evento) {
  const boton = evento.target.closest("[data-aj]");
  if (!boton) return;

  switch (boton.dataset.aj) {
    case "exportar":
      return exportar();
    case "importar":
      $("#input-archivo").click();
      return;
    case "ejemplo":
      return cargarEjemplo();
    case "borrar-todo":
      return borrarTodo();
    default:
      return undefined;
  }
}

/* -------------------------------------------------------- importar / exportar */

function exportar() {
  if (store.personajes.length === 0) {
    toast("No hay PJs que exportar", "aviso");
    return;
  }
  descargarJson("mesa-de-heroes-pjs.json", {
    version: 1,
    exportado: new Date().toISOString(),
    personajes: store.personajes,
  });
  toast("Biblioteca exportada", "ok");
}

async function importar(archivo) {
  try {
    const texto = await leerArchivo(archivo);
    const datos = JSON.parse(texto);
    const lista = Array.isArray(datos) ? datos : datos?.personajes;
    if (!Array.isArray(lista) || lista.length === 0) throw new Error("no contiene personajes");

    const antes = store.personajes.length;
    await reemplazarBiblioteca([...store.personajes, ...lista.map(normalizar)]);
    const nuevos = store.personajes.length - antes;
    toast(`${nuevos} PJ${nuevos === 1 ? "" : "s"} importado${nuevos === 1 ? "" : "s"}`, "ok");
  } catch (error) {
    console.error(error);
    toast(`No se pudo importar: ${error.message}`, "error");
  }
}

async function cargarEjemplo() {
  if (store.personajes.length > 0) {
    const seguro = await confirmar("Se añadirán 3 personajes de ejemplo a tu biblioteca. ¿Continuar?", {
      titulo: "Cargar ejemplo",
      boton: "Sí, añadir",
    });
    if (!seguro) return;
  }
  try {
    await reemplazarBiblioteca([...store.personajes, ...EJEMPLO.map((pj) => personajeNuevo(pj))]);
    toast("Mesa de ejemplo cargada", "ok");
  } catch (error) {
    console.error(error);
    toast("No se pudo cargar el ejemplo", "error");
  }
}

async function borrarTodo() {
  if (store.personajes.length === 0) {
    toast("La biblioteca ya está vacía", "aviso");
    return;
  }
  const seguro = await confirmar("Se borrarán TODOS los PJs de la sala. Esta acción no se puede deshacer.", {
    titulo: "Borrar biblioteca",
    boton: "Sí, borrar todo",
  });
  if (!seguro) return;
  try {
    await reemplazarBiblioteca([]);
    toast("Biblioteca vaciada", "ok");
  } catch (error) {
    console.error(error);
    toast("No se pudo vaciar la biblioteca", "error");
  }
}

/* ---------------------------------------------------------------- controles */

function conectarControles() {
  for (const pestana of $$(".pestana")) {
    pestana.addEventListener("click", () => activarPanel(pestana.dataset.panel));
  }

  $("#btn-nuevo")?.addEventListener("click", () => abrirEditor(null));
  $("#btn-exportar")?.addEventListener("click", exportar);
  $("#btn-importar")?.addEventListener("click", () => $("#input-archivo").click());
  $("#btn-limpiar-registro")?.addEventListener("click", async () => {
    const seguro = await confirmar("¿Vaciar el registro de tiradas de toda la mesa?", {
      titulo: "Vaciar registro",
      boton: "Sí, vaciar",
    });
    if (seguro) await limpiarRegistro();
  });

  $("#input-archivo")?.addEventListener("change", (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (archivo) importar(archivo);
  });

  $("#panel-ajustes")?.addEventListener("change", alCambiarAjustes);
  $("#panel-ajustes")?.addEventListener("click", alClicAjustes);

  document.addEventListener("mdh:ejemplo", cargarEjemplo);

  document.addEventListener("mdh:tirada", (evento) => {
    const { resultado, origen } = evento.detail ?? {};
    if (!resultado) return;
    if (origen === "dados") return;
    mostrarResultado(resultado, resultado.personaje?.id ?? null);
    activarPanel("dados");
  });

  // Escape cierra el diálogo sin recargar la ventana.
  $("#dialogo-pj")?.addEventListener("cancel", (evento) => evento.preventDefault());
}

/* -------------------------------------------------------------------- inicio */

if (OBR.isAvailable) {
  OBR.onReady(arrancar);
} else {
  document.addEventListener("DOMContentLoaded", arrancar);
}
