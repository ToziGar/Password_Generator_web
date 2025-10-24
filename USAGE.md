# Generador de Contraseñas — Uso

Abre `index.html` en tu navegador (doble clic o "Abrir con" -> navegador). Es una página estática sin servidor.

Controles principales:
- Longitud: slider para elegir longitud de la contraseña.
- Minúsculas/Mayúsculas/Números/Símbolos: incluye o excluye conjuntos de caracteres.
- Usar frase: activa la generación de una "passphrase" (palabras aleatorias).
- Palabras: cuando "Usar frase" está activo, ajusta cuántas palabras se combinan.

Botones:
- Generar: crea una nueva contraseña según las opciones.
- Regenerar: crea otra diferente sin cambiar las opciones.
- Copiar: copia la contraseña al portapapeles.

Indicadores:
- Medidor de fuerza: muestra visualmente la seguridad estimada.
- Entropía: bits aproximados de entropía calculados.
- Estimación de tiempo de crack: aproximación usando 1e10 intentos/segundo.
- Mensajes graciosos cuando la contraseña es prácticamente imposible de romper.

Limitaciones:
- Estimaciones orientativas; para auditorías reales usa herramientas especializadas.

Nuevas funciones:
- Passphrases reales: si `wordlist.txt` está disponible, las passphrases se generan a partir de esa lista (mejor memorizables y con entropía calculada correctamente).
- Estimaciones: puedes elegir entre varias tasas de ataque (Online, Botnets, GPU cluster, Super cluster) o introducir una tasa personalizada; la UI mostrará varias estimaciones simultáneas.
- Frases graciosas: se muestran frases aleatorias para dar feedback; la implementación evita repetir frases hasta agotar la lista.
- Animaciones: medidor animado, animación al copiar y confetti si la contraseña tiene entropía >= 128 bits.
