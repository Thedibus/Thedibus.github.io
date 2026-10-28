/** Diálogo de creación y edición de fichas. */

import { escribirBurbujas } from "../bubbles.js";
import { CARACTERISTICAS, bonoCompetencia, modificador, normalizar, personajeNuevo } from "../model.js";
import { estadisticasDe, guardarPersonaje } from "../store.js";
import { $, conSigno, esc, toast } from "../util.js";

function plantilla(pj, esNuevo, est) {
  const mods = Object.fromEntries(CARACTERISTICAS.map((c) => [c.clave, modificador(pj.caracteristicas[c.clave])]));
  const competenciaAuto = bonoCompetencia(pj.nivel);

  return `
  <form novalidate>
    <header class="dialogo-cabecera">
      <h2>${esNuevo ? "Nuevo personaje" : "Editar ficha"}</h2>
      <button type="button" class="btn icono" data-cerrar aria-label="Cerrar">✕</button>
    </header>

    <div class="dialogo-cuerpo">
      ${
        est?.tokenId
          ? `<p class="ayuda">Vinculado a <strong>${esc(est.tokenNombre ?? "un token")}</strong>. Los PG y la CA de aquí se copian también a las burbujas del token.</p>`
          : ""
      }

      <div class="grid-2">
        <label class="campo">
          <span class="etiqueta">Nombre</span>
          <input name="nombre" required maxlength="60" autocomplete="off" value="${esc(pj.nombre)}" />
        </label>
        <label class="campo">
          <span class="etiqueta">Clase</span>
          <input name="clase" maxlength="40" autocomplete="off" value="${esc(pj.clase)}" />
        </label>
      </div>

      <div class="grid-3">
        <label class="campo">
          <span class="etiqueta">Nivel</span>
          <input name="nivel" type="number" min="1" max="20" value="${pj.nivel}" />
        </label>
        <label class="campo">
          <span class="etiqueta">Velocidad</span>
          <input name="velocidad" type="number" min="0" max="300" value="${pj.velocidad}" />
        </label>
        <label class="campo">
          <span class="etiqueta">Bono comp.</span>
          <input name="bonoCompetencia" type="number" min="0" max="20" placeholder="auto ${conSigno(competenciaAuto)}"
                 value="${pj.bonoCompetencia === null ? "" : pj.bonoCompetencia}" />
        </label>
      </div>

      <div class="grid-3">
        <label class="campo">
          <span class="etiqueta">PG actuales</span>
          <input name="hp" type="number" min="0" max="9999" value="${pj.hp}" />
        </label>
        <label class="campo">
          <span class="etiqueta">PG máximos</span>
          <input name="hpMax" type="number" min="1" max="9999" value="${pj.hpMax}" />
        </label>
        <label class="campo">
          <span class="etiqueta">CA</span>
          <input name="ac" type="number" min="1" max="99" value="${pj.ac}" />
        </label>
      </div>

      <fieldset>
        <legend>Características</legend>
        <div class="grid-3">
          ${CARACTERISTICAS.map(
            (c) => `
            <div class="caracteristica">
              <span class="etiqueta" title="${c.nombre}">${c.abrev}</span>
              <input type="number" min="1" max="40" name="car-${c.clave}" data-car="${c.clave}" value="${pj.caracteristicas[c.clave]}" />
              <span class="mod" data-mod="${c.clave}">${conSigno(mods[c.clave])}</span>
            </div>`
          ).join("")}
        </div>
      </fieldset>

      <fieldset>
        <legend>Salvaciones competentes</legend>
        <div class="salvaciones">
          ${CARACTERISTICAS.map(
            (c) => `<label><input type="checkbox" name="sal-${c.clave}" ${pj.salvaciones[c.clave] ? "checked" : ""} />${c.abrev}</label>`
          ).join("")}
        </div>
      </fieldset>

      <label class="campo">
        <span class="etiqueta">Rasgos y habilidades</span>
        <textarea name="rasgos" rows="4" placeholder="Uno por línea:&#10;Ataque furtivo 2d6&#10;Visión en la oscuridad&#10;Esquiva">${esc((pj.rasgos ?? []).join("\n"))}</textarea>
        <span class="ayuda">Un rasgo por línea. Se muestran como etiquetas en la ficha.</span>
      </label>

      <label class="campo">
        <span class="etiqueta">Notas</span>
        <textarea name="notas" rows="3" maxlength="2000" placeholder="Objetos, contactos, recordatorios…">${esc(pj.notas)}</textarea>
      </label>
    </div>

    <footer class="dialogo-pie">
      <button type="button" class="btn" data-cerrar>Cancelar</button>
      <button type="submit" class="btn primario">${esNuevo ? "Crear PJ" : "Guardar cambios"}</button>
    </footer>
  </form>`;
}

