/** Piezas de interfaz compartidas por la ficha y la tarjeta del token. */

import { CARACTERISTICAS, derivar, estadoVida } from "../model.js";
import { conSigno, esc } from "../util.js";

export function mensajeEstado(contexto) {
  switch (contexto?.estado) {
    case "sin-escena":
      return "Abre una escena para usar los tokens";
    case "multiple":
      return "Selecciona un solo token";
    case "sin-seleccion":
      return "Selecciona un token en el mapa";
    default:
      return "No hay ningún token seleccionado";
  }
}

/** Rejilla de las seis características: abreviatura arriba, modulador y valor. */
export function bloqueStats(pj) {
  const d = derivar(pj);
  return `<div class="stats">
    ${CARACTERISTICAS.map(
      (c) => `<div class="stat" title="${c.nombre}">
        <span class="stat-abbr">${c.abrev}</span>
        <b class="stat-mod">${conSigno(d.mods[c.clave])}</b>
        <span class="stat-score">${pj.caracteristicas[c.clave]}</span>
      </div>`
    ).join("")}
  </div>`;
}

/** Lista de rasgos como etiquetas. `maximo` recorta y añade «+N más». */
export function bloqueRasgos(pj, maximo = 0) {
  if (!pj.rasgos || pj.rasgos.length === 0) {
    return `<p class="ayuda">Sin rasgos anotados.</p>`;
  }
  const visibles = maximo > 0 ? pj.rasgos.slice(0, maximo) : pj.rasgos;
  const resto = pj.rasgos.length - visibles.length;
  return `<div class="rasgos">
    ${visibles.map((rasgo) => `<span class="chip">${esc(rasgo)}</span>`).join("")}
    ${resto > 0 ? `<span class="chip chip-tenue">+${resto} más</span>` : ""}
  </div>`;
}

/** Bloque de vida + CA, con máscara si el director ocultó las estadísticas. */
export function bloqueVida(pj, est, { oculto = false } = {}) {
  const hp = oculto ? null : est.hp;
  const hpMax = oculto ? null : est.hpMax;
  const ac = oculto ? null : est.ac;
  const estado = estadoVida(hp, hpMax);
  const pct = hpMax && hpMax > 0 ? Math.round(Math.min(100, Math.max(0, (hp / hpMax) * 100))) : 0;

  return `<div class="ficha-vida">
    <div class="pv">
      <div class="pv-texto">
        <span>Puntos de golpe</span>
        <b>${oculto ? "—" : `${hp} / ${hpMax}`}</b>
      </div>
      <div class="pv-barra" data-estado="${estado}"><i style="width:${pct}%"></i></div>
      ${!oculto && est.temp > 0 ? `<span class="pv-temp">+${est.temp} PG temporales</span>` : ""}
    </div>
    <div class="ca"><b>${oculto ? "—" : ac}</b><span>CA</span></div>
  </div>`;
}
