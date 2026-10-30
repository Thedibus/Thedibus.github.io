/** Exportar e importar un único personaje (para jugadores). */

import { normalizar } from "./model.js?v=2.7.0";
import { buscarPersonaje, estadisticasDe, guardarPersonaje, setActivo } from "./store.js?v=2.7.0";
import { confirmar, descargarJson, leerArchivo, toast } from "./util.js?v=2.7.0";

const nombreArchivo = (nombre) =>
  `pj-${String(nombre ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "personaje"}.json`;

/** Descarga un JSON con la ficha y los PG/CA que se ven ahora. */
export function exportarPersonaje(id) {
  const pj = buscarPersonaje(id);
  if (!pj) {
    toast("Ese PJ ya no existe", "aviso");
    return;
  }

  const est = estadisticasDe(pj);
  const personaje = est ? { ...pj, hp: est.hp, hpMax: est.hpMax, ac: est.ac } : pj;

  descargarJson(nombreArchivo(pj.nombre), {
    app: "mesa-de-heroes",
    tipo: "personaje",
    version: 1,
    exportado: new Date().toISOString(),
    personaje,
  });
  toast(`«${pj.nombre}» exportado`, "ok");
}

/** Lee un archivo de un solo personaje y lo añade (o reemplaza) en la biblioteca. */
export async function importarPersonaje(archivo) {
  try {
    const texto = await leerArchivo(archivo);
    const datos = JSON.parse(texto);

    if (datos && Array.isArray(datos.personajes)) {
      throw new Error("es una biblioteca completa; usa Ajustes → Importar biblioteca");
    }

    const bruto = datos?.personaje ?? (Array.isArray(datos) ? datos[0] : datos);
    if (!bruto || typeof bruto !== "object" || !String(bruto.nombre ?? "").trim()) {
      throw new Error("el archivo no contiene un personaje válido");
    }

    const pj = normalizar(bruto);
    const existente = buscarPersonaje(pj.id);

    if (existente) {
      const seguro = await confirmar(
        `Ya existe «${existente.nombre}» con ese identificador. ¿Reemplazarlo por el del archivo?`,
        { titulo: "Importar PJ", boton: "Sí, reemplazar" }
      );
      if (!seguro) return null;
    }

    await guardarPersonaje(pj);
    await setActivo(pj.id);
    document.dispatchEvent(new CustomEvent("mdh:abrir-ficha", { detail: { id: pj.id } }));
    toast(`«${pj.nombre}» importado`, "ok");
    return pj;
  } catch (error) {
    console.warn("[Mesa de Héroes] importación rechazada:", error.message);
    toast(`No se pudo importar: ${error.message}`, "error");
    return null;
  }
}
