/**
 * Script de segundo plano: registra el menú contextual del token.
 * Se ejecuta aunque el popover esté cerrado.
 */

import OBR from "../vendor/owlbear-sdk.js";
import { EXT_ID } from "./config.js";

const URL_TARJETA = new URL("../token-card.html", import.meta.url).href;

/** Bubbles solo trabaja con imágenes de las capas Personaje y Montura. */
const FILTRO_TOKEN = {
  some: [
    { key: "layer", value: "CHARACTER", coordinator: "||" },
    { key: "layer", value: "MOUNT" },
  ],
};

async function registrarMenu() {
  try {
    await OBR.contextMenu.create({
      id: `${EXT_ID}/ficha`,
      icons: [
        {
          icon: "/icons/ficha.svg",
          label: "Ficha del PJ (Mesa de Héroes)",
          filter: FILTRO_TOKEN,
        },
      ],
      embed: { url: URL_TARJETA, height: 262 },
    });
  } catch (error) {
    console.error("[Mesa de Héroes] no se pudo crear el menú contextual", error);
  }
}

OBR.onReady(registrarMenu);
