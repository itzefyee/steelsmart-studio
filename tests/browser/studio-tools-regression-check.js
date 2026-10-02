import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const delay=ms=>new Promise(r=>setTimeout(r,ms)),folder=resolve('artifacts/studio-tools'),port=9690;
await mkdir(folder,{recursive:true});
const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader','--no-first-run','--no-default-browser-check','--remote-debugging-port='+port,'--user-data-dir='+resolve('../.steelsmart-regression-'+process.pid),'about:blank'],{windowsHide:true,stdio:'ignore'});
let socket,send;try{
  let targets;for(let i=0;i<80;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json`,{signal:AbortSignal.timeout(1500)})).json();break;}catch{await delay(200);}}assert.ok(targets,'Browser starts');socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});let id=0;const pending=new Map(),errors=[];
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(m.error):p?.resolve(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);};
  send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id,t=setTimeout(()=>reject(new Error(method+' timeout')),20000);pending.set(n,{resolve:v=>{clearTimeout(t);resolve(v);},reject:e=>{clearTimeout(t);reject(e);}});socket.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw new Error('Timed out: '+expression);};
  const shot=async name=>{if(process.env.CAPTURE!=='1')return;const r=await send('Page.captureScreenshot',{format:'png'});await writeFile(folder+'/'+name+'.png',Buffer.from(r.data,'base64'));};
  const metrics=(width,height,mobile=false)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const scroll=async expression=>{await evaluate(expression);await delay(450);};
  const pixels=id=>evaluate(`(()=>{const c=document.createElement('canvas');c.width=100;c.height=100;const ctx=c.getContext('2d');ctx.drawImage(document.getElementById('${id}'),0,0,100,100);const d=ctx.getImageData(0,0,100,100).data;let count=0;for(let i=3;i<d.length;i+=4)if(d[i]>0)count++;return count})()`);
  await send('Page.enable');await send('Runtime.enable');await metrics(1512,1100);await send('Page.navigate',{url:'http://localhost:4310/studio.html'});await until("document.documentElement?.dataset.ready==='true'");
  await evaluate("(async()=>{const {SteelViewport}=await import('./scene.js');const original=SteelViewport.prototype.selectMember;SteelViewport.prototype.selectMember=function(id){window.view=this;return original.call(this,id);};})()");
  const set=async(id,value)=>evaluate(`(()=>{const field=document.getElementById('${id}');field.value=${JSON.stringify(value)};field.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const failures=[];const check=async(name,run)=>{try{await run();console.log('PASS: '+name);}catch(error){failures.push(name+': '+error.message);console.log('FAIL: '+name+': '+error.message);}};
  await check('isolation reconciles a missing family after template changes',async()=>{
    await set('member-family','rafter');await click('[data-member-id=R003]');await click('#member-isolate');await set('template','canopy');assert.ok(await evaluate('window.view.group.children.some(g=>g.visible&&g.userData.member)'),'New template remains visible');assert.equal(await evaluate("document.getElementById('member-family').value"),'');
  });
  await check('cleared selection no longer colors a previously selected member',async()=>{
    await click('[data-preset=portal]');await evaluate('window.view.setIsolation(null)');await set('member-family','rafter');await click('[data-member-id=R003]');await click('#member-isolate');await set('member-family','column');await click('#member-isolate');assert.equal(await evaluate('window.view.selected'),null);assert.equal(await evaluate("window.view.pickables.filter(m=>m.userData.member.id==='R003').some(m=>m.material===window.view.selectedMaterial)"),false);
  });
  await check('restored front camera also selects its named view button',async()=>{
    await click('[data-view=front]');await click('#mode-review');await evaluate("document.getElementById('review-note').value='Front elevation review'");await click('#save-review');await click('[data-view=top]');await click('[data-restore-mark]');assert.equal(await evaluate("document.querySelector('[data-view=front]').getAttribute('aria-pressed')"),'true');
  });
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);console.log('PASS: final studio regression checks.');
}finally{if(send)try{await send('Browser.close');}catch{}socket?.close();browser.kill();browser.unref();}
