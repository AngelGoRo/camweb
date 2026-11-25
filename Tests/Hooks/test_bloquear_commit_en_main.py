#!/usr/bin/env python3
"""
Tests del hook .claude/hooks/bloquear_commit_en_main.py

Ejecutar desde la raíz del repositorio:
    python3 Tests/Hooks/test_bloquear_commit_en_main.py

Cada test simula el JSON que Claude Code envía al hook por stdin. Para no depender de la
rama en la que esté el repositorio real, se crea un repositorio git temporal y se prueba
en él estando en `main` y en otra rama.
"""

import json
import os
import subprocess
import sys
import tempfile
import unittest

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
HOOK = os.path.join(RAIZ, ".claude", "hooks", "bloquear_commit_en_main.py")


def git(directorio, *argumentos):
  subprocess.run(["git", "-C", directorio, *argumentos], check=True, capture_output=True)


def ejecutar_hook(comando, cwd, entrada=None):
  """Devuelve True si el hook deniega el comando."""
  if entrada is None:
    entrada = json.dumps({"tool_name": "Bash", "tool_input": {"command": comando}, "cwd": cwd})
  salida = subprocess.run([sys.executable, HOOK], input=entrada,
                          capture_output=True, text=True, timeout=15)
  if salida.returncode != 0:
    raise AssertionError("El hook terminó con código %d: %s" % (salida.returncode, salida.stderr))
  if not salida.stdout.strip():
    return False
  respuesta = json.loads(salida.stdout)
  return respuesta["hookSpecificOutput"]["permissionDecision"] == "deny"


class TestBloquearCommitEnMain(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    cls.tmp  = tempfile.TemporaryDirectory()
    cls.repo = cls.tmp.name
    git(cls.repo, "init", "-q", "-b", "main")
    git(cls.repo, "-c", "user.name=test", "-c", "user.email=test@example.com",
        "commit", "-q", "--allow-empty", "-m", "inicial")

  @classmethod
  def tearDownClass(cls):
    cls.tmp.cleanup()

  def en_rama(self, rama):
    git(self.repo, "switch", "-q", "-C", rama)

  # ---- Estando en main -------------------------------------------------------------

  def test_main_bloquea_commits(self):
    self.en_rama("main")
    for comando in ['git commit -m "x"',
                    "git commit -am x",
                    "git -C . commit -m x",
                    "git -c user.name=x commit -m x",
                    "git add . && git commit -m x",
                    "git commit -m x && git switch -c rama"]:     # la rama se crea DESPUÉS
      with self.subTest(comando=comando):
        self.assertTrue(ejecutar_hook(comando, self.repo))

  def test_main_permite_si_crea_rama_antes(self):
    self.en_rama("main")
    for comando in ["git switch -c rama && git commit -m x",
                    "git checkout -b rama && git commit -m x"]:
      with self.subTest(comando=comando):
        self.assertFalse(ejecutar_hook(comando, self.repo))

  def test_main_permite_otros_comandos_git(self):
    self.en_rama("main")
    for comando in ["git status", "git log --grep commit", "git push origin rama", "ls -la"]:
      with self.subTest(comando=comando):
        self.assertFalse(ejecutar_hook(comando, self.repo))

  # ---- Estando en otra rama ---------------------------------------------------------

  def test_otra_rama_permite_commits(self):
    self.en_rama("boton_tema")
    self.assertFalse(ejecutar_hook('git commit -m "x"', self.repo))

  # ---- Robustez ("fail open") -----------------------------------------------------

  def test_entrada_no_json_no_bloquea(self):
    self.assertFalse(ejecutar_hook(None, self.repo, entrada="esto no es json"))

  def test_directorio_sin_git_no_bloquea(self):
    with tempfile.TemporaryDirectory() as sin_git:
      self.assertFalse(ejecutar_hook('git commit -m "x"', sin_git))


if __name__ == "__main__":
  unittest.main(verbosity=2)
