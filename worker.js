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
      // data: {password, salt, iterations, length}
      const enc = new TextEncoder();
      const passKey = await crypto.subtle.importKey('raw', enc.encode(data.password), {name:'PBKDF2'}, false, ['deriveBits']);
      const params = {name:'PBKDF2', salt: enc.encode(data.salt || ''), iterations: data.iterations || 100000, hash:'SHA-256'};
      const bits = await crypto.subtle.deriveBits(params, passKey, (data.length||32)*8);
      const out = new Uint8Array(bits);
      self.postMessage({id, ok:true, result: out.buffer}, [out.buffer]);
      return;
    }

    throw new Error('unknown action');
  }catch(err){
    self.postMessage({id, ok:false, error:err.message || String(err)});
  }
});
