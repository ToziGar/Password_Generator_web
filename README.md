
# Password Generator (web)

Descripción
-----------
Generador de contraseñas y frases de acceso (SPA) que produce contraseñas deterministas basadas en una clave maestra y parámetros seleccionables. Está pensado para generar credenciales reproducibles sin almacenar contraseñas en servidor alguno. La aplicación incluye opciones de verificación opcional contra el servicio Have I Been Pwned (k‑anonymity), exportación/ importación cifrada de datos, y mecanismos criptográficos ejecutados en un worker para mantener la interfaz responsiva.

Características principales
-------------------------
- Generación determinista: HMAC‑DRBG derivado de la clave maestra para obtener bytes pseudoaleatorios reproducibles a partir de los mismos parámetros.
- Exportación / importación cifrada: PBKDF2 para derivar la clave y AES‑GCM para el cifrado autenticado del archivo de respaldo.
- Trabajo en segundo plano: operaciones costosas (PBKDF2, HMAC/DRBG) realizadas en un Web Worker; incluye un fallback embebido para entornos restringidos.
- Comprobación opcional HIBP: integración con el endpoint de k‑anonymity para comprobar si una contraseña aparece en filtraciones públicas (opt‑in).
- Accesibilidad: modales con trap de foco, regiones aria‑live para notificaciones, soporte prefers‑reduced‑motion.
- Tests y QA: pruebas end‑to‑end y capturas visuales con Playwright; auditorías de accesibilidad con axe integradas en los tests.

Seguridad y modelo de amenazas (breve)
------------------------------------
- No hay servidor de confianza: la generación determinista permite reproducir contraseñas localmente sin enviar la clave maestra a terceros.
- Almacenamiento: la aplicación no guarda la clave maestra en el repositorio ni en servidores por defecto. El archivo de exportación está cifrado con AES‑GCM y protegido por una contraseña que se deriva con PBKDF2.
- HIBP: la comprobación es opcional y usa la técnica de k‑anonymity (hash parcial) para minimizar la exposición del secreto.
- Entorno: la seguridad depende del entorno de ejecución (navegador, dispositivo). El código asume un entorno de cliente moderno con Web Crypto API disponible; se incluye fallback funcional para entornos limitados.

Estructura del repositorio
-------------------------
- `index.html` — interfaz principal y modales.
- `styles.css` — variables de diseño, temas y animaciones.
- `script.js` — lógica de la aplicación: generación, worker, export/import, tutorial y control de UI.
- `worker.js` / fallback embebido — implementaciones de PBKDF2, HMAC‑DRBG y utilidades criptográficas ejecutadas en un worker.
- `tests/` — pruebas Playwright (smoke, visual e integración de axe).
- `.github/workflows/` — flujo CI para ejecución de pruebas y subida de artefactos.

Requisitos
----------
- Navegador moderno con Web Crypto API (Chrome/Chromium, Edge, Firefox, Safari recientes).
- Node.js (solo para ejecutar las pruebas con Playwright y herramientas de desarrollo).

Uso rápido
---------
1. Instalar dependencias de desarrollo (opcional, solo para tests):

```powershell
npm install
```

2. Servir la carpeta del proyecto desde un servidor estático y abrir `index.html` en el navegador. (El proyecto es una aplicación estática de cliente.)

3. Ejecutar pruebas (Playwright) desde el entorno de desarrollo:

```powershell
npx playwright test
```

Consideraciones de desarrollo
-----------------------------
- Mantener los IDs y selectores usados por las pruebas para no romper la suite de Playwright.
- Las operaciones criptográficas se ejecutan en un worker; los cambios que afecten a `WORKER_FALLBACK_SRC` deben probarse en entornos con y sin posibilidad de crear Workers.

Licencia
--------
Este repositorio incluye una licencia de código abierto (ver archivo `LICENSE`).

Contacto
-------
Para detalles técnicos o reporte de incidencias, revisar los issues del repositorio.

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

# Generador de Contraseñas — Password_Generator_web

**Versión:** 1.0 — 2025-10-25

Descripción
-----------
SPA estática (HTML/CSS/JS) para generar contraseñas y passphrases seguras en el navegador. Está diseñada para demostraciones locales y uso personal: todas las operaciones criptográficas se realizan en el cliente (Web Crypto + Web Worker). El objetivo de este proyecto es ofrecer una experiencia segura, accesible y visualmente atractiva.

Características principales
--------------------------
- Generación de contraseñas y passphrases (configurables).
- Generación determinista reproducible (semilla -> HMAC‑DRBG en `worker.js`).
- Evaluación de entropía y estimaciones de tiempo de crack para distintas tasas de ataque.
- HIBP opt‑in (k‑anonymity): solo si el usuario lo permite se solicita el prefijo SHA‑1 al servicio público.
- Export / Import cifrado (PBKDF2 + AES‑GCM). Iteraciones configurables (50k–800k).
- Operaciones pesadas en Web Worker para mantener la UI reactiva.
- Tutorial interactivo con spotlight y tooltip (accesible y orientado a la usabilidad).

Seguridad y privacidad
----------------------
- Todo el cifrado y derivado de claves ocurre en el cliente. La app no envía contraseñas por defecto.
- HIBP es completamente opcional y respeta k‑anonymity.
- Los backups cifrados guardan salt/iv/iterations y el ciphertext en un JSON; la contraseña maestra no se almacena.

Diseño y UX
----------
Se incluyó Bootstrap 5 para utilidades y layout, y GSAP para animaciones suaves. He aplicado mejoras visuales: fondos con gradientes radiales, tarjetas elevadas, micro‑interacciones y una entrada elegante del hero para una apariencia moderna y cuidada.

Cómo ejecutar (local)
---------------------
1. Servir la carpeta del proyecto (recomendado para evitar limitaciones de `file://` con Web Worker):

```powershell
python -m http.server 8000
# Abre: http://localhost:8000
```

2. (Opcional) Instalar dependencias para tests y Playwright:

```powershell
npm install
npx playwright install
```

Ejecutar pruebas (Playwright)
-----------------------------
```powershell
npx playwright test --project=chromium
```

Los reportes y artefactos se guardan en `playwright-report/`, `test-results/` y `tests/screenshots/`.

Accesibilidad
-------------
Se integró `axe-core` en la suite Playwright para comprobaciones automáticas de WCAG2AA en los flujos críticos (pantalla principal, tutorial y modales). Aun así, recomiendo pruebas manuales con lector de pantalla y navegación por teclado.

Formato del backup cifrado
-------------------------
Ejemplo simplificado:

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

CI
--
Existe un workflow en `.github/workflows/playwright.yml` que ejecuta Playwright en push/PRs y sube artifacts para diagnóstico. Se puede ampliar para bloquear PRs con diffs visuales.

Cómo contribuir
---------------
- Haz fork y crea una rama por funcionalidad.
- Si tocas criptografía, añade tests y justificación técnica.
