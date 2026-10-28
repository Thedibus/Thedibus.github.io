/**
 * Script de segundo plano: registra el menú contextual del token.
 * Se ejecuta aunque el popover esté cerrado.
 */

import OBR from "../vendor/owlbear-sdk.js";
import { EXT_ID } from "./config.js";
import { ejecutar } from "./dice.js";
import { anunciar, buscarPersonaje, contextoToken, iniciarTienda, registrarTirada } from "./store.js";

const URL_TARJETA = new URL("../token-card.html", import.meta.url).href;

/** Solo mostramos los iconos cuando hay algo de la capa de personajes seleccionado. */
const FILTRO_TOKEN = { some: [{ key: "layer", value: "CHARACTER" }] };

async function arrancar() {
  try {
    await iniciarTienda();
  } catch (error) {
    console.error("[Mesa de Héroes] no se pudo iniciar el segundo plano", error);
  }
  await registrarMenus();
}

async function registrarMenus() {
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
      embed: { url: URL_TARJETA, height: 250 },
    });

    await OBR.contextMenu.create({
      id: `${EXT_ID}/ataque`,
      icons: [
        {
          icon: "/icons/ataque.svg",
          label: "Tirar ataque (Mesa de Héroes)",
          filter: FILTRO_TOKEN,
        },
      ],
      onClick: () => tirarDesdeToken("attack"),
    });

    await OBR.contextMenu.create({
      id: `${EXT_ID}/dano`,
      icons: [
        {
          icon: "/icons/dano.svg",
          label: "Tirar daño (Mesa de Héroes)",
          filter: FILTRO_TOKEN,
        },
      ],
      onClick: () => tirarDesdeToken("damage"),
    });
  } catch (error) {
    console.error("[Mesa de Héroes] no se pudo crear el menú contextual", error);
  }
}

async function tirarDesdeToken(tipo) {
  try {
    const contexto = await contextoToken();
    if (contexto.estado !== "ok") {
      OBR.notification.show("Selecciona un token del mapa", "WARNING");
      return;
    }
    if (!contexto.vinculo) {
      OBR.notification.show("Este token no tiene un PJ vinculado. Ábrelo con «Ficha del PJ».", "WARNING");
      return;
    }

    const pj = buscarPersonaje(contexto.vinculo.personajeId);
    if (!pj) {
      OBR.notification.show("La ficha vinculada ya no existe en la biblioteca", "WARNING");
      return;
    }

    const resultado = ejecutar(tipo, pj, {});
    if (!resultado.ok) {
      OBR.notification.show(resultado.error, "ERROR");
      return;
    }

    await registrarTirada(resultado);
    anunciar(resultado);
  } catch (error) {
    console.error("[Mesa de Héroes] fallo al tirar desde el token", error);
    OBR.notification.show("No se pudo tirar los dados", "ERROR");
  }
}

OBR.onReady(arrancar);
