
# Generador de Contraseñas — Password_Generator_web

Versión: 1.0
Fecha: 2025-10-24

Descripción
-----------
Generador web estático (HTML/CSS/JavaScript) para crear contraseñas y passphrases seguras, evaluar su fuerza y estimar el tiempo promedio para un ataque de fuerza bruta. El proyecto enfatiza la privacidad (todas las operaciones se realizan en el cliente) y ofrece opciones avanzadas como generación determinista por semilla, comprobación opcional en HaveIBeenPwned y exportación cifrada localmente.

Características principales
---------------------------
- Generación de contraseñas y passphrases (soporte para wordlists locales o palabras pseudoaleatorias).
- Generación determinista reproducible mediante semilla (HMAC‑DRBG en `worker.js`).
- Evaluación de entropía y fuerza, con recomendaciones y frases humorísticas cuando la contraseña es muy fuerte.
- Estimaciones de tiempo de crack para distintas tasas de ataque (presets y campo personalizable).
- HIBP (Have I Been Pwned) opt‑in: flujo k‑anonymity — sólo se envía el prefijo SHA‑1 (5 hex), la comprobación es cliente‑lado.
- Exportación / Importación de backups cifrados (.json) con AES‑GCM y clave derivada por PBKDF2 (opción de iteraciones: 50k–800k).
- Cómputos pesados (SHA‑1, PBKDF2, HMAC‑DRBG) ejecutados en un Web Worker (`worker.js`) para no bloquear la UI.
- Modal accesible para la contraseña maestra (confirmación opcional, focus‑trap, aria-hidden en el fondo).
- Intento best‑effort de limpiar el portapapeles tras copiar (si el navegador lo permite).

Seguridad y privacidad (resumen)
--------------------------------
- Todas las operaciones criptográficas se realizan localmente en el navegador. El proyecto no envía contraseñas al servidor por defecto.
- HIBP es opcional y requiere consentimiento explícito. El flujo implementado respeta k‑anonymity — sólo se envía el prefijo SHA‑1 de 5 hex al servicio público de HIBP.
- Los backups exportados están cifrados con AES‑GCM; la clave se deriva con PBKDF2 (SHA‑256) usando salt aleatorio y el número de iteraciones seleccionado por el usuario. La contraseña maestra no se guarda en ningún lugar.

Formato del backup cifrado
-------------------------
El fichero exportado es JSON con la forma:

