// Generador y evaluador de contraseñas (todo en español)
console.log('script.js cargado');

// Pequeño indicador de estado en la página (para depuración visible sin abrir la consola)
let statusEl = document.getElementById('pgw-status');
if(!statusEl){
  statusEl = document.createElement('div');
  statusEl.id = 'pgw-status';
  statusEl.style.position = 'fixed';
  statusEl.style.right = '12px';
  statusEl.style.top = '12px';
  statusEl.style.padding = '8px 10px';
  statusEl.style.background = 'rgba(0,0,0,0.45)';
  statusEl.style.color = 'white';
  statusEl.style.borderRadius = '8px';
  statusEl.style.fontSize = '12px';
  statusEl.style.zIndex = 9999;
  statusEl.textContent = 'PGW: script cargado';
  document.body.appendChild(statusEl);
}

window.addEventListener('error', (ev) => {
  console.error('Unhandled error:', ev.error || ev.message, ev);
  try{ statusEl.textContent = 'PGW ERROR: ' + (ev.message || (ev.error && ev.error.message) || 'see console'); }catch(e){}
});
const el = id => document.getElementById(id);

// Elementos
const lengthEl = el('length');
const lengthVal = el('lengthVal');
const lower = el('lower');
const upper = el('upper');
const numbers = el('numbers');
const symbols = el('symbols');
const passphrase = el('passphrase');
const words = el('words');
const wordsVal = el('wordsVal');
const generateBtn = el('generate');
const regenerateBtn = el('regenerate');
const copyBtn = el('copy');
const passwordOut = el('password');
const meterBar = el('meterBar');
const strengthLabel = el('strengthLabel');
const entropyLabel = el('entropyLabel');
const crackTimeEl = el('crackTime');
const funnyEl = el('funny');
const useCustom = el('useCustom');
const customPw = el('customPw');
const evalCustom = el('evalCustom');
const calcSource = el('calcSource');
const passwordInput = el('password');
const rateSelect = el('rateSelect');
const customRate = el('customRate');
const crackEstimatesEl = el('crackEstimates');

// Opciones
const SYMBOLS = "!@#$%^&*()_+[]{}<>?,.;:-=_~";
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
// Para frases usamos un pool aproximado (simulamos lista de palabras)
const WORD_POOL = 2048; // tamaño típico usado en listas de palabras (fallback)
let wordList = null; // se cargará desde wordlist.txt si está disponible

// Cargar wordlist local (async). Si falla, quedará null y usaremos fakeWord
fetch('wordlist.txt').then(r=>{
  if(!r.ok) throw new Error('no local');
  return r.text();
}).then(txt=>{
  const lines = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length>0){ wordList = lines; console.log('Wordlist cargada, palabras:', lines.length); }
}).catch(err=>{
  console.warn('No se pudo cargar wordlist local:', err);
  // Intentamos cargar BIP39 como fallback remoto (opcional)
  fetch('https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt').then(r=>r.text()).then(t=>{
    const lines = t.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(lines.length>0){ wordList = lines; console.log('Wordlist remota cargada, palabras:', lines.length); }
  }).catch(()=>{/* ignore */});
});

// Frases graciosas adicionales (seleccionadas aleatoriamente)
const FUNNY_PHRASES = [
  '¡Ups! Esa contraseña parece un helado de siete sabores, difícil de morder.',
  'Si un hacker lo intenta, al primer sorbo se rinde y se toma un café.',
  'Esta contraseña podría firmar libros por sí sola.',
  '¡Casi inhumana! Incluso tu cactus la olvidaría.',
  'Protegida como la receta secreta de la abuela.',
  'Esta clave tiene más capas que una cebolla (pero sin lágrimas).',
  'Más segura que la caja fuerte del banco de los cuentos.',
  'Si fuera un pergamino, estaría en un museo.',
  'Nivel: criptógrafo jubilado aprobado.',
  'Advertencia: podría despertar a los dinosaurios del sueño.',
  'Muy buena — tu futura yo te lo agradecerá.',
  'Esta contraseña exige una taza de té y tranquilidad para ser atacada.',
  'Requiere permiso del consejo de seguridad intergaláctico para probarla.',
  'Se recomienda contársela solo a tu espejo y a tu mejor amigo imaginario.',
  'Suena a leyenda urbana: "La contraseña que venció a los hackers".'
];

