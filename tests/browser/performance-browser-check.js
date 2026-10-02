import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser,delay} from './qa-browser.js';

const browser=await openBrowser(),{send,evaluate,until,click,set,navigate}=browser,baseline=process.env.BASELINE==='1',results={},failures=[];
const check=(name,actual,expected)=>{results[name]=actual;try{assert.equal(actual,expected,name);}catch(error){failures.push(error.message);}};
try{
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.qaFrames=0;const raf=requestAnimationFrame;window.requestAnimationFrame=callback=>raf(time=>{window.qaFrames++;callback(time);});`});
  await navigate('studio.html',"document.documentElement.dataset.ready==='true'");await delay(300);
  await evaluate(`(async()=>{const {SteelViewport}=await import('./scene.js');const {MaterialPanel}=await import('./studio-material-panel.js');window.qa={updates:0,writes:0,layouts:0,times:[]};const update=SteelViewport.prototype.update;SteelViewport.prototype.update=function(model){const start=performance.now();window.qaView=this;window.qa.updates++;const result=update.call(this,model);window.qa.times.push(performance.now()-start);return result;};const position=SteelViewport.prototype.positionCamera;SteelViewport.prototype.positionCamera=function(){window.qaView=this;return position.call(this);};const layout=MaterialPanel.prototype.renderPlan;MaterialPanel.prototype.renderPlan=function(){window.qa.layouts++;return layout.call(this);};const write=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){window.qa.writes++;return write.apply(this,args);};})()`);
  await click('#fit');await evaluate('document.fonts.ready');if(!baseline)await until('window.qaView.frame===null&&!window.qaView.dirty');
  results.initialGeometries=await evaluate('window.qaView.renderer.info.memory.geometries');
  await evaluate('window.qaFrames=0');await delay(500);check('idleFrameCallbacks',await evaluate('window.qaFrames'),0);
  results.sliderBurstHandlerMs=await evaluate(`(()=>{const start=performance.now(),field=document.getElementById('width');for(let i=0;i<24;i++){field.value=12+i;field.dispatchEvent(new Event('input',{bubbles:true}));}return performance.now()-start})()`);
  await delay(300);results.sliderGeometryMs=await evaluate('window.qa.times.reduce((sum,n)=>sum+n,0)');
  check('sliderRebuilds',await evaluate('window.qa.updates'),1);check('hiddenMaterialLayouts',await evaluate('window.qa.layouts'),0);
  results.sliderStorageWrites=await evaluate('window.qa.writes');
  await evaluate("document.getElementById('width').dispatchEvent(new Event('change',{bubbles:true}))");
  check('finalWidth',await evaluate('window.qaView.model.params.width'),35);
  await click('#undo');check('undoWidth',await evaluate('window.qaView.model.params.width'),18);
  await evaluate("document.getElementById('prompt').value='A warehouse 30m wide and 48m long';document.getElementById('prompt-form').requestSubmit();document.getElementById('new-design').click()");await delay(600);
  check('latestResetWins',await evaluate("document.getElementById('width').value"),'18');
  await click('#new-design');await click('#mode-materials');
  check('lazyMaterialsReady',await evaluate("document.querySelectorAll('[data-cut-member]').length>0"),true);
  await click('#mode-inspect');await set('#height-number',8);await click('#mode-materials');
  check('lazyMaterialsFresh',await evaluate("document.querySelector('[data-cut-member=C001]').getAttribute('aria-label').includes('8 metres')"),true);
  await click('#mode-inspect');await click('#new-design');if(!baseline)await until('window.qaView.frame===null&&!window.qaView.dirty');
  results.geometryCount=await evaluate('window.qaView.renderer.info.memory.geometries');check('pooledGeometry',results.geometryCount<80,true);
  await click('[data-view=front]');await evaluate("document.getElementById('viewport').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))");
  check('orbitClearsNamedView',await evaluate("document.querySelectorAll('[data-view][aria-pressed=true]').length"),0);
  await evaluate(`(()=>{const canvas=document.getElementById('scene');canvas.setPointerCapture=()=>{};window.qaPointer=(type,id,x)=>canvas.dispatchEvent(new PointerEvent(type,{pointerId:id,clientX:x,clientY:200,button:0,pointerType:'mouse',bubbles:true}));window.qaPointer('pointerdown',1,100);window.qaStartYaw=window.qaView.yaw;window.qaPointer('pointerdown',2,400);window.qaPointer('pointermove',2,450);})()`);
  check('secondPointerIgnored',await evaluate('window.qaView.yaw===window.qaStartYaw'),true);
  await evaluate("window.dispatchEvent(new Event('blur'));window.qaStartYaw=window.qaView.yaw;window.qaPointer('pointermove',1,500)");
  check('blurEndsDrag',await evaluate('window.qaView.yaw===window.qaStartYaw'),true);
  await evaluate("window.qaPointer('pointerup',1,500);window.qaPointer('pointerdown',3,100);window.qaPointer('pointermove',3,130);window.qaPointer('pointerup',3,130)");
  check('dragRecovers',await evaluate('window.qaView.yaw!==window.qaStartYaw'),true);
  await click('#rotate');await evaluate("document.querySelector('.workspace').hidden=true");if(!baseline)await until('window.qaView.active===false&&window.qaView.frame===null');else await delay(300);const yaw=await evaluate('window.qaView.yaw');await evaluate('window.qaFrames=0');await delay(350);
  check('offscreenAutoPaused',await evaluate('window.qaView.yaw'),yaw);check('offscreenFrameCallbacks',await evaluate('window.qaFrames'),0);
  await evaluate("document.querySelector('.workspace').hidden=false");await delay(250);check('visibleAutoResumes',await evaluate('window.qaView.yaw!=='+yaw),true);await click('#rotate');
  if(process.env.CAPTURE==='1'){await click('[data-view=perspective]');await evaluate("window.scrollTo(0,0);document.getElementById('toast').hidden=true");await delay(200);await browser.screenshot('studio-desktop');await browser.metrics(390,844,true);await delay(150);await browser.screenshot('studio-mobile');}
  await browser.metrics();
  await navigate('',"document.documentElement.dataset.experienceReady==='true'");await evaluate("document.getElementById('playground').scrollIntoView({behavior:'instant'})");await until("document.getElementById('playground').dataset.ready==='true'");
  await evaluate(`(async()=>{const {Sculpture}=await import('./experience-scene.js');const build=Sculpture.prototype.buildStructure;window.qaBuilds=0;Sculpture.prototype.buildStructure=function(params){window.qaBuilds++;window.qaSculpture=this;return build.call(this,params);};const section=Sculpture.prototype.setSection;Sculpture.prototype.setSection=function(...args){window.qaSculpture=this;return section.apply(this,args);};})()`);
  results.playgroundBurstHandlerMs=await evaluate("(()=>{const start=performance.now(),field=document.getElementById('config-width');for(let i=0;i<24;i++){field.value=12+i;field.dispatchEvent(new Event('input',{bubbles:true}));}return performance.now()-start})()");await until('window.qaBuilds>0');
  check('playgroundRebuilds',await evaluate('window.qaBuilds'),1);
  await click('[data-lab-mode=section]');await evaluate('window.qaSectionGeometry=window.qaSculpture.sectionVisual.children[0].geometry');
  await set('#section-position',35,'input');check('sectionReusesGeometry',await evaluate('window.qaSectionGeometry===window.qaSculpture.sectionVisual.children[0].geometry'),true);
  if(process.env.CAPTURE==='1'){await click('[data-lab-mode=explore]');await browser.screenshot('playground-desktop');await browser.metrics(390,844,true);await delay(150);await browser.screenshot('playground-mobile');}
  const response=await fetch('http://localhost:4310/vendor/three.module.js',{headers:{'Accept-Encoding':'br, gzip'}});results.assetEncoding=response.headers.get('content-encoding');results.assetTransferredBytes=Number(response.headers.get('content-length'));results.assetSourceBytes=(await response.arrayBuffer()).byteLength;
  if(!baseline)check('compressedAsset',Boolean(results.assetEncoding),true);
  results.errors=browser.errors;results.failures=failures;
  await mkdir('artifacts/performance',{recursive:true});await writeFile('artifacts/performance/'+(baseline?'before':'after')+'.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  if(!baseline){assert.deepEqual(browser.errors,[]);assert.deepEqual(failures,[]);console.log('PASS: performance and interaction regressions.');}
}finally{await browser.close();}
