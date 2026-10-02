import assert from 'node:assert/strict';
import {openBrowser} from './qa-browser.js';

const browser=await openBrowser({port:9740,label:'context-recovery'}),{evaluate,until,click,set,navigate}=browser;
try{
  await navigate('',"document.documentElement.dataset.experienceReady==='true'");
  await evaluate("document.getElementById('playground').scrollIntoView({behavior:'instant'})");await until("document.getElementById('playground').dataset.ready==='true'");
  await evaluate(`(async()=>{const {Sculpture}=await import('./experience-scene.js'),original=Sculpture.prototype.setComparisonFrame;window.qaScenes={};Sculpture.prototype.setComparisonFrame=function(frame){window.qaScenes[this.canvas.id]=this;return original.call(this,frame);};})()`);
  await click('[data-lab-mode=compare]');await click('#lab-share-button');
  await evaluate("window.qaMain=window.qaScenes['playground-canvas'];window.qaContext=window.qaMain.renderer.getContext().getExtension('WEBGL_lose_context');window.qaContext.loseContext()");await until('window.qaMain.contextLost===true');
  assert.equal(await evaluate("document.getElementById('lab-save').disabled"),true);
  await set('#config-width',31,'input');await until('window.qaMain.model.params.width===31');
  const expected=await evaluate("Math.round(window.qaMain.model.mass).toLocaleString('en-US')");
  assert.match(await evaluate("document.querySelector('[data-comparison=mass]').cells[2].textContent"),new RegExp(expected),'Comparison quantities update while graphics are unavailable');
  assert.equal(await evaluate("new URL(document.getElementById('lab-share-url').value).searchParams.get('width')"),'31');
  await click('#compare-pin');assert.equal(await evaluate("window.qaScenes['reference-canvas'].model.params.width"),31);
  await set('#config-length',40,'input');await until('window.qaMain.model.params.length===40');
  await evaluate('window.qaContext.restoreContext()');await until('window.qaMain.contextLost===false');
  await until("document.getElementById('lab-save').disabled===false");
  assert.equal(await evaluate(`(async()=>{const {comparisonFrame}=await import('./lab-model.js'),frame=comparisonFrame(window.qaScenes['reference-canvas'].model.params,window.qaMain.model.params);return Math.abs(window.qaMain.structure.scale.x-frame.scale)<1e-9&&Math.abs(window.qaMain.comparisonRadius-frame.radius)<1e-9;})()`),true,'Recovered camera shares the latest comparison frame');
  await until('window.qaMain.dirty===false');
  assert.ok(await evaluate("(()=>{const copy=document.createElement('canvas');copy.width=100;copy.height=100;const context=copy.getContext('2d');context.drawImage(window.qaMain.canvas,0,0,100,100);const pixels=context.getImageData(0,0,100,100).data;let visible=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)visible++;return visible;})()")>20,'Recovered renderer draws visible geometry');
  await click('[data-lab-mode=explore]');assert.equal(await evaluate("document.querySelectorAll('#reference-canvas').length"),0);
  assert.deepEqual(browser.errors,[]);console.log('PASS: real software-WebGL context loss, editable comparison data, updated share link, reference pinning and matching views after restoration.');
}finally{await browser.close();}
