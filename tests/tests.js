 (async function(){
  const resultsEl = document.getElementById('results');
  function report(name, ok, info){
    const div = document.createElement('div'); div.className = 'test';
    const h = document.createElement('div'); h.textContent = name + ': ' + (ok ? 'OK' : 'FAIL'); h.className = ok ? 'ok' : 'fail';
    div.appendChild(h);
    if(info){ const pre = document.createElement('pre'); pre.textContent = info; div.appendChild(pre); }
    resultsEl.appendChild(div);
  }

  function approxEqual(a,b,tol=1e-6){ return Math.abs(a-b) <= tol; }

  // Synchronous tests
  try{
    const e1 = calculateEntropy('', {passphrase:false, length:8, lower:true, upper:false, numbers:false, symbols:false});
    const expected1 = 8 * Math.log2(26);
    report('calculateEntropy: lowercase 8 chars', approxEqual(e1, expected1, 1e-4), `got=${e1.toFixed(4)}, expected=${expected1.toFixed(4)}`);
  }catch(e){ report('calculateEntropy: lowercase 8 chars', false, e.stack || e.message); }

  try{
    const a1 = analyzePassword('password');
    report('analyzePassword: common password', a1.entropy <= 12, JSON.stringify(a1));
  }catch(e){ report('analyzePassword: common password', false, e.stack || e.message); }

  try{
    const pass = 'alpha bravo charlie delta';
    const a2 = analyzePassword(pass);
    report('analyzePassword: passphrase-like', a2.entropy > 0, JSON.stringify(a2));
  }catch(e){ report('analyzePassword: passphrase-like', false, e.stack || e.message); }

  try{
    const bits = 40;
    const r1 = estimateCrackTime(bits, 1e10);
    const r2 = estimateCrackTime(bits+1, 1e10);
    report('estimateCrackTime: monotonic with entropy', r2.seconds > r1.seconds, `${r1.label} vs ${r2.label}`);
  }catch(e){ report('estimateCrackTime: monotonic with entropy', false, e.stack || e.message); }

  try{
    const z = estimateCrackTime(0, 1e6);
    report('estimateCrackTime: zero entropy', z.seconds <= 1, JSON.stringify(z));
  }catch(e){ report('estimateCrackTime: zero entropy', false, e.stack || e.message); }

  // Asynchronous tests
  try{
    const a = await deterministicBytes('test-seed-42', 32);
    const b = await deterministicBytes('test-seed-42', 32);
    const same = a.length === b.length && a.every((v,i)=>v===b[i]);
    report('deterministicBytes: reproducible', same, same ? 'buffers equal' : 'buffers differ');
  }catch(e){ report('deterministicBytes: reproducible', false, e.stack || e.message); }

  try{
    const sample = { createdAt: new Date().toISOString(), password: 'sample-pass', options: { length:12, lower:true } };
    const master = 'test-master-123';
    const enc = await encryptBackupObject(sample, master, 1024);
    const dec = await decryptBackupObject(enc, master);
    const ok = dec && dec.password === sample.password && dec.options && dec.options.length === sample.options.length;
    report('encrypt/decrypt roundtrip', ok, ok ? 'roundtrip OK' : JSON.stringify({enc,dec}));
  }catch(e){ report('encrypt/decrypt roundtrip', false, e.stack || e.message); }

  // Summary
  try{
    const tests = resultsEl.querySelectorAll('.test'); let okCount = 0; for(const t of tests){ if(t.querySelector('.ok')) okCount++; }
    const sum = document.createElement('div'); sum.style.marginTop='18px'; sum.textContent = `Passed ${okCount} / ${tests.length}`; resultsEl.appendChild(sum);
  }catch(e){ console.error('tests summary failed', e); }

})();