const IMPOSSIBLE_PHRASES = [
  '¡Imposible! Tendrías que contratar una excavación arqueológica para encontrar tiempo suficiente.',
  'Solo descifrable por futuros historiadores con máquinas del tiempo.',
  '¡Alerta! Protección nivel: fortaleza impenetrable — trae bocadillos para la espera.',
  'Esta es la definición de "prácticamente imposible" — felicidades, maestro/a.'
];

const commonPasswords = ['123456','password','12345678','qwerty','abc123','111111','1234567890','1234567','password1','admin','letmein','1234','iloveyou','000000','contraseña','clave','qwertyuiop'];

// Para evitar repeticiones hasta agotar la lista
let availableFunny = FUNNY_PHRASES.slice();
let availableImpossible = IMPOSSIBLE_PHRASES.slice();

function pickFunny(){
  if(availableFunny.length===0) availableFunny = FUNNY_PHRASES.slice();
  const i = Math.floor(Math.random()*availableFunny.length);
  return availableFunny.splice(i,1)[0];
}

function pickImpossible(){
  if(availableImpossible.length===0) availableImpossible = IMPOSSIBLE_PHRASES.slice();
  const i = Math.floor(Math.random()*availableImpossible.length);
  return availableImpossible.splice(i,1)[0];
}

function updateUI(){
  lengthVal.textContent = lengthEl.value;
  wordsVal.textContent = words.value;
  el('words').disabled = !passphrase.checked;
  el('wordsLabel').style.opacity = passphrase.checked ? '1' : '0.6';
}

function generatePassword(){
  if(passphrase.checked){
    // Generar passphrase usando wordList si está disponible
    if(wordList && wordList.length>0){
      const pw = [];
      for(let i=0;i<words.value;i++) pw.push(randomFrom(wordList));
      return pw.join(' ');
    }
    // fallback: palabras pseudoaleatorias
    const pw = [];
    for(let i=0;i<words.value;i++) pw.push(fakeWord());
    return pw.join(' ');
  }

  let pool = '';
  if(lower.checked) pool += LOWER;
  if(upper.checked) pool += UPPER;
  if(numbers.checked) pool += DIGITS;
  if(symbols.checked) pool += SYMBOLS;
  if(!pool) pool = LOWER; // fallback

  const length = parseInt(lengthEl.value,10);
  let out = '';
  const get = () => pool[Math.floor(Math.random()*pool.length)];
  for(let i=0;i<length;i++) out += get();
  return out;
}

function fakeWord(){
  // Creamos palabras pseudoaleatorias para la frase (evita listas grandes)
  const syll = ['ba','be','bi','bo','bu','ra','re','ri','ro','ru','ta','te','ti','to','tu','sol','mar','luz','nube','casa','palo','gato','perro','luna','alto','bajo'];
  const w = [];
  const parts = 2 + Math.floor(Math.random()*2);
  for(let i=0;i<parts;i++) w.push(syll[Math.floor(Math.random()*syll.length)]);
  return capitalize(w.join(''));
}

function capitalize(s){return s.charAt(0).toLowerCase() + s.slice(1)}

function calculateEntropy(password, opts){
  if(opts.passphrase){
    // Entropía aproximada: palabras * log2(size_of_wordlist)
    const pool = (wordList && wordList.length) ? wordList.length : WORD_POOL;
    return opts.words * Math.log2(pool);
  }
  let poolSize = 0;
  if(opts.lower) poolSize += 26;
  if(opts.upper) poolSize += 26;
  if(opts.numbers) poolSize += 10;
  if(opts.symbols) poolSize += SYMBOLS.length;
  if(poolSize <= 0) poolSize = 26;
  // Entropía = length * log2(poolSize). Evitamos pow para mayor estabilidad.
  return opts.length * Math.log2(poolSize);
}

