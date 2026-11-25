/* ======================================================================================
   Tests del botón de tema (claro / oscuro) de assets/web/index.html

   Playwright abre la página en un Chromium sin ventana y la maneja como un usuario:
   pulsa botones, recarga, cambia el tema del sistema (emulateMedia), etc.
   Cada test empieza con un navegador "limpio" (localStorage vacío).
   ====================================================================================== */
const { test, expect } = require("@playwright/test");

const CLAVE_TEMA = "camweb.theme";

const tema   = page => page.locator("html").getAttribute("data-theme");
const boton  = page => page.locator("#theme-toggle");
const fondo  = page => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

// Errores de JavaScript de la página: cualquiera hace fallar el test
test.beforeEach(async ({ page }) => {
  page.errores = [];
  page.on("pageerror", error => page.errores.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(page.errores, "errores de JavaScript en la página").toEqual([]);
});

// ---- Carga básica ---------------------------------------------------------------------

test("la página carga, dibuja el plano y carga las fuentes", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#plan polygon.room")).toHaveCount(7);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('16px "Plus Jakarta Sans"'))).toBe(true);
});

test("el botón tiene nombre accesible ya en el HTML, antes de que corra el script", async ({ request }) => {
  const html = await (await request.get("/")).text();
  expect(html).toMatch(/<button id="theme-toggle"[^>]*aria-label="[^"]+"/);
});

// ---- Tema inicial: sigue al sistema --------------------------------------------------

for (const sistema of ["light", "dark"]) {
  test(`sin elección guardada sigue al sistema (${sistema})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: sistema });
    await page.goto("/");
    expect(await tema(page)).toBe(sistema);
  });
}

// ---- El botón ------------------------------------------------------------------------

test("el botón alterna claro <-> oscuro y actualiza colores, icono y etiqueta", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");

  const fondoClaro = await fondo(page);
  await expect(boton(page)).toHaveAttribute("aria-label", "Cambiar a modo oscuro");
  await expect(page.locator(".icon-moon")).toBeVisible();
  await expect(page.locator(".icon-sun")).toBeHidden();

  await boton(page).click();
  expect(await tema(page)).toBe("dark");
  expect(await fondo(page)).not.toBe(fondoClaro);
  await expect(boton(page)).toHaveAttribute("aria-label", "Cambiar a modo claro");
  await expect(page.locator(".icon-sun")).toBeVisible();
  await expect(page.locator(".icon-moon")).toBeHidden();

  await boton(page).click();
  expect(await tema(page)).toBe("light");
  expect(await fondo(page)).toBe(fondoClaro);
});

test("la elección se recuerda al recargar y manda sobre el sistema", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await boton(page).click();                                  // el usuario elige oscuro
  expect(await page.evaluate(k => localStorage.getItem(k), CLAVE_TEMA)).toBe("dark");

  await page.reload();
  expect(await tema(page)).toBe("dark");                      // sigue en oscuro aunque el sistema esté en claro
});

test("el tema se fija antes de pintar (sin parpadeo)", async ({ page }) => {
  await page.addInitScript(k => localStorage.setItem(k, "dark"), CLAVE_TEMA);
  // Leemos data-theme en cuanto existe el <body>, antes de que corra el script del final
  await page.addInitScript(() => {
    new MutationObserver((_, obs) => {
      if (document.body) { window.__temaAlPintar = document.documentElement.dataset.theme; obs.disconnect(); }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/");
  expect(await page.evaluate(() => window.__temaAlPintar)).toBe("dark");
});

// ---- Cambios del tema del sistema con la página abierta -----------------------------

test("sin elección guardada, sigue los cambios del sistema en vivo", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(boton(page)).toHaveAttribute("aria-label", "Cambiar a modo claro");
});

test("con elección guardada, ignora los cambios del sistema", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await boton(page).click();                                  // elige oscuro
  await page.emulateMedia({ colorScheme: "light" });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.emulateMedia({ colorScheme: "light" });
  expect(await tema(page)).toBe("dark");
});

test("un valor guardado inválido se ignora y se sigue al sistema", async ({ page }) => {
  await page.addInitScript(k => localStorage.setItem(k, "morado"), CLAVE_TEMA);
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  expect(await tema(page)).toBe("dark");
});

// ---- Navegadores con limitaciones ----------------------------------------------------

test("sin localStorage (modo privado, WebView) la página y el botón funcionan", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("SecurityError"); } });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("#plan polygon.room")).toHaveCount(7);
  await boton(page).click();
  expect(await tema(page)).toBe("dark");
});

test("navegador antiguo sin MediaQueryList.addEventListener: el plano se dibuja igual", async ({ page }) => {
  // addEventListener lo hereda de EventTarget: no basta con borrarlo, hay que taparlo
  await page.addInitScript(() => {
    Object.defineProperty(MediaQueryList.prototype, "addEventListener", { value: undefined });
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("#plan polygon.room")).toHaveCount(7);

  // El camino de reserva (addListener) también sigue los cambios del sistema en vivo
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await boton(page).click();                                  // el botón sigue funcionando
  expect(await tema(page)).toBe("light");
});

// ---- Maquetación ---------------------------------------------------------------------

test("con un título muy largo el botón no encoge y no hay scroll horizontal", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    document.getElementById("title").textContent = "Habitación con un nombre larguísimo ".repeat(5);
  });
  const caja = await boton(page).boundingBox();
  expect(caja.width).toBeGreaterThanOrEqual(44);
  expect(caja.height).toBeGreaterThanOrEqual(44);
  const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(desborda).toBe(false);
});

test("el botón está a la derecha de la cabecera", async ({ page }) => {
  await page.goto("/");
  const cabecera = await page.locator("header").boundingBox();
  const caja     = await boton(page).boundingBox();
  expect(cabecera.x + cabecera.width - (caja.x + caja.width)).toBeLessThanOrEqual(20);  // solo el padding
});
