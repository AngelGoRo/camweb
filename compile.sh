#!/bin/bash
# --------------------------------------------------------------------
# compile.sh : compila CamWeb con los scripts oficiales de GEN.
#
# Por qué existe: GEN compila sus apps con Common/Scripts/compile/compile.bash,
# que lee una lista de apps (listapp.txt). En vez de modificar la lista de GEN,
# CamWeb tiene su propio listapp.txt y se lo pasamos con la variable LISTAPP.
# Las rutas de listapp.txt se resuelven respecto a la carpeta del propio fichero.
#
# Uso (todos los argumentos se pasan tal cual a compile.bash):
#   ./compile.sh INTEL64 DEBUG                 -> CMAKE + COMPILE + TEST en Linux x64, debug
#   ./compile.sh COMPILE INTEL64 DEBUG camweb  -> solo recompilar camweb
#   ./compile.sh                               -> todas las fases, DEBUG y RELEASE
#
# Resultado: CMake/Build/<SO>/<target>/<debug|release>/
# Log completo: GENFramework/linux_outfile.log
# --------------------------------------------------------------------

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GEN_COMPILE_DIR="$APP_DIR/../../Common/Scripts/compile"

cd "$GEN_COMPILE_DIR"
# Se invoca con "bash" porque compile.bash de GEN no tiene permiso de ejecución.
LISTAPP="$APP_DIR/listapp.txt" exec bash ./compile.bash "$@"
