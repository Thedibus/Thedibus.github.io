# Mesa de Héroes · ficha de consulta para Owlbear Rodeo

Una ficha pequeña y siempre a mano para cada personaje, con la **vida y la CA
compartidas con «Stat Bubbles for D&D»**: si bajas los PG desde las burbujas del
token, la ficha lo refleja; si los cambias en la ficha, las burbujas se
actualizan.

- **Ficha compacta**: nombre, clase, PG, CA, las seis características con su
  abreviatura (FUE, DES, CON, INT, SAB, CAR), modificador y valor, y los rasgos.
- **Ficha entera**: un panel con todos los datos del PJ (PG/CA editables,
  derivados, salvaciones, rasgos y notas).
- **Vida compartida con Stat Bubbles**: los PG/CA viven en los metadatos del
  token, en las mismas claves que usa Bubbles, así que los dos paneles ven lo
  mismo y se puede ajustar la vida desde el mapa sin abrir esta extensión.
- **Rasgos y notas**: se añaden desde el editor, uno por línea.
- **Biblioteca compartida**: los PJs se guardan en la sala y los ve todo el
  mundo. Importar/exportar en JSON.
- **Menú contextual del token**: clic derecho sobre el token → ficha compacta
  con PG, CA, características y rasgos, sin salir del mapa.

No hace tiradas de dados: las estadísticas están pensadas para consultarlas y
tirar tus propios dados en la mesa.

---

## 1. Requisito: instala «Stat Bubbles for D&D»

Mesa de Héroes escribe la vida y la CA en los metadatos que usa **Stat Bubbles
for D&D** (de Seamus Finlayson). Para ver las burbujas sobre el token hace falta
tener esa extensión añadida a la sala:

- Repositorio: <https://github.com/SeamusFinlayson/Bubbles-for-Owlbear-Rodeo>
- Tienda de extensiones de Owlbear: busca **Stat Bubbles**.

Sin Bubbles, esta ficha sigue funcionando y guardando los datos en el token, pero
no habrá burbujas dibujadas en el mapa.

## 2. Instalarla

La extensión ya está publicada en:

```
https://thedibus.github.io/manifest.json
```

En Owlbear Rodeo: **sala → Extensiones → Añadir extensión** → pega esa URL.
Aparece el botón **Mesa de Héroes** arriba a la izquierda.

### Actualizarla (GitHub Pages)

1. En el repo `Thedibus/Thedibus.github.io`, **Add file → Upload files**.
2. Sube los archivos modificados (o todo el contenido de la carpeta).
3. **Commit changes**. Pages redespliega solo en 1–2 minutos.

### Publicarla desde cero

1. Crea el repositorio `TUUSUARIO.github.io` (público).
2. Sube el **contenido** de esta carpeta: `index.html`, `manifest.json` y las
   carpetas `css`, `icons`, `js`, `vendor`, más `.nojekyll` y `_headers`.
3. **Settings → Pages → Deploy from a branch → main / (root) → Save**.
4. Comprueba `https://TUUSUARIO.github.io/manifest.json`.

> El manifiesto usa rutas absolutas (`/index.html`, `/icons/ficha.svg`), igual
> que las extensiones oficiales, así que la carpeta tiene que quedar en la raíz
> del sitio (`usuario.github.io`, Netlify, Cloudflare Pages).

## 3. Uso

### Crear un personaje

1. Pestaña **PJs** → **+ Nuevo PJ**.
2. Rellena nombre, clase, nivel, PG, CA y las seis características. El
   modificador se calcula solo.
3. En **Rasgos y habilidades** escribe uno por línea; se mostrarán como
   etiquetas.
4. **Guardar**.

### Vincular el personaje a un token

1. Selecciona **un** token en el mapa (capa Personaje o Montura, para que Bubbles
   lo dibuje).
2. Pestaña **Ficha** → **Vincular token seleccionado** (o desde la tarjeta del PJ
   en **PJs**).
3. Al vincular, si el token no tenía datos de Bubbles, se copian los PG/CA de la
   ficha. Si ya los tenía, se respetan los del token.

