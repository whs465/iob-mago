# Plan de modernizacion interna de IOB Mago

## Objetivo

Modernizar IOB Mago por dentro sin cambiar la UI actual. La interfaz ya esta bien lograda, asi que el trabajo debe enfocarse en arquitectura, TypeScript, modulos, pruebas y confiabilidad del procesamiento PDF.

La regla principal es simple: la UI se conserva visualmente igual. No se redisenan tarjetas, botones, textos, colores, espaciados ni flujos salvo que exista un bug puntual.

## Decision de stack

No conviene movernos directo a React o Vue en la primera fase.

La recomendacion es empezar con:

- Vite
- TypeScript
- HTML y CSS actuales
- modulos internos para PDF, estado, DOM y utilidades
- Vitest para pruebas unitarias

Esto permite arreglar lo amateur del codigo sin reescribir la interfaz. React o Vue pueden entrar despues, pero no son el primer problema.

## Por que no React todavia

React es buena opcion si la app va a crecer hacia componentes complejos, rutas, estados ricos, vistas dinamicas o una experiencia mas parecida a producto grande. Pero migrar ya mismo a React implicaria tocar mucho markup y aumentar el riesgo de romper una UI que ya esta bonita.

Para esta app, el dolor real ahora mismo esta en otro lado:

- demasiada logica dentro de `index.html`;
- estado global mezclado con DOM;
- manipulacion PDF dificil de probar;
- uso de dependencias globales desde CDN;
- funciones grandes;
- errores poco tipados;
- cero tests para casos delicados como bookmarks.

React no arregla automaticamente eso. TypeScript modular si lo ataca directamente.

## Por que no Vue todavia

Vue seria una migracion mas amable que React si queremos mantener HTML expresivo y componentes sencillos. Aun asi, meter Vue en la primera fase tambien obligaria a partir la UI en componentes y revalidar mucho comportamiento visual.

Vue puede ser una buena segunda fase si despues queremos:

- componentes para cada herramienta;
- estado reactivo mas limpio;
- formularios mas mantenibles;
- una app mas facil de extender.

Pero primero conviene estabilizar el nucleo.

## Ruta recomendada

La ruta recomendada es:

1. Vite + TypeScript vanilla.
2. Modulos internos claros.
3. Tests para la logica PDF.
4. UI congelada visualmente.
5. Evaluar React/Vue solo despues de que el nucleo este limpio.

## Arquitectura propuesta

```txt
src/
  main.ts
  state/
    source-files.ts
    signature.ts
    page-order.ts
  pdf/
    load.ts
    merge.ts
    bookmarks.ts
    render.ts
    split.ts
    extract.ts
    delete-pages.ts
    rotate.ts
    sign.ts
  ui/
    dom.ts
    status.ts
    source-list.ts
    file-input.ts
    language.ts
    buttons.ts
  utils/
    filenames.ts
    page-ranges.ts
    errors.ts
    async.ts
  types/
    pdf.ts
    ui.ts
```

## Fase 1: Congelar la UI actual

Antes de mover codigo, hay que tratar la UI como contrato.

Tareas:

- tomar capturas desktop y mobile de la app actual;
- documentar flujos principales;
- guardar estados visuales de exito, error, procesamiento y lista de archivos;
- evitar cambios de CSS salvo correcciones necesarias;
- mantener textos y estructura visual.

Resultado esperado: cualquier refactor se valida contra la apariencia actual.

## Fase 2: Crear base Vite + TypeScript

Crear un proyecto moderno sin cambiar comportamiento.

Tareas:

- agregar `package.json`;
- configurar Vite;
- agregar TypeScript;
- mover el script embebido a `src/main.ts`;
- mantener `index.html` con el markup y CSS actuales;
- conectar el bundle generado por Vite.

Resultado esperado: la app se ve igual, pero ya compila con TypeScript.

## Fase 3: Tipar el DOM y el estado

Reducir errores silenciosos alrededor de `document.getElementById`.

Tareas:

