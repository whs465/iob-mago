# Plan de mejoras de IOB Mago

## Estado actual

IOB Mago ya completo la migracion principal a Vite + TypeScript modular sin redisenar la UI.

El codigo ya no depende de scripts CDN globales para las librerias principales. `pdf-lib`, `pdfjs-dist`, `file-saver` y `jszip` entran por imports reales de npm.

`src/main.ts` quedo como archivo de composicion y wiring. Tiene cerca de 747 lineas y ya delega los flujos grandes a modulos:

- operaciones PDF: merge, split, extract, delete, reorder y rotate;
- firma PDF: carga, render, navegacion, marcadores, drag, aplicacion y descarga;
- generacion de PNG transparente de firma;
- fuente compartida y analisis de PDFs;
- avance de contrato;
- soporte/donaciones;
- helpers DOM, estado y utilidades puras.

La ultima verificacion registrada dejo la suite en verde:

- `npm test`: 75 archivos, 253 tests;
- `npm run build`: correcto.

## Objetivo de la siguiente fase

Mejorar la experiencia de firma para que el usuario pueda trabajar sobre el documento cargado con mas comodidad.

Hoy la firma funciona, pero el PDF se ve como una miniatura. El usuario puede marcar y mover la firma, pero falta una vista mas grande, navegable y con zoom para ubicar la firma con precision.

La regla se mantiene: mejorar UX sin reescribir la app ni cambiar la identidad visual general.

## Mejora prioritaria: visor de firma grande

Convertir la seccion de firma en un visor de trabajo mas comodo.

Resultado esperado:

- el PDF se puede ver mas grande dentro de la pantalla;
- el usuario puede navegar paginas sin perder contexto;
- el usuario puede hacer zoom in, zoom out y volver a ajustar al ancho;
- los marcadores de firma siguen alineados al PDF al cambiar zoom o pagina;
- firmar y descargar sigue siendo igual de directo;
- la experiencia mejora en desktop y mobile.

## Corte 1: agrandar el visor actual

Archivos principales:

- `index.html`
- `src/ui/signature-render.ts`
- `src/ui/signature-viewer.ts`
- `src/ui/signature-navigation-flow.ts`

Tareas:

1. Revisar el limite actual de render en `signature-render.ts`, donde el canvas se limita a un ancho maximo aproximado de 800 px.
2. Permitir que el canvas use mas ancho disponible en desktop.
3. Darle a `.pdf-preview-container` y `.pdf-canvas-wrapper` un comportamiento mas cercano a visor:
   - mas alto disponible;
   - scroll interno cuando el PDF sea alto;
   - canvas centrado;
   - controles visibles y compactos.
4. Mantener el panel de configuracion de firma sin romper mobile.
5. Verificar que click, drag y borrado de marcadores sigan funcionando.

Pruebas esperadas:

- actualizar tests de `signature-render.ts` si cambia el calculo de escala;
- correr `npm run build`;
- correr la suite con el comando Node/NPM explicito del repo.

## Corte 2: zoom del visor

Archivos principales:

- `src/state/signature-viewer.ts`
- `src/ui/signature-render.ts`
- `src/ui/signature-viewer.ts`
- `src/ui/signature-navigation-flow.ts`
- `index.html`

Tareas:

1. Agregar estado de zoom al viewer:
   - modo `fit-width`;
   - nivel numerico, por ejemplo 0.75, 1, 1.25, 1.5, 2.
2. Cambiar el render para calcular:

```txt
scale = fitWidthScale * zoomLevel
```

3. Agregar controles en la barra del visor:
   - zoom out;
   - porcentaje actual;
   - zoom in;
   - ajustar.
4. Re-renderizar la pagina cuando cambie el zoom.
5. Re-renderizar marcadores despues de cada render para que se mantengan alineados.

Pruebas esperadas:

- tests unitarios para el estado de zoom;
- tests del render con escala base y zoom;
- tests de controles de zoom si se extrae helper UI.

## Corte 3: navegacion mas comoda

Archivos principales:

- `index.html`
- `src/ui/signature-viewer.ts`
- `src/ui/signature-navigation-flow.ts`
- `src/main.ts`

Tareas:

1. Mantener anterior/siguiente.
2. Evaluar input numerico de pagina o selector simple.
3. Validar limites: no ir antes de pagina 1 ni despues del total.
4. Mantener el texto localizado `Pagina X de Y` / `Page X of Y`.
5. Opcional: atajos de teclado solo cuando el foco esta en el visor.

Pruebas esperadas:

- tests de navegacion para pagina valida e invalida;
- tests de UI para disabled de botones.

## Corte 4: modo vista grande

Este corte es opcional despues de probar el visor inline.

Idea:

- agregar boton `Vista grande`;
- mostrar el visor en un panel ampliado dentro de la seccion de firma;
- mantener controles arriba y lista/configuracion de firma cerca;
- cerrar sin perder marcadores ni pagina actual.

No conviene empezar por modal full-screen si el visor inline todavia no tiene zoom. Primero hay que estabilizar escala, marcadores y navegacion.

## Criterios de calidad

La mejora esta lista cuando:

- cargar PDF y firma sigue funcionando;
- marcar firma con click sigue ubicando coordenadas correctas;
- mover firma con drag sigue actualizando posicion;
- borrar marcadores sigue funcionando;
- cambiar pagina conserva los marcadores de cada pagina;
- zoom no desalineea los marcadores;
- aplicar firma genera el PDF final en la ubicacion correcta;
- desktop aprovecha mas pantalla;
- mobile no queda apretado ni con controles rotos;
- build y tests pasan.

## Riesgos a cuidar

1. Desalineacion de marcadores.

Los marcadores se dibujan sobre el canvas escalado, pero la firma final usa coordenadas PDF. Cada cambio de escala debe refrescar posiciones visuales usando `viewerState.currentScale`.

2. Scroll y click.

Si el wrapper tiene scroll interno, el calculo de click debe seguir usando el rect real del canvas y no asumir posicion fija.

3. Canvas demasiado pesado.

Zoom alto puede renderizar paginas grandes. Conviene limitar zoom maximo, por ejemplo 200%.

4. Mobile.

En telefono el visor debe priorizar ancho completo, controles en varias lineas y scroll natural.

## Despues de la firma

Cuando esta mejora este estable, los siguientes pasos opcionales son:

1. Evaluar `manualChunks` en Vite para separar `pdf-lib` y `pdfjs-dist` del bundle principal.
2. Medir tiempos de carga reales antes de optimizar de mas.
3. Evaluar Vue o React solo si empiezan a aparecer vistas mas complejas o estado reactivo dificil de sostener en vanilla TypeScript.

## Proximo paso recomendado

Empezar por el Corte 1:

1. quitar/subir el limite de 800 px en `signature-render.ts`;
2. ajustar CSS del visor para que use mas pantalla;
3. verificar que marcadores y firma final sigan alineados;
4. correr build y tests.
