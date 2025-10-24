// Worker for crypto-heavy operations: sha1, drbg (HMAC-DRBG using HMAC-SHA256), pbkdf2
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
      // data: {seed: string, length: number}
      // We'll implement a lightweight HMAC-DRBG: key = HMAC(seed, 0x00) style
      const enc = new TextEncoder();
      const seedBytes = enc.encode(data.seed || '');
      // initial key material: SHA-256(seed)
      const seedHash = await crypto.subtle.digest('SHA-256', seedBytes);
      const keyRaw = new Uint8Array(seedHash);
      // import key for HMAC-SHA256
      const key = await crypto.subtle.importKey('raw', keyRaw, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
      const out = new Uint8Array(data.length || 64);
      let counter = 0;
      let filled = 0;
      while(filled < out.length){
        // generate block: HMAC(key, counter || seed)
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
      // data: {password, salt, iterations, length, reportProgress}
      // If reportProgress is truthy, perform a JS implementation of PBKDF2 with HMAC-SHA256
      // so we can emit progress messages. Otherwise use SubtleCrypto deriveBits for speed.
      const enc = new TextEncoder();
      const passwordBytes = enc.encode(data.password || '');
      const saltBytes = enc.encode(data.salt || '');
      const iterations = Number(data.iterations) || 100000;
      const dkLen = Number(data.length) || 32; // bytes

      if(!data.reportProgress){
        try{
          const passKey = await crypto.subtle.importKey('raw', passwordBytes, {name:'PBKDF2'}, false, ['deriveBits']);
          const params = {name:'PBKDF2', salt: saltBytes, iterations: iterations, hash:'SHA-256'};
          const bits = await crypto.subtle.deriveBits(params, passKey, dkLen*8);
          const out = new Uint8Array(bits);
          self.postMessage({id, ok:true, result: out.buffer}, [out.buffer]);
          return;
        }catch(e){ /* fallback to JS implementation below */ }
      }

      // JS PBKDF2 implementation with HMAC-SHA256 (progress-capable)
      // Import HMAC key
      const hmacKey = await crypto.subtle.importKey('raw', passwordBytes, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
      const hLen = 32; // HMAC-SHA256 output size in bytes
      const l = Math.ceil(dkLen / hLen);
      const r = dkLen - (l-1)*hLen;
      const derived = new Uint8Array(dkLen);

      // progress reporting parameters
      const totalIterations = iterations * l;
      let completedIterations = 0;
      const updateEvery = Math.max(1, Math.floor(iterations / 50)); // ~50 updates per block

      for(let i=1;i<=l;i++){
        // U1 = HMAC(P, S || INT(i))
        const intBuf = new Uint8Array(4);
        intBuf[0] = (i >>> 24) & 0xFF;
        intBuf[1] = (i >>> 16) & 0xFF;
        intBuf[2] = (i >>> 8) & 0xFF;
        intBuf[3] = (i) & 0xFF;
        const msg1 = new Uint8Array(saltBytes.length + 4);
        msg1.set(saltBytes,0); msg1.set(intBuf, saltBytes.length);

        let u = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, msg1));
        let t = new Uint8Array(u); // initial block
        completedIterations++;
        if((completedIterations % updateEvery) === 0){
          const pct = Math.floor((completedIterations / totalIterations) * 100);
          self.postMessage({id, progress:true, percent: pct, completed: completedIterations, total: totalIterations});
        }
        for(let j=2;j<=iterations;j++){
          u = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, u));
          // XOR into T
          for(let k=0;k<u.length;k++) t[k] ^= u[k];
          completedIterations++;
          if((completedIterations % updateEvery) === 0){
            const pct = Math.floor((completedIterations / totalIterations) * 100);
            self.postMessage({id, progress:true, percent: pct, completed: completedIterations, total: totalIterations});
          }
        }
        // copy t into derived
        const offset = (i-1)*hLen;
        const take = (i === l) ? r : hLen;
        derived.set(t.slice(0,take), offset);
      }

      // final progress 100%
      self.postMessage({id, progress:true, percent:100, completed: totalIterations, total: totalIterations});
      self.postMessage({id, ok:true, result: derived.buffer}, [derived.buffer]);
      return;
    }

    throw new Error('unknown action');
  }catch(err){
    self.postMessage({id, ok:false, error:err.message || String(err)});
  }
});
