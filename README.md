# Mesa de Héroes

Ficha de personaje para **Owlbear Rodeo**: consulta los datos de tu PJ y mantén
su vida y su CA sincronizadas con las burbujas del token.

## Antes de empezar

- Añade **Mesa de Héroes** a la sala.
- Añade también **Stat Bubbles for D&D**: es lo que dibuja la vida y la CA sobre
  el token. Sin ella la ficha funciona igual, pero no verás las burbujas.

## Instalación

1. En la sala, abre **Extensiones** (icono de puzle) → **Añadir extensión**.
2. Pega esta URL:

   ```
   https://thedibus.github.io/manifest.json
   ```

3. Aparece el botón **Mesa de Héroes** arriba a la izquierda.

## Uso

### Crear tu personaje

1. **PJs** → **+ Nuevo PJ**.
2. Rellena nombre, clase, nivel, PG, CA y las seis características.
3. Marca las habilidades en las que sea competente.
4. Añade rasgos, inventario y notas con los botones **+**.
5. **Guardar**.

### Vincularlo a tu token

1. Selecciona tu token en el mapa (capa **Personaje** o **Montura**).
2. Pestaña **Ficha** → **Vincular token seleccionado**.

La ficha mostrará la imagen del token y compartirá con él la vida y la CA.

### Guardar o llevar tu personaje

- **Exportar**: en **Ver ficha entera** → **Exportar**, o con el botón **⬇** de la
  lista, descargas solo ese PJ.
- **Importar PJ**: en la pestaña **PJs**, carga el archivo de un personaje. Si ya
  existe uno con el mismo identificador, te pregunta si reemplazarlo.
- La biblioteca completa se exporta e importa desde **Ajustes**.

### Durante la partida

- **Ficha**: resumen del personaje activo con PG, CA, características y rasgos.
- **Ver ficha entera**: todos los datos, con PG y CA editables. Se abre como una
  ventana: **⤢** la amplía, **⤡** la reduce y **✕** la cierra. Ampliada ocupa
  casi todo el panel.
- **Editar ficha**: la misma ventana, con los mismos controles de tamaño y cierre.
- **Clic derecho en el token → Ficha del PJ**: la misma información sin abrir el
  panel.
- **⤢** amplía el panel y **⤡** lo devuelve a su tamaño.
- Cambia de personaje con las iniciales de la parte superior.

### Cambiar la vida

Puedes hacerlo desde las burbujas del token o desde **Ver ficha entera**. Los dos
sitios muestran siempre el mismo valor.

## Si algo no sale

| Problema | Solución |
|---|---|
| No aparecen las burbujas | Añade **Stat Bubbles for D&D** a la sala |
| No aparecen en un token | El token debe ser una imagen de la capa **Personaje** o **Montura** |
| No aparece el botón | Revisa la URL y recarga con **Ctrl+F5** |
| El icono o el nombre se ven mal | **Ctrl+F5**; si sigue, quita y vuelve a añadir la extensión |

## Autor

Hecho por **Thedibus** · <https://github.com/Thedibus>
