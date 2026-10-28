/**
 * Modelo de personaje: creación, normalización y valores derivados.
 * Los datos viven en los metadatos de la sala, así que todo se guarda
 * como JSON plano (sin clases ni referencias).
 */

import { clamp, uid } from "./util.js";

export const CARACTERISTICAS = [
  { clave: "str", abrev: "FUE", nombre: "Fuerza" },
  { clave: "dex", abrev: "DES", nombre: "Destreza" },
  { clave: "con", abrev: "CON", nombre: "Constitución" },
  { clave: "int", abrev: "INT", nombre: "Inteligencia" },
  { clave: "wis", abrev: "SAB", nombre: "Sabiduría" },
  { clave: "cha", abrev: "CAR", nombre: "Carisma" },
];

export const abrev = (clave) => CARACTERISTICAS.find((c) => c.clave === clave)?.abrev ?? "???";

/** Las 18 habilidades de D&D 5e, cada una ligada a una característica. */
export const HABILIDADES = [
  { clave: "atletismo", nombre: "Atletismo", caracteristica: "str" },
  { clave: "acrobacias", nombre: "Acrobacias", caracteristica: "dex" },
  { clave: "juego-de-manos", nombre: "Juego de manos", caracteristica: "dex" },
  { clave: "sigilo", nombre: "Sigilo", caracteristica: "dex" },
  { clave: "arcano", nombre: "Arcano", caracteristica: "int" },
  { clave: "historia", nombre: "Historia", caracteristica: "int" },
  { clave: "investigacion", nombre: "Investigación", caracteristica: "int" },
  { clave: "naturaleza", nombre: "Naturaleza", caracteristica: "int" },
  { clave: "religion", nombre: "Religión", caracteristica: "int" },
  { clave: "trato-animales", nombre: "Trato con animales", caracteristica: "wis" },
  { clave: "perspicacia", nombre: "Perspicacia", caracteristica: "wis" },
  { clave: "medicina", nombre: "Medicina", caracteristica: "wis" },
  { clave: "percepcion", nombre: "Percepción", caracteristica: "wis" },
  { clave: "supervivencia", nombre: "Supervivencia", caracteristica: "wis" },
  { clave: "engano", nombre: "Engaño", caracteristica: "cha" },
  { clave: "intimidacion", nombre: "Intimidación", caracteristica: "cha" },
  { clave: "interpretacion", nombre: "Interpretación", caracteristica: "cha" },
  { clave: "persuasion", nombre: "Persuasión", caracteristica: "cha" },
];

export function modificador(puntuacion) {
  return Math.floor((clamp(puntuacion, 1, 40) - 10) / 2);
}

export function bonoCompetencia(nivel) {
  return 2 + Math.floor((clamp(nivel, 1, 20) - 1) / 4);
}

/** Plantilla de un PJ nuevo. */
export function personajeNuevo(extra = {}) {
  const base = {
    id: uid("pj"),
    nombre: "Nuevo PJ",
    clase: "",
    nivel: 1,
    hp: 10,
    hpMax: 10,
    ac: 10,
    velocidad: 30,
    caracteristicas: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    bonoCompetencia: null,
    salvaciones: { str: false, dex: false, con: false, int: false, wis: false, cha: false },
    habilidades: {},
    rasgos: [],
    notas: "",
    actualizado: Date.now(),
  };
  return normalizar({ ...base, ...extra });
}

const numeroOpcional = (valor, minimo, maximo) => {
  if (valor === null || valor === undefined || valor === "") return null;
  return clamp(valor, minimo, maximo);
};

/** Convierte cualquier entrada en un PJ válido y completo. */
export function normalizar(bruto = {}) {
  const nivel = clamp(bruto.nivel ?? 1, 1, 20);
  const caracteristicas = {};
  for (const { clave } of CARACTERISTICAS) {
    caracteristicas[clave] = clamp(bruto.caracteristicas?.[clave] ?? 10, 1, 40);
  }
  const hpMax = clamp(bruto.hpMax ?? 10, 1, 9999);
  const salvaciones = {};
  for (const { clave } of CARACTERISTICAS) {
    salvaciones[clave] = Boolean(bruto.salvaciones?.[clave]);
  }

  const habilidades = {};
  for (const { clave } of HABILIDADES) {
    habilidades[clave] = Boolean(bruto.habilidades?.[clave]);
  }

  const rasgos = Array.isArray(bruto.rasgos)
    ? bruto.rasgos
        .map((rasgo) => String(rasgo ?? "").trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 60)
    : [];

  return {
    id: typeof bruto.id === "string" && bruto.id.length > 0 ? bruto.id : uid("pj"),
    nombre: String(bruto.nombre ?? "PJ sin nombre").trim().slice(0, 60) || "PJ sin nombre",
    clase: String(bruto.clase ?? "").trim().slice(0, 40),
    nivel,
    hp: clamp(bruto.hp ?? hpMax, 0, hpMax),
    hpMax,
    ac: clamp(bruto.ac ?? 10, 1, 99),
    velocidad: clamp(bruto.velocidad ?? 30, 0, 300),
    caracteristicas,
    bonoCompetencia: numeroOpcional(bruto.bonoCompetencia, 0, 20),
    salvaciones,
    habilidades,
    rasgos,
    notas: String(bruto.notas ?? "").slice(0, 2000),
    actualizado: Number(bruto.actualizado) || Date.now(),
  };
}

/** Valores calculados que no se guardan. */
export function derivar(pj) {
  const competencia = pj.bonoCompetencia ?? bonoCompetencia(pj.nivel);
  const mods = {};
  for (const { clave } of CARACTERISTICAS) mods[clave] = modificador(pj.caracteristicas[clave]);

  const salvaciones = {};
  for (const { clave } of CARACTERISTICAS) {
    salvaciones[clave] = mods[clave] + (pj.salvaciones[clave] ? competencia : 0);
  }

  const habilidades = {};
  for (const habilidad of HABILIDADES) {
    habilidades[habilidad.clave] =
      mods[habilidad.caracteristica] + (pj.habilidades[habilidad.clave] ? competencia : 0);
  }

  return {
    competencia,
    mods,
    salvaciones,
    habilidades,
    iniciativa: mods.dex,
    hpPct: pj.hpMax > 0 ? pj.hp / pj.hpMax : 0,
  };
}

/** "ok" | "aviso" | "critico" | "vacio" según el porcentaje de vida. */
export function estadoVida(hp, hpMax) {
  if (!hpMax || hpMax <= 0) return "vacio";
  if (hp <= 0) return "critico";
  const pct = hp / hpMax;
  if (pct <= 0.25) return "critico";
  if (pct <= 0.5) return "aviso";
  return "ok";
}

export function resumenClase(pj) {
  return [pj.clase, pj.nivel > 0 ? `nivel ${pj.nivel}` : ""].filter(Boolean).join(" · ");
}
