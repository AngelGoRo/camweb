#!/usr/bin/env python3
"""
Hook PreToolUse de Claude Code (herramienta Bash) para CamWeb.

Impide que Claude haga `git commit` estando en la rama `main`: todo cambio debe ir en
una rama propia que luego se sube y se integra mediante un pull request.

Funcionamiento:
  - Claude Code pasa por stdin un JSON con el comando que se va a ejecutar.
  - Si el comando contiene `git ... commit` y la rama actual es `main`, se responde con
    permissionDecision = "deny" y el comando no se ejecuta.
  - Si el mismo comando crea antes una rama (`git checkout -b` / `git switch -c`), se deja
    pasar, porque el commit ya caerá en la rama nueva.
"""

import json
import os
import re
import subprocess
import sys

RAMA_PROTEGIDA = "main"

# `git commit`, también con opciones globales delante: `git -C ruta commit`, `git -c x=y commit`
RE_COMMIT     = re.compile(r"\bgit(\s+-[Cc]\s+\S+|\s+--?[\w-]+(=\S+)?)*\s+commit\b")
RE_RAMA_NUEVA = re.compile(r"\bgit\s+(checkout\s+-[bB]|switch\s+(-c|--create|-C))\s+\S+")


def rama_actual(directorio):
  try:
    salida = subprocess.run(["git", "-C", directorio, "rev-parse", "--abbrev-ref", "HEAD"],
                            capture_output=True, text=True, timeout=10)
    return salida.stdout.strip()
  except Exception:
    return ""


def main():
  try:
    datos = json.load(sys.stdin)
  except Exception:
    return 0                                     # entrada inesperada: no bloqueamos nada

  comando = (datos.get("tool_input") or {}).get("command") or ""
  commit  = RE_COMMIT.search(comando)
  if not commit:
    return 0

  # ¿Se crea una rama antes del commit dentro del mismo comando?
  rama_nueva = RE_RAMA_NUEVA.search(comando)
  if rama_nueva and rama_nueva.start() < commit.start():
    return 0

  directorio = datos.get("cwd") or os.environ.get("CLAUDE_PROJECT_DIR") or "."
  if rama_actual(directorio) != RAMA_PROTEGIDA:
    return 0

  motivo = ("En CamWeb no se hace commit directamente sobre 'main'. Crea una rama "
            "(git switch -c <nombre>), haz el commit allí y súbela como pull request.")
  print(json.dumps({
    "hookSpecificOutput": {
      "hookEventName":            "PreToolUse",
      "permissionDecision":       "deny",
      "permissionDecisionReason": motivo,
    }
  }, ensure_ascii=False))
  return 0


if __name__ == "__main__":
  sys.exit(main())
