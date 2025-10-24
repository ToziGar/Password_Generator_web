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
  if(!isFinite(seconds)) return randomFrom(IMPOSSIBLE_PHRASES);
  const years = seconds/60/60/24/365.25;
  if(years > 1e9) return randomFrom(IMPOSSIBLE_PHRASES);
  if(years > 1e6) return 'Se tardaría tanto que podrías escribir una novela completa mientras tanto.';
  if(years > 1000) return 'Solo descifrable por arqueólogos del futuro con mucho tiempo libre.';
  if(years > 100) return randomFrom(FUNNY_PHRASES);
  if(years > 1) return 'Bastante robusta: un buen equilibrio entre seguridad y usabilidad.';
  return randomFrom(FUNNY_PHRASES.concat(['Precaución: fácil de atacar en poco tiempo. Considera aumentar longitud o variedad de caracteres.']));
}

function randomFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

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
  // Mostrar frase con animación aleatoria
  const phrase = funnyFor(crack.seconds);
  showFunnyPhrase(phrase);

  // Si la contraseña es extremadamente fuerte, lanzamos confetti
  if(entropy >= 128){
    launchConfetti();
  }
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