- crear helper `getRequiredElement<T>()`;
- tipar botones, inputs, labels, listas y canvas;
- centralizar `showStatus`;
- centralizar `setActionBusy`;
- tipar el estado de archivos fuente, firma, ordenamiento y rotacion.

Resultado esperado: menos nulls invisibles y menos estado regado.

## Fase 4: Extraer utilidades puras

Sacar primero lo que no depende del DOM.

Modulos iniciales:

- `utils/filenames.ts`
- `utils/page-ranges.ts`
- `utils/errors.ts`
- `utils/async.ts`

Tests iniciales:

- parseo de rangos: `1,3,5-8`;
- rangos invalidos;
- paginas duplicadas;
- nombres base de archivos;
- errores de PDF protegido.

Resultado esperado: primeras pruebas reales sin tocar la UI.

## Fase 5: Extraer nucleo PDF

Mover la logica pesada fuera de la interfaz.

Modulos prioritarios:

- `pdf/load.ts`
- `pdf/bookmarks.ts`
- `pdf/merge.ts`
- `pdf/render.ts`

`bookmarks.ts` debe cubrir:

- leer bookmarks existentes;
- detectar destinos por pagina;
- remapear indices al unir documentos;
- aplanar bookmarks cuando el documento final debe tener un solo nivel;
- crear bookmarks nuevos;
- ignorar bookmarks sin destino valido.

Resultado esperado: merge y bookmarks dejan de depender de funciones gigantes dentro del HTML.

## Fase 6: Tests de PDFs

Crear fixtures pequenos para probar comportamientos reales.

Casos minimos:

- PDF sin bookmarks;
- PDF con bookmarks de un nivel;
- PDF con bookmarks anidados;
- merge de dos PDFs con bookmarks;
- merge con opcion "Agregar marcadores por archivo";
- merge sin esa opcion;
- PDF protegido/rasterizado;
- remapeo correcto de paginas.

Resultado esperado: bugs como bookmarks borrados o corridos se detectan antes de llegar al navegador.

## Fase 7: Extraer herramientas restantes

Mover el resto por bloques:

- separar PDF;
- extraer paginas;
- eliminar paginas;
- ordenar paginas;
- rotar paginas;
- firmar PDF;
- procesar firma transparente.

Cada bloque debe salir con tipos y tests donde aplique.

Resultado esperado: `main.ts` queda como orquestador, no como deposito de toda la app.

## Fase 8: Dependencias reales

Reemplazar dependencias globales CDN por imports.

Dependencias probables:

- `pdf-lib`;
- `pdfjs-dist`;
- `file-saver`;
- `jszip`;
- `vitest`;
- `typescript`;
- `vite`.

Resultado esperado: build reproducible, autocompletado, tipos y menos magia global.

## Fase 9: Verificacion visual

Despues de cada fase grande:

- correr la app localmente;
- probar desktop y mobile;
- comparar contra capturas de referencia;
- validar flujos principales;
- confirmar que textos, tarjetas y botones no cambiaron.

Resultado esperado: arquitectura mejorada sin regresion visual.

## Cuando considerar React o Vue

Considerar React o Vue solo despues de completar la migracion TypeScript modular.

Tiene sentido migrar a framework si aparecen necesidades como:

- muchas vistas condicionales;
- componentes repetidos dificiles de mantener;
- estado compartido mas complejo;
- historial de operaciones;
- cola de procesamiento;
- configuracion persistente;
- modo avanzado;
- rutas o multiples pantallas.

Si llegamos a ese punto, recomendaria Vue antes que React para esta app, porque el HTML actual ya es fuerte y Vue permite una transicion mas natural hacia componentes sin cambiar tanto la manera de pensar la plantilla.

Si el producto crece mucho y necesita ecosistema mas grande, React tambien seria razonable. Pero hoy la mejor jugada es TypeScript vanilla primero.

## Orden de ejecucion recomendado

