import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {openBrowser,delay} from './qa-browser.js';

const browser=await openBrowser({port:9720,label:'reliability'}),{send,evaluate,until,click,set,navigate,trustedClick}=browser,coverage=new Set(),failures=[];
const press=async selector=>{await trustedClick(selector);coverage.add(selector);};
const key=async(key,code=key,modifiers=0)=>{const windowsVirtualKeyCode={Escape:27,Enter:13,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,End:35,Home:36}[key]||key.toUpperCase().charCodeAt(0);await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers,windowsVirtualKeyCode});await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers,windowsVirtualKeyCode});};
const check=async(name,run)=>{try{await run();console.log('PASS: '+name);}catch(error){failures.push(name+': '+error.message);console.log('FAIL: '+name+': '+error.message);await evaluate("document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close())");}};
try{
  await navigate('studio.html',"document.documentElement.dataset.ready==='true'");
  await evaluate("window.qaExports=[];const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.qaExports.push(blob);return create(blob)}");
  await check('studio navigation, all dialogs and history restoration',async()=>{
    for(const selector of ['#help','#viewport-help','[data-nav=library]','[data-nav=projects]']){await press(selector);assert.equal(await evaluate("document.getElementById('info-dialog').open"),true);await press('#info-dialog .close-dialog');}
    await press('[data-nav=design]');await press('#mode-brief');await press('#engine-info');await key('Escape');
    for(const kind of ['canopy','rack','portal']){await press('[data-preset='+kind+']');assert.equal(await evaluate("document.getElementById('template').value"),kind);}
    await press('#undo');await press('#history button');await press('[data-nav=projects]');await press('.saved-design button');await press('#new-design');
    await set('#prompt','A warehouse 22m wide, 30m long and 7m high');await press('#generate');assert.equal(await evaluate("document.getElementById('width').value"),'22');
    await evaluate("document.getElementById('prompt').value='A canopy 12m wide';for(let i=0;i<8;i++)document.getElementById('prompt-form').requestSubmit();document.querySelector('[data-preset=rack]').click()");await delay(550);assert.equal(await evaluate("document.getElementById('template').value"),'rack');
    await press('#new-design');await set('#prompt','');await press('#generate');assert.equal(await evaluate("document.getElementById('prompt-feedback').classList.contains('error')"),true);
  });
  await check('parameter extremes, pending input, latest exports and keyboard tabs',async()=>{
    for(const [id,value,expected] of [['width',999,36],['length',-1,6],['height','',6],['bays',100,8],['pitch',2,5]]){await set('#'+id+'-number',value);assert.equal(await evaluate("Number(document.getElementById('"+id+"').value)"),expected);}
    await press('#new-design');await set('#width',29,'input');await press('#export-open');await press('[data-export=json]');assert.equal(await evaluate("window.qaExports.at(-1).text().then(text=>JSON.parse(text).params.width)"),29);
    for(const format of ['obj','csv']){await press('#export-open');await press('[data-export='+format+']');}await press('#csv-export');
    for(const tab of ['checks','notes','bom'])await press('#tab-'+tab);await evaluate("document.getElementById('tab-bom').focus()");await key('ArrowRight');assert.equal(await evaluate("document.activeElement.id"),'tab-checks');await key('End');assert.equal(await evaluate("document.activeElement.id"),'tab-notes');
    await set('#material','S235');await press('#bracing');await press('#bracing');await press('#new-design');
  });
  await check('inspection controls, camera controls and measured member selection',async()=>{
    await press('#mode-inspect');for(const view of ['front','top','perspective'])await press('[data-view='+view+']');
    for(const id of ['wireframe','explode','dimensions','rotate']){await press('#'+id);await press('#'+id);}await press('#fit');
    await set('#member-search','missing-profile','input');assert.match(await evaluate("document.getElementById('member-list').textContent"),/No matching/);await set('#member-search','','input');await set('#member-family','column');
    await press('[data-member-id=C001]');await press('#member-focus');await press('#fit');await press('#member-isolate');await press('#member-isolate');
    for(const id of ['mass-colors','scale-reference']){await press('#'+id);await press('#'+id);}
    await press('.measure-details summary');await set('#measure-to',await evaluate("document.getElementById('measure-to').options[2].value"));await press('#measure-toggle');await press('#measure-toggle');
    await set('#template','canopy');await set('#template','portal');
  });
  await check('material scenarios, every stock preset and cut selection',async()=>{
    await press('#mode-materials');for(const n of [6,9,12,15])await press('[data-stock="'+n+'"]');await press('#show-cut-layouts');await press('.stock-piece[data-cut-member]');
    await evaluate("window.qaFirstStock=document.getElementById('stock-layouts').firstElementChild");await set('#material-rate',3.5);assert.equal(await evaluate("window.qaFirstStock===document.getElementById('stock-layouts').firstElementChild"),true,'Price changes retain the cutting layout');
    for(const currency of ['MYR','EUR','GBP','USD'])await set('#scenario-currency',currency);
    for(const id of ['stock-length','saw-kerf','material-rate','carbon-factor']){const previous=await evaluate("document.getElementById('"+id+"').value");await set('#'+id,'');assert.equal(await evaluate("document.getElementById('stock-export').disabled"),true);await set('#'+id,previous);}
    await press('#stock-export');assert.match(await evaluate('window.qaExports.at(-1).text()'),/ALLOCATED/);
  });
  await check('all alternatives, review marks and portable outputs',async()=>{
    await press('#mode-explore');await press('#challenge-toggle');for(const name of ['frames','height','proportion'])await press('[data-variant='+name+']');await press('#challenge-toggle');
    await press('#mode-review');await press('#save-review');assert.match(await evaluate("document.getElementById('review-feedback').textContent"),/Add a short note/);
    await set('#review-note','Check connection <img src=x onerror=alert(1)>');await press('#save-review');assert.equal(await evaluate("document.querySelector('#review-list img')"),null);await press('[data-restore-mark]');
    await press('#drawing-export');await press('#review-export');await press('#studio-png');await until('window.qaExports.some(blob=>blob.type===\'image/png\')');await press('[data-remove-mark]');
  });
  await check('focus, command search, every command and Escape recovery',async()=>{
    await press('#studio-focus');await key('Escape');assert.equal(await evaluate("document.body.classList.contains('studio-focus')"),false);
    await press('#studio-command-open');assert.equal(await evaluate("document.getElementById('studio-command-dialog').open"),true,'A rapid click after exiting focus opens the palette');await set('#studio-command-search','nothing matches','input');await key('Enter');assert.equal(await evaluate("document.getElementById('studio-command-dialog').open"),true);await press('#command-close');
    const names=['Inspect members','Plan stock cuts','Explore alternatives','Review and drawing sheets','Write a design brief','Fit complete model','Front elevation','Plan view','Perspective view','Color by member mass','Human scale reference','Focus view','Export concept drawing'];
    for(const name of names){await key('k','KeyK',2);await set('#studio-command-search',name,'input');await key('Enter');coverage.add('command: '+name);if(name==='Focus view')await key('Escape');}
    await press('#mode-inspect');await browser.metrics(390,844,true);await press('#mode-materials');await press('#mode-review');await press('#studio-focus');await press('#studio-focus');assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);await browser.metrics();
  });
  await check('showcase controls, chapters, templates, lab modes and valid navigation links',async()=>{
    await navigate('',"document.documentElement.dataset.experienceReady==='true'");await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    for(const id of ['hero-explode','hero-wire']){await press('#'+id);await press('#'+id);}for(const finish of ['signal','graphite','silver'])await press('[data-finish='+finish+']');for(const n of [0,1,2])await press('[data-jump="'+n+'"]');
    await evaluate("document.getElementById('playground').scrollIntoView({behavior:'instant'})");await until("document.getElementById('playground').dataset.ready==='true'");for(const template of ['canopy','rack','portal'])await press('[data-template='+template+']');
    await press('#playground-wire');await press('#playground-wire');await press('[data-lab-mode=assembly]');await press('#assembly-play');await press('#assembly-play');await set('#assembly-progress',100,'input');await press('[data-lab-mode=section]');for(const axis of ['width','length','height'])await set('#section-axis',axis);await set('#section-position',0,'input');await set('#section-position',100,'input');
    for(let i=0;i<3;i++){await press('[data-lab-mode=compare]');await press('#compare-pin');await press('[data-lab-mode=explore]');}assert.equal(await evaluate("document.querySelectorAll('#reference-canvas').length"),0);
    await press('#lab-share-button');await press('#lab-share-url');await browser.metrics(390,844,true);for(const id of ['playground-touch','hero-touch']){await press('#'+id);await press('#'+id);}await press('#back-top');
    const anchors=await evaluate("[...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href'))");for(const href of new Set(anchors)){if(href.startsWith('#')){if(href!=='#')assert.equal(await evaluate('Boolean(document.querySelector('+JSON.stringify(href)+'))'),true,href);}else assert.equal((await fetch(new URL(href,'http://localhost:4310/'))).status,200,href);}
    assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  });
  await check('storage denied remains editable and review marks remain session-local',async()=>{
    await send('Page.addScriptToEvaluateOnNewDocument',{source:"Storage.prototype.getItem=Storage.prototype.setItem=function(){throw new DOMException('Storage denied','SecurityError')};"});
    await navigate('studio.html',"document.documentElement.dataset.ready==='true'");await set('#width-number',25);assert.match(await evaluate("document.getElementById('model-status').textContent"),/Session only/);await press('#mode-review');await set('#review-note','Session-only note');await press('#save-review');assert.match(await evaluate("document.getElementById('review-feedback').textContent"),/session/);
  });
  assert.deepEqual(browser.errors,[]);
}finally{await browser.close();}

