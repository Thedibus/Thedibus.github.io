/** Ventanas ligeras: tamaño, arrastre y límites dentro del panel. */

const CLAVE_POS = "mdh:ventana:";
const MARGEN = 12;

let arrastre = null;
let globales = false;
let pendienteResize = false;

export const controlesVentana = () => `<div class="ventana-controles">
  <button type="button" class="btn-ventana" data-ventana="tamano" title="Ampliar ventana" aria-label="Ampliar ventana">⤢</button>
  <button type="button" class="btn-ventana" data-cerrar title="Cerrar" aria-label="Cerrar">✕</button>
</div>`;

function claveDe(dialogo) {
  return dialogo.dataset.ventanaClave || "ventana";
}

function actualizarBoton(dialogo) {
  const boton = dialogo.querySelector('[data-ventana="tamano"]');
  if (!boton) return;
  const grande = dialogo.classList.contains("ventana-grande");
  boton.textContent = grande ? "⤡" : "⤢";
  boton.title = grande ? "Reducir ventana" : "Ampliar ventana";
  boton.setAttribute("aria-label", boton.title);
}

/** Repinta el icono de tamaño tras volver a generar el contenido. */
export function sincronizarVentana(dialogo) {
  if (dialogo) actualizarBoton(dialogo);
}

function leerPos(dialogo) {
  try {
    const bruto = localStorage.getItem(CLAVE_POS + claveDe(dialogo));
    if (!bruto) return { dx: 0, dy: 0 };
    const pos = JSON.parse(bruto);
    return { dx: Number(pos.dx) || 0, dy: Number(pos.dy) || 0 };
  } catch {
    return { dx: 0, dy: 0 };
  }
}

function guardarPos(dialogo) {
  try {
    localStorage.setItem(
      CLAVE_POS + claveDe(dialogo),
      JSON.stringify({
        dx: Math.round(Number(dialogo.dataset.dx) || 0),
        dy: Math.round(Number(dialogo.dataset.dy) || 0),
      })
    );
  } catch {
    /* sin almacenamiento: la ventana sigue funcionando centrada */
  }
}

/** Mantiene la ventana dentro del panel, con un margen fijo. */
function limitar(dialogo, dx, dy) {
  const ancho = document.documentElement.clientWidth || window.innerWidth;
  const alto = document.documentElement.clientHeight || window.innerHeight;
  const w = dialogo.offsetWidth;
  const h = dialogo.offsetHeight;
  const baseX = (ancho - w) / 2;
  const baseY = (alto - h) / 2;
  const fijar = (valor, minimo, maximo) =>
    minimo > maximo ? (minimo + maximo) / 2 : Math.min(maximo, Math.max(minimo, valor));
  return {
    dx: fijar(dx, MARGEN - baseX, ancho - MARGEN - baseX - w),
    dy: fijar(dy, MARGEN - baseY, alto - MARGEN - baseY - h),
  };
}

function aplicar(dialogo, dx, dy, persistir = false) {
  const pos = limitar(dialogo, dx, dy);
  dialogo.dataset.dx = String(pos.dx);
  dialogo.dataset.dy = String(pos.dy);
  dialogo.style.transform = `translate(${pos.dx}px, ${pos.dy}px)`;
  if (persistir) guardarPos(dialogo);
}

/** Coloca la ventana en su última posición, siempre dentro del panel. */
export function colocarVentana(dialogo) {
  if (!dialogo || arrastre) return;
  const { dx, dy } = leerPos(dialogo);
  aplicar(dialogo, dx, dy);
}

/** Tamano inicial: pequena si el panel esta reducido, ampliada si no. */
export function ajustarVentana(dialogo, forzar = null) {
  if (!dialogo) return;

  // Solo una ventana de contenido a la vez; la confirmacion puede superponerse.
  for (const otra of document.querySelectorAll("dialog[open]")) {
    if (otra !== dialogo && otra.id !== "dialogo-confirmar") otra.close();
  }

  const grande =
    typeof forzar === "boolean"
      ? forzar
      : document.body.classList.contains("panel-grande") || window.innerWidth >= 700;
  dialogo.classList.toggle("ventana-grande", grande);
  actualizarBoton(dialogo);
  requestAnimationFrame(() => colocarVentana(dialogo));
}

/** Gestiona el boton de tamano. Devuelve true si era su clic. */
export function manejarVentana(evento, dialogo) {
  const boton = evento.target.closest('[data-ventana="tamano"]');
  if (!boton || !dialogo) return false;
  dialogo.classList.toggle("ventana-grande");
  actualizarBoton(dialogo);
  requestAnimationFrame(() => colocarVentana(dialogo));
  return true;
}

/** Arrastre por la cabecera, con captura de puntero y límites. */
export function montarVentana(dialogo, clave) {
  if (!dialogo || dialogo.dataset.ventanaMontada) return;
  dialogo.dataset.ventanaMontada = "1";
  dialogo.dataset.ventanaClave = clave;
  montarGlobales();

  dialogo.addEventListener("pointerdown", (evento) => {
    if (evento.button !== 0) return;
    const cabecera = evento.target.closest(".dialogo-cabecera");
    if (!cabecera || evento.target.closest("button, a, input, select, textarea")) return;
    arrastre = {
      dialogo,
      id: evento.pointerId,
      x: evento.clientX,
      y: evento.clientY,
      dx: Number(dialogo.dataset.dx) || 0,
      dy: Number(dialogo.dataset.dy) || 0,
    };
    dialogo.classList.add("arrastrando");
    try {
      cabecera.setPointerCapture(evento.pointerId);
    } catch {
      /* sin captura, el arrastre sigue con los listeners globales */
    }
    evento.preventDefault();
  });
}

function montarGlobales() {
  if (globales) return;
  globales = true;

  window.addEventListener(
    "pointermove",
    (evento) => {
      if (!arrastre || evento.pointerId !== arrastre.id) return;
      const dx = arrastre.dx + (evento.clientX - arrastre.x);
      const dy = arrastre.dy + (evento.clientY - arrastre.y);
      const pos = limitar(arrastre.dialogo, dx, dy);
      arrastre.dialogo.dataset.dx = String(pos.dx);
      arrastre.dialogo.dataset.dy = String(pos.dy);
      arrastre.dialogo.style.transform = `translate(${pos.dx}px, ${pos.dy}px)`;
    },
    { passive: true }
  );

  const soltar = (evento) => {
    if (!arrastre || (evento.pointerId !== undefined && evento.pointerId !== arrastre.id)) return;
    const dialogo = arrastre.dialogo;
    dialogo.classList.remove("arrastrando");
    guardarPos(dialogo);
    arrastre = null;
  };
  window.addEventListener("pointerup", soltar);
  window.addEventListener("pointercancel", soltar);

  window.addEventListener("resize", () => {
    if (pendienteResize) return;
    pendienteResize = true;
    requestAnimationFrame(() => {
      pendienteResize = false;
      for (const dialogo of document.querySelectorAll("dialog[open]")) colocarVentana(dialogo);
    });
  });
}
