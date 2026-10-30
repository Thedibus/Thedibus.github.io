/** Controles de ventana compartidos por la ficha y el editor. */

export const controlesVentana = () => `<div class="ventana-controles">
  <button type="button" class="btn-ventana" data-ventana="tamano" title="Ampliar ventana" aria-label="Ampliar ventana">⤢</button>
  <button type="button" class="btn-ventana" data-cerrar title="Cerrar" aria-label="Cerrar">✕</button>
</div>`;

function actualizarBoton(dialogo) {
  const boton = dialogo.querySelector('[data-ventana="tamano"]');
  if (!boton) return;
  const grande = dialogo.classList.contains("ventana-grande");
  boton.textContent = grande ? "⤡" : "⤢";
  boton.title = grande ? "Reducir ventana" : "Ampliar ventana";
  boton.setAttribute("aria-label", boton.title);
}

/** Deja la ventana ampliada si el panel ya está ampliado. */
export function ajustarVentana(dialogo) {
  if (!dialogo) return;
  const grande = document.body.classList.contains("panel-grande") || window.innerWidth >= 700;
  dialogo.classList.toggle("ventana-grande", grande);
  actualizarBoton(dialogo);
}

/** Gestiona el botón de tamaño. Devuelve true si era su clic. */
export function manejarVentana(evento, dialogo) {
  const boton = evento.target.closest('[data-ventana="tamano"]');
  if (!boton || !dialogo) return false;
  dialogo.classList.toggle("ventana-grande");
  actualizarBoton(dialogo);
  return true;
}
