# Mesa de Héroes · extensión para Owlbear Rodeo

Fichas de personaje con **PG** y **CA** que se pueden **pegar a los tokens** y un
lanzador de dados que **sabe qué tipo de tirada** estás haciendo para sumar los
modificadores correctos.

- **Biblioteca de PJs compartida**: todos los datos viven en la sala, así que el
  director y los jugadores ven las mismas fichas.
- **Token con datos dentro**: al vincular un PJ a un token, los PG, la CA y el
  nombre se guardan en los metadatos del token y se mantienen sincronizados.
- **Tiradas con tipo**: ataque, daño, salvación, prueba de característica,
  iniciativa, curación y fórmula libre. Cada tipo aplica su bono, con ventaja /
  desventaja, críticos y pifias.
- **Menú contextual del token**: clic derecho sobre un token → ficha rápida con
  PG, CA, botones de −5/−1/+1/+5 y tiradas de ataque y daño.
- **Registro compartido**: las últimas 40 tiradas quedan visibles para toda la
  mesa, con notificación opcional.
- **Importar / exportar** la biblioteca en JSON.

No necesita Node, ni compilación, ni servidor propio: son archivos estáticos.

---

## 1. Publicar los archivos (una sola vez)

Owlbear Rodeo carga las extensiones desde una URL **HTTPS**. Elige una de estas
opciones y sube **todo el contenido de esta carpeta** (incluida la carpeta `js`,
`css`, `icons` y `vendor`):

| Opción | Cómo | Ruta resultante |
| --- | --- | --- |
| **Netlify Drop** | Entra en <https://app.netlify.com/drop> y arrastra la carpeta. | `https://algo.netlify.app` |
| **Cloudflare Pages** | *Create project → Direct upload*. | `https://algo.pages.dev` |
| **GitHub Pages (sitio de usuario)** | Repo llamado `tuusuario.github.io` en la rama `main`. | `https://tuusuario.github.io` |
| **GitHub Pages (proyecto)** | Repo normal, activa Pages. Sirve en `https://tuusuario.github.io/repo/`. | ⚠ requiere que la URL del manifiesto sea la de la carpeta |

> El manifiesto usa rutas absolutas (`/index.html`, `/icons/ficha.svg`) igual
> que las extensiones oficiales, así que lo más sencillo es publicar la carpeta
> en la **raíz** de un dominio o subdominio (Netlify, Cloudflare o un repo
> `usuario.github.io`). Si publicas en una subcarpeta de GitHub Pages, cambia en
> `manifest.json` las rutas por las que incluyan `/nombre-del-repo` y haz lo
> mismo en `js/background.js` (iconos) y en `index.html` (`/icon.svg`).

### GitHub Pages paso a paso

1. Crea el repositorio con el nombre exacto `TUUSUARIO.github.io` (público, sin README).
2. **Add file → Upload files**: arrastra el **contenido** de esta carpeta, no el
   ZIP ni la carpeta entera. Deben quedar `index.html` y `manifest.json` en la
   raíz, junto a las carpetas `css`, `icons`, `js` y `vendor`.
3. **Commit changes**.
4. **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
5. Espera 1–2 minutos y abre `https://TUUSUARIO.github.io/manifest.json`.
   Debe verse el JSON.
6. Esa es la URL que se pega en Owlbear Rodeo.

El repositorio tiene que ser **público**: GitHub Pages gratuito no publica repos
privados. El archivo `.nojekyll` ya está incluido para que GitHub no procese el
sitio con Jekyll.

Si ya tienes un sitio en `TUUSUARIO.github.io` y no quieres reemplazarlo, crea un
repo normal (`mesa-de-heroes`) y avísame: hay que prefijar las rutas con
`/mesa-de-heroes/` en `manifest.json`, `index.html` y `js/background.js`.

La URL del manifiesto será, por ejemplo:

```
https://tu-sitio.netlify.app/manifest.json
https://TUUSUARIO.github.io/manifest.json
```

## 2. Instalarla en Owlbear Rodeo

1. Abre (o crea) una **sala**.
2. Menú de la sala → **Extensiones** → **Añadir extensión**.
3. Pega la URL del `manifest.json` y confirma.
4. Aparecerá un botón **Mesa de Héroes** arriba a la izquierda, junto a las
   herramientas. Ese botón abre el panel.

La extensión queda guardada en esa sala. Los jugadores la ven al entrar.

## 3. Uso rápido

### Crear la ficha

1. Pestaña **PJs** → **+ Nuevo PJ**.
2. Rellena nombre, clase, nivel, **PG máximos**, **PG actuales**, **CA** y las
   seis características. El modificador se calcula solo.
3. En **Combate** puedes dejar el bono de ataque en blanco para que use
   automáticamente el mejor de FUE/DES + competencia, o escribir el total.
4. **Guardar**.

### Pegar la ficha a un token

