/**
 * Motor de dados: fórmulas tipo "2d6+3", tiradas de d20 con ventaja y
 * resolución del tipo de tirada (ataque, daño, salvación, prueba…).
 * Todo es aleatorio de verdad: no hay resultados pregrabados.
 */

import { abrev, derivar } from "./model.js";
import { conSigno } from "./util.js";

const azar = (caras) => Math.floor(Math.random() * caras);
const tirarDado = (caras) => 1 + azar(caras);

/** Tipos de tirada que entiende la extensión. */
export const TIPOS = [
  { id: "attack", nombre: "Ataque", simbolo: "⚔", ayuda: "d20 + bono de ataque", d20: true },
  { id: "damage", nombre: "Daño", simbolo: "🩸", ayuda: "Dados de daño; el crítico duplica los dados" },
  { id: "save", nombre: "Salvación", simbolo: "🛡", ayuda: "d20 + modificador + competencia", d20: true, habilidad: true },
  { id: "check", nombre: "Prueba", simbolo: "🎲", ayuda: "d20 + modificador de característica", d20: true, habilidad: true, competencia: true },
  { id: "initiative", nombre: "Iniciativa", simbolo: "⚡", ayuda: "d20 + modificador de DES", d20: true },
  { id: "heal", nombre: "Curación", simbolo: "✚", ayuda: "Dados de curación", formula: true },
  { id: "free", nombre: "Libre", simbolo: "🎯", ayuda: "Cualquier fórmula: 2d6+3", formula: true },
];

export const tipoPorId = (id) => TIPOS.find((t) => t.id === id) ?? TIPOS[0];

/* ------------------------------------------------------------------ fórmulas */

function textoFormula(terminos, plano) {
  const partes = terminos.map((t, indice) => {
    const cuerpo = `${Math.abs(t.cantidad)}d${t.caras}`;
    if (indice === 0) return t.cantidad < 0 ? `-${cuerpo}` : cuerpo;
    return t.cantidad < 0 ? `-${cuerpo}` : `+${cuerpo}`;
  });
  if (plano !== 0) partes.push(`${plano < 0 ? "-" : "+"}${Math.abs(plano)}`);
  return partes.join("") || "0";
}

/**
 * Lee una fórmula de dados.
 * @returns {{ok: true, terminos: Array<{cantidad: number, caras: number}>, plano: number, texto: string} | {ok: false, error: string}}
 */
export function parsearFormula(entrada) {
  const original = String(entrada ?? "").trim();
  if (!original) return { ok: false, error: "Escribe una fórmula, por ejemplo 2d6+3" };
  if (/\d\s+\d/.test(original)) {
    return { ok: false, error: "Separa los grupos de dados con + o −, por ejemplo 2d6 + 3" };
  }
  const limpio = original.toLowerCase().replace(/\s+/g, "").replace(/[−–]/g, "-");

  const patron = /([+-]?)(\d{0,3})d(\d{1,4})|([+-]?)(\d{1,4})/g;
  const terminos = [];
  let plano = 0;
  let consumido = 0;
  let coincidencia;

  while ((coincidencia = patron.exec(limpio)) !== null) {
    if (coincidencia.index !== consumido) {
      return { ok: false, error: `No entiendo «${limpio.slice(consumido, coincidencia.index)}»` };
    }
    consumido = patron.lastIndex;

    if (coincidencia[3] !== undefined) {
      const signo = coincidencia[1] === "-" ? -1 : 1;
      const cantidad = Math.max(1, Math.min(50, parseInt(coincidencia[2] || "1", 10))) * signo;
      const caras = parseInt(coincidencia[3], 10);
      if (caras < 2 || caras > 1000) return { ok: false, error: "Los dados deben tener entre 2 y 1000 caras" };
      terminos.push({ cantidad, caras });
    } else {
      const signo = coincidencia[4] === "-" ? -1 : 1;
      plano += signo * parseInt(coincidencia[5], 10);
    }
  }

  if (consumido !== limpio.length) return { ok: false, error: `No entiendo «${limpio.slice(consumido)}»` };
  if (terminos.length === 0 && plano === 0) return { ok: false, error: "La fórmula no suma nada" };
  if (terminos.length > 12) return { ok: false, error: "Demasiados grupos de dados" };

  return { ok: true, terminos, plano, texto: textoFormula(terminos, plano) };
}

/**
 * Tira una fórmula completa.
 * @param {string} formula
 * @param {{critico?: boolean}} opciones  el crítico duplica el número de dados, no el modificador
 */
