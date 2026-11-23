# CamWeb — guía para Claude

## 1. Qué es este proyecto
CamWeb es un visor de las cámaras Securitas Direct de casa, escrito en C++ con **GEN Framework**.
- Es **una sola aplicación multiplataforma**: la misma CamWeb se usa como **interfaz web** (servidor web de GEN) y se compila también para **Android**. Android no es otra app; es la razón de usar GEN.
- El acceso es **solo para el usuario** (dueño de las cámaras).
- Además de que funcione, el objetivo es **aprender** (ver sección 8).

### Ubicación dentro de GEN
GEN es un espacio de trabajo formado por varios repositorios (`Common`, `GEN`, `ThirdPartyLibraries`, `Examples`, `Tests`, `Utilities`…), y las aplicaciones viven dentro de él. CamWeb sigue ese paradigma:
```
/home/angel/proyectos/GENFramework/
├── Common/  GEN/  ThirdPartyLibraries/  Examples/   ← GEN (no se modifica desde aquí)
└── Apps/
    └── CamWeb/                                       ← este repositorio (git propio → GitHub)
```
CamWeb localiza GEN con rutas relativas (`GEN_DIRECTORY "../../.."` en `CMake/CMakeLists.txt`), así que **no se debe mover de `Apps/CamWeb`**. No se modifican ficheros de GEN; si algo de GEN parece un bug, avisar al usuario.

Estructura:
- `Sources/` — código de la aplicación (`CamWeb*.cpp/.h`).
- `assets/` — configuración (`camweb.ini`), idiomas, web (`assets/web/`) y certificados de ejemplo.
- `CMake/` — `CMakeLists.txt` (y `CMakePresets.json`, solo para el IDE).
- `listapp.txt` y `compile.sh` — compilación con los scripts de GEN (sección 2).
- `Tests/` — tests (sección 3).
- `docs/` — documentación y decisiones (sección 7).

## 2. Compilación
Se compila con los **scripts oficiales de GEN** (`GENFramework/Common/Scripts/compile/compile.py`), no con `cmake --build`. `compile.sh` es un envoltorio que les pasa nuestro `listapp.txt`:
```bash
./compile.sh INTEL64 DEBUG                  # CMAKE + COMPILE + TEST, Linux x64, debug
./compile.sh COMPILE INTEL64 DEBUG camweb   # solo recompilar camweb
```
- Fases: `CMAKE`, `COMPILE`, `TEST`. Modos: `DEBUG`, `RELEASE`. Si no se indican, hace todas las fases en ambos modos.
- Binario: `CMake/Build/Linux/intel64/debug/camweb`. Log completo: `GENFramework/linux_outfile.log`.
- Al terminar, el script indica errores y el número de warnings de cada app.
- `listapp.txt` define qué apps hay y en qué plataformas compilan (`"ruta" "nombre" "PLATAFORMAS"`, rutas relativas a este repositorio). Al crear una app de tests, se añade ahí.
- El servidor arranca con TLS (certificados de ejemplo), así que se prueba en `https://127.0.0.1:8080` (`curl -k`).

Reglas:
- El código debe compilar **sin errores y sin warnings nuevos** en **Linux (INTEL64)** y en **Android (ANDROID32/ANDROID64)**.
- **Android se compila desde Windows**: `compile.py` solo admite ANDROID32/64 en un host Windows. El código se queda en WSL y se lanza `compile.bat` desde Windows (PowerShell, que acepta rutas `\\wsl.localhost\...`). Desde WSL se puede invocar con `powershell.exe`.
- **Pendiente:** el entorno Android en Windows (Python, Visual Studio Build Tools, CMake, Ninja y el NDK de Windows con `Common/Scripts/android/InstallAndroid.bat`) todavía no está configurado. Hasta entonces, avisar al usuario de que Android no se ha verificado (no darlo por bueno).
- El código nuevo no debe usar APIs exclusivas de Linux ni de Windows: lo dependiente de la plataforma se hace a través de las clases de GEN (`XFactory`, `DIOFactory`, etc.), para que compile igual en Android.

## 3. Tests
- **Toda funcionalidad nueva debe ir acompañada de tests.** Al corregir un bug, añadir un test que lo reproduzca.
- Siguiendo la convención de GEN, **los tests son aplicaciones GEN aparte**, en una carpeta separada dentro de este repositorio (fuera de `Sources/`):
  - `Tests/UnitTests/` — app `unittests_camweb` (tests unitarios). La fase `TEST` de `compile.py` ejecuta automáticamente las apps cuyo nombre empieza por `unittests_`.
  - `Tests/Integration/` — app de pruebas de integración (servidor web, API REST, configuración…). Se ejecuta a mano tras compilar.
  - Cada app de tests se registra en `listapp.txt`.
- Los tests **no deben depender de las cámaras reales, de Internet ni de credenciales**: usar datos simulados.

## 4. Flujo obligatorio antes de cada `git push`
Seguir estos pasos **en este orden**. Si alguno falla, parar, explicar el problema al usuario y no continuar.
1. **Compilar** con `./compile.sh INTEL64 DEBUG` (incluye la fase `TEST` de los tests unitarios), y en Android cuando esté configurado.
2. **Pruebas de integración:** si existen en `Tests/Integration/`, ejecutarlas. Esto va **antes** de la revisión.
3. **Revisión por subagente:** lanzar un subagente que revise todos los commits pendientes de subir (`git diff origin/main...HEAD`). Debe comprobar:
   - errores de lógica y casos límite,
   - seguridad y secretos (sección 5),
   - que las funcionalidades nuevas tienen tests,
   - que se cumple este CLAUDE.md.
4. **Mostrar al usuario** el resultado de las pruebas y de la revisión, y hacer push **solo con su confirmación**.

## 5. Seguridad y secretos
- **Nunca** subir al repositorio credenciales de Securitas, contraseñas, tokens, IPs/URLs privadas de casa ni claves o certificados propios.
- Los valores reales van en un `.ini` local que git ignora (por ejemplo `assets/camweb.local.ini`); `assets/camweb.ini` solo lleva valores vacíos o de ejemplo.
- Los certificados de `assets/certificates/` son los de ejemplo de GEN (públicos): sirven solo para pruebas, nunca para producción.
- Antes de que el servidor escuche fuera de `127.0.0.1`, deben estar activos la **autenticación** (`isauthenticatedaccess=yes`) y **TLS** con certificados propios.
- Ante la duda sobre si algo es sensible, preguntar al usuario antes de hacer commit.

## 6. Git
- Commits pequeños, cada uno con un solo propósito, con mensaje en **español**.
- **No hacer push** si el usuario no lo pide (y siempre pasando por la sección 4).
- No reescribir la historia de `main` (`push --force`, `rebase` de commits ya subidos).

## 7. Estilo y documentación
- Seguir las convenciones de código de GEN: imitar los ficheros existentes en `Sources/` (cabeceras, nombres de clases y métodos, uso de `XSTRING`, `XDWORD`, etc.).
- Las decisiones importantes (arquitectura, librerías, protocolo de las cámaras, seguridad) se documentan en `docs/decisiones/`, con una nota corta por decisión: contexto, opciones consideradas, decisión y por qué.

## 8. Modo aprendizaje
- Explicar el **porqué** de cada decisión, no solo el qué.
- Avanzar en **pasos pequeños** y comprensibles; no entregar grandes bloques de código de golpe.
- Cuando se introduzca un concepto nuevo (de GEN, C++, redes, Android…), explicarlo brevemente.