1. En el mapa, selecciona **un** token.
2. Pestaña **Token** (o el botón **🔗 Vincular** de la ficha).
3. Elige el PJ y pulsa **Vincular**.

Desde ese momento:

- el token guarda `nombre`, `hp`, `hpMax`, `ac` y `personajeId` en sus metadatos;
- si cambias los PG en la ficha, el token se actualiza;
- clic derecho sobre el token → **Ficha del PJ** abre una tarjeta con PG, CA y
  botones de daño/curación.

### Tirar dados

Pestaña **Dados**:

1. Elige personaje (se preselecciona el del token seleccionado).
2. Elige el **tipo de tirada**:
   - **Ataque** → `1d20 + bono de ataque`
   - **Daño** → los dados de daño del PJ (botón *Crítico* para duplicar dados)
   - **Salvación** → `1d20 + mod. + competencia` si la salvación está marcada
   - **Prueba** → `1d20 + mod.` (puedes sumar competencia)
   - **Iniciativa** → `1d20 + DES`
   - **Curación** → fórmula de curación
   - **Libre** → cualquier fórmula, por ejemplo `2d6+3`
3. Ventaja / desventaja para las tiradas de d20.
4. **Tirar**. El resultado muestra el total, los dados y el desglose.
5. En daño y curación aparece un botón para **aplicarlo directamente** a los PG
   del personaje (y del token vinculado).

También puedes tirar sin abrir el panel: clic derecho en el token →
**Tirar ataque** o **Tirar daño**.

## 4. Dónde se guardan los datos

| Dato | Ubicación | Clave |
| --- | --- | --- |
| Biblioteca de PJs | Metadatos de la **sala** | `com.mesadeheroes/characters` |
| Registro de tiradas | Metadatos de la **sala** | `com.mesadeheroes/rolls` |
| Preferencias | Metadatos de la **sala** | `com.mesadeheroes/settings` |
| Ficha del token | Metadatos del **item** | `com.mesadeheroes/token` |

Consecuencias:

- Si borras la sala, se borran las fichas. **Exporta** de vez en cuando desde
  *Ajustes → Exportar*.
- Cualquier jugador con permiso para editar la sala puede modificar la
  biblioteca; si un jugador no puede guardar, normalmente es por los permisos
  de la sala o porque el token es del director.
- Para mover la biblioteca a otra sala: *Exportar* en una, *Importar* en la otra.

## 5. Personalización

- **Nombre, icono y descripción**: `manifest.json` e `icon.svg`.
- **Colores e interfaz**: `css/estilos.css` (variables al principio; hay tema
  claro y oscuro automático).
- **Tipos de tirada y fórmulas**: `js/dice.js` (`TIPOS` y `vistaPrevia`).
- **Datos de ejemplo**: `js/app.js` (`EJEMPLO`).

El SDK de Owlbear Rodeo está incluido en `vendor/owlbear-sdk.js` (versión 3.1.0,
empaquetado). No hace falta `npm install`; si quieres actualizarlo, descarga
`https://esm.sh/@owlbear-rodeo/sdk@<versión>/es2022/sdk.bundle.mjs` y sustituye
el archivo.

## 6. Problemas frecuentes

| Síntoma | Causa probable | Solución |
| --- | --- | --- |
| «No se pudo conectar» | El panel se abrió fuera de Owlbear Rodeo, o la URL no es HTTPS. | Abre el botón de la extensión dentro de la sala. |
| No aparece el botón | El manifiesto no carga. | Comprueba que `manifest.json` abre en el navegador y que la sala tiene la extensión añadida. |
| No se guardan los PJs | Permisos de la sala. | El director debe crearlos, o revisa los permisos de los jugadores. |
| El token no se actualiza | El token es de otra capa o no tienes permiso de edición. | Usa un token de la capa de personajes y comprueba los permisos. |
| Los iconos del menú salen rotos | Se publicó en una subcarpeta con rutas absolutas. | Ver la nota de la sección 1. |

## 7. Estructura

```
manifest.json          → punto de entrada
background.html/.js    → menú contextual del token
index.html             → panel principal (popover)
token-card.html/.js    → tarjeta rápida del token
js/
  config.js            → identificadores y ajustes por defecto
  model.js             → personaje y valores derivados
  dice.js              → fórmulas, d20 y tipos de tirada
  store.js             → estado compartido (metadatos de sala y token)
  app.js               → arranque, pestañas, ajustes, registro
  ui/                  → editor, fichas, dados, token, acciones
vendor/owlbear-sdk.js  → SDK empaquetado
css/estilos.css        → estilos (tema claro/oscuro)
icons/                 → iconos del menú contextual
```

## 8. Créditos y licencia

Hecho para Owlbear Rodeo 2.x usando el SDK oficial
(<https://github.com/owlbear-rodeo/sdk>). Puedes modificarlo y compartirlo
libremente con tu mesa.
