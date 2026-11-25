# 0001 — No hacer commits en `main`: todo cambio va por rama y pull request

**Fecha:** 2026-11-25 · **Estado:** aceptada

## Contexto
Hasta ahora los cambios se podían hacer directamente sobre `main`. Eso tiene dos riesgos:
- un cambio a medias o con fallos queda en la rama principal sin que nadie lo haya revisado;
- se pierde el punto natural de revisión: el pull request (PR), donde se ve el cambio
  completo, se comenta y se decide si se integra.

Además, buena parte de los commits los hace Claude Code. Una instrucción escrita en
`CLAUDE.md` se puede pasar por alto; una comprobación automática, no.

## Opciones consideradas
1. **Solo una norma escrita en `CLAUDE.md`.** Fácil, pero depende de que se recuerde.
2. **Hook de git (`.git/hooks/pre-commit`).** Bloquea también los commits manuales, pero git
   no versiona la carpeta `.git/hooks`: habría que instalarlo a mano en cada copia.
3. **Hook de Claude Code (`.claude/settings.json`).** Se versiona con el repositorio y se
   aplica a cualquier sesión de Claude sobre CamWeb. No afecta a los commits manuales.
4. **Regla de protección de `main` en GitHub.** Impide subir directamente a `main` y obliga
   a usar PR, para todos. Se configura en GitHub, no en el repositorio.

## Decisión
Opción 3: un hook `PreToolUse` de Claude Code
(`.claude/hooks/bloquear_commit_en_main.py`) que deniega `git commit` cuando la rama actual
es `main`. Flujo resultante:

1. crear una rama (`git switch -c <nombre>`),
2. hacer allí los commits,
3. seguir el flujo de la sección 4 de `CLAUDE.md` (compilar, tests, revisión),
4. subir la rama y abrir un pull request contra `main`.

Tests del hook: `Tests/Hooks/test_bloquear_commit_en_main.py`.

## Por qué
Es la opción que cubre el caso real (los commits de Claude) sin pasos manuales de
instalación. Es una **red de seguridad, no una barrera**: sus límites conocidos (alias,
`merge`, `cherry-pick`, rutas con espacios…) están documentados en el propio script.

Si en el futuro se quiere cubrir también los commits manuales, lo adecuado es añadir la
opción 4 (protección de `main` en GitHub), que es complementaria a esta.
