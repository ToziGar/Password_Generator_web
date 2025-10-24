// Generador y evaluador de contraseñas (todo en español)
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

// Opciones
const SYMBOLS = "!@#$%^&*()_+[]{}<>?,.;:-=_~";
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
// Para frases usamos un pool aproximado (simulamos lista de palabras)
const WORD_POOL = 2048; // tamaño típico usado en listas de palabras

function updateUI(){
  lengthVal.textContent = lengthEl.value;
  wordsVal.textContent = words.value;
  el('words').disabled = !passphrase.checked;
  el('wordsLabel').style.opacity = passphrase.checked ? '1' : '0.6';
}

function generatePassword(){
  if(passphrase.checked){
    // Generar frase simple: combinamos palabras ficticias
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
    // Entropía aproximada: palabras * log2(word_pool)
    return opts.words * Math.log2(WORD_POOL);
  }
  let poolSize = 0;
  if(opts.lower) poolSize += 26;
  if(opts.upper) poolSize += 26;
  if(opts.numbers) poolSize += 10;
  if(opts.symbols) poolSize += SYMBOLS.length;
  if(poolSize <= 0) poolSize = 26;
  return Math.log2(Math.pow(poolSize, opts.length));
}

function evaluateStrength(entropy){
  if(entropy < 28) return {label:'Débil','colorPct':20};
  if(entropy < 36) return {label:'Aceptable','colorPct':40};
  if(entropy < 60) return {label:'Buena','colorPct':65};
  if(entropy < 128) return {label:'Muy fuerte','colorPct':85};
  return {label:'Prácticamente imposible','colorPct':100};
}

function estimateCrackTime(entropy){
  // Usamos una tasa de 10^10 intentos por segundo (alta: ataques offline GPU clusters)
  const rate = 1e10;
  // log10(seconds) = entropy*log10(2) - log10(rate)
  const log10sec = entropy * Math.LOG10E * Math.log(2) - Math.log10(rate);
  if(!isFinite(log10sec)) return {label:'Demasiado grande',seconds:Infinity};

  const seconds = Math.pow(10, log10sec);
  return {label:formatDuration(seconds), seconds};
}

function formatDuration(seconds){
  if(!isFinite(seconds)) return 'Infinito';
  const mins = seconds/60;
  const hours = mins/60;
  const days = hours/24;
  const years = days/365.25;
  if(seconds < 1) return `${Math.round(seconds*1000)} ms`;
  if(seconds < 60) return `${Math.round(seconds)} s`;
  if(minutesLessThan(hours,1)) return `${Math.round(minutesLessThan(seconds/60, 60))} min`;
  if(hours < 24) return `${Math.round(hours)} h`;
  if(days < 365) return `${Math.round(days)} d`;
  if(years < 1000) return `${Math.round(years)} años`;
  if(years < 1e6) return `${(years/1000).toFixed(2)} mil años`;
  if(years < 1e9) return `${(years/1e6).toFixed(2)} millones de años`;
  if(years < 1e18) return `${(years/1e9).toFixed(2)} mil millones de años`;
  return 'Prácticamente imposible';
}

function minutesLessThan(v, limit){ return v < limit ? v : limit }

function funnyFor(seconds){
  if(!isFinite(seconds)) return '¡Imposible! Tendrías que enseñar generación de contraseñas a tus tataranietos y a una civilización de hace millones de años.';
  const years = seconds/60/60/24/365.25;
  if(years > 1e9) return '¡Olvídalo! Mejor dedícate a aprender un instrumento; la contraseña vivirá más que tú.';
  if(years > 1e6) return 'Se tardaría tanto que podrías escribir una novela completa mientras tanto.';
  if(years > 1000) return 'Solo descifrable por arqueólogos del futuro con mucho tiempo libre.';
  if(years > 100) return 'Muy resistente — incluso tus nietos lo agradecerán.';
  if(years > 1) return 'Bastante robusta: un buen equilibrio entre seguridad y usabilidad.';
  return 'Precaución: fácil de atacar en poco tiempo. Considere aumentar longitud o variedad de caracteres.';
}

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

  const pw = generatePassword();
  passwordOut.value = pw;

  const entropy = calculateEntropy(pw, opts);
  const entRounded = Math.round(entropy);
  entropyLabel.textContent = `Entropía: ${entRounded} bits`;

  const strength = evaluateStrength(entropy);
  strengthLabel.textContent = `Fuerza: ${strength.label}`;
  meterBar.style.width = `${strength.colorPct}%`;

  const crack = estimateCrackTime(entropy);
  crackTimeEl.textContent = crack.label;
  funnyEl.textContent = funnyFor(crack.seconds);
}

// Eventos
lengthEl.addEventListener('input', updateUI);
words.addEventListener('input', updateUI);
passphrase.addEventListener('change', updateUI);
generateBtn.addEventListener('click', ()=>{ render(); });
regenerateBtn.addEventListener('click', ()=>{ render(); });
copyBtn.addEventListener('click', ()=>{
  navigator.clipboard.writeText(passwordOut.value).then(()=>{
    copyBtn.textContent = '¡Copiado!';
    setTimeout(()=>copyBtn.textContent = 'Copiar',1200);
  });
});

// Inicializar
updateUI(); render();