const fallback=await openBrowser({port:9721,label:'fallback',noWebGL:true});
try{
  await fallback.navigate('studio.html',"document.documentElement.dataset.ready==='true'");
  const disabled=await fallback.evaluate("['fit','rotate','wireframe','explode','dimensions'].every(id=>document.getElementById(id).disabled)&&[...document.querySelectorAll('[data-view]')].every(button=>button.disabled)");if(!disabled)failures.push('Unavailable WebGL controls must be disabled');
  await fallback.set('#width-number',27);assert.equal(await fallback.evaluate("document.getElementById('width').value"),'27');await fallback.click('#mode-materials');assert.ok(await fallback.evaluate("document.querySelectorAll('[data-cut-member]').length")>0);
  await fallback.navigate('',"document.documentElement.dataset.experienceReady==='true'");if(!await fallback.evaluate("document.getElementById('hero-wire').disabled"))failures.push('Unavailable hero controls must be disabled');
  await fallback.evaluate("document.getElementById('playground').scrollIntoView({behavior:'instant'})");await delay(350);await fallback.click('[data-template=canopy]');assert.match(await fallback.evaluate("document.getElementById('continue-design').href"),/template=canopy/);assert.deepEqual(fallback.errors,[]);
}finally{await fallback.close();}
await mkdir('artifacts/performance',{recursive:true});await writeFile('artifacts/performance/interactions.json',JSON.stringify({covered:[...coverage],count:coverage.size,failures},null,2));
assert.deepEqual(failures,[]);console.log('PASS: '+coverage.size+' controls/actions, rapid actions, keyboard, mobile, storage and WebGL fallback.');