export function tirarFormula(formula, { critico = false } = {}) {
  const leida = parsearFormula(formula);
  if (!leida.ok) return leida;

  const dados = leida.terminos.map((termino) => {
    const cantidad = Math.abs(termino.cantidad) * (critico ? 2 : 1);
    const valores = Array.from({ length: cantidad }, () => tirarDado(termino.caras));
    return { caras: termino.caras, valores, signo: termino.cantidad < 0 ? -1 : 1 };
  });

  const sumaDados = dados.reduce(
    (total, grupo) => total + grupo.signo * grupo.valores.reduce((a, b) => a + b, 0),
    0
  );

  return {
    ok: true,
    total: sumaDados + leida.plano,
    plano: leida.plano,
    texto: leida.texto,
    dados,
  };
}

/** d20 con ventaja ("ventaja"), desventaja ("desventaja") o normal. */
export function tirarD20(modificador, modo = "normal") {
  const valores = modo === "normal" ? [tirarDado(20)] : [tirarDado(20), tirarDado(20)];
  const conservado =
    modo === "ventaja" ? Math.max(...valores) : modo === "desventaja" ? Math.min(...valores) : valores[0];
  const modificadorNum = Number(modificador) || 0;
  return {
    valores,
    conservado,
    natural: conservado,
    mod: modificadorNum,
    total: conservado + modificadorNum,
    critico: conservado === 20,
    pifia: conservado === 1,
    modo,
  };
}

/* --------------------------------------------------------------- tipo de tirada */

const modAtaque = (pj, d) => (Number.isFinite(pj.bonoAtaque) ? pj.bonoAtaque : d.ataque);

const formulaDano = (pj, d) => {
  const propia = String(pj.dano ?? "").trim();
  if (propia) return propia;
  return d.mods.str === 0 ? "1d6" : `1d6${conSigno(d.mods.str)}`;
};

/** Texto de la fórmula y explicación, para el panel de dados. */
export function vistaPrevia(tipo, pj, opciones = {}) {
  if (!pj) return { formula: "—", nota: "Elige un personaje" };
  const d = derivar(pj);
  const habilidad = opciones.habilidad ?? "dex";

  switch (tipo) {
    case "attack": {
      const mod = modAtaque(pj, d);
      return { formula: `1d20 ${conSigno(mod)}`, nota: `Bono de ataque ${conSigno(mod)}` };
    }
    case "damage": {
      return {
        formula: formulaDano(pj, d),
        nota: opciones.critico ? "Crítico: se duplican los dados de daño" : "Dados de daño del personaje",
      };
    }
    case "save": {
      const mod = d.mods[habilidad] + (pj.salvaciones[habilidad] ? d.competencia : 0);
      return { formula: `1d20 ${conSigno(mod)}`, nota: `Salvación de ${abrev(habilidad)} ${conSigno(mod)}` };
    }
    case "check": {
      const mod = d.mods[habilidad] + (opciones.competente ? d.competencia : 0);
      return { formula: `1d20 ${conSigno(mod)}`, nota: `Prueba de ${abrev(habilidad)} ${conSigno(mod)}` };
    }
    case "initiative": {
      return { formula: `1d20 ${conSigno(d.iniciativa)}`, nota: `Iniciativa ${conSigno(d.iniciativa)}` };
    }
    case "heal":
      return { formula: opciones.formula || "1d8", nota: "Curación" };
    case "free":
      return { formula: opciones.formula || "1d20", nota: "Fórmula libre" };
    default:
      return { formula: "—", nota: "" };
  }
}

/**
 * Realiza la tirada y devuelve un resultado listo para pintar.
 * @returns {object} resultado o {ok:false, error}
 */