### Ver y editar la vida

- **Desde el mapa**: clic derecho sobre el token → **Ficha del PJ** abre la
  tarjeta con PG, CA, características y rasgos. Para cambiar la vida usa las
  burbujas de Bubbles (su propio menú contextual).
- **Desde esta extensión**: **Ver ficha entera** → cambia **PG actuales**,
  **PG máximos** o **CA**. Se escribe en las burbujas al instante.

### Ocultar estadísticas a los jugadores

Si en Bubbles marcas un token como oculto (`hide`), Mesa de Héroes también
muestra `—` en ese token cuando el jugador no es el director.

## 4. Dónde se guardan los datos

| Dato | Ubicación | Clave |
| --- | --- | --- |
| Biblioteca de PJs | Metadatos de la **sala** | `com.mesadeheroes/characters` |
| PJ vinculado al token | Metadatos del **token** | `com.mesadeheroes/token` |
| PJ activo de cada jugador | Metadatos del **jugador** | `com.mesadeheroes/activo` |
| PG, PG máximos, PG temporales y CA | Metadatos del **token** (Bubbles) | `com.owlbear-rodeo-bubbles-extension/metadata` |

Consecuencias:

- Los PG/CA son los mismos en Bubbles y en Mesa de Héroes; no hay dos copias
  que se puedan desincronizar.
- Si borras la sala, se borran las fichas. **Exporta** de vez en cuando desde
  *Ajustes → Exportar*.
- Al actualizar desde la versión 1, los tokens que tenían PG guardados por la
  versión antigua se migran automáticamente a Bubbles la primera vez.

## 5. Personalización

- **Nombre e icono**: `manifest.json` e `icon.svg`.
- **Colores e interfaz**: `css/estilos.css` (variables al principio, tema claro
  y oscuro automático).
- **Datos de ejemplo**: `js/app.js` (`EJEMPLO`).
- **Claves de Bubbles**: `js/config.js` (`BURBUJAS`).

El SDK de Owlbear Rodeo está incluido en `vendor/owlbear-sdk.js` (3.1.0). No
hace falta Node ni compilar.

## 6. Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| No aparecen las burbujas | Bubbles no está instalado en la sala | Añade **Stat Bubbles for D&D** a la sala |
| No aparecen las burbujas en un token | Está en una capa que Bubbles no dibuja | Usa un token de las capas **Personaje** o **Montura** |
| La ficha muestra `—` | El token está oculto para jugadores | Desactiva `hide` en Bubbles o entra como director |
| No se guardan los cambios | Permisos de la sala o del token | Comprueba los permisos de jugador |
| Los PG de la ficha no cambian al tocar el token | El evento de escena aún no llegó | Espera un instante; se refresca solo |

## 7. Estructura

```
manifest.json          → punto de entrada
background.html/.js    → menú contextual del token
index.html             → panel principal (ficha / PJs / ajustes)
token-card.html/.js    → tarjeta compacta del token
js/
  config.js            → identificadores y claves de Bubbles
  model.js             → personaje y valores derivados
  bubbles.js           → lectura/escritura de las burbujas
  store.js             → estado compartido y vínculos token ↔ PJ
  app.js               → arranque, pestañas, ajustes, importación
  ui/comun.js          → piezas de ficha reutilizadas
  ui/ficha.js          → ficha compacta y ficha entera
  ui/pjs.js            → biblioteca de PJs
  ui/editor.js         → alta y edición de fichas
vendor/owlbear-sdk.js  → SDK empaquetado
css/estilos.css        → estilos (tema claro/oscuro)
icons/ficha.svg        → icono del menú contextual
```

## 8. Historial

- **2.0.0** — La extensión deja de tirar dados. La ficha pasa a ser de consulta,
  con PG/CA sincronizados con Stat Bubbles, rasgos y ficha completa. Se eliminan
  los botones de ataque, daño y los ajustes de vida predeterminados.
- **1.0.0** — Fichas, vínculo a tokens, dados por tipo de tirada y registro.