// Analyze actual password content to get a realistic entropy estimate
function analyzePassword(pw){
  if(!pw) return {entropy:0, reason:'vacía'};
  const s = pw + '';
  const lower = s.toLowerCase();

  // Detect common passwords
  if(commonPasswords.includes(lower)) return {entropy:10, reason:'contraseña muy común'};

  // If contains spaces, treat as passphrase
  if(s.includes(' ')){
    const parts = s.trim().split(/\s+/).filter(Boolean);
    if(parts.length>0 && wordList && wordList.length>0){
      // count how many parts are found in wordlist
      let found = 0;
      for(const p of parts){ if(wordList.includes(p.toLowerCase())) found++; }
      const pool = wordList.length;
      const entropy = parts.length * Math.log2(pool);
      return {entropy, reason:`passphrase (${parts.length} palabras, ${found} reconocidas)`};
    }
  }

  // char classes present
  let poolSize = 0;
  if(/[a-z]/.test(s)) poolSize += 26;
  if(/[A-Z]/.test(s)) poolSize += 26;
  if(/[0-9]/.test(s)) poolSize += 10;
  if(/[^A-Za-z0-9]/.test(s)) poolSize += SYMBOLS.length;
  if(poolSize === 0) poolSize = 1;

  // Base entropy
  let entropy = s.length * Math.log2(poolSize);

  // Penalize sequences like '123456' or 'abcdef'
  if(/^(?:\d){4,}$/.test(s) || /(0123|1234|2345|3456|4567|5678|6789|7890)/.test(s.toLowerCase()) || /(abcd|bcde|cdef|defg|efgh)/.test(lower)){
    entropy = Math.min(entropy, 20);
  }

  // Penalize repeats e.g., 'aaaaaa' or 'abcabcabc'
  if(/^(.+)\1+$/.test(s)){
    entropy = Math.min(entropy, Math.log2(poolSize) * Math.max(1, Math.floor(s.length/ (s.match(/^(.+)\1+$/)[1].length))));
  }

  // Penalize if contains dictionary words fully
  if(wordList && wordList.length>0){
    const lowerS = lower;
    for(const w of wordList){ if(w.length>=3 && lowerS.includes(w) ){ entropy = Math.min(entropy, Math.max(8, Math.log2(poolSize) * (s.length - w.length))); break; } }
  }

  // Floor to 0 minimum
  if(!isFinite(entropy) || entropy < 0) entropy = 0;
  return {entropy, reason: 'basado en contenido'};
}

function evaluateStrength(entropy){
  if(entropy < 28) return {label:'Débil','colorPct':20};
  if(entropy < 36) return {label:'Aceptable','colorPct':40};
  if(entropy < 60) return {label:'Buena','colorPct':65};
  if(entropy < 128) return {label:'Muy fuerte','colorPct':85};
  return {label:'Prácticamente imposible','colorPct':100};
}

function estimateCrackTime(entropy, rate){
  // rate: intentos por segundo
  // Queremos estimar el tiempo medio hasta adivinar: ~ (2^entropy)/2 / rate = 2^(entropy-1)/rate
  // Para evitar overflow, trabajamos en log10:
  // log10(seconds) = (entropy-1)*log10(2) - log10(rate)
  rate = Number(rate) || 1e10;
  const log10_2 = Math.LOG10E * Math.log(2); // log10(2)
  const log10sec = (entropy - 1) * log10_2 - Math.log10(rate);
  if(!isFinite(log10sec)) return {label:'Demasiado grande',seconds:Infinity};
  const seconds = Math.pow(10, log10sec);
  return {label:formatDuration(seconds), seconds};
}

function estimatesForRates(entropy, rates){
  return rates.map(r=>{
    const est = estimateCrackTime(entropy, r);
    return {rate: r, label: est.label, seconds: est.seconds};
  });
}

function formatDuration(seconds){
  if(!isFinite(seconds)) return 'Prácticamente imposible';
  const mins = seconds/60;
  const hours = mins/60;
  const days = hours/24;
  const years = days/365.25;
  if(seconds < 1) return `${Math.round(seconds*1000)} ms`;
  if(seconds < 60) return `${Math.round(seconds)} s`;
  if(mins < 60) return `${Math.round(mins)} min`;
  if(hours < 24) return `${Math.round(hours)} h`;
  if(days < 365) return `${Math.round(days)} d`;
  if(years < 1000) return `${Math.round(years)} años`;
  if(years < 1e6) return `${(years/1000).toFixed(2)} mil años`;
  if(years < 1e9) return `${(years/1e6).toFixed(2)} millones de años`;
  if(years < 1e12) return `${(years/1e9).toFixed(2)} mil millones de años`;
  // Para valores gigantes, devolver notación científica con unidades de años
  const exp = years.toExponential(2);
  return `${exp} años`;
}

function minutesLessThan(v, limit){ return v < limit ? v : limit }

