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

// Read-only info modal (used by tutorial CTA). Presents a title and HTML/text body and returns when closed.
function showInfoModal(message, title = 'Información'){
  return new Promise((resolve)=>{
    const modal = el('infoModal');
    if(!modal){ // fallback to alert
      try{ if(window.alert) window.alert(title + '\n\n' + message); }catch(e){}
      resolve(); return;
    }
    const label = el('infoModalLabel');
    const body = el('infoModalBody');
    const closeBtn = el('infoClose');
    const main = document.querySelector('#mainContent') || document.querySelector('main.container');
    if(label) label.textContent = title || 'Información';
    if(body){ if(typeof message === 'string') body.textContent = message; else body.innerHTML = String(message); }
    // remember opener to restore focus later
    const opener = document.activeElement;
    // show modal and hide main from assistive tech
    modal.style.display = 'flex';
    try{ if(main) main.setAttribute('aria-hidden','true'); }catch(e){}

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(modal.querySelectorAll(focusableSelector)).filter(elm => !elm.hasAttribute('disabled'));
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length-1];

    const cleanup = ()=>{
      try{ modal.style.display = 'none'; }catch(e){}
      try{ if(main) main.removeAttribute('aria-hidden'); }catch(e){}
      try{ closeBtn.removeEventListener('click', onClose); }catch(e){}
      try{ document.removeEventListener('keydown', onKey); }catch(e){}
      try{ modal.removeEventListener('keydown', onModalKeydown); }catch(e){}
      try{ if(opener && typeof opener.focus === 'function') opener.focus(); }catch(e){}
      resolve();
    };

    const onClose = ()=> cleanup();
    const onKey = (e)=>{ if(e.key === 'Escape') onClose(); };
    const onModalKeydown = (e)=>{
      if(e.key !== 'Tab') return;
      if(focusable.length === 0) return;
      const idx = focusable.indexOf(document.activeElement);
      if(e.shiftKey){ if(document.activeElement === firstFocusable || idx === -1){ e.preventDefault(); lastFocusable.focus(); } }
      else { if(document.activeElement === lastFocusable || idx === -1){ e.preventDefault(); firstFocusable.focus(); } }
    };

    closeBtn.addEventListener('click', onClose);
    document.addEventListener('keydown', onKey);
    modal.addEventListener('keydown', onModalKeydown);
    // focus first actionable element
    setTimeout(()=>{ try{ (firstFocusable || closeBtn).focus(); }catch(e){} }, 20);
  });
}

// Lightweight metrics for development/testing (kept in-memory only)
window.__pgw_metrics = window.__pgw_metrics || { cancels: 0, retries: 0 };

// Runtime flags to indicate fallbacks used (set when fallbacks activate)
window.__pgw_worker_fallback = false;
window.__pgw_wordlist_fallback = false;
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
const kdfIterations = el('kdfIterations');
const kdfEta = el('kdfEta');

// THEME TOGGLE: apply saved theme or system preference and persist choice
const themeToggle = el('themeToggle');
function applyTheme(theme){
  const html = document.documentElement;
  if(theme === 'light'){
    html.setAttribute('data-theme','light');
    if(themeToggle) themeToggle.setAttribute('aria-pressed','true');
    if(themeToggle) themeToggle.title = 'Cambiar a tema oscuro';
  }else{
    html.removeAttribute('data-theme');
    if(themeToggle) themeToggle.setAttribute('aria-pressed','false');
    if(themeToggle) themeToggle.title = 'Cambiar a tema claro';
  }
  try{ localStorage.setItem('pgw-theme', theme); }catch(e){}
}

;(function initTheme(){
  try{
    const saved = localStorage.getItem('pgw-theme');
    if(saved === 'light' || saved === 'dark'){
      applyTheme(saved);
    } else {
      // Respect system preference when not set
      const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
      applyTheme(prefersLight ? 'light' : 'dark');
    }
  }catch(e){ /* ignore storage errors */ }

  if(themeToggle){
    themeToggle.setAttribute('role','button');
    // ensure aria-pressed is present
    if(!themeToggle.hasAttribute('aria-pressed')) themeToggle.setAttribute('aria-pressed', 'false');
    themeToggle.addEventListener('click', ()=>{
      const curr = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = (curr === 'light') ? 'dark' : 'light';
      applyTheme(next);
      // small pulse to indicate change
      themeToggle.classList.add('pulse');
      setTimeout(()=> themeToggle.classList.remove('pulse'), 800);
    });
  }
})();

// Fallback for checkbox styling when :has() is not available: keep label[data-checked] in sync
document.querySelectorAll('.checkbox-row label').forEach(label => {
  try{
    const cb = label.querySelector('input[type=checkbox]');
    if(!cb) return;
    const sync = ()=> label.setAttribute('data-checked', cb.checked ? 'true' : 'false');
    // initialize
    sync();
    cb.addEventListener('change', sync);
  }catch(e){/* ignore */}
});

// Opciones
const SYMBOLS = "!@#$%^&*()_+[]{}<>?,.;:-=_~";
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
// Para frases usamos un pool aproximado (simulamos lista de palabras)
const WORD_POOL = 2048; // tamaño típico usado en listas de palabras (fallback)
let wordList = null; // se cargará desde wordlist.txt si está disponible

// Embedded fallback wordlist (used when fetching wordlist.txt fails - keeps offline demo usable)
const EMBEDDED_WORDLIST = [
  'amor','libro','casa','sol','luna','mar','montaña','río','cielo','estrella','viento','fuego','agua','bosque','llave','puerta','camino','puerta','gato','perro','valle','ciudad','mariposa','hoja','roca','arena','nube','sueño','voz','tempo','brisa','café','teatro','música','lago','isla','puente','torre','jardín','flor','hoja','corazón','amistad','familia','viaje','mapa','reloj','tesoro','ritmo','pintura','sombra','luz'
];

