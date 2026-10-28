/** Utilidades pequeñas y sin dependencias. */

export const $ = (selector, raiz = document) => raiz.querySelector(selector);
export const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

/** Identificador corto y único para PJs y tiradas. */
export function uid(prefijo = "id") {
  return `${prefijo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function clamp(valor, minimo, maximo) {
  const n = Number(valor);
  if (!Number.isFinite(n)) return minimo;
  return Math.min(maximo, Math.max(minimo, n));
}

const ENTIDADES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapa texto antes de inyectarlo en plantillas HTML. */
export function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

/** 5 -> "+5", -2 -> "-2", 0 -> "+0". */
export function conSigno(valor) {
  const n = Number(valor) || 0;
  return n >= 0 ? `+${n}` : `${n}`;
}

export function horaCorta(marca) {
  try {
    return new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" }).format(new Date(marca));
  } catch {
    return "--:--";
  }
}

/** Muestra un aviso efímero en la esquina inferior. */
export function toast(mensaje, tipo = "info", ms = 2800) {
  const contenedor = document.getElementById("toasts");
  if (!contenedor) return;
  const nodo = document.createElement("div");
  nodo.className = "toast";
  nodo.dataset.tipo = tipo;
  nodo.textContent = mensaje;
  contenedor.append(nodo);
  setTimeout(() => {
    nodo.classList.add("saliendo");
    setTimeout(() => nodo.remove(), 220);
  }, ms);
}

/** Espera a que una condición sea verdadera (con límite de intentos). */
export function esperar(condicion, { intentos = 40, pausa = 100 } = {}) {
  return new Promise((resolver, rechazar) => {
    let restantes = intentos;
    const probar = () => {
      let resultado = false;
      try {
        resultado = condicion();
      } catch {
        resultado = false;
      }
      if (resultado) return resolver(resultado);
      if (--restantes <= 0) return rechazar(new Error("Tiempo de espera agotado"));
      setTimeout(probar, pausa);
    };
    probar();
  });
}

/** Descarga un objeto como archivo JSON. */
export function descargarJson(nombre, datos) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lee un archivo de texto elegido por el usuario. */
export function leerArchivo(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result ?? ""));
    lector.onerror = () => rechazar(lector.error ?? new Error("No se pudo leer el archivo"));
    lector.readAsText(archivo);
  });
}

/**
 * Confirmación con un diálogo propio (los iframes de Owlbear Rodeo pueden
 * bloquear window.confirm). Devuelve una promesa con true/false.
 */
export function confirmar(mensaje, { titulo = "Confirmar", boton = "Sí, continuar" } = {}) {
  const dialogo = document.getElementById("dialogo-confirmar");
  if (!dialogo) return Promise.resolve(window.confirm(mensaje));

  document.getElementById("confirmar-titulo").textContent = titulo;
  document.getElementById("confirmar-texto").textContent = mensaje;
  const botonSi = document.getElementById("confirmar-si");
  if (botonSi) botonSi.textContent = boton;
  dialogo.returnValue = "";

  return new Promise((resolver) => {
    dialogo.addEventListener("close", () => resolver(dialogo.returnValue === "si"), { once: true });
    if (!dialogo.open) dialogo.showModal();
  });
}