// Decide frases/feedback en función de la ENTROPÍA (más directo y accionable)
function funnyFor(seconds, entropy){
  // si no hay número, devolvemos imposible
  if(!isFinite(seconds)) return pickImpossible();
  // Umbrales por entropía (bits)
  // - <28 bits: débil — aconsejar aumentar longitud o añadir tipos de caracteres
  // - 28-35 bits: aceptable — sugerir mejorar
  // - 36-59 bits: buena — frase ligera
  // - 60-127 bits: muy fuerte — frase celebratoria
  // - >=128 bits: prácticamente imposible — frases épicas
  if(entropy >= 128) return pickImpossible();
  if(entropy >= 60) return pickFunny();
  if(entropy >= 36) return pickFunny();
  if(entropy >= 28) return 'Aceptable, pero considera aumentar la longitud o añadir símbolos.';
  // <28
  return 'Débil — aumenta la longitud y añade mayúsculas, números y símbolos.';
}

function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

// Secure random integer in [0, max) using Web Crypto (avoids bias with rejection sampling)
function secureRandomInt(max){
  if(max <= 0) return 0;
  const uint32Max = 0xFFFFFFFF;
  const range = max;
  const maxValid = Math.floor((uint32Max + 1) / range) * range - 1;
  const b = new Uint32Array(1);
  while(true){
    window.crypto.getRandomValues(b);
    const v = b[0] >>> 0;
    if(v <= maxValid) return v % range;
  }
}

function secureChoice(arr){ return arr[secureRandomInt(arr.length)]; }

function render(){
  const opts = {
    passphrase: passphrase.checked,
    words: parseInt(words.value,10),
    length: parseInt(lengthEl.value,10),
    lower: lower.checked,
    upper: upper.checked,
    numbers: numbers.checked,
    symbols: symbols.checked
  };
  // Decide source: if the user explicitly enabled manual evaluation and provided a value,
  // we must NOT overwrite/clear their manual field when regenerating. Respect manual input.
  let source = 'ajustes';
  let pw = '';
  let entropy;
  let reason = 'basado en ajustes';

  const hasManual = useCustom && useCustom.checked && customPw && customPw.value && customPw.value.trim().length > 0;
  if(hasManual){
    // Use the provided manual password for analysis and do not touch the manual input field.
    pw = customPw.value.trim();
    passwordInput.value = pw;
    const analysis = analyzePassword(pw);
    entropy = analysis.entropy;
    reason = analysis.reason;
    source = 'contenido';
  } else {
    // Generate a password from the current options and show it in the output field.
    pw = generatePassword();
    passwordInput.value = pw;
    entropy = calculateEntropy(pw, opts);
  }
  const entRounded = Math.round(entropy);
  entropyLabel.textContent = `Entropía: ${entRounded} bits`;

  const strength = evaluateStrength(entropy);
  strengthLabel.textContent = `Fuerza: ${strength.label}`;
  meterBar.style.width = `${strength.colorPct}%`;

  // Mostrar solo la estimación para la tasa seleccionada/personalizada
  let custom = Number(customRate.value);
  if(!isFinite(custom)) custom = Number(rateSelect.value) || 1e10;
  const chosen = estimateCrackTime(entropy, custom);
  // Render single estimate in a clear format
  crackEstimatesEl.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'crack-estimate';
  const span = document.createElement('span');
  span.textContent = `${formatRate(custom)}: ${chosen.label}`;
  container.appendChild(span);
  crackEstimatesEl.appendChild(container);
  // Seleccionar frase según entropía y mostrarla
  const phrase = funnyFor(chosen.seconds, entropy);
  showFunnyPhrase(phrase);

  // Mostrar fuente del cálculo
  calcSource.textContent = `Fuente: ${source} (${reason})`;

  // Confetti sólo para entropía extremadamente alta
  if(entropy >= 128){ launchConfetti(); }
}

function formatRate(r){
  r = Number(r) || 0;
  if(r >= 1e12) return `${(r/1e12).toFixed(2)}T ops/s`;
  if(r >= 1e9) return `${(r/1e9).toFixed(2)}G ops/s`;
  if(r >= 1e6) return `${(r/1e6).toFixed(2)}M ops/s`;
  if(r >= 1e3) return `${(r/1e3).toFixed(2)}k ops/s`;
  return `${r.toLocaleString()} ops/s`;
}

