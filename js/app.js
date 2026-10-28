/** Arranque del popover: pestañas, ajustes e importación. */

import OBR from "../vendor/owlbear-sdk.js";
import { ROL_ETIQUETA } from "./config.js";
import { normalizar, personajeNuevo } from "./model.js";
import { desvincularTodosLosTokens, estadisticasDe, iniciarTienda, reemplazarBiblioteca, setActivo, store } from "./store.js";
import { $, $$, confirmar, descargarJson, esc, leerArchivo, toast } from "./util.js";
import { abrirEditor } from "./ui/editor.js";
import { montarDialogoFicha, montarFicha, pintarFicha, pintarFichaCompleta } from "./ui/ficha.js";
import { montarPjs, pintarPjs } from "./ui/pjs.js";
import { importarPersonaje } from "./transferencia.js";

let panelActivo = "ficha";
let renderPendiente = false;
const CLAVE_TAMANO = "mdh:tamano";

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
    salvaciones: { str: false, dex: true, con: false, int: true, wis: false, cha: false },
    habilidades: { sigilo: true, "juego-de-manos": true, percepcion: true },
    rasgos: ["Ataque furtivo 2d6", "Esquiva", "Visión en la oscuridad", "Herramientas de ladrón"],
    inventario: [
      { nombre: "Dagas", cantidad: 2, detalle: "1d4+3" },
      { nombre: "Herramientas de ladrón", cantidad: 1, detalle: "" },
      { nombre: "Cuerda de seda", cantidad: 1, detalle: "15 m" },
    ],
    notas: ["Contacto en la guild de ladrones del puerto.", "Debe un favor a la capitana."],
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
    salvaciones: { str: false, dex: false, con: true, int: false, wis: true, cha: false },
    habilidades: { religion: true, medicina: true, perspicacia: true },
    rasgos: ["Canalizar divinidad", "Resistencia enana", "Palabra curativa 1d8+3"],
    inventario: [
      { nombre: "Martillo de guerra", cantidad: 1, detalle: "1d8+2" },
      { nombre: "Símbolo sagrado", cantidad: 1, detalle: "de Moradin" },
      { nombre: "Poción de curación", cantidad: 2, detalle: "2d4+2" },
    ],
    notas: ["Sirve a Moradin.", "Busca la forja perdida de su clan."],
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
    salvaciones: { str: false, dex: false, con: false, int: true, wis: true, cha: false },
    habilidades: { arcano: true, historia: true, investigacion: true },
    rasgos: ["Rayo de fuego 2d6", "Escudo arcano", "Trance élfico", "Bola de fuego"],
    inventario: [
      { nombre: "Grimorio", cantidad: 1, detalle: "3 conjuros" },
      { nombre: "Componentes", cantidad: 1, detalle: "bolsa" },
      { nombre: "Poción de curación", cantidad: 1, detalle: "2d4+2" },
    ],
    notas: ["Busca el grimorio perdido de su maestro."],
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

  montarFicha($("#panel-ficha"));
  montarDialogoFicha();
  montarPjs($("#lista-pjs"));

  conectarControles();
  store.alCambiar(programarRender);

  $("#rol").textContent = ROL_ETIQUETA[store.rol] ?? store.rol;
  $("#rol").dataset.rol = store.rol;

  let tamanoGuardado = null;
  try {
    tamanoGuardado = localStorage.getItem(CLAVE_TAMANO);
  } catch {
    tamanoGuardado = null;
  }
  if (tamanoGuardado === "grande") aplicarTamano(true, false);

  renderizar();
}

