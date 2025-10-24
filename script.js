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

// Async password generator. Uses worker-backed deterministic DRBG when deterministic mode is selected.
async function generatePassword(){
  if(passphrase.checked){
    // Generar passphrase usando wordList si está disponible
    if(wordList && wordList.length>0){
      const pw = [];
      for(let i=0;i<words.value;i++) pw.push(secureChoice(wordList));
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
  const outArr = [];
  const deterministicChecked = el('deterministic') && el('deterministic').checked;
  const seedValue = el('seedInput') ? el('seedInput').value : '';
  if(deterministicChecked && seedValue && seedValue.trim().length>0){
    // Use worker-backed deterministicBytes to get cryptographically secure bytes.
    // For passphrase mode, map 4 bytes -> uint32 index into wordList when available.
    const bytes = await deterministicBytes(seedValue, passphrase.checked ? (words.value*4) : length);
    if(passphrase.checked){
      const wl = (wordList && wordList.length) ? wordList.length : 0;
      if(wl > 0){
        for(let i=0;i<words.value;i++){
          const off = i*4;
          const idx = (bytes[off] | (bytes[off+1]<<8) | (bytes[off+2]<<16) | (bytes[off+3]<<24)) >>> 0;
          outArr.push((wordList[idx % wl]));
        }
        return outArr.join(' ');
      } else {
        // if no wordlist, fall back to fakeWord using deterministic bytes per word
        for(let i=0;i<words.value;i++){
          // use 4 bytes to pick syllables deterministically
          const off = (i*4) % bytes.length;
          const seedByte = bytes[off];
          // simple deterministic fake word: rotate syllable choices
          const syll = ['ba','be','bi','bo','bu','ra','re','ri','ro','ru','ta','te','ti','to','tu','sol','mar','luz','nube','casa','palo','gato','perro','luna','alto','bajo'];
          const parts = 2 + (seedByte % 2);
          let w = [];
          for(let j=0;j<parts;j++) w.push(syll[(bytes[(off+j)%bytes.length] + j) % syll.length]);
          outArr.push(capitalize(w.join('')));
        }
        return outArr.join(' ');
      }
    }
    for(let i=0;i<length;i++){
      const idx = bytes[i] % pool.length;
      outArr.push(pool[idx]);
    }
    return outArr.join('');
  }
  for(let i=0;i<length;i++) outArr.push(pool[secureRandomInt(pool.length)]);
  return outArr.join('');
}

function fakeWord(){
  // Creamos palabras pseudoaleatorias para la frase (evita listas grandes)
  const syll = ['ba','be','bi','bo','bu','ra','re','ri','ro','ru','ta','te','ti','to','tu','sol','mar','luz','nube','casa','palo','gato','perro','luna','alto','bajo'];
  const w = [];
  const parts = 2 + secureRandomInt(2);
  for(let i=0;i<parts;i++) w.push(secureChoice(syll));
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

async function render(){
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
    pw = await generatePassword();
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

  // Show hardcore breakdown if enabled
  try{
    if(hardcore && hardcore.checked && breakdownEl){
      const tokens = breakdownEntropyDetailed(pw);
      breakdownEl.innerHTML = '<strong>Desglose hardcore:</strong><br>' + tokens.map(t=>`${t.token} — ${t.bits} bits (${t.cls})`).join('<br>');
      breakdownEl.style.display = 'block';
    } else if(breakdownEl){ breakdownEl.style.display = 'none'; }
  }catch(e){/* ignore UI errors */}

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

// SHA-1 helper: returns hex digest of input string using SubtleCrypto (used for k-anonymity)
async function sha1Hex(str){
  const enc = new TextEncoder();
  const data = enc.encode(str);
  const hash = await crypto.subtle.digest('SHA-1', data);
  const b = new Uint8Array(hash);
  return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
}

// Initialize worker for heavy crypto ops
let cryptoWorker = null;
let workerReqId = 1;
const workerCallbacks = new Map();
function ensureWorker(){
  if(cryptoWorker) return;
  try{
    cryptoWorker = new Worker('worker.js');
    cryptoWorker.addEventListener('message', (ev)=>{
      const { id, ok, result, error } = ev.data || {};
      const cb = workerCallbacks.get(id);
      if(cb){ workerCallbacks.delete(id); if(ok) cb.resolve(result); else cb.reject(new Error(error)); }
    });
  }catch(e){ console.warn('No se pudo crear worker:', e); cryptoWorker = null; }
}

function workerRequest(action, data){
  ensureWorker();
  if(!cryptoWorker){ return Promise.reject(new Error('Web Worker no disponible')); }
  const id = workerReqId++;
  return new Promise((resolve,reject)=>{
    workerCallbacks.set(id, {resolve,reject});
    cryptoWorker.postMessage({id, action, data});
  });
}

// Wrapper to get SHA-1 using worker when possible (returns hex)
async function sha1HexWorker(str){
  try{
    const res = await workerRequest('sha1',{str});
    return res;
  }catch(e){
    return sha1Hex(str); // fallback
  }
}

// Deterministic DRBG using worker
async function deterministicBytes(seed, length){
  try{
    const buf = await workerRequest('hmacDrbg',{seed:length?seed:'', length});
    // worker returns an ArrayBuffer
    return new Uint8Array(buf);
  }catch(e){
    // fallback: derive via SHA-256 loop (less ideal)
    const enc = new TextEncoder();
    let out = new Uint8Array(length);
    let pos = 0;
    let counter = 0;
    while(pos < length){
      const input = enc.encode(seed + '|' + counter);
      const h = await crypto.subtle.digest('SHA-256', input);
      const hb = new Uint8Array(h);
      const take = Math.min(hb.length, length - pos);
      out.set(hb.slice(0,take), pos);
      pos += take; counter++;
    }
    return out;
  }
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
// Loading / UI lock helper
function setLoading(on, text){
  try{
    if(on){
      generateBtn.classList.add('loading'); generateBtn.disabled = true;
      regenerateBtn.disabled = true; copyBtn.disabled = true;
      if(text) generateBtn.textContent = text; else generateBtn.textContent = 'Generando...';
    } else {
      generateBtn.classList.remove('loading'); generateBtn.disabled = false;
      regenerateBtn.disabled = false; copyBtn.disabled = false;
      generateBtn.textContent = 'Generar';
    }
  }catch(e){}
}
if(generateBtn){
  generateBtn.addEventListener('click', async ()=>{
    // Privacy-by-default: clear manual input and disable manual-eval before generating
    try{ customPw.value = ''; }catch(e){}
    try{ useCustom.checked = false; }catch(e){}
    try{ passwordInput.readOnly = true; }catch(e){}
    console.log('generateBtn clicked');
    statusEl.textContent = 'PGW: Generando (manual borrado)';
    setLoading(true,'Generando...');
    try{ await render(); }catch(e){ console.error('Error en render:', e); statusEl.textContent='PGW: error al generar'; }
    finally{ setLoading(false); }
  });
  // Fallback onclick (safe)
  generateBtn.onclick = () => { (async ()=>{ try{ statusEl.textContent = 'PGW: Generar onclick (manual borrado)'; customPw.value=''; useCustom.checked=false; passwordInput.readOnly = true; setLoading(true,'Generando...'); await render(); }catch(e){ console.error('Error en render desde onclick fallback', e); statusEl.textContent = 'PGW: error al generar (ver consola)'; } finally{ setLoading(false); } })(); };
} else {
  console.warn('generateBtn no encontrado');
  statusEl.textContent = 'PGW: generateBtn no encontrado';
}
if(regenerateBtn){ regenerateBtn.addEventListener('click', async ()=>{ console.log('regenerate clicked'); statusEl.textContent = 'PGW: Regenerar'; setLoading(true,'Generando...'); try{ await render(); }catch(e){ console.error(e); } finally{ setLoading(false); } }); }
else { console.warn('regenerateBtn no encontrado'); }
if(copyBtn){
  copyBtn.addEventListener('click', ()=>{
    navigator.clipboard.writeText(passwordOut.value).then(()=>{
      copyBtn.textContent = '¡Copiado!';
      // animación del campo
      passwordOut.classList.add('flash');
      setTimeout(()=>passwordOut.classList.remove('flash'),700);
      setTimeout(()=>copyBtn.textContent = 'Copiar',1200);
        // Try to clear clipboard after 15s (best-effort) and notify user
        tryClearClipboard(15000);
    });
    console.log('copyBtn clicked');
  });
} else { console.warn('copyBtn no encontrado'); }

// Attempt to clear clipboard after a short time (best-effort). Browsers may restrict this.
function tryClearClipboard(delayMs=15000){
  setTimeout(async ()=>{
    try{
      // Overwrite clipboard with an empty string
      await navigator.clipboard.writeText('');
      statusEl.textContent = 'PGW: portapapeles borrado (intento)';
    }catch(e){
      // If denied by browser, show message but don't expose password
      console.warn('No se pudo limpiar portapapeles automáticamente:', e);
      statusEl.textContent = 'PGW: no se pudo limpiar portapapeles automáticamente';
    }
  }, delayMs);
}

// reaccionar a cambios en tasa seleccionada
// reaccionar a cambios en tasa seleccionada
if(rateSelect) rateSelect.addEventListener('change', async ()=>{ customRate.value = rateSelect.value; try{ await render(); }catch(e){console.error(e);} });
if(customRate) customRate.addEventListener('input', async ()=>{ try{ await render(); }catch(e){console.error(e);} });

// HIBP check (opt-in) - k-anonymity flow
const hibpOptIn = el('hibpOptIn');
const hibpCheck = el('hibpCheck');
const hardcore = el('hardcore');
const breakdownEl = el('breakdown');
if(hibpCheck){
  hibpCheck.addEventListener('click', async ()=>{
    // Consent check
    if(hibpOptIn && !hibpOptIn.checked){ if(!confirm('No ha marcado la casilla de opt-in para HIBP. Desea continuar y marcarla?')) return; hibpOptIn.checked = true; }
    // choose password to check: prefer manual if set, else current output
    const pw = (useCustom && useCustom.checked && customPw && customPw.value.trim()) ? customPw.value.trim() : passwordInput.value || '';
    if(!pw){ alert('No hay contraseña para comprobar.'); return; }
    // Compute SHA-1 locally via worker
    statusEl.textContent = 'PGW: calculando SHA-1 localmente...';
    try{
      const hash = await sha1HexWorker(pw);
      const prefix = hash.slice(0,5);
      const suffix = hash.slice(5);
      statusEl.textContent = 'PGW: consultando HIBP (prefijo)';
      const resp = await fetch('https://api.pwnedpasswords.com/range/' + prefix);
      if(!resp.ok){ statusEl.textContent = 'PGW: HIBP no disponible'; alert('No se pudo consultar HIBP: ' + resp.status); return; }
      const txt = await resp.text();
      const lines = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      let found = 0;
      for(const line of lines){ const [suf,cnt] = line.split(':'); if(suf && suf.toUpperCase()===suffix.toUpperCase()){ found = parseInt(cnt,10) || 0; break; } }
      if(found>0){ statusEl.textContent = `PGW: contraseña encontrada ${found} veces en HIBP`; alert(`Esta contraseña apareció ${found} veces en la base de datos de HIBP. Recomendado cambiarla.`); }
      else { statusEl.textContent = 'PGW: no encontrada en HIBP (con el prefijo consultado)'; alert('No aparece en HIBP según el prefijo consultado.'); }
    }catch(e){ console.error('Error HIBP:', e); statusEl.textContent = 'PGW: error HIBP (ver consola)'; alert('Error al consultar HIBP: ' + e.message); }
  });
}

// Hardcore breakdown toggle
if(hardcore){ hardcore.addEventListener('change', async ()=>{ if(hardcore.checked) breakdownEl.style.display='block'; else breakdownEl.style.display='none'; try{ await render(); }catch(e){console.error(e);} }); }

// Pattern detector and hardcore breakdown
function detectPatterns(pw){
  const reasons = [];
  if(!pw) return reasons;
  // dates like 2020, 20/10/1990, 19901010
  if(/\b(19|20)\d{2}\b/.test(pw) || /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(pw)) reasons.push('Contiene fecha o año (predecible)');
  // common name heuristic: capitalized word + lowercase (simple)
  if(/\b[A-Z][a-z]{2,}\b/.test(pw)) reasons.push('Contiene palabras con formato nombre (posible nombre propio)');
  // sequences
  if(/(0123|1234|2345|3456|4567|5678|6789|7890)/.test(pw)) reasons.push('Contiene secuencia numérica');
  if(/(.)\1{3,}/.test(pw)) reasons.push('Contiene repetición larga de caracteres');
  return reasons;
}

function breakdownEntropyDetailed(pw){
  if(!pw) return [];
  const tokens = [];
  // split by spaces for passphrases, otherwise group runs of same class
  if(pw.includes(' ')){
    for(const w of pw.split(/\s+/).filter(Boolean)){
      const cls = /[^A-Za-z0-9]/.test(w) ? 'symbol' : (/\d/.test(w)?'digits':'letters');
      const pool = cls==='symbol'? SYMBOLS.length : (cls==='digits'?10:52);
      const bits = Math.round(w.length * Math.log2(pool));
      tokens.push({token:w, bits, cls});
    }
    return tokens;
  }
  // otherwise, run-length group
  let i=0;
  while(i<pw.length){
    const ch = pw[i];
    const isDigit = /\d/.test(ch);
    const isAlpha = /[A-Za-z]/.test(ch);
    const isSymbol = !isDigit && !isAlpha;
    let j=i+1;
    while(j<pw.length){
      const ch2 = pw[j];
      if((/\d/.test(ch2))===isDigit && (/[^A-Za-z0-9]/.test(ch2))===isSymbol && (/[^0-9]/.test(ch2))===isAlpha) j++; else break;
    }
    const token = pw.slice(i,j);
    const cls = isSymbol ? 'symbol' : (isDigit ? 'digits' : 'letters');
    const pool = cls==='symbol'? SYMBOLS.length : (cls==='digits'?10: (/[a-z]/.test(token)&&/[A-Z]/.test(token)?52:26));
    const bits = Math.round(token.length * Math.log2(pool));
    tokens.push({token, bits, cls});
    i=j;
  }
  return tokens;
}

// Inicializar
// Inicializar: update UI and run first render async
(async ()=>{
  try{
    updateUI();
    await render();
    statusEl.textContent = 'PGW: listo';
  }catch(e){
    console.error('Error al inicializar render/updateUI', e);
    statusEl.textContent = 'PGW: init error (ver consola)';
  }
})();

// Wire up custom evaluation controls
if(evalCustom){
  evalCustom.addEventListener('click', async ()=>{
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
    try{ await render(); }catch(e){ console.error('Error en render desde evalCustom', e); }
  });
}
if(useCustom){
  useCustom.addEventListener('change', async ()=>{
    // when unchecked, make password input readonly and regenerate from settings
    passwordInput.readOnly = !useCustom.checked;
    if(!useCustom.checked){ try{ await render(); }catch(e){ console.error('Error en render desde useCustom change', e); } }
  });
  // start with password input readonly
  passwordInput.readOnly = true;
}