function showFunnyPhrase(text){
  funnyEl.classList.remove('show');
  // force reflow to restart transition
  void funnyEl.offsetWidth;
  funnyEl.textContent = text;
  funnyEl.classList.add('show');
}

// Simple confetti implementation (canvas)
function launchConfetti(){
  const canvas = document.getElementById('confetti');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;
  const colors = ['#ff7a7a','#ffd36b','#7c3aed','#06b6d4','#60a5fa','#34d399'];
  const particles = [];
  const count = 80;
  for(let i=0;i<count;i++){
    particles.push({
      x: Math.random()*w,
      y: Math.random()*-h/2,
      vx: (Math.random()-0.5)*6,
      vy: 2+Math.random()*6,
      r: 6+Math.random()*6,
      color: colors[Math.floor(Math.random()*colors.length)],
      rot: Math.random()*360,
      vr: (Math.random()-0.5)*10
    });
  }

  let start = null;
  function frame(ts){
    if(!start) start = ts;
    const elapsed = ts-start;
    ctx.clearRect(0,0,w,h);
    for(const p of particles){
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // gravity
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot*Math.PI/180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.6);
      ctx.restore();
    }
    // remove out-of-screen particles
    for(let i=particles.length-1;i>=0;i--){ if(particles[i].y>h+50) particles.splice(i,1); }
    if(elapsed < 1600 && particles.length>0){
      requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0,0,w,h);
    }
  }
  requestAnimationFrame(frame);
}

// Eventos
lengthEl.addEventListener('input', updateUI);
words.addEventListener('input', updateUI);
passphrase.addEventListener('change', updateUI);
if(generateBtn){
  generateBtn.addEventListener('click', ()=>{ console.log('generateBtn clicked'); statusEl.textContent = 'PGW: Generar pulsado'; render(); });
  // Fallback: también exponemos un onclick directo por si algo impide el listener estándar
  generateBtn.onclick = () => { try{ console.log('generateBtn onclick fallback'); statusEl.textContent = 'PGW: Generar onclick'; render(); } catch(e){ console.error('Error en render desde onclick fallback', e); statusEl.textContent = 'PGW: error al generar (ver consola)'; } };
} else {
  console.warn('generateBtn no encontrado');
  statusEl.textContent = 'PGW: generateBtn no encontrado';
}
if(regenerateBtn){ regenerateBtn.addEventListener('click', ()=>{ console.log('regenerate clicked'); statusEl.textContent = 'PGW: Regenerar'; render(); }); }
else { console.warn('regenerateBtn no encontrado'); }
if(copyBtn){
  copyBtn.addEventListener('click', ()=>{
    navigator.clipboard.writeText(passwordOut.value).then(()=>{
      copyBtn.textContent = '¡Copiado!';
      // animación del campo
      passwordOut.classList.add('flash');
      setTimeout(()=>passwordOut.classList.remove('flash'),700);
      setTimeout(()=>copyBtn.textContent = 'Copiar',1200);
    });
    console.log('copyBtn clicked');
  });
} else { console.warn('copyBtn no encontrado'); }

// reaccionar a cambios en tasa seleccionada
// reaccionar a cambios en tasa seleccionada
if(rateSelect) rateSelect.addEventListener('change', ()=>{ customRate.value = rateSelect.value; render(); });
if(customRate) customRate.addEventListener('input', ()=>{ render(); });

// Inicializar
updateUI(); render();

// Wire up custom evaluation controls
if(evalCustom){
  evalCustom.addEventListener('click', ()=>{
    useCustom.checked = true;
    // copy customPw into password input for clarity
    if(customPw.value && customPw.value.trim().length>0) passwordInput.value = customPw.value.trim();
    passwordInput.readOnly = false;
    // Brief visual feedback: pulso en el botón
    try{
      evalCustom.classList.add('pulse');
      setTimeout(()=>{ evalCustom.classList.remove('pulse'); }, 900);
    }catch(e){/* ignore if element missing */}
    // focus the manual field so user can edit if needed
    try{ customPw.focus(); }catch(e){}
    render();
  });
}
if(useCustom){
  useCustom.addEventListener('change', ()=>{
    // when unchecked, make password input readonly and regenerate from settings
    passwordInput.readOnly = !useCustom.checked;
    if(!useCustom.checked){ render(); }
  });
  // start with password input readonly
  passwordInput.readOnly = true;
}