export function ejecutar(tipo, pj, opciones = {}) {
  if (!pj) return { ok: false, error: "Elige un personaje" };
  const d = derivar(pj);
  const base = { ok: true, tipo, personaje: { id: pj.id, nombre: pj.nombre }, modo: opciones.modo ?? "normal" };

  switch (tipo) {
    case "attack": {
      const mod = modAtaque(pj, d);
      const t = tirarD20(mod, opciones.modo);
      return finalizar({
        ...base,
        etiqueta: "Ataque",
        total: t.total,
        mod,
        formula: `1d20 ${conSigno(mod)}`,
        dados: t.valores.map((valor) => ({
          valor,
          caras: 20,
          descartado: t.valores.length > 1 && valor !== t.conservado,
        })),
        natural: t.natural,
        critico: t.critico,
        pifia: t.pifia,
        desglose: `d20 ${t.conservado} ${conSigno(mod)}`,
        puedeAplicar: null,
      });
    }

    case "damage": {
      const formula = formulaDano(pj, d);
      const t = tirarFormula(formula, { critico: Boolean(opciones.critico) });
      if (!t.ok) return { ok: false, error: `Daño: ${t.error}` };
      return finalizar({
        ...base,
        etiqueta: "Daño",
        total: t.total,
        formula: t.texto,
        dados: aplanarDados(t.dados),
        critico: Boolean(opciones.critico),
        pifia: false,
        desglose: desgloseFormula(t),
        puedeAplicar: "dano",
      });
    }

    case "save": {
      const habilidad = opciones.habilidad ?? "dex";
      const mod = d.mods[habilidad] + (pj.salvaciones[habilidad] ? d.competencia : 0);
      const t = tirarD20(mod, opciones.modo);
      return finalizar({
        ...base,
        etiqueta: `Salvación de ${abrev(habilidad)}`,
        total: t.total,
        mod,
        formula: `1d20 ${conSigno(mod)}`,
        dados: t.valores.map((valor) => ({
          valor,
          caras: 20,
          descartado: t.valores.length > 1 && valor !== t.conservado,
        })),
        natural: t.natural,
        critico: false,
        pifia: false,
        desglose: `d20 ${t.conservado} ${conSigno(mod)}`,
        puedeAplicar: null,
      });
    }

    case "check": {
      const habilidad = opciones.habilidad ?? "str";
      const mod = d.mods[habilidad] + (opciones.competente ? d.competencia : 0);
      const t = tirarD20(mod, opciones.modo);
      return finalizar({
        ...base,
        etiqueta: `Prueba de ${abrev(habilidad)}`,
        total: t.total,
        mod,
        formula: `1d20 ${conSigno(mod)}`,
        dados: t.valores.map((valor) => ({
          valor,
          caras: 20,
          descartado: t.valores.length > 1 && valor !== t.conservado,
        })),
        natural: t.natural,
        critico: false,
        pifia: false,
        desglose: `d20 ${t.conservado} ${conSigno(mod)}`,
        puedeAplicar: null,
      });
    }

    case "initiative": {
      const t = tirarD20(d.iniciativa, opciones.modo);
      return finalizar({
        ...base,
        etiqueta: "Iniciativa",
        total: t.total,
        mod: d.iniciativa,
        formula: `1d20 ${conSigno(d.iniciativa)}`,
        dados: t.valores.map((valor) => ({
          valor,
          caras: 20,
          descartado: t.valores.length > 1 && valor !== t.conservado,
        })),
        natural: t.natural,
        critico: false,
        pifia: false,
        desglose: `d20 ${t.conservado} ${conSigno(d.iniciativa)}`,
        puedeAplicar: null,
      });
    }

    case "heal": {
      const t = tirarFormula(opciones.formula || "1d8", { critico: false });
      if (!t.ok) return { ok: false, error: `Curación: ${t.error}` };
      return finalizar({
        ...base,
        etiqueta: "Curación",
        total: t.total,
        formula: t.texto,
        dados: aplanarDados(t.dados),
        critico: false,
        pifia: false,
        desglose: desgloseFormula(t),
        puedeAplicar: "cura",
      });
    }

    case "free": {
      const formula = opciones.formula || "1d20";
      const t = tirarFormula(formula);
      if (!t.ok) return { ok: false, error: t.error };
      return finalizar({
        ...base,
        etiqueta: "Tirada libre",
        total: t.total,
        formula: t.texto,
        dados: aplanarDados(t.dados),
        critico: false,
        pifia: false,
        desglose: desgloseFormula(t),
        puedeAplicar: null,
      });
    }

    default:
      return { ok: false, error: "Tipo de tirada desconocido" };
  }
}

function aplanarDados(grupos) {
  return grupos.flatMap((grupo) =>
    grupo.valores.map((valor) => ({ valor, caras: grupo.caras, signo: grupo.signo, descartado: false }))
  );
}

function desgloseFormula(t) {
  const partes = t.dados.map((grupo) => {
    const signo = grupo.signo < 0 ? "-" : "";
    return `${signo}${grupo.caras === 20 ? "d20" : `d${grupo.caras}`}: ${grupo.valores.join(", ")}`;
  });
  const plano = t.plano !== 0 ? ` ${conSigno(t.plano)}` : "";
  return `${partes.join(" ")}${plano}`.trim();
}

function finalizar(resultado) {
  return {
    ...resultado,
    resumen: describir(resultado),
  };
}

/** Texto corto para notificaciones y registro. */
export function describir(resultado) {
  const tipo = tipoPorId(resultado.tipo);
  const nombre = resultado.personaje?.nombre ?? "Alguien";
  const marca = resultado.critico ? " ¡CRÍTICO!" : resultado.pifia ? " (pifia)" : "";
  return `${tipo.simbolo} ${nombre} · ${resultado.etiqueta}: ${resultado.total}${marca} [${resultado.desglose}]`;
}

/** Crea la entrada que se guarda en el registro compartido. */
export function entradaRegistro(resultado) {
  return {
    tipo: resultado.tipo,
    etiqueta: resultado.etiqueta,
    total: resultado.total,
    desglose: resultado.desglose,
    personajeId: resultado.personaje?.id ?? null,
    personaje: resultado.personaje?.nombre ?? "—",
    critico: Boolean(resultado.critico),
    pifia: Boolean(resultado.pifia),
    resumen: resultado.resumen,
  };
}
