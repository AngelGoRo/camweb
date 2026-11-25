/* ======================================================================================
   Configuración de Playwright para los tests de la web de CamWeb.

   - Por defecto arranca servidor_estatico.js, que sirve assets/web (no hace falta compilar).
   - Con CAMWEB_URL se prueba contra un servidor ya arrancado, por ejemplo el camweb real:
       CAMWEB_URL=https://127.0.0.1:8080 npx playwright test
     (se aceptan los certificados de ejemplo de GEN, que no son de confianza).
   ====================================================================================== */
const { defineConfig, devices } = require("@playwright/test");

const PUERTO     = 8099;
const URL_PROPIA = process.env.CAMWEB_URL;

module.exports = defineConfig({
  testDir: "./tests",
  reporter: "list",
  use: {
    baseURL:           URL_PROPIA || `http://127.0.0.1:${PUERTO}`,
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    { name: "movil",      use: { ...devices["Pixel 7"] } },      // Chromium con pantalla de móvil
  ],
  webServer: URL_PROPIA ? undefined : {
    command:             "node servidor_estatico.js",
    url:                 `http://127.0.0.1:${PUERTO}/`,
    env:                 { PUERTO: String(PUERTO) },
    reuseExistingServer: false,
  },
});