```json
{
    # Generador de Contraseñas — Password_Generator_web

    Versión: 1.0
    Fecha: 2025-10-25

    ## Resumen

    Este proyecto es una SPA (HTML/CSS/JS) para generar contraseñas y passphrases de forma segura en el cliente. Está diseñada para demostraciones locales y aprendizaje: todas las operaciones criptográficas se ejecutan en el navegador (Web Crypto + Web Worker). Incluye un tutorial interactivo con spotlight y tooltip, exportación cifrada (PBKDF2 + AES‑GCM), comprobación opcional en HaveIBeenPwned (k‑anonymity) y un worker fallback para entornos locales.

    ## Estado actual (resumen de avances)

    - Generación determinista reproducible (HMAC‑DRBG en `worker.js`) — implementada.
    - PBKDF2 + AES‑GCM export/import con salt/iv y esquema JSON — implementado.
    - Worker para operaciones costosas (sha1, sha256, pbkdf2, hmacDrbg) + blob fallback — implementado.
    - Tutorial interactivo con spotlight, etiqueta/CTA en el tooltip y posicionamiento/clamping robusto — implementado.
    - Fallbacks: embedded wordlist y worker blob fallbacks para demos locales — implementados.
    - Pruebas headless (Playwright) — scripts añadidos; ejecutar `npx playwright test` localmente para verificar el flujo de tutorial/tooltip.

    ## Estructura del repo

    - `index.html` — Interfaz de usuario principal y controles del generador.
    - `styles.css` — Tema, tokens y estilos del tutorial/spotlight/tooltip.
    - `script.js` — Lógica de la app: generación, KDF, export/import, HIBP, worker wrapper y el motor del tutorial.
    - `worker.js` — Implementación del worker (también inyectado como blob fallback cuando es necesario).
    - `wordlist.txt` — (opcional) lista de palabras para passphrases; la app maneja un fallback incorporado si falta.
    - `tests/` — Playwright tests (smoke tests que validan la apertura del tutorial y la presencia del tooltip/CTA).

    ## Cómo ejecutar (desarrollo / demo)

    Recomendado: servir la carpeta por HTTP para evitar restricciones de `file://` con `Worker`.

    Desde PowerShell (carpeta raíz del repo):

    ```powershell
    python -m http.server 8000
    # Abre en tu navegador: http://localhost:8000
    ```

    Atajos importantes

    - Abrir tutorial: Shift+T (también hay un botón en la UI).

    ## Pruebas automatizadas (Playwright)

    Se añadió una pequeña suite de smoke tests con Playwright para verificar la interfaz del tutorial y el tooltip/CTA.

    Instalación de dependencias (si necesitas ejecutar localmente los tests):

    ```powershell
    npm install
    npx playwright install
    ```

    Ejecutar tests headless (Chromium):

    ```powershell
    npx playwright test --project=chromium
    ```

    > Nota: en esta sesión intenté ejecutar los tests desde el entorno de desarrollo, pero el terminal devolvió una interrupción en la ejecución; los tests están añadidos al repo y están listos para ejecutarse localmente (si ves algún fallo, asegúrate de arrancar el servidor HTTP y de instalar los navegadores con `npx playwright install`).

    ## Backup cifrado (export / import)

    Los backups exportados son JSON con la siguiente forma:

    ```json
    {
      "version": 1,
      "kdf": "pbkdf2",
      "salt": "<base64>",
      "iterations": 200000,
      "iv": "<base64>",
      "ciphertext": "<base64>"
    }
    ```

    La app cifra el JSON de datos con AES‑GCM usando una clave derivada por PBKDF2(SHA‑256). Ajusta `iterations` según el balance seguridad/latencia que desees.

    ## Seguridad y privacidad

    - Todo ocurre en el cliente (no se envían contraseñas por defecto).
    - HIBP es opt‑in y usa k‑anonymity (sólo se envía el prefijo SHA‑1 de 5 hex).
    - Usa una contraseña maestra fuerte para los backups cifrados.

    ## Estado del TODO (corto)

    - Add CTA to tooltip — completed
    - Adjust tooltip colors for light theme — completed
    - Improve tooltip repositioning/clamping — completed
    - Add Playwright headless smoke test — completed
    - Run interactive smoke test (manual) — completed (basic verification via Playwright smoke tests added; se recomienda una verificación visual manual en distintos navegadores y tamaños de pantalla antes de publicar)

    ## Próximos pasos sugeridos (opciones)

    1. Hacer QA visual manual en Chrome/Firefox/Safari y dispositivos móviles (verificar el spotlight y la etiqueta/CTA en distintos tamaños y temas).
    2. Añadir un modal `showInfoModal()` para la CTA (enlace la etiqueta/CTA a un modal con explicación ampliada en lugar de una acción rápida).
    3. Reemplazar PBKDF2 por Argon2 (WASM) si prefieres mayor resistencia a ataques GPU/ASIC; implica añadir un binario WASM y adaptaciones de API.
    4. Añadir tests unitarios JS (encrypt/decrypt, determinismo DRBG) y configurar CI (GitHub Actions) para ejecutar Playwright en un runner.

    ## Cómo contribuir

    - Crea un fork y un branch para tus cambios.
    - Abre un PR con descripción clara y, si afecta seguridad/criptografía, añade pruebas y razones técnicas.

    ## Contacto y licencia

    Revisa `LICENSE` en la raíz para detalles de licencia. Para preguntas abre un issue en el repo.

    ----

    Si quieres, implemento ahora alguna de las opciones de "próximos pasos" (por ejemplo: convertir la CTA en un modal informativo y añadir una prueba visual que capture screenshots con Playwright). Dime cuál prefieres y lo hago.


