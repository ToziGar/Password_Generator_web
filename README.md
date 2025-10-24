# Password_Generator_web

Generador de contraseñas estático y educativo.

Cómo usar

- Abre `index.html` en tu navegador (doble clic o arrastra al navegador).
- Ajusta la longitud, las opciones de caracteres o activa "Usar frase" para generar una passphrase.
- Pulsa "Generar" o "Regenerar". Puedes copiar la contraseña con el botón "Copiar".

Notas técnicas

- La estimación de tiempo de crack es aproximada y usa una tasa conservadora alta (1e10 intentos/segundo). No reemplaza auditoría profesional.
- Frases humorísticas aparecen para reforzar la idea de cuando la contraseña es prácticamente irrompible.

 Archivos añadidos:
 
 - `index.html` — interfaz principal
 - `styles.css` — estilos responsivos y modernos
 - `script.js` — lógica de generación, evaluación y UI
 - `USAGE.md` — instrucciones de uso rápido
 Nuevas mejoras añadidas:
  - `wordlist.txt` — lista local de palabras para generar passphrases memorables (offline).
  - Selector de tasas de ataque y estimaciones múltiples de tiempo de crack.
  - Frases graciosas rotativas sin repetirse hasta agotar la lista.
  - Animaciones y confetti cuando la contraseña es muy fuerte.

