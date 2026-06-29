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
