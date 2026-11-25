# 0002 — Tests de la web y de los hooks fuera de las apps de GEN

**Fecha:** 2026-11-25 · **Estado:** aceptada

## Contexto
La convención de GEN es que los tests son aplicaciones GEN en C++ (`Tests/UnitTests`,
`Tests/Integration`), registradas en `listapp.txt`. Pero parte de CamWeb no es C++:
- la interfaz web (`assets/web/index.html`, HTML/CSS/JavaScript), que ya tiene lógica propia
  (navegación, tema claro/oscuro, `localStorage`);
- los hooks de Claude Code (`.claude/hooks/`, Python).

Desde C++ no se puede comprobar de forma razonable cómo se comporta una página en un navegador.

## Opciones consideradas
1. **Solo apps GEN.** Como mucho, pedir el HTML al servidor y buscar texto: no ejecuta el
   JavaScript ni ve la página.
2. **Probar a mano en el navegador.** Sin coste inicial, pero no se repite en cada cambio.
3. **Herramientas propias de cada lenguaje:** Playwright (Node) para la web, `unittest`
   (Python) para los hooks.

## Decisión
Opción 3:
- `Tests/Web/`: Playwright con Chromium headless, en pantalla de escritorio y de móvil. Un
  servidor estático de Node sirve `assets/web`, así que no hace falta compilar; con
  `CAMWEB_URL` se lanzan contra el camweb real.
- `Tests/Hooks/`: `unittest` de Python, con un repositorio git temporal.

No se registran en `listapp.txt` (no son apps GEN) y la fase `TEST` de `compile.py` no los
ejecuta, por eso el flujo previo al push de `CLAUDE.md` los incluye como paso propio.

## Por qué
Playwright maneja un navegador de verdad: ejecuta el JavaScript, pulsa botones, emula el
tema del sistema y el tamaño del móvil, y captura los errores de la consola. Es lo más
parecido al uso real (web y WebView de Android) sin depender de nada externo en los tests.

Coste: requiere Node.js y las bibliotecas de Chromium en la máquina de desarrollo, pero no
afecta a la compilación de la app ni a Android.