1. Crear `package.json`, Vite y TypeScript.
2. Mover JS embebido a `src/main.ts`.
3. Mantener UI intacta.
4. Extraer utilidades puras.
5. Extraer `pdf/bookmarks.ts`.
6. Extraer `pdf/merge.ts`.
7. Agregar tests de bookmarks y merge.
8. Extraer el resto de operaciones PDF.
9. Cambiar dependencias CDN por imports.
10. Evaluar Vue o React con la app ya limpia.

## Criterio de exito

La migracion va bien si:

- la UI se ve igual;
- el usuario no siente cambio visual;
- el codigo deja de depender de un unico `index.html` gigante;
- los bugs PDF se pueden probar;
- TypeScript detecta errores antes del navegador;
- agregar una herramienta nueva no obliga a tocar media app.

## Resumen

No estamos buscando una reescritura vistosa. Estamos buscando que IOB Mago siga viendose igual de bien, pero que por dentro deje de sentirse improvisado.

Primero Vite + TypeScript vanilla. Luego modulos y tests. Despues, si la app lo pide de verdad, Vue o React.

## Avance actual

Ya se inicio la migracion sin cambiar la UI:

- `index.html` conserva el markup y CSS, y carga `src/main.ts` como modulo.
- Se agrego Vite + TypeScript.
- Se agrego `package-lock.json` para builds reproducibles.
- Se movio la logica legacy a `src/main.ts` y ya se retiro el puente temporal `@ts-nocheck`.
- Se tiparon contratos globales en `src/global.d.ts` para `PDFLib`, `pdfjsLib`, `JSZip`, `saveAs` y funciones expuestas en `window`, sin `any` productivo.
- Se endurecieron tipos de firma en `src/pdf/sign.ts` y del visor PDF de firma en `src/state/signature-viewer.ts`, reduciendo `any` en codigo productivo.
- Se endurecieron tipos de render/rasterizado en `src/pdf/render.ts` y `src/pdf/copy-pages.ts`, incluyendo contratos estructurales para PDF-lib y PDF.js.
- Se endurecieron tipos de `src/pdf/operations.ts` y `src/pdf/bookmarks.ts`, incluyendo contratos para documentos PDF creados, documentos rotables y diccionarios mutables de bookmarks.
- Se quitaron casts `any` reales de los tests de bookmarks; los `any` restantes en tests son matchers de Vitest como `expect.any(...)`.
- Se extrajo `src/pdf/bookmarks.ts` con TypeScript real.
- Se extrajo `src/pdf/copy-pages.ts`.
- Se extrajo `src/pdf/render.ts` para carga, metricas, rasterizado y rotacion de PDFs protegidos.
- Se extrajo `src/pdf/operations.ts` para acciones de merge, separar, extraer, eliminar paginas, ordenar paginas y rotar paginas a vertical.
- Se extrajo `src/pdf/sign.ts` para aplicar imagenes de firma al PDF, incluyendo aplicacion por marcador o en todas las paginas.
- Se extrajo `src/pdf/active-signature-action.ts` para restaurar/cargar la firma activa y preparar datos de preview.
- Se extrajo `src/pdf/prepared-signature-actions.ts` para descargar o convertir el PNG preparado en `File` reutilizable.
- Se extrajo `src/pdf/prepared-signature-generation-action.ts` para guardar el PNG generado en estado preparado y devolver datos de preview.
- Se extrajo `src/pdf/sign-action.ts` para validar y ejecutar la aplicacion final de firmas con un resultado tipado.
- Se extrajo `src/pdf/sign-download-action.ts` para convertir la firma aplicada en Blob descargable y nombre localizado fuera de `src/main.ts`.
- Se extrajo `src/pdf/signature-generation-action.ts` para preparar PNG de firma con estado de generacion, cola y versionado testeables.
- Se extrajo `src/pdf/signature-preparation.ts` para preparar el PNG transparente de firma desde una foto con dependencias testeables.
- Se extrajo `src/pdf/signature-pdf-load.ts` para cargar el PDF de firma via PDF.js con dependencias inyectables.
- Se extrajo `src/pdf/signature-recolor-action.ts` para recolorear el PNG preparado, regenerar su blob y actualizar la URL temporal.
- Se extrajo `src/pdf/merge-action.ts` para validar y ejecutar merge de PDFs con progreso inyectable.
- Se extrajo `src/pdf/page-actions.ts` para validar rangos y ejecutar acciones de extraer, eliminar, ordenar y rotar paginas fuera de `src/main.ts`.
- Se extrajo `src/pdf/split-action.ts` para validar y ejecutar la separacion de PDF fuera de `src/main.ts`.
- Se extrajo `src/pdf/split-download.ts` para descargar paginas separadas como ZIP o archivos individuales con dependencias testeables.
- Se extrajo `src/ui/dom.ts` para helpers DOM tipados de status, botones ocupados, inputs y labels de archivos.
- Se extrajo `src/ui/source-list.ts` para renderizar la lista de archivos fuente y sus acciones.
- Se extrajo `src/ui/order-list.ts` para renderizar la lista de paginas reordenables.
- Se extrajo `src/ui/pdf-tools.ts` para centralizar estados DOM de herramientas PDF, checkboxes y campos de rangos.
- Se extrajo `src/ui/pdf-status.ts` para centralizar mensajes de exito de acciones PDF con/sin rasterizacion.
- Se extrajo `src/ui/signature-markers.ts` para coordinar/renderizar marcadores visuales, detener eventos de marcador y renderizar la lista de firmas sin `onclick` inline.
- Se extrajo `src/ui/signature-viewer.ts` para mostrar/ocultar el visor de firma, limpiar canvas y actualizar controles de pagina.
- Se extrajo `src/ui/signature-preview.ts` para labels de firma, previews, metadatos y controles del generador PNG.
- Se extrajo `src/ui/signature-events.ts` para registrar inputs de firma y eventos pointer fuera de `src/main.ts`.
- Se extrajo `src/ui/signature-render.ts` para renderizar paginas PDF de firma y actualizar controles de pagina fuera de `src/main.ts`.
- Se extrajo `src/ui/signature-canvas-click.ts` para convertir clicks del canvas en marcadores PDF reutilizando la geometria compartida.
- Se extrajeron `src/ui/signature-generator-controls.ts`, `src/ui/prepared-signature-flow.ts`, `src/ui/active-signature-flow.ts`, `src/ui/signature-viewer-flow.ts`, `src/ui/signature-pdf-load-flow.ts`, `src/ui/signature-navigation-flow.ts`, `src/ui/signature-marker-flow.ts`, `src/ui/signature-marker-render-flow.ts`, `src/ui/signature-drag-flow.ts`, `src/ui/signature-apply-flow.ts` y `src/ui/window-actions.ts` para seguir vaciando la orquestacion de firma fuera de `src/main.ts`.
- Se extrajo `src/ui/english-content.ts` para aplicar el contenido en ingles fuera de `src/main.ts`.
- Se extrajo `src/ui/support.ts` para renderizar soporte/donaciones, alternar paneles y copiar datos.
- Se extrajo `src/ui/file-drag-drop.ts` para centralizar drag-and-drop de inputs de archivo.
- Se extrajo `src/ui/contract-progress.ts` para renderizar y resetear el panel de avance de contrato fuera de `src/main.ts`.
- Se extrajo `src/state/active-signature.ts` para centralizar bytes y proporcion de la firma activa.
- Se extrajo `src/state/source-files.ts` para centralizar seleccion, reordenamiento, eliminacion y versionado de archivos fuente.
- Se extrajo `src/state/page-order.ts` para centralizar paginas cargadas, version de fuente y reordenamiento de paginas.
- Se extrajo `src/state/prepared-signature.ts` para centralizar blob, canvas, nombre y URL temporal del PNG preparado.
- Se extrajo `src/state/signature-drag.ts` para centralizar indice activo y estado de movimiento de marcadores de firma.
- Se extrajo `src/state/signature-drag-action.ts` para mover y detener drag de marcadores con geometria inyectable.
- Se extrajo `src/state/signature-generation-schedule-action.ts` para programar recolor/regeneracion de firmas preparadas con timers testeables.
- Se extrajo `src/state/signature-marker-actions.ts` para remover, limpiar y redimensionar marcadores con persistencia del tamano.
- Se extrajo `src/state/signature-marker-click-action.ts` para validar imagen activa, crear y agregar marcadores desde clicks del canvas.
- Se extrajo `src/state/signature-markers.ts` para centralizar marcadores de firma, limpieza, eliminacion y cambios de tamano.
- Se extrajo `src/state/signature-generator.ts` para centralizar fuente, version, timers, cola y estado de generacion PNG.
- Se extrajo `src/state/signature-preview.ts` para centralizar la URL temporal de vista previa de la firma activa.
- Se extrajo `src/state/signature-storage.ts` para persistir/restaurar firma activa y tamano guardado.
- Se extrajo `src/state/signature-viewer.ts` para centralizar PDF de firma cargado, pagina actual, totales, escala y metricas de pagina.
- Se extrajeron utilidades puras y de procesamiento en `src/utils/filenames.ts`, `src/utils/page-ranges.ts`, `src/utils/page-selection.ts`, `src/utils/pdf-bytes.ts`, `src/utils/math.ts`, `src/utils/signature-geometry.ts`, `src/utils/signature-png.ts`, `src/utils/signature-tone.ts`, `src/utils/signature-image.ts`, `src/utils/signature-recolor.ts`, `src/utils/locale.ts` y `src/utils/contract-progress.ts`.
- Se saco de `src/main.ts` la logica pura de idioma, fechas, DÍAS360 y calculo de avance de contrato.
- Se centralizo seleccion/validacion de rangos de paginas en `src/utils/page-selection.ts`.
- Se agrego Vitest.
- Se agregaron pruebas iniciales para `src/utils/filenames.ts`, `src/utils/page-ranges.ts`, `src/utils/page-selection.ts`, `src/utils/pdf-bytes.ts`, `src/utils/math.ts`, `src/utils/signature-geometry.ts`, `src/utils/signature-png.ts`, `src/utils/signature-tone.ts`, `src/utils/signature-image.ts`, `src/utils/signature-recolor.ts`, `src/utils/locale.ts`, `src/utils/contract-progress.ts`, `src/pdf/active-signature-action.ts`, `src/pdf/bookmarks.ts`, `src/pdf/copy-pages.ts`, `src/pdf/operations.ts`, `src/pdf/sign.ts`, `src/pdf/prepared-signature-actions.ts`, `src/pdf/prepared-signature-generation-action.ts`, `src/pdf/sign-action.ts`, `src/pdf/sign-download-action.ts`, `src/pdf/signature-generation-action.ts`, `src/pdf/signature-preparation.ts`, `src/pdf/signature-pdf-load.ts`, `src/pdf/signature-recolor-action.ts`, `src/pdf/merge-action.ts`, `src/pdf/page-actions.ts`, `src/pdf/split-action.ts`, `src/pdf/split-download.ts`, `src/ui/dom.ts`, `src/ui/source-list.ts`, `src/ui/order-list.ts`, `src/ui/pdf-tools.ts`, `src/ui/pdf-status.ts`, `src/ui/signature-markers.ts`, `src/ui/signature-viewer.ts`, `src/ui/signature-preview.ts`, `src/ui/signature-events.ts`, `src/ui/signature-render.ts`, `src/ui/signature-canvas-click.ts`, `src/ui/signature-generator-controls.ts`, `src/ui/prepared-signature-flow.ts`, `src/ui/active-signature-flow.ts`, `src/ui/signature-viewer-flow.ts`, `src/ui/signature-pdf-load-flow.ts`, `src/ui/signature-navigation-flow.ts`, `src/ui/signature-marker-flow.ts`, `src/ui/signature-marker-render-flow.ts`, `src/ui/signature-drag-flow.ts`, `src/ui/signature-apply-flow.ts`, `src/ui/window-actions.ts`, `src/ui/contract-progress.ts`, `src/ui/support.ts`, `src/ui/file-drag-drop.ts`, `src/state/active-signature.ts`, `src/state/source-files.ts`, `src/state/page-order.ts`, `src/state/prepared-signature.ts`, `src/state/signature-drag.ts`, `src/state/signature-drag-action.ts`, `src/state/signature-generation-schedule-action.ts`, `src/state/signature-marker-actions.ts`, `src/state/signature-marker-click-action.ts`, `src/state/signature-markers.ts`, `src/state/signature-generator.ts`, `src/state/signature-preview.ts`, `src/state/signature-storage.ts` y `src/state/signature-viewer.ts`.
- Se extrajeron `src/ui/delete-pdf-flow.ts`, `src/ui/reorder-pdf-flow.ts` y `src/ui/rotate-pdf-flow.ts` siguiendo el mismo patron que `extractPdfFlow`.
- `eliminarPaginas()`, `ordenarPaginasPdf()` y `rotarPaginasPortrait()` ahora delegan en los nuevos flows, reduciendo `src/main.ts` de ~1178 a ~1040 lineas.
- Se extrajo `renderOrderPageListWithI18n` a `src/ui/order-list.ts`, simplificando `actualizarOrderList()` en main.ts de 12 a 5 lineas.
- Se agregaron tests para `renderOrderPageListWithI18n`.
- Se eliminaron imports no usados de `src/main.ts`: `getPdfBaseName`, `pdfBytesToBlob`, `getRemovePagesSuccessMessage`, `getReorderSuccessMessage`, `getRotatePagesSuccessMessage`, `removePdfPagesFromText`, `reorderPdfPagesFromOrder`, `rotatePdfPagesFromText`, `renderOrderPageList`.
- **Se reemplazaron todas las dependencias CDN por imports reales de npm**:
  - `pdf-lib@1.17.1` (antes global `PDFLib`)
  - `pdfjs-dist@2.16.105` (antes global `pdfjsLib`)
  - `file-saver@2.0.5` con `@types/file-saver` (antes global `saveAs`)
  - `jszip@3.10.1` (antes global `JSZip`)
