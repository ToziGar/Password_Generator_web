
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
    "version": 1,
    "kdf": "pbkdf2",
    "salt": "<base64>",
    "iterations": 200000,
    "iv": "<base64>",
    "ciphertext": "<base64>"
}
```

El `ciphertext` contiene la representación JSON (cifrada) del objeto con la contraseña y opciones.

Requisitos y compatibilidad
---------------------------
- Navegador moderno con Web Crypto (`crypto.subtle`) y Web Worker.
- Servir la app por HTTP/HTTPS (no se puede usar `Worker` desde `file://`). Recomendado HTTPS en producción.

Instalación y ejecución local rápida
-----------------------------------
Desde PowerShell (carpeta raíz del repo):

```powershell
python -m http.server 8000
# luego abre http://localhost:8000 en tu navegador
```

Uso básico
----------
1. Ajusta las opciones (longitud, mayúsculas/minúsculas, números, símbolos) o activa "Usar frase" para generar passphrases.
2. (Opcional) Activa "Generador determinista" e introduce una semilla para reproducir la salida.
3. Haz clic en "Generar". El campo de salida mostrará la contraseña.
4. Para comprobar HIBP marca la casilla opt‑in y pulsa "Comprobar ahora".
5. Para exportar un backup cifrado, selecciona las iteraciones KDF deseadas y pulsa "Exportar (.json cifrado)"; confirma la contraseña maestra (repetición requerida en export).
6. Para importar, usa "Importar (.json cifrado)" y facilita la contraseña maestra para descifrar.

Decisiones de diseño y tradeoffs
--------------------------------
- PBKDF2 con SHA‑256 se usa por compatibilidad y porque los navegadores proveen `SubtleCrypto`. Para mayor resistencia a ataques modernos, Argon2 sería preferible (requiere WASM/implementación externa).
- Se proporciona un slider/selector de iteraciones (50k–800k). Más iteraciones implican mayor coste para el atacante, pero también más latencia para la derivación en el cliente — la app muestra una ETA estimada basada en un micro‑benchmark.

Estructura del proyecto
-----------------------
- `index.html` — UI principal y controles.
- `styles.css` — estilos y animaciones.
- `script.js` — toda la lógica: generación, evaluación, export/import, HIBP, worker wrapper, UI.
- `worker.js` — Web Worker que implementa `sha1`, `sha256`, `pbkdf2` y `hmacDrbg`.
- `wordlist.txt` — (opcional) wordlist local para passphrases. Si no existe, la app intentará un fallback remoto o generará palabras pseudoaleatorias.

Calidad, pruebas y próximos pasos sugeridos
-----------------------------------------
- Actualmente no hay suite de tests automatizada en el repo. Recomendaciones:
    - Añadir tests unitarios para encrypt/decrypt round‑trip.
    - Tests para determinismo del DRBG.
    - Pruebas de integración para export→import con distintos valores de iteraciones.
- Mejoras UX sugeridas:
    - Reemplazar `alert()` por errores inline accesibles.
    - Modal de configuración para export con explicación sobre iteraciones y tiempo.
    - Focus restoration (actualmente el modal usa focus trap; podemos restaurar foco al elemento que lo abrió).

Limitaciones y notas importantes
-------------------------------
- No expongas contraseñas reales en foros públicos ni en repositorios sin cifrar.
- El backup cifrado sólo es seguro si usas una contraseña maestra fuerte y única.
- El micro‑benchmark y la ETA son aproximaciones: resultados varían con CPU, temperatura y carga del navegador.

Contribuciones
--------------
Pull requests y issues son bienvenidos. Algunas ideas de contribución:
- Integrar Argon2 via WASM para KDF.
- Añadir tests automáticos y CI (GitHub Actions).
- Mejorar accesibilidad y localización.

Licencia
--------
Revisa el fichero `LICENSE` en la raíz del repositorio para los términos de licencia.

Contacto
--------
Repositorio: `Password_Generator_web` (owner: ToziGar)

Gracias por probar el proyecto. Si deseas, puedo añadir ahora:
- Suite de tests automatizada y comandos `npm`/`yarn` para desarrollo.
- Un modal de export con más opciones de seguridad (confirmación, iteraciones personalizadas y estimación de tiempo). 

Indica qué prefieres y lo implemento a continuación.


---

Actualización rápida (25-Oct-2025) — UI polish
------------------------------------------------
- Reorganizado el toolbar: acciones primarias (Generar, Regenerar, Copiar) ahora están agrupadas y son más prominentes; acciones secundarias (Tutorial, Exportar, Importar) están a la derecha.
- Reducción de transparencias y blur en tarjetas y modales para mejorar legibilidad.
- Botones rediseñados: jerarquía clara entre primario y secundario, tamaños consistentes y mejores estados de enfoque/hover.
- Mejoras de accesibilidad: soporte `prefers-reduced-motion`, focus-visible, tamaños mínimos de objetivo táctil.

Prueba rápida después de los cambios
-----------------------------------
1. Sirve la carpeta (por ejemplo `python -m http.server 8000`) y abre http://localhost:8000
2. Verifica el header, el grupo de acciones y que el botón "Generar" destaque.
3. Abre el tutorial (Shift+T) y revisa que el contenido es legible y que los highlights son sutiles.

Si quieres, puedo:
- Ajustar la tipografía (ej. cambiar a SF Pro/Inter refinado) y exportar un screenshot de ejemplo.
- Implementar una coreografía GSAP paso a paso para el tutorial (scroll+spotlight+announce).