/** Abre el diálogo. Sin argumento crea un PJ nuevo. */
export function abrirEditor(pj = null) {
  const dialogo = $("#dialogo-pj");
  if (!dialogo) return;

  const esNuevo = !pj;
  const base = pj ?? personajeNuevo();
  const est = pj ? estadisticasDe(pj) : null;

  // Si está vinculado, los PG/CA que se editan son los vivos del token.
  const modelo = normalizar({
    ...base,
    hp: est ? est.hp : base.hp,
    hpMax: est && est.hpMax > 0 ? est.hpMax : base.hpMax,
    ac: est && est.ac > 0 ? est.ac : base.ac,
  });

  dialogo.innerHTML = plantilla(modelo, esNuevo, est);

  const formulario = dialogo.querySelector("form");
  const campoNivel = formulario.elements.nivel;
  const campoComp = formulario.elements.bonoCompetencia;

  const refrescarCompetencia = () => {
    if (campoComp.value !== "") return;
    campoComp.placeholder = `auto ${conSigno(bonoCompetencia(campoNivel.value))}`;
  };
  campoNivel.addEventListener("input", refrescarCompetencia);

  for (const entrada of formulario.querySelectorAll("[data-car]")) {
    entrada.addEventListener("input", () => {
      const salida = formulario.querySelector(`[data-mod="${entrada.dataset.car}"]`);
      if (salida) salida.textContent = conSigno(modificador(entrada.value));
    });
  }

  for (const cerrar of dialogo.querySelectorAll("[data-cerrar]")) {
    cerrar.addEventListener("click", () => dialogo.close());
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const boton = formulario.querySelector('[type="submit"]');
    const datos = recoger(formulario, modelo);

    if (!datos.nombre.trim()) {
      toast("Ponle un nombre al personaje", "aviso");
      formulario.elements.nombre.focus();
      return;
    }

    boton.disabled = true;
    boton.textContent = "Guardando…";
    try {
      const guardado = await guardarPersonaje(datos);
      const vinculado = estadisticasDe(guardado);
      if (vinculado?.tokenId) {
        await escribirBurbujas(vinculado.tokenId, {
          hp: guardado.hp,
          hpMax: guardado.hpMax,
          ac: guardado.ac,
        });
      }
      dialogo.close();
      toast(esNuevo ? `«${guardado.nombre}» se unió a la mesa` : "Ficha guardada", "ok");
    } catch (error) {
      console.error(error);
      toast("No se pudo guardar la ficha", "error");
    } finally {
      boton.disabled = false;
      boton.textContent = esNuevo ? "Crear PJ" : "Guardar cambios";
    }
  });

  if (dialogo.open) dialogo.close();
  dialogo.showModal();
  setTimeout(() => formulario.elements.nombre.select?.(), 60);
}

function recoger(formulario, base) {
  const datos = new FormData(formulario);
  const caracteristicas = {};
  const salvaciones = {};
  for (const { clave } of CARACTERISTICAS) {
    caracteristicas[clave] = Number(datos.get(`car-${clave}`));
    salvaciones[clave] = datos.get(`sal-${clave}`) !== null;
  }
  const opcional = (valor) => (valor === null || String(valor).trim() === "" ? null : Number(valor));

  const rasgos = String(datos.get("rasgos") ?? "")
    .split("\n")
    .map((linea) => linea.trim())
    .filter(Boolean);

  return {
    ...base,
    nombre: String(datos.get("nombre") ?? "").trim(),
    clase: String(datos.get("clase") ?? "").trim(),
    nivel: Number(datos.get("nivel")),
    hp: Number(datos.get("hp")),
    hpMax: Number(datos.get("hpMax")),
    ac: Number(datos.get("ac")),
    velocidad: Number(datos.get("velocidad")),
    bonoCompetencia: opcional(datos.get("bonoCompetencia")),
    rasgos,
    notas: String(datos.get("notas") ?? ""),
    caracteristicas,
    salvaciones,
  };
}