- Se eliminaron los 5 `<script>` tags CDN de `index.html`.
- Se limpiaron las declaraciones globales (`declare const PDFLib`, `pdfjsLib`, `JSZip`, `saveAs`) de `src/global.d.ts`, dejando solo `interface Window`.
- Se actualizaron tipos internos (`PdfJsPage.render`, `SignaturePdfPageProxy.view`) para compatibilidad con los tipos reales de pdfjs-dist.
- **Se extrajo la orquestacion de fuente compartida y analisis** (`actualizarSourceList()`, `actualizarCardEstados()`, `scheduleSourceAnalysis()`, `analizarSourceCards()`, `actualizarRotateInfo()`) a `src/ui/source-file-flow.ts` como `setupSourceFileFlow()`.
- Se eliminaron imports no usados de `src/main.ts`: `renderSourceFileList`, `updateFileInputLabel`, `updateSourceToolStatuses`, `getRequiredElement`.
- **Se extrajo la orquestacion de avance de contrato** (`resetContractProgressDisplay()`, `triggerContractCompletionCelebration()`, `calcularAvance()`, `autoCalcularAvance()`, `initFromLocalStorage()`) a `src/ui/contract-progress-flow.ts` como `setupContractProgressFlow()`.
- `npm test` corre correctamente: 75 archivos de prueba, 253 tests.
- `npm run build` compila correctamente.

## Pendientes reales

`src/main.ts` tiene ~747 lineas. La migracion a Vite + TypeScript modular esta completa. No quedan bloques grandes por extraer.

Proximos pasos opcionales:

1. Evaluar chunk splitting en Vite (`manualChunks`) para separar `pdf-lib` y `pdfjs-dist` del bundle principal.
2. Evaluar migracion a Vue o React solo si la app realmente necesita mas interaccion reactiva.

## Siguiente corte recomendado

No hay mas bloques grandes que extraer de `main.ts` (~747 lineas de orquestacion pura). El siguiente paso logico es optimizar el build con chunk splitting, o evaluar Vue/React como siguiente fase de arquitectura.
