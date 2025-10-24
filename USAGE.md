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