// Fallback worker source: we'll attempt to create a Worker from 'worker.js' normally,
// but when the page is opened via file:// new Worker('worker.js') is blocked (origin 'null').
// In that case, we can create a blob-based worker using this embedded source so the app still functions.
const WORKER_FALLBACK_SRC = `// Worker for crypto-heavy operations: sha1, drbg (HMAC-DRBG using HMAC-SHA256), pbkdf2
self.addEventListener('message', async (ev) => {
  const { id, action, data } = ev.data || {};
  try{
    if(action === 'sha1'){
      const enc = new TextEncoder();
      const buf = enc.encode(data.str);
      const h = await crypto.subtle.digest('SHA-1', buf);
      const b = new Uint8Array(h);
      const hex = Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('').toUpperCase();
      self.postMessage({id, ok:true, result: hex});
      return;
    }

    if(action === 'sha256'){
      const enc = new TextEncoder();
      const buf = enc.encode(data.str);
      const h = await crypto.subtle.digest('SHA-256', buf);
      const b = new Uint8Array(h);
      self.postMessage({id, ok:true, result: b});
      return;
    }

    if(action === 'hmacDrbg'){
      const enc = new TextEncoder();
      const seedBytes = enc.encode(data.seed || '');
      const seedHash = await crypto.subtle.digest('SHA-256', seedBytes);
      const keyRaw = new Uint8Array(seedHash);
      const key = await crypto.subtle.importKey('raw', keyRaw, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
      const out = new Uint8Array(data.length || 64);
      let counter = 0;
      let filled = 0;
      while(filled < out.length){
        const ctr = new Uint8Array(4);
        ctr[0] = (counter >>> 24) & 0xFF;
        ctr[1] = (counter >>> 16) & 0xFF;
        ctr[2] = (counter >>> 8) & 0xFF;
        ctr[3] = (counter) & 0xFF;
        const dataInput = new Uint8Array(ctr.length + seedBytes.length);
        dataInput.set(ctr, 0);
        dataInput.set(seedBytes, ctr.length);
        const mac = await crypto.subtle.sign('HMAC', key, dataInput);
        const macBytes = new Uint8Array(mac);
        const take = Math.min(macBytes.length, out.length - filled);
        out.set(macBytes.slice(0,take), filled);
        filled += take;
        counter++;
      }
      self.postMessage({id, ok:true, result: out.buffer}, [out.buffer]);
      return;
    }

    if(action === 'pbkdf2'){
      const enc = new TextEncoder();
      const passwordBytes = enc.encode(data.password || '');
      const saltBytes = enc.encode(data.salt || '');
      const iterations = Number(data.iterations) || 100000;
      const dkLen = Number(data.length) || 32;
      if(!data.reportProgress){
        try{
          const passKey = await crypto.subtle.importKey('raw', passwordBytes, {name:'PBKDF2'}, false, ['deriveBits']);
          const params = {name:'PBKDF2', salt: saltBytes, iterations: iterations, hash:'SHA-256'};
          const bits = await crypto.subtle.deriveBits(params, passKey, dkLen*8);
          const out = new Uint8Array(bits);
          self.postMessage({id, ok:true, result: out.buffer}, [out.buffer]);
          return;
        }catch(e){ }
      }
      const hmacKey = await crypto.subtle.importKey('raw', passwordBytes, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
      const hLen = 32;
      const l = Math.ceil(dkLen / hLen);
      const r = dkLen - (l-1)*hLen;
      const derived = new Uint8Array(dkLen);
      const totalIterations = iterations * l;
      let completedIterations = 0;
      const updateEvery = Math.max(1, Math.floor(iterations / 50));
      for(let i=1;i<=l;i++){
        const intBuf = new Uint8Array(4);
        intBuf[0] = (i >>> 24) & 0xFF;
        intBuf[1] = (i >>> 16) & 0xFF;
        intBuf[2] = (i >>> 8) & 0xFF;
        intBuf[3] = (i) & 0xFF;
        const msg1 = new Uint8Array(saltBytes.length + 4);
        msg1.set(saltBytes,0); msg1.set(intBuf, saltBytes.length);
        let u = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, msg1));
        let t = new Uint8Array(u);
        completedIterations++;
        if((completedIterations % updateEvery) === 0){
          const pct = Math.floor((completedIterations / totalIterations) * 100);
          self.postMessage({id, progress:true, percent: pct, completed: completedIterations, total: totalIterations});
        }
        for(let j=2;j<=iterations;j++){
          u = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, u));
          for(let k=0;k<u.length;k++) t[k] ^= u[k];
          completedIterations++;
          if((completedIterations % updateEvery) === 0){
            const pct = Math.floor((completedIterations / totalIterations) * 100);
            self.postMessage({id, progress:true, percent: pct, completed: completedIterations, total: totalIterations});
          }
        }
        const offset = (i-1)*hLen;
        const take = (i === l) ? r : hLen;
        derived.set(t.slice(0,take), offset);
      }
      self.postMessage({id, progress:true, percent:100, completed: totalIterations, total: totalIterations});
      self.postMessage({id, ok:true, result: derived.buffer}, [derived.buffer]);
      return;
    }
    throw new Error('unknown action');
  }catch(err){
    self.postMessage({id, ok:false, error:err.message || String(err)});
  }
});
`;
// Cargar wordlist local (async). Si falla, intentamos remoto y finalmente usamos EMBEDDED_WORDLIST
fetch('wordlist.txt').then(r=>{
  if(!r.ok) throw new Error('no local');
  return r.text();
}).then(txt=>{
  const lines = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(lines.length>0){ wordList = lines; console.log('Wordlist cargada, palabras:', lines.length); }
}).catch(err=>{
  console.warn('No se pudo cargar wordlist local:', err);
  // Intentamos cargar BIP39 como fallback remoto (opcional)
  fetch('https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt').then(r=>{
    if(!r.ok) throw new Error('no remote');
    return r.text();
  }).then(t=>{
    const lines = t.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if(lines.length>0){ wordList = lines; console.log('Wordlist remota cargada, palabras:', lines.length); }
  }).catch(()=>{
    // Último recurso: usar lista embebida mínima para que el modo passphrase siga funcionando offline/file://
    wordList = EMBEDDED_WORDLIST.slice();
    console.warn('Usando wordlist embebida de fallback, palabras:', wordList.length);
  });
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
  // Helper to attach message handler
  const attachHandlers = (w) => {
    w.addEventListener('message', (ev)=>{
      const msg = ev.data || {};
      const { id, ok, result, error, progress } = msg;
      const cb = workerCallbacks.get(id);
      if(cb){
        if(progress && typeof cb.progress === 'function'){
          try{ cb.progress(msg); }catch(e){}
          return; // don't resolve yet
        }
        workerCallbacks.delete(id);
        if(ok) cb.resolve(result); else cb.reject(new Error(error));
      }
    });
    cryptoWorker = w;
  };

  try{
    // First attempt: normal worker from file (works when served over http/https)
    const w = new Worker('worker.js');
    attachHandlers(w);
    return;
  }catch(e){
    console.warn('No se pudo crear worker desde archivo (posible file://):', e);
    // Try fallback: create worker from embedded source via Blob (works even when page is opened via file://)
    try{
      const blob = new Blob([WORKER_FALLBACK_SRC], {type:'application/javascript'});
      const url = URL.createObjectURL(blob);
      const w2 = new Worker(url);
      attachHandlers(w2);
      // mark fallback used so UI can show badge
      window.__pgw_worker_fallback = true;
      console.log('Worker creado desde blob fallback');
      try{ showFallbackBadge(); }catch(e){}
      return;
    }catch(err2){
      console.warn('No se pudo crear worker desde blob fallback:', err2);
      cryptoWorker = null;
    }
  }
}

function workerRequest(action, data, onProgress){
  ensureWorker();
  if(!cryptoWorker){ return Promise.reject(new Error('Web Worker no disponible')); }
  const id = workerReqId++;
  return new Promise((resolve,reject)=>{
    workerCallbacks.set(id, {resolve,reject,progress:onProgress});
    cryptoWorker.postMessage({id, action, data});
  });
}

// Cancel outstanding worker operations and terminate the worker.
function cancelWorkerOperations(){
  try{
    if(cryptoWorker){
      // Reject all pending callbacks so awaiting promises don't hang
      for(const [id, cb] of workerCallbacks.entries()){
        try{ cb.reject(new Error('Operación cancelada por el usuario')); }catch(e){}
      }
      workerCallbacks.clear();
      try{ cryptoWorker.terminate(); }catch(e){}
      cryptoWorker = null;
      // show toast with retry action if a retry function is registered
      const retryFn = (window && window.__pgw_last_longop_retry) ? window.__pgw_last_longop_retry : null;
      if(retryFn && typeof retryFn === 'function'){
        showToast('Operación cancelada', 'warn', 8000, 'Reintentar', ()=>{ try{ retryFn(); }catch(e){ console.error('retry fn failed', e); } });
      } else {
        showToast('Operación cancelada', 'warn', 3000);
      }
      statusEl.textContent = 'PGW: operación cancelada';
    }
  }catch(e){ console.error('Error al cancelar worker:', e); }
  try{ if(window && window.__pgw_kdf_progress_handler) delete window.__pgw_kdf_progress_handler; }catch(e){}
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
    try{ await render(); 
      // micro-interaction: pulse the output and meter to highlight new password
      try{ passwordOut.classList.add('flash'); meterBar.classList.add('pulse'); setTimeout(()=>{ passwordOut.classList.remove('flash'); meterBar.classList.remove('pulse'); }, 900); }catch(e){}
    }catch(e){ console.error('Error en render:', e); statusEl.textContent='PGW: error al generar'; }
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
      // visual micro-feedback: add .copied class and toast; preserve inner SVG
      copyBtn.classList.add('copied');
      setTimeout(()=>copyBtn.classList.remove('copied'),1200);
      // animación del campo
      passwordOut.classList.add('flash');
      setTimeout(()=>passwordOut.classList.remove('flash'),700);
      // Toast notification
      try{ showToast('Contraseña copiada al portapapeles', 'info', 2200); }catch(e){}
      // Try to clear clipboard after 15s (best-effort) and notify user
      tryClearClipboard(15000);
    }).catch((err)=>{
      console.warn('No se pudo copiar al portapapeles:', err);
      try{ showToast('No se pudo copiar (permiso denegado)', 'warn', 3500); }catch(e){}
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
    // Consent check (accessible confirm modal)
    if(hibpOptIn && !hibpOptIn.checked){
      const ok = await showConfirmModal('No ha marcado la casilla de opt-in para HIBP. ¿Desea continuar y marcarla?');
      if(!ok) return;
      hibpOptIn.checked = true;
    }
    // choose password to check: prefer manual if set, else current output
    const pw = (useCustom && useCustom.checked && customPw && customPw.value.trim()) ? customPw.value.trim() : passwordInput.value || '';
  if(!pw){ showToast('No hay contraseña para comprobar.', 'warn'); return; }
    // Compute SHA-1 locally via worker
    statusEl.textContent = 'PGW: calculando SHA-1 localmente...';
    try{
      const hash = await sha1HexWorker(pw);
      const prefix = hash.slice(0,5);
      const suffix = hash.slice(5);
      statusEl.textContent = 'PGW: consultando HIBP (prefijo)';
      const resp = await fetch('https://api.pwnedpasswords.com/range/' + prefix);
  if(!resp.ok){ statusEl.textContent = 'PGW: HIBP no disponible'; showToast('No se pudo consultar HIBP: ' + resp.status, 'error'); return; }
      const txt = await resp.text();
      const lines = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
      let found = 0;
      for(const line of lines){ const [suf,cnt] = line.split(':'); if(suf && suf.toUpperCase()===suffix.toUpperCase()){ found = parseInt(cnt,10) || 0; break; } }
  if(found>0){ statusEl.textContent = `PGW: contraseña encontrada ${found} veces en HIBP`; showToast(`Esta contraseña apareció ${found} veces en la base de datos de HIBP. Recomendado cambiarla.`, 'warn'); }
  else { statusEl.textContent = 'PGW: no encontrada en HIBP (con el prefijo consultado)'; showToast('No aparece en HIBP según el prefijo consultado.', 'info'); }
  }catch(e){ console.error('Error HIBP:', e); statusEl.textContent = 'PGW: error HIBP (ver consola)'; showToast('Error al consultar HIBP: ' + e.message, 'error'); }
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
    // Kick off KDF ETA estimation in background
    try{ if(kdfIterations) estimateKdfEta(Number(kdfIterations.value)); }catch(e){/* ignore */}
    // Auto-open tutorial for first-time visitors (unless already completed)
    try{
      const completed = (localStorage && localStorage.getItem && localStorage.getItem('pgw_tutorial_completed') === '1');
      const seenSession = (sessionStorage && sessionStorage.getItem && sessionStorage.getItem('pgw_tutorial_shown'));
      if(!completed && !seenSession){
        // mark shown this session to avoid repeat modals on reload
        try{ sessionStorage.setItem('pgw_tutorial_shown','1'); }catch(e){}
        // small delay so the page finishes layout before opening modal
        setTimeout(()=>{ try{ openTutorial(); }catch(e){ console.error('auto open tutorial failed', e); } }, 900);
      }
    }catch(e){ console.warn('tutorial auto-open check failed', e); }
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
    setLoading(true,'Analizando...');
    try{ await render(); }catch(e){ console.error('Error en render desde evalCustom', e); }
    finally{ setLoading(false); }
  });
}
// Clear manual input button
const clearCustom = el('clearCustom');
if(clearCustom){
  clearCustom.addEventListener('click', ()=>{
    try{
      // store previous value for undo
      const prev = (customPw && customPw.value) ? customPw.value : '';
      window.__pgw_last_cleared_custom = prev;
      // clear field
      customPw.value = '';
      useCustom.checked = false;
      passwordInput.readOnly = true;
      passwordInput.focus();
      // show toast with Undo action
      showToast('Campo manual limpiado', 'info', 6000, 'Deshacer', ()=>{
        try{
          if(window.__pgw_last_cleared_custom !== undefined && window.__pgw_last_cleared_custom !== null){
            customPw.value = window.__pgw_last_cleared_custom;
            useCustom.checked = true;
            passwordInput.readOnly = false;
            customPw.focus();
            window.__pgw_last_cleared_custom = null;
            showToast('Restaurado', 'info', 1800);
          }
        }catch(e){ console.error('undo clear failed', e); }
      });
    }catch(e){ console.error(e); }
  });
}
if(useCustom){
  useCustom.addEventListener('change', async ()=>{
    // when unchecked, make password input readonly and regenerate from settings
    passwordInput.readOnly = !useCustom.checked;
    if(!useCustom.checked){ setLoading(true,'Generando...'); try{ await render(); }catch(e){ console.error('Error en render desde useCustom change', e); } finally{ setLoading(false); } }
  });
  // start with password input readonly
  passwordInput.readOnly = true;
}

