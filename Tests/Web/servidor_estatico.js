/* ======================================================================================
   Servidor estático mínimo para los tests de la web.

   Sirve assets/web en http://127.0.0.1:<puerto> para que los tests no dependan de
   compilar ni arrancar camweb. Para probar contra el servidor real de GEN, ver
   playwright.config.js (variable CAMWEB_URL).
   ====================================================================================== */
const http = require("http");
const fs   = require("fs");
const path = require("path");

const RAIZ   = path.resolve(__dirname, "..", "..", "assets", "web");
const PUERTO = Number(process.env.PUERTO || 8099);

const TIPOS = {
  ".html":  "text/html; charset=utf-8",
  ".woff2": "font/woff2",
  ".ico":   "image/x-icon",
  ".txt":   "text/plain; charset=utf-8",
};

http.createServer((peticion, respuesta) => {
  let fichero;
  try {
    // decodeURIComponent lanza URIError con secuencias mal formadas (p. ej. "%E0%A4%A")
    const ruta = decodeURIComponent(new URL(peticion.url, "http://x").pathname);
    if (ruta.includes("\0")) throw new Error("byte nulo");        // fs lo rechaza lanzando
    fichero = path.join(RAIZ, ruta === "/" ? "index.html" : ruta);
  } catch (e) {
    respuesta.writeHead(400); return respuesta.end();
  }

  // Que no se pueda salir de assets/web con "../"
  if (!fichero.startsWith(RAIZ + path.sep)) { respuesta.writeHead(403); return respuesta.end(); }

  fs.readFile(fichero, (error, datos) => {
    if (error) { respuesta.writeHead(404); return respuesta.end(); }
    respuesta.writeHead(200, { "Content-Type": TIPOS[path.extname(fichero)] || "application/octet-stream" });
    respuesta.end(datos);
  });
}).listen(PUERTO, "127.0.0.1", () => console.log(`Sirviendo ${RAIZ} en http://127.0.0.1:${PUERTO}`));