/** Cambia entre el panel compacto (400×680) y el ancho (760×860). */
async function aplicarTamano(grande, persistir = true) {
  document.body.classList.toggle("panel-grande", grande);
  const boton = $("#btn-tamano");
  if (boton) {
    boton.textContent = grande ? "⤡" : "⤢";
    boton.title = grande ? "Reducir panel" : "Ampliar panel";
    boton.setAttribute("aria-label", boton.title);
  }

  try {
    if (typeof OBR.action?.setWidth === "function") {
      await OBR.action.setWidth(grande ? 760 : 400);
      await OBR.action.setHeight(grande ? 860 : 680);
    }
  } catch (error) {
    console.warn("[Mesa de Héroes] no se pudo cambiar el tamaño del panel", error);
  }

  if (!persistir) return;
  try {
    localStorage.setItem(CLAVE_TAMANO, grande ? "grande" : "normal");
  } catch {
    /* almacenamiento no disponible */
  }
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
    const pjs = store.personajes.length;
    const conVida = [...store.tokens.values()].filter((token) => token.datos).length;
    subtitulo.textContent = `${pjs} PJ${pjs === 1 ? "" : "s"} · ${conVida} token${conVida === 1 ? "" : "s"} con vida`;
  }
  pintarFicha();
  pintarPjs();
  pintarFichaCompleta();
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
  if (nombre === "ficha") pintarFicha();
  if (nombre === "pjs") pintarPjs();
  if (nombre === "ajustes") pintarAjustes();
}

/* ------------------------------------------------------------------- ajustes */

function pintarAjustes() {
  const contenedor = $("#panel-ajustes");
  if (!contenedor) return;

  const vinculados = store.vinculos.size;

  contenedor.innerHTML = `
    <div class="ajustes">
      <fieldset>
        <legend>Biblioteca de PJs</legend>
        <div class="btn-fila">
          <button class="btn" data-aj="exportar">Exportar biblioteca</button>
          <button class="btn" data-aj="importar">Importar biblioteca</button>
          <button class="btn" data-aj="ejemplo">Cargar ejemplo</button>
        </div>
        <p class="ayuda">Los PJs se guardan en la sala y los ve todo el mundo. Exporta de vez en cuando para tener copia.</p>
      </fieldset>

      <fieldset>
        <legend>Información</legend>
        <p class="ayuda">
          <strong>Mesa de Héroes</strong> · por <strong>Thedibus</strong><br />
          Rol: ${esc(ROL_ETIQUETA[store.rol] ?? store.rol)}<br />
          Sala: <span title="${esc(OBR.room.id)}">${esc(OBR.room.id.slice(0, 8))}…</span><br />
          PJs: ${store.personajes.length} · Tokens vinculados: ${vinculados}
        </p>
      </fieldset>

      <fieldset>
        <legend>Zona peligrosa</legend>
        <div class="btn-fila">
          <button class="btn peligro" data-aj="borrar-todo">Borrar todos los PJs</button>
        </div>
        <p class="ayuda">Los tokens vinculados quedarán sin ficha, pero sus burbujas se conservan.</p>
      </fieldset>
    </div>`;
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

  // La copia incluye los PG/CA que se ven ahora mismo, no solo los de la ficha:
  // así una restauración no pierde la vida que había en los tokens.
  const personajes = store.personajes.map((pj) => {
    const est = estadisticasDe(pj);
    if (!est) return pj;
    return { ...pj, hp: est.hp, hpMax: est.hpMax, ac: est.ac };
  });

  descargarJson("mesa-de-heroes-pjs.json", {
    version: 2,
    exportado: new Date().toISOString(),
    personajes,
  });
  toast("Biblioteca exportada", "ok");
}

async function importarBiblioteca(archivo) {
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
    await desvincularTodosLosTokens();
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
  $("#btn-importar-pj")?.addEventListener("click", () => $("#input-pj").click());
  $("#btn-tamano")?.addEventListener("click", () => {
    aplicarTamano(!document.body.classList.contains("panel-grande"));
  });

  $("#input-pj")?.addEventListener("change", (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (archivo) importarPersonaje(archivo);
  });

  $("#input-archivo")?.addEventListener("change", (evento) => {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (archivo) importarBiblioteca(archivo);
  });

  $("#panel-ajustes")?.addEventListener("click", alClicAjustes);

  document.addEventListener("mdh:ejemplo", cargarEjemplo);

  document.addEventListener("mdh:abrir-ficha", async (evento) => {
    const id = evento.detail?.id;
    if (id) await setActivo(id);
    activarPanel("ficha");
    pintarFicha();
  });

  $("#dialogo-pj")?.addEventListener("cancel", (evento) => evento.preventDefault());
}

/* -------------------------------------------------------------------- inicio */

if (OBR.isAvailable) {
  OBR.onReady(arrancar);
} else if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", arrancar);
} else {
  arrancar();
}