// --- Export / Import cifrado (AES-GCM con clave derivada por PBKDF2 en worker) ---
function arrayBufferToBase64(buf){
  const bytes = new Uint8Array(buf);
  let chunk = 0;
  const chunkSize = 0x8000; // evitar apply con arrays grandes
  let str = '';
  while(chunk * chunkSize < bytes.length){
    const sub = bytes.subarray(chunk*chunkSize, (chunk+1)*chunkSize);
    str += String.fromCharCode.apply(null, sub);
    chunk++;
  }
  return btoa(str);
}
function base64ToUint8Array(b64){
  const bin = atob(b64);
  const u = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function deriveAesKey(masterPass, saltBase64, iterations=200000){
  const salt = base64ToUint8Array(saltBase64);
  // Use worker PBKDF2 to derive 32 bytes (256 bits)
  try{
    const saltStr = arrayBufferToBase64(salt.buffer); // worker pbkdf2 expects salt as string in our worker (it encodes it again)
    // If caller provided an onProgress callback in a global slot, use it. We'll accept a temporary global handler 'currentKdfProgressHandler'.
    const onProgress = (typeof window !== 'undefined' && window.__pgw_kdf_progress_handler) ? window.__pgw_kdf_progress_handler : null;
    const outBuf = await workerRequest('pbkdf2', { password: masterPass, salt: saltStr, iterations: iterations, length: 32, reportProgress: !!onProgress }, onProgress);
    const keyBytes = new Uint8Array(outBuf);
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt','decrypt']);
    return key;
  }catch(e){
    // Fallback: try SubtleCrypto deriveBits (if worker not available)
    try{
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey('raw', enc.encode(masterPass), {name:'PBKDF2'}, false, ['deriveBits']);
      const derived = await crypto.subtle.deriveBits({name:'PBKDF2', salt, iterations, hash:'SHA-256'}, baseKey, 256);
      const key = await crypto.subtle.importKey('raw', derived, {name:'AES-GCM'}, false, ['encrypt','decrypt']);
      // If an onProgress handler exists, call it to indicate completion (can't provide incremental progress here)
      try{ if(window && window.__pgw_kdf_progress_handler){ window.__pgw_kdf_progress_handler({id:null, progress:true, percent:100, completed:iterations, total:iterations}); } }catch(e){}
      return key;
    }catch(err){ throw new Error('No se pudo derivar la clave: '+err.message); }
  }
}

async function encryptBackupObject(obj, masterPass, iterations = 200000){
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(masterPass, arrayBufferToBase64(salt.buffer), iterations);
  const enc = new TextEncoder();
  const plain = enc.encode(JSON.stringify(obj));
  const cipher = await crypto.subtle.encrypt({name:'AES-GCM', iv}, key, plain);
  return {
    version: 1,
    kdf: 'pbkdf2',
    salt: arrayBufferToBase64(salt.buffer),
    iterations: iterations,
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(cipher)
  };
}

async function decryptBackupObject(blobObj, masterPass){
  if(!blobObj || !blobObj.salt || !blobObj.iv || !blobObj.ciphertext) throw new Error('Formato de backup incorrecto');
  const key = await deriveAesKey(masterPass, blobObj.salt, blobObj.iterations || 200000);
  const iv = base64ToUint8Array(blobObj.iv);
  const cipher = base64ToUint8Array(blobObj.ciphertext);
  const plainBuf = await crypto.subtle.decrypt({name:'AES-GCM', iv}, key, cipher);
  const dec = new TextDecoder();
  const json = dec.decode(plainBuf);
  return JSON.parse(json);
}

// Modal helper: show a modal to ask for the master password (replaces prompt())
function ensureMasterModalElements(){
  const modal = el('masterModal');
  if(!modal) return null;
  return {
    modal,
    header: modal.querySelector('.modal-header'),
    body: modal.querySelector('.modal-body'),
    input: el('masterInput'),
    confirmBtn: el('masterConfirm'),
    cancelBtn: el('masterCancel')
  };
}

function showMasterModal(promptText, placeholder, opts = {}){
  // opts: { requireConfirm: boolean }
  return new Promise((resolve)=>{
    const elems = ensureMasterModalElements();
    if(!elems){
      // fallback to window.prompt if modal missing
      const res = window.prompt(promptText || 'Contraseña maestra:');
      resolve(res);
      return;
    }
    const {modal, header, body, input, confirmBtn, cancelBtn} = elems;
    const confirmWrap = el('masterConfirmWrap');
    const confirmInput = el('masterInputConfirm');
  const main = document.querySelector('#mainContent') || document.querySelector('main.container');
    try{ if(header) header.textContent = 'Contraseña maestra'; }catch(e){}
    try{ if(body) body.textContent = promptText || 'Introduce la contraseña maestra.'; }catch(e){}
    input.value = '';
    if(confirmInput) confirmInput.value = '';
    input.placeholder = placeholder || '';
    // show/hide confirm field depending on opts
    if(opts.requireConfirm){ if(confirmWrap) confirmWrap.style.display = 'block'; } else { if(confirmWrap) confirmWrap.style.display = 'none'; }

  // remember opener to restore focus later
  const opener = document.activeElement;
  // show modal and hide main content from assistive tech
  modal.style.display = 'flex';
  try{ if(main) main.setAttribute('aria-hidden','true'); }catch(e){}
  // focus first element
  setTimeout(()=>{ try{ input.focus(); }catch(e){} }, 50);

    // focus trap: collect focusable elements inside modal
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(modal.querySelectorAll(focusableSelector)).filter(elm => !elm.hasAttribute('disabled'));
    let firstFocusable = focusable[0];
    let lastFocusable = focusable[focusable.length-1];

    const masterErrorEl = el('masterError');
    const clearMasterError = ()=>{ if(masterErrorEl){ masterErrorEl.style.display='none'; masterErrorEl.textContent=''; } };

    const cleanup = (val)=>{
      try{ modal.style.display = 'none'; }catch(e){}
      try{ if(main) main.removeAttribute('aria-hidden'); }catch(e){}
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      modal.removeEventListener('keydown', onModalKeydown);
      clearMasterError();
      // restore focus to opener when possible
      try{ if(opener && typeof opener.focus === 'function') opener.focus(); }catch(e){}
      resolve(val);
    };

    const onConfirm = ()=>{
      const val = input.value || null;
      if(opts.requireConfirm && confirmInput){
  if(val === null || val === ''){ if(masterErrorEl){ masterErrorEl.textContent = 'La contraseña maestra no puede estar vacía.'; masterErrorEl.style.display='block'; input.focus(); } return; }
  if(confirmInput.value !== val){ if(masterErrorEl){ masterErrorEl.textContent = 'Las contraseñas no coinciden. Por favor, repite la contraseña.'; masterErrorEl.style.display='block'; confirmInput.focus(); } return; }
      }
      cleanup(val);
    };
    const onCancel = ()=> cleanup(null);

    const onKey = (e)=>{ if(e.key === 'Escape') onCancel(); };
    const onModalKeydown = (e)=>{
      if(e.key !== 'Tab') return;
      // manage tab cycling
      if(focusable.length === 0) return;
      const idx = focusable.indexOf(document.activeElement);
      if(e.shiftKey){
        // shift+tab
        if(document.activeElement === firstFocusable || idx === -1) { e.preventDefault(); lastFocusable.focus(); }
      } else {
        if(document.activeElement === lastFocusable || idx === -1) { e.preventDefault(); firstFocusable.focus(); }
      }
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
    modal.addEventListener('keydown', onModalKeydown);
  });
}

// Accessible confirm modal to replace window.confirm()
function showConfirmModal(message, title = 'Confirmación'){
  return new Promise((resolve)=>{
    const modal = el('confirmModal');
    if(!modal){ const res = window.confirm(message); resolve(res); return; }
    const label = el('confirmModalLabel');
    const body = el('confirmModalBody');
    const okBtn = el('confirmOk');
    const cancelBtn = el('confirmCancel');
  const main = document.querySelector('#mainContent') || document.querySelector('main.container');
    if(label) label.textContent = title;
    if(body) body.textContent = message;
    // remember opener to restore focus later
    const opener = document.activeElement;
    // show modal and hide main from assistive tech
    modal.style.display = 'flex';
    try{ if(main) main.setAttribute('aria-hidden','true'); }catch(e){}

    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(modal.querySelectorAll(focusableSelector)).filter(elm => !elm.hasAttribute('disabled'));
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length-1];

    const cleanup = (val)=>{
      try{ modal.style.display = 'none'; }catch(e){}
      try{ if(main) main.removeAttribute('aria-hidden'); }catch(e){}
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      modal.removeEventListener('keydown', onModalKeydown);
      // restore focus
      try{ if(opener && typeof opener.focus === 'function') opener.focus(); }catch(e){}
      resolve(val);
    };

    const onOk = ()=> cleanup(true);
    const onCancel = ()=> cleanup(false);
    const onKey = (e)=>{ if(e.key === 'Escape') onCancel(); };
    const onModalKeydown = (e)=>{
      if(e.key !== 'Tab') return;
      if(focusable.length === 0) return;
      const idx = focusable.indexOf(document.activeElement);
      if(e.shiftKey){ if(document.activeElement === firstFocusable || idx === -1){ e.preventDefault(); lastFocusable.focus(); } }
      else { if(document.activeElement === lastFocusable || idx === -1){ e.preventDefault(); firstFocusable.focus(); } }
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
    modal.addEventListener('keydown', onModalKeydown);
    // focus first actionable element
    setTimeout(()=>{ try{ (firstFocusable||okBtn).focus(); }catch(e){} }, 20);
  });
}

// Wire buttons
const exportBtn = el('exportBtn');
const importBtn = el('importBtn');
const importFile = el('importFile');
const tutorialBtn = el('tutorialBtn');

// Tutorial state helpers
let _tutorialSnapshot = null;
const tutorialSteps = [
  { title: 'Longitud: seguridad vs memoria', body: 'Aumentar longitud incrementa exponencialmente la entropía. Vamos a probar 24 caracteres.', apply: ()=>{ try{ lengthEl.value = 24; updateUI(); }catch(e){} }, highlight: '#length' },
  { title: 'Clases de caracteres', body: 'Agregar mayúsculas, números y símbolos hace la contraseña más resistente. Activamos mayúsculas, números y símbolos.', apply: ()=>{ try{ upper.checked = true; numbers.checked = true; symbols.checked = true; updateUI(); }catch(e){} }, highlight: '#upper' },
  { title: 'Frase (passphrase)', body: 'Las frases (palabras aleatorias) suelen ser fáciles de recordar y seguras. Activamos passphrase y usamos 5 palabras.', apply: ()=>{ try{ passphrase.checked = true; words.value = 5; updateUI(); }catch(e){} }, highlight: '#passphrase' },
  { title: 'Generación determinista', body: 'Puedes usar una semilla para reproducir la passphrase. Activamos modo determinista y sugerimos una semilla.', apply: ()=>{ try{ const d = el('deterministic'); if(d) d.checked = true; const s = el('seedInput'); if(s) s.value = 'mi-semilla-de-ejemplo'; updateUI(); }catch(e){} }, highlight: '#deterministic' },
  { title: 'Comprobación HIBP (opt-in)', body: 'HIBP usa k-anonymity: solo se envía el prefijo SHA-1. Activamos opt-in y mostramos cómo comprobar.', apply: ()=>{ try{ if(hibpOptIn) hibpOptIn.checked = true; updateUI(); }catch(e){} }, highlight: '#hibpOptIn' },
  { title: 'Iteraciones KDF', body: 'Para exportar el backup puedes elegir iteraciones PBKDF2. Más iteraciones = más seguridad pero más tiempo.', apply: ()=>{ try{ if(kdfIterations) kdfIterations.value = 50000; estimateKdfEta(Number(kdfIterations.value)); }catch(e){} }, highlight: '#kdfIterations' },
  { title: 'Exportar backup (demostración)', body: 'Si quieres, podemos simular un export cifrado con una contraseña maestra. Se te pedirá confirmación antes de crear un fichero descargable.', apply: async ()=>{ try{ const proceed = await showConfirmModal('¿Deseas ejecutar una demostración de export (se descargará un fichero cifrado de ejemplo)?'); if(!proceed) return; // user cancelled
        // Use a low iteration count for demo to avoid long waits
        const pw = passwordInput.value || await generatePassword();
        const payload = { createdAt: (new Date()).toISOString(), password: pw, options: { length: lengthEl.value, lower: lower.checked, upper: upper.checked, numbers: numbers.checked, symbols: symbols.checked, passphrase: passphrase.checked, words: words.value } };
        const master = await showMasterModal('Introduce una contraseña maestra para la demo (no se guardará).', '', { requireConfirm: false });
        if(!master){ showToast('Demo de export cancelada.', 'info'); return; }
        setLoading(true,'Cifrando demo...');
        try{ const demoExport = await encryptBackupObject(payload, master, 1000); const blob = new Blob([JSON.stringify(demoExport,null,2)],{type:'application/json'}); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'pgw-demo-backup.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); showToast('Demo export creada (descarga iniciada).', 'info', 4000); }catch(e){ console.error('demo export failed', e); showToast('Demo export falló: '+(e.message||e), 'error', 4000); }finally{ setLoading(false); }
      }catch(e){ console.error('tutorial export demo error', e); } }, highlight: '#exportBtn' },
  { title: 'Consejos finales', body: 'Resumen: usa una longitud adecuada, añade clases de caracteres o usa una frase memorizable y exporta backups cifrados si necesitas portabilidad. ¡Listo!', apply: ()=>{}, highlight: ['#password','#meterBar'] }
];
let _tutorialIndex = 0;

async function openTutorial(){
  // snapshot current values to restore later
  _tutorialSnapshot = {
    length: lengthEl.value, lower: lower.checked, upper: upper.checked, numbers: numbers.checked, symbols: symbols.checked,
    passphrase: passphrase.checked, words: words.value, deterministic: (el('deterministic')?el('deterministic').checked:false), seed: (el('seedInput')?el('seedInput').value:'')
  };
  _tutorialIndex = 0;
  const modal = el('tutorialModal');
  if(!modal) return;
  modal.style.display = 'flex';
  try{ document.querySelector('main.container').setAttribute('aria-hidden','true'); }catch(e){}
  // focus-trap for tutorial modal
  try{
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(modal.querySelectorAll(focusableSelector)).filter(elm => !elm.hasAttribute('disabled'));
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length-1];
    const onKey = (e)=>{ if(e.key === 'Escape'){ closeTutorial(true); } else if(e.key === 'Tab'){
      const idx = focusable.indexOf(document.activeElement);
      if(e.shiftKey){ if(document.activeElement === firstFocusable || idx === -1){ e.preventDefault(); lastFocusable.focus(); } }
      else { if(document.activeElement === lastFocusable || idx === -1){ e.preventDefault(); firstFocusable.focus(); } }
    } };
    document.addEventListener('keydown', onKey);
    // store cleanup handler on modal so closeTutorial can remove it
    // also attach a backdrop click handler (clicking outside dialog closes tutorial)
    const onBackdropClick = (ev)=>{ try{ if(ev.target === modal) { closeTutorial(true); } }catch(e){} };
    modal.addEventListener('click', onBackdropClick);
    const prevCleanup = (modal._cleanup && typeof modal._cleanup === 'function') ? modal._cleanup : null;
    modal._cleanup = ()=>{ try{ document.removeEventListener('keydown', onKey); }catch(e){} try{ modal.removeEventListener('click', onBackdropClick); }catch(e){} if(prevCleanup) try{ prevCleanup(); }catch(e){} };
    // focus first actionable element after open
    setTimeout(()=>{ try{ (firstFocusable || el('tutorialNext')).focus(); }catch(e){} }, 40);
  }catch(e){/* ignore focus trap errors */}

  await renderTutorialStep();
}

// Tutorial overlay / spotlight helpers
function ensureTutorialOverlay(){
  if(document.getElementById('pgw-tutorial-overlay')) return;
  const ov = document.createElement('div'); ov.id = 'pgw-tutorial-overlay'; ov.className = 'tutorial-overlay';
  const spot = document.createElement('div'); spot.id = 'pgw-tutorial-spot'; spot.className = 'tutorial-spot';
  const label = document.createElement('div'); label.id = 'pgw-tutorial-spot-label'; label.className = 'tutorial-spot-label hidden';
  // role=status so screen readers can be informed when label text changes; we also use a separate aria-live announcer elsewhere
  label.setAttribute('role','status');
  ov.appendChild(spot);
  document.body.appendChild(ov);
  // label appended to body (absolute positioned) so it can be placed near the spot
  document.body.appendChild(label);
}

function hideTutorialOverlay(){
  const ov = document.getElementById('pgw-tutorial-overlay');
  if(!ov) return;
  try{ ov.classList.remove('visible'); ov.style.opacity = '0'; ov.style.pointerEvents = 'none'; }catch(e){}
  // cleanup spot and label event handlers and remove from DOM to avoid any lingering visual artifacts
  try{
    const spot = document.getElementById('pgw-tutorial-spot');
    if(spot){ try{ spot.style.width = '0px'; spot.style.height = '0px'; spot.style.left = '-9999px'; spot.style.top = '-9999px'; }catch(e){}
      try{ if(spot.parentNode) spot.parentNode.removeChild(spot); }catch(e){}
    }
  }catch(e){}
  try{
    const label = document.getElementById('pgw-tutorial-spot-label');
    if(label){
      // remove CTA handler if present
      try{ const cta = label.querySelector('.label-cta'); if(cta && label._ctaHandler) cta.removeEventListener('click', label._ctaHandler); }catch(e){}
      try{ label.classList.add('hidden'); label.style.left = '-9999px'; label.style.top = '-9999px'; }catch(e){}
      try{ if(label.parentNode) label.parentNode.removeChild(label); }catch(e){}
    }
  }catch(e){}
  // finally remove the overlay element entirely after a short delay to allow CSS transition to finish
  try{ setTimeout(()=>{ try{ const o = document.getElementById('pgw-tutorial-overlay'); if(o && o.parentNode) o.parentNode.removeChild(o); }catch(e){} }, 260); }catch(e){}
}

function showSpotFor(node, labelText){
  try{
    if(!node) { hideTutorialOverlay(); return; }
    ensureTutorialOverlay();
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ov = document.getElementById('pgw-tutorial-overlay'); const spot = document.getElementById('pgw-tutorial-spot');
    if(!ov || !spot) return;
    const rect = node.getBoundingClientRect();
    // base geometry
    let left = rect.left - 8;
    let top = rect.top - 8;
    let w = rect.width + 16;
    let h = rect.height + 16;
    // viewport and header/footer awareness
    const vw = Math.max(320, window.innerWidth || document.documentElement.clientWidth);
    const vh = Math.max(200, window.innerHeight || document.documentElement.clientHeight);
    const headerEl = document.querySelector('.hero') || document.querySelector('header');
    const footerEl = document.querySelector('.footer');
    const headerH = headerEl ? headerEl.getBoundingClientRect().height : 0;
    const footerH = footerEl ? footerEl.getBoundingClientRect().height : 0;
    const margin = 12; // keep some breathing room from edges and fixed chrome
    // Handle extremely small targets (e.g., icon buttons) by expanding the spot to a tappable focus area
    const minW = 44, minH = 44;
    if(rect.width < 12 || rect.height < 12){
      w = Math.max(minW, w);
      h = Math.max(minH, h);
      left = rect.left + (rect.width/2) - (w/2);
      top = rect.top + (rect.height/2) - (h/2);
    }
    // Ensure spot fits within viewport (clamp and avoid overlapping header/footer)
    w = Math.min(w, vw - (margin*2));
    h = Math.min(h, vh - headerH - footerH - (margin*2));
    left = Math.min(Math.max(margin, left), vw - w - margin);
    top = Math.min(Math.max(margin + headerH, top), vh - h - footerH - margin);
    // Scroll into view (smooth unless reduced motion)
    try{ if(!reduced) node.scrollIntoView({behavior:'smooth', block:'center', inline:'center'}); else node.scrollIntoView({block:'center'}); }catch(e){}
    // Position the overlay spot
    if(reduced || !window.gsap){
      ov.classList.add('visible');
      spot.style.left = `${Math.round(left)}px`; spot.style.top = `${Math.round(top)}px`; spot.style.width = `${Math.round(w)}px`; spot.style.height = `${Math.round(h)}px`; spot.style.transform = 'scale(1)';
    } else {
      // animate overlay and spot with GSAP
      try{ gsap.killTweensOf(ov); gsap.killTweensOf(spot); }catch(e){}
      try{ gsap.to(ov, {duration:0.28, opacity:1, ease:'power2.out', onStart: ()=>ov.classList.add('visible')}); }catch(e){}
      try{ gsap.fromTo(spot, {left: Math.round(left)-8, top: Math.round(top)-8, width: Math.round(w)+16, height: Math.round(h)+16, scale:1.06, opacity:0.95}, {left: Math.round(left), top: Math.round(top), width: Math.round(w), height: Math.round(h), scale:1, opacity:1, duration:0.48, ease:'power3.out'}); }catch(e){}
    }

    // Position and show label (if provided)
    try{
      const label = document.getElementById('pgw-tutorial-spot-label');
      if(label){
        // Set text into inner element
        const textEl = label.querySelector('.label-text');
        if(textEl) textEl.textContent = labelText ? String(labelText) : '';
        // Wire CTA to show more info (use provided labelBody)
        const cta = label.querySelector('.label-cta');
        try{ if(label._ctaHandler && cta) cta.removeEventListener('click', label._ctaHandler); }catch(e){}
  label._ctaHandler = (ev)=>{ try{ ev.preventDefault(); if(labelBody) showInfoModal(labelBody, labelText || 'Información'); else showToast('Más información no disponible.', 'info'); }catch(e){ console.error('CTA handler failed', e); } };
        if(cta) cta.addEventListener('click', label._ctaHandler);
        label.classList.remove('below');
        label.classList.remove('hidden');
        // Compute label size after adding text
        // Give browser a tick to measure if animations enabled
        const doPosition = ()=>{
          const lr = label.getBoundingClientRect();
          // Prefer placing label above the spot; if not enough space, place below
          const preferredTop = top - lr.height - 12;
          let labelTop = preferredTop;
          let arrowBelow = false;
          // If preferredTop overlaps header or is off-screen, place below
          if(preferredTop < (margin + headerH + 6)){
            labelTop = top + h + 12;
            arrowBelow = true;
          }
          // If below placement extends beyond viewport bottom, try placing above even if preferred top was small
          if((labelTop + lr.height) > (vh - footerH - margin)){
            labelTop = Math.max(margin + headerH, top - lr.height - 12);
            arrowBelow = false;
          }
          let labelLeft = left + (w/2) - (lr.width/2);
          // clamp within viewport
          const pad = margin;
          labelLeft = Math.max(pad, Math.min(labelLeft, vw - lr.width - pad));
          // ensure label doesn't overlap the spot vertically; if it would, nudge it
          if(!arrowBelow && (labelTop + lr.height) > top && (labelTop < top + h)){
            labelTop = top - lr.height - 12; // force above
            arrowBelow = false;
          }
          if(arrowBelow && labelTop < top + h){
            labelTop = top + h + 12;
          }
          // apply
          label.style.left = `${Math.round(labelLeft)}px`;
          label.style.top = `${Math.round(labelTop)}px`;
          if(arrowBelow) label.classList.add('below'); else label.classList.remove('below');
          if(window.gsap && !reduced){
            try{ gsap.killTweensOf(label); gsap.fromTo(label, {opacity:0, y: (arrowBelow? -6 : 6), scale:0.98}, {opacity:1, y:0, scale:1, duration:0.36, ease:'power2.out'}); }catch(e){}
          } else {
            label.style.opacity = '1'; label.style.transform = 'none';
          }
        };
        // If GSAP is present and not reduced, allow a short delay to get stable layout before measuring
        if(window.gsap && !reduced){ setTimeout(doPosition, 40); } else { doPosition(); }
      }
    }catch(e){ console.warn('label positioning failed', e); }
  }catch(err){ console.warn('showSpotFor failed', err); }
}

function closeTutorial(restore=true){
  const modal = el('tutorialModal');
  if(modal){ modal.style.display = 'none'; if(modal._cleanup) try{ modal._cleanup(); delete modal._cleanup; }catch(e){} }
  try{ hideTutorialOverlay(); }catch(e){}
  try{ document.querySelector('main.container').removeAttribute('aria-hidden'); }catch(e){}
  if(restore && _tutorialSnapshot){
    try{
      lengthEl.value = _tutorialSnapshot.length; lower.checked = _tutorialSnapshot.lower; upper.checked = _tutorialSnapshot.upper; numbers.checked = _tutorialSnapshot.numbers; symbols.checked = _tutorialSnapshot.symbols;
      passphrase.checked = _tutorialSnapshot.passphrase; words.value = _tutorialSnapshot.words; if(el('deterministic')) el('deterministic').checked = _tutorialSnapshot.deterministic; if(el('seedInput')) el('seedInput').value = _tutorialSnapshot.seed;
      updateUI();
      render();
    }catch(e){ console.error('restore snapshot failed', e); }
  }
  _tutorialSnapshot = null;
}

// Render tutorial step, apply its settings, run the generator and update a live entropy panel.
async function renderTutorialStep(){
  const s = tutorialSteps[_tutorialIndex];
  const title = el('tutorialStepTitle');
  const body = el('tutorialStepBody');
  if(title) title.textContent = s.title || ('Paso ' + (_tutorialIndex+1));
  if(body) body.textContent = s.body || '';
  // Announce step for screen readers (aria-live)
  try{
    let ann = document.getElementById('pgw-tutorial-announce');
    if(!ann){ ann = document.createElement('div'); ann.id = 'pgw-tutorial-announce'; ann.className = 'visually-hidden'; ann.setAttribute('aria-live','polite'); document.body.appendChild(ann); }
    ann.textContent = `Paso ${_tutorialIndex+1}: ${s.title}. ${s.body}`;
  }catch(e){}
  // Small entrance animations for tutorial text (GSAP if available)
  try{
    if(window.gsap){
      try{ gsap.fromTo(title, {y:8, opacity:0}, {y:0, opacity:1, duration:0.45, ease:'power2.out'}); }catch(e){}
      try{ gsap.fromTo(body, {y:10, opacity:0}, {y:0, opacity:1, duration:0.45, delay:0.05, ease:'power2.out'}); }catch(e){}
    }
  }catch(e){}
  // remove any previous highlights
  try{ Array.from(document.querySelectorAll('.tutorial-highlight')).forEach(n=>n.classList.remove('tutorial-highlight')); }catch(e){}
  // apply suggested settings for this step
  try{ if(typeof s.apply === 'function') s.apply(); }catch(e){ console.error('apply tutorial step failed', e); }

  // Add highlight(s) for this step if provided
  try{
    if(s.highlight){
      const sels = Array.isArray(s.highlight) ? s.highlight : [s.highlight];
      for(const sel of sels){ try{ const node = document.querySelector(sel); if(node) node.classList.add('tutorial-highlight'); }catch(e){} }
    }
  }catch(e){ console.error('highlight apply failed', e); }

  // Show spotlight overlay for the primary highlighted element (if any)
  try{
    if(s.highlight){
      const sels = Array.isArray(s.highlight) ? s.highlight : [s.highlight];
      const node = document.querySelector(sels[0]);
    if(node) showSpotFor(node, s.title, s.body); else hideTutorialOverlay();
    } else {
      hideTutorialOverlay();
    }
  }catch(e){ console.error('spotlight failed', e); }

  // brief pulse on highlighted elements to draw attention
  try{
    if(s.highlight){
      const sels = Array.isArray(s.highlight) ? s.highlight : [s.highlight];
      for(const sel of sels){
        try{
          const node = document.querySelector(sel);
          if(node){
            node.classList.add('pulse');
            setTimeout(()=>{ try{ node.classList.remove('pulse'); }catch(e){} }, 900);
          }
        }catch(e){}
      }
    }
      // GSAP highlight glow (subtle)
      try{
        if(window.gsap && s.highlight){
          const sels = Array.isArray(s.highlight) ? s.highlight : [s.highlight];
          for(const sel of sels){ try{ const n = document.querySelector(sel); if(n){ try{ gsap.fromTo(n, {boxShadow: '0 0 0px rgba(0,0,0,0)'}, {boxShadow: '0 0 18px rgba(255,200,50,0.12)', duration:0.6, yoyo:true, repeat:1, ease: 'sine.inOut'}); }catch(e){} } }catch(e){} }
        }
      }catch(e){}
  }catch(e){ /* ignore pulse errors */ }

  // Update UI by generating or analyzing current values so the user sees live entropy and estimate
  try{
    // show generation activity for better UX (tutorial triggers generation)
    try{ setLoading(true,'Generando...'); }catch(e){}
    await render();
    try{ setLoading(false); }catch(e){}
    // compute analysis for the currently displayed password
    const curPw = (passwordInput && passwordInput.value) ? passwordInput.value : '';
    const analysis = analyzePassword(curPw);
    const entropy = analysis.entropy || 0;
    const custom = Number(customRate && customRate.value) || Number(rateSelect && rateSelect.value) || 1e10;
    const chosen = estimateCrackTime(entropy, custom);
    const entRounded = Math.round(entropy);
    const entropyEl = el('tutorialEntropy');
    if(entropyEl){
      const phrase = funnyFor(chosen.seconds, entropy);
      entropyEl.textContent = `Entropía: ${entRounded} bits — ${formatRate(custom)}: ${chosen.label} — ${phrase}`;
    }
    // visual pulse on the password output so user notices the generated value
    try{ passwordInput.classList.add('flash'); setTimeout(()=>passwordInput.classList.remove('flash'),900); }catch(e){}
  }catch(e){ console.error('renderTutorialStep render/analysis failed', e); }

  // update buttons
  try{ el('tutorialPrev').disabled = (_tutorialIndex === 0); el('tutorialNext').textContent = (_tutorialIndex === tutorialSteps.length-1) ? 'Finalizar' : 'Siguiente'; }catch(e){}
}

async function nextTutorialStep(){
  if(_tutorialIndex < tutorialSteps.length-1){ _tutorialIndex++; await renderTutorialStep(); } else { try{ localStorage.setItem('pgw_tutorial_completed', '1'); }catch(e){} closeTutorial(false); showToast('Tutorial finalizado — los cambios se conservaron.', 'info', 3000); }
}

async function prevTutorialStep(){ if(_tutorialIndex>0){ _tutorialIndex--; await renderTutorialStep(); } }

// wire tutorial UI
document.addEventListener('DOMContentLoaded', ()=>{
  try{
    const tBtn = document.getElementById('tutorialBtn'); if(tBtn) tBtn.addEventListener('click', ()=>openTutorial());
    const tClose = document.getElementById('tutorialClose'); if(tClose) tClose.addEventListener('click', ()=>closeTutorial());
    const tNext = document.getElementById('tutorialNext'); if(tNext) tNext.addEventListener('click', ()=>nextTutorialStep());
    const tPrev = document.getElementById('tutorialPrev'); if(tPrev) tPrev.addEventListener('click', ()=>prevTutorialStep());
  }catch(e){ console.error('wire tutorial failed', e); }
});

// Keyboard shortcut: Shift+T opens the tutorial (unless typing in an input)
document.addEventListener('keydown', (e)=>{
  try{
    if(!e.shiftKey) return;
    const k = e.key || e.keyCode;
    if(k === 'T' || k === 't' || k === 84){
      const active = document.activeElement;
      const tag = active && active.tagName;
      if(tag === 'INPUT' || tag === 'TEXTAREA' || (active && active.isContentEditable)) return; // avoid interfering while typing
      e.preventDefault();
      try{ openTutorial(); showToast('Atajo: abrir tutorial (Shift+T)', 'info', 2200); }catch(err){ console.error('shortcut open tutorial failed', err); }
    }
  }catch(e){ /* ignore */ }
});

if(exportBtn){
  exportBtn.addEventListener('click', async ()=>{
    try{
      const pw = passwordInput.value || '';
  if(!pw){ showToast('No hay contraseña generada para exportar', 'warn'); return; }
      // Build object to export (do not include unnecessary logs)
      const payload = {
        createdAt: (new Date()).toISOString(),
        password: pw,
        options: {
          length: lengthEl.value,
          lower: lower.checked,
          upper: upper.checked,
          numbers: numbers.checked,
          symbols: symbols.checked,
          passphrase: passphrase.checked,
          words: words.value,
          deterministic: el('deterministic')?el('deterministic').checked:false,
          seed: el('seedInput')?el('seedInput').value:''
        }
      };
  const master = await showMasterModal('Introduce una contraseña maestra para cifrar el backup (no se guardará).', '', { requireConfirm: true });
  if(!master){ showToast('Cancelado. Se requiere una contraseña maestra para cifrar.', 'warn'); return; }
  statusEl.textContent = 'PGW: cifrando backup...';
  const iters = (kdfIterations && Number(kdfIterations.value)) || 200000;
  // If KDF is expected to be long, show blocking overlay
  try{
    const seconds = await estimateKdfEta(iters);
    if(seconds && seconds > 5){
      // register a temporary global progress handler that receives worker progress messages
      window.__pgw_kdf_progress_handler = (msg)=>{
        try{
          const percent = Number(msg.percent) || 0;
          setBlockingProgress(percent);
        }catch(e){}
      };
      // register a retry shortcut so toast can trigger export again if user cancels
    try{ window.__pgw_last_longop_retry = ()=>{ try{ window.__pgw_metrics.retries = (window.__pgw_metrics.retries||0) + 1; console.log('PGW metrics (retries):', window.__pgw_metrics.retries); }catch(e){} exportBtn.click(); }; }catch(e){}
      showBlockingOverlay(`Cifrando backup — esto puede tardar ${formatDuration(seconds)}`);
    }
  }catch(e){ /* ignore ETA errors */ }
  let exported;
  try{
    exported = await encryptBackupObject(payload, master, iters);
  }finally{
    hideBlockingOverlay();
    try{ delete window.__pgw_kdf_progress_handler; }catch(e){}
  }
      const blob = new Blob([JSON.stringify(exported, null, 2)], {type:'application/json'});
      const name = `pgw-backup-${(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      statusEl.textContent = 'PGW: backup descargado (cifrado)';
  }catch(e){ console.error('Export error:', e); showToast('Error al exportar: '+(e.message||e), 'error'); statusEl.textContent = 'PGW: error export'; }
  });
}

if(importBtn && importFile){
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', async (ev)=>{
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    try{
      const txt = await f.text();
      const parsed = JSON.parse(txt);
  const master = await showMasterModal('Introduce la contraseña maestra usada para cifrar este backup:');
  if(!master){ showToast('Importación cancelada. Se requiere la contraseña maestra.', 'warn'); return; }
      statusEl.textContent = 'PGW: descifrando backup...';
      // If the backup declares iterations, estimate decrypt time and show overlay if long
      try{
        const iters = parsed && parsed.iterations ? Number(parsed.iterations) : null;
        if(iters){
          const seconds = await estimateKdfEta(iters);
          if(seconds && seconds > 5){
            window.__pgw_kdf_progress_handler = (msg)=>{ try{ setBlockingProgress(Number(msg.percent)||0); }catch(e){} };
            // register retry shortcut so toast can re-open import file picker
            try{ window.__pgw_last_longop_retry = ()=>{ try{ window.__pgw_metrics.retries = (window.__pgw_metrics.retries||0) + 1; console.log('PGW metrics (retries):', window.__pgw_metrics.retries); }catch(e){} importBtn.click(); }; }catch(e){}
            showBlockingOverlay(`Descifrando backup — esto puede tardar ${formatDuration(seconds)}`);
          }
        }
      }catch(e){ /* ignore ETA errors */ }
      let obj;
      try{
        obj = await decryptBackupObject(parsed, master);
      }finally{
        hideBlockingOverlay();
        try{ delete window.__pgw_kdf_progress_handler; }catch(e){}
      }
  // Ask user before loading into UI to avoid unintended overwrites (accessible confirm)
  const want = await showConfirmModal('Backup descifrado correctamente. Contiene contraseña y opciones. ¿Desea cargar la contraseña en la interfaz ahora? (Se sobrescribirá el campo actual)');
  if(want){
        try{ passwordInput.value = obj.password || ''; useCustom.checked = true; passwordInput.readOnly = false; }catch(e){}
        try{
          if(obj.options){
            lengthEl.value = obj.options.length || lengthEl.value;
            lower.checked = !!obj.options.lower; upper.checked = !!obj.options.upper; numbers.checked = !!obj.options.numbers; symbols.checked = !!obj.options.symbols;
            passphrase.checked = !!obj.options.passphrase; words.value = obj.options.words || words.value;
            if(el('deterministic')) el('deterministic').checked = !!obj.options.deterministic;
            if(el('seedInput')) el('seedInput').value = obj.options.seed || '';
            updateUI();
          }
        }catch(e){/* ignore UI set errors */}
        statusEl.textContent = 'PGW: backup cargado (local)';
      } else {
        statusEl.textContent = 'PGW: backup descifrado (no cargado)';
      }
  }catch(e){ console.error('Import error:', e); showToast('Error al importar/descifrar: ' + (e.message||e), 'error'); statusEl.textContent = 'PGW: error import'; }
    // Reset file input
    importFile.value = '';
  });
}

// KDF benchmark cache and ETA estimation
const kdfBenchmark = { msPerIteration: null, sampleIterations: 2000 };
async function measureKdfSample(){
  if(kdfBenchmark.msPerIteration) return kdfBenchmark.msPerIteration;
  const sample = kdfBenchmark.sampleIterations;
  try{
    ensureWorker();
    const t0 = performance.now();
    await workerRequest('pbkdf2', { password: 'benchmark-pgw', salt: 'bench', iterations: sample, length: 32 });
    const t1 = performance.now();
    kdfBenchmark.msPerIteration = (t1 - t0) / sample;
    return kdfBenchmark.msPerIteration;
  }catch(e){
    // fallback using subtle deriveBits (slower but available)
    try{
      const enc = new TextEncoder();
      const baseKey = await crypto.subtle.importKey('raw', enc.encode('benchmark-pgw'), {name:'PBKDF2'}, false, ['deriveBits']);
      const t0 = performance.now();
      await crypto.subtle.deriveBits({name:'PBKDF2', salt: enc.encode('bench'), iterations: sample, hash:'SHA-256'}, baseKey, 256);
      const t1 = performance.now();
      kdfBenchmark.msPerIteration = (t1 - t0) / sample;
      return kdfBenchmark.msPerIteration;
    }catch(err){
      console.warn('No se pudo medir KDF sample:', err);
      kdfBenchmark.msPerIteration = null;
      return null;
    }
  }
}

async function estimateKdfEta(iterations){
  if(!kdfEta) return null;
  kdfEta.textContent = 'ETA estimada: calculando...';
  const msPer = await measureKdfSample();
  if(!msPer){ kdfEta.textContent = 'ETA estimada: N/A'; return null; }
  const seconds = (msPer * iterations) / 1000;
  kdfEta.textContent = `ETA estimada: ${formatDuration(seconds)}`;
  return seconds;
}

if(kdfIterations){
  kdfIterations.addEventListener('change', async ()=>{ try{ await estimateKdfEta(Number(kdfIterations.value)); }catch(e){console.error(e);} });
}

// Simple toast notifications (non-blocking)
function showToast(msg, type='info', timeout=5000){
  let container = el('toastContainer');
  if(!container){
    container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container);
  }
  const t = document.createElement('div'); t.className = 'toast ' + (type||'info');
  t.setAttribute('role','status');
  t.style.opacity = '0';
  // message
  const txt = document.createElement('div'); txt.textContent = msg; txt.style.flex = '1';
  t.appendChild(txt);
  // support optional action via extra args (passed via arguments beyond timeout)
  const actionLabel = arguments[3];
  const actionCb = arguments[4];
  if(actionLabel && typeof actionLabel === 'string' && typeof actionCb === 'function'){
    const actBtn = document.createElement('button'); actBtn.className = 'btn'; actBtn.textContent = actionLabel; actBtn.style.marginLeft = '10px'; actBtn.addEventListener('click', ()=>{ try{ actionCb(); }catch(e){} t.remove(); });
    t.appendChild(actBtn);
  }
  container.appendChild(t);
  // fade in
  requestAnimationFrame(()=>{ t.style.transition = 'opacity 240ms ease'; t.style.opacity = '1'; });
  setTimeout(()=>{ try{ t.style.opacity = '0'; setTimeout(()=>t.remove(),300); }catch(e){} }, timeout);
}

// Tooltip/Popover for .info-btn (supports touch and keyboard)
function createTooltipPopover(){
  let pop = document.getElementById('pgw-tooltip-popover');
  if(pop) return pop;
  pop = document.createElement('div'); pop.id = 'pgw-tooltip-popover'; pop.className = 'tooltip-popover'; pop.setAttribute('role','tooltip'); pop.setAttribute('hidden','');
  const arrow = document.createElement('div'); arrow.className = 'arrow'; pop.appendChild(arrow);
  const content = document.createElement('div'); content.id = 'pgw-tooltip-content'; pop.appendChild(content);
  document.body.appendChild(pop);
  return pop;
}

function showTooltipForBtn(btn){
  const pop = createTooltipPopover();
  const txt = btn.getAttribute('data-tooltip') || btn.getAttribute('aria-label') || '';
  const content = document.getElementById('pgw-tooltip-content');
  content.textContent = txt;
  // position near button with flipping and responsive reposition on scroll/resize
  const rect = btn.getBoundingClientRect();
  pop.style.left = '0px'; pop.style.top = '0px'; pop.removeAttribute('hidden');
  pop.tabIndex = -1;
  const margin = 8;

  const reposition = ()=>{
    const popRect = pop.getBoundingClientRect();
    let top, left;
    // Prefer placing above unless there's not enough space
    if(rect.top - popRect.height - margin > 8){
      // place above
      top = rect.top - popRect.height - margin;
      pop.classList.remove('below'); pop.classList.add('above');
    } else {
      // place below
      top = rect.bottom + margin;
      pop.classList.remove('above'); pop.classList.add('below');
    }
    left = rect.left + (rect.width/2) - (popRect.width/2);
    if(left < 8) left = 8;
    if(left + popRect.width > window.innerWidth - 8) left = window.innerWidth - popRect.width - 8;
    pop.style.left = Math.round(left) + 'px';
    pop.style.top = Math.round(top) + 'px';
  };

  // initial placement
  reposition();

  // set aria-describedby for the button so screen readers associate tooltip
  try{ btn.setAttribute('aria-describedby','pgw-tooltip-popover'); }catch(e){}

  // expose expanded state for assistive tech
  try{ btn.setAttribute('aria-expanded','true'); }catch(e){}

  // attach dismissal & reposition handlers
  const onDoc = (e)=>{ if(!pop.contains(e.target) && e.target !== btn) hideTooltip(); };
  const onEsc = (e)=>{ if(e.key === 'Escape') hideTooltip(); };
  const onScrollResize = ()=>{ try{ reposition(); }catch(e){} };
  setTimeout(()=>{
    document.addEventListener('click', onDoc, {capture:true});
    document.addEventListener('touchstart', onDoc, {capture:true});
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', onScrollResize);
    window.addEventListener('scroll', onScrollResize, true);
    pop._cleanup = ()=>{
      document.removeEventListener('click', onDoc, {capture:true});
      document.removeEventListener('touchstart', onDoc, {capture:true});
      document.removeEventListener('keydown', onEsc);
      window.removeEventListener('resize', onScrollResize);
      window.removeEventListener('scroll', onScrollResize, true);
      try{ btn.removeAttribute('aria-describedby'); }catch(e){}
      try{ btn.removeAttribute('aria-expanded'); }catch(e){}
    };
  },0);
}

// Show a small badge in the header when fallbacks are active (useful for dev / debugging)
function showFallbackBadge(){
  try{
    let badge = document.getElementById('pgw-fallback-badge');
    if(!badge){
      badge = document.createElement('div'); badge.id = 'pgw-fallback-badge'; badge.className = 'fallback-badge';
      badge.setAttribute('aria-live','polite');
      const header = document.querySelector('.hero') || document.body;
      header.appendChild(badge);
    }
    const parts = [];
    if(window.__pgw_worker_fallback) parts.push('Worker: blob');
    if(window.__pgw_wordlist_fallback) parts.push('Wordlist: embebida');
    if(parts.length===0){ badge.style.display = 'none'; return; }
    badge.style.display = 'inline-flex'; badge.textContent = 'Fallback activo — ' + parts.join(' | ');
  }catch(e){console.warn('No se pudo mostrar badge de fallback', e);} 
}

function hideTooltip(){ const pop = document.getElementById('pgw-tooltip-popover'); if(!pop) return; pop.setAttribute('hidden',''); if(pop._cleanup) try{ pop._cleanup(); }catch(e){} }

// Initialize info button behavior: on touch/click show JS popover, on mouse hover fallback to CSS tooltip
function initInfoButtons(){
  const buttons = Array.from(document.querySelectorAll('.info-btn'));
  if(buttons.length === 0) return;
  buttons.forEach(btn=>{
    // on click/tap show popover (good for touch)
    btn.addEventListener('click', (e)=>{
      e.stopPropagation(); e.preventDefault();
      const pop = document.getElementById('pgw-tooltip-popover');
      if(pop && !pop.hasAttribute('hidden') && pop._currentBtn === btn){ hideTooltip(); pop._currentBtn = null; return; }
      hideTooltip(); showTooltipForBtn(btn); const popEl = document.getElementById('pgw-tooltip-popover'); if(popEl) popEl._currentBtn = btn;
    });
    // keyboard focus shows popover
    btn.addEventListener('focus', ()=>{ showTooltipForBtn(btn); const popEl = document.getElementById('pgw-tooltip-popover'); if(popEl) popEl._currentBtn = btn; });
    btn.addEventListener('blur', ()=>{ hideTooltip(); });
  });
}

// Auto-init info buttons on DOMContentLoaded
// Initialize UI affordances on DOMContentLoaded
document.addEventListener('DOMContentLoaded', ()=>{
  try{ initInfoButtons(); }catch(e){console.error('initInfoButtons', e);} 
  try{ initTheme(); }catch(e){console.error('initTheme', e);} 
  try{ // show badge if any fallbacks are active (set by worker/wordlist init)
    if(window.__pgw_worker_fallback || window.__pgw_wordlist_fallback) showFallbackBadge();
  }catch(e){}
  try{
    const t = document.getElementById('themeToggle');
    if(t) t.addEventListener('click', ()=>{
      try{
        const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = cur === 'light' ? 'dark' : 'light';
        setTheme(next);
        showToast(`Tema: ${next}`, 'info', 1600);
      }catch(e){ console.error('theme toggle failed', e); }
    });
  }catch(e){ console.error('wire themeToggle failed', e); }
});

// Theme helpers: persist theme to localStorage and update the toggle icon
function setTheme(theme){
  try{ document.documentElement.setAttribute('data-theme', theme); }catch(e){}
  try{ localStorage.setItem('pgw_theme', theme); }catch(e){}
  try{ updateThemeToggleIcon(theme); }catch(e){}
}
function updateThemeToggleIcon(theme){
  try{
    const btn = el('themeToggle');
    if(!btn) return;
    btn.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    // Use feather icons; replace markup and re-run feather.replace()
    btn.innerHTML = (theme === 'light') ? '<i data-feather="sun" aria-hidden="true"></i> Tema' : '<i data-feather="moon" aria-hidden="true"></i> Tema';
    if(window.feather) try{ window.feather.replace(); }catch(e){}
  }catch(e){ console.error('updateThemeToggleIcon failed', e); }
}
function initTheme(){
  try{
    const stored = localStorage.getItem('pgw_theme');
    const prefersLight = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
    const theme = stored || (prefersLight ? 'light' : 'dark');
    setTheme(theme);
  }catch(e){ console.error('initTheme failed', e); }
}

// Privacy banner: show unless dismissed
document.addEventListener('DOMContentLoaded', ()=>{
  try{
    const banner = el('privacyBanner');
    const dismiss = el('privacyDismiss');
    if(!banner) return;
    const dismissed = (localStorage && localStorage.getItem && localStorage.getItem('pgw_privacy_dismissed') === '1');
    if(!dismissed){ banner.style.display = 'flex'; }
    if(dismiss){ dismiss.addEventListener('click', ()=>{
      try{ localStorage.setItem('pgw_privacy_dismissed','1'); }catch(e){}
      try{ banner.style.display = 'none'; }catch(e){}
      showToast('Aviso de privacidad descartado', 'info', 2500);
    }); }
  }catch(e){ console.error('privacy banner init failed', e); }
});

// Wire overlay cancel button to abort long-running worker operations
document.addEventListener('DOMContentLoaded', ()=>{
  try{
    const ovCancel = el('overlayCancel');
    if(ovCancel){
      ovCancel.addEventListener('click', async ()=>{
        try{
          // Ask for confirmation using accessible confirm modal
          const ok = await showConfirmModal('¿Cancelar la operación en curso? Esto abortará la operación criptográfica actual.');
          if(ok){
            // Indicate aborting state immediately in the UI
            try{ ovCancel.disabled = true; ovCancel.textContent = 'Abortando...'; ovCancel.classList.add('loading'); }catch(e){}
            // metrics
            try{ window.__pgw_metrics.cancels = (window.__pgw_metrics.cancels||0) + 1; console.log('PGW metrics (cancels):', window.__pgw_metrics.cancels); }catch(e){}
            cancelWorkerOperations();
            hideBlockingOverlay();
            setBlockingProgress(0);
            try{ ovCancel.classList.remove('loading'); ovCancel.disabled = false; ovCancel.textContent = 'Cancelar'; }catch(e){}
          } else {
            // user changed mind — leave overlay visible
            showToast('Continuando operación...', 'info', 1600);
          }
        }catch(e){ console.error('cancel overlay', e); }
      });
    }
  }catch(e){ console.error('error wiring overlayCancel', e); }
});

// Blocking overlay controls for long operations
function showBlockingOverlay(message){
  const ov = el('blockingOverlay');
  const msg = el('overlayMessage');
  if(!ov) return;
  if(msg) msg.textContent = message || 'Procesando...';
  // reset progress
  setBlockingProgress(0);
  ov.style.display = 'flex';
}
function hideBlockingOverlay(){
  const ov = el('blockingOverlay');
  if(!ov) return;
  ov.style.display = 'none';
}

function setBlockingProgress(pct){
  try{
    const bar = el('overlayProgressBar');
    const pctLbl = el('overlayProgressPct');
    if(bar) bar.style.width = Math.max(0,Math.min(100,pct)) + '%';
    if(pctLbl) pctLbl.textContent = (Math.round(pct) + '%');
  }catch(e){}
}
