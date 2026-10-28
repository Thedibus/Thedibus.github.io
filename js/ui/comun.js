/** Piezas de interfaz compartidas por la ficha y la tarjeta del token. */

import { CARACTERISTICAS, HABILIDADES, abrev, derivar, estadoVida } from "../model.js";
import { conSigno, esc } from "../util.js";

/** Retrato del token vinculado; si no hay token, la inicial del PJ. */
export function bloqueRetrato(pj, est, { grande = false } = {}) {
  const inicial = (pj?.nombre ?? "?").trim().charAt(0).toUpperCase() || "?";
  const url = est?.tokenImagen;
  return `<div class="retrato${grande ? " retrato-grande" : ""}">
    <span class="retrato-letra">${esc(inicial)}</span>
    ${url ? `<img src="${esc(url)}" alt="Retrato de ${esc(pj?.nombre ?? "")}" loading="lazy" onerror="this.remove()" />` : ""}
  </div>`;
}

/** Rejilla de las 18 habilidades con su bono total. */
export function rejillaHabilidades(pj) {
  const d = derivar(pj);
  return `<div class="habilidades">
    ${HABILIDADES.map((habilidad) => {
      const competente = pj.habilidades[habilidad.clave];
      return `<div class="habilidad${competente ? " es-competente" : ""}" title="${habilidad.nombre} (${abrev(habilidad.caracteristica)})">
        <span class="hab-punto"></span>
        <span class="hab-nombre">${habilidad.nombre}</span>
        <span class="hab-car">${abrev(habilidad.caracteristica)}</span>
        <b class="hab-bono">${conSigno(d.habilidades[habilidad.clave])}</b>
      </div>`;
    }).join("")}
  </div>`;
}

/** Etiquetas solo con las habilidades competentes (para la ficha compacta). */
export function chipsHabilidades(pj, maximo = 0) {
  const d = derivar(pj);
  const competentes = HABILIDADES.filter((habilidad) => pj.habilidades[habilidad.clave]);
  if (competentes.length === 0) return "";

  const visibles = maximo > 0 ? competentes.slice(0, maximo) : competentes;
  const resto = competentes.length - visibles.length;

  return `<div class="rasgos">
    ${visibles
      .map(
        (habilidad) =>
          `<span class="chip chip-hab">${habilidad.nombre} <b>${conSigno(d.habilidades[habilidad.clave])}</b></span>`
      )
      .join("")}
    ${resto > 0 ? `<span class="chip chip-tenue">+${resto} más</span>` : ""}
  </div>`;
}

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

  return `<div class="vida">
    <div class="vida-tiles">
      <div class="vida-tile">
        <span>PG</span>
        <b>${oculto ? "—" : `${hp}<s> / ${hpMax}</s>`}</b>
      </div>
      <div class="vida-tile">
        <span>CA</span>
        <b>${oculto ? "—" : ac}</b>
      </div>
      ${
        !oculto && est.temp > 0
          ? `<div class="vida-tile vida-temp"><span>TEMP</span><b>+${est.temp}</b></div>`
          : ""
      }
    </div>
    <div class="pv-barra" data-estado="${estado}"><i style="width:${pct}%"></i></div>
  </div>`;
}

/** Lista de notas, como filas de inventario. */
export function listaNotas(notas) {
  if (!notas || notas.length === 0) return `<p class="ayuda">Sin notas.</p>`;
  return `<ul class="lista-ficha">${notas.map((nota) => `<li>${esc(nota)}</li>`).join("")}</ul>`;
}

/** Inventario con cantidad y detalle. */
export function listaInventario(items) {
  if (!items || items.length === 0) return `<p class="ayuda">Inventario vacío.</p>`;
  return `<ul class="lista-ficha lista-inventario">
    ${items
      .map(
        (item) => `<li>
          <span class="inv-nombre">${esc(item.nombre)}</span>
          ${item.cantidad > 1 ? `<span class="inv-cant">×${item.cantidad}</span>` : ""}
          ${item.detalle ? `<span class="inv-detalle">${esc(item.detalle)}</span>` : ""}
        </li>`
      )
      .join("")}
  </ul>`;
}
