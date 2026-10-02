import {Sculpture} from './experience-scene.js';
import {normalize} from './model.js';
import {assemblyState,compareDesigns,comparisonFrame,designLink} from './lab-model.js';

const $=id=>document.getElementById(id);
const names={portal:'Portal frame',canopy:'Open canopy',rack:'Storage structure'};
const dimensions=p=>`${p.width} × ${p.length} × ${p.height} m`;
const number=(n,digits=0)=>n.toLocaleString('en-US',{maximumFractionDigits:digits});
const signed=(n,digits=0)=>`${n>0?'+':n<0?'−':''}${number(Math.abs(n),digits)}`;
const icon=path=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
const icons={explore:icon('m12 3 9 5v9l-9 5-9-5V8l9-5ZM3 8l9 5 9-5M12 13v9'),assembly:icon('m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5'),section:icon('M4 4h16v16H4V4ZM8 1v22M1 9h6m3 0h13'),compare:icon('M3 5h7v14H3V5ZM14 5h7v14h-7V5ZM12 2v20'),share:icon('M10 14 14 10M8 16l-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 1 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0'),save:icon('M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5')};

export class DesignLab {
  constructor({getScene,getParams,notify}){
    this.getScene=getScene;this.getParams=getParams;this.notify=notify;
    this.mode='explore';this.progress=.35;this.baseline=null;this.reference=null;this.playing=false;
    this.motion=matchMedia('(prefers-reduced-motion: reduce)');
    this.mount();this.bind();
    this.visibility=new IntersectionObserver(entries=>{if(!entries.at(-1).isIntersecting)this.pause();});
    this.visibility.observe($('playground-canvas-wrap'));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
    this.motion.addEventListener('change',()=>{this.pause();if(this.reference)this.reference.reduced=this.motion.matches;});
  }

  mount(){
    const rail=document.createElement('div');rail.className='lab-rail';
    rail.innerHTML=`<div class="lab-modes" role="group" aria-label="Design exploration mode">${['explore','assembly','section','compare'].map(mode=>`<button data-lab-mode="${mode}" aria-pressed="${mode==='explore'}" aria-controls="lab-${mode}" class="${mode==='explore'?'active':''}" disabled>${icons[mode]}${mode[0].toUpperCase()+mode.slice(1)}</button>`).join('')}</div><div class="lab-actions"><span id="lab-status" class="lab-live-status" role="status"></span><button id="lab-share-button" aria-label="Share design link">${icons.share}<span>Share design</span></button><button id="lab-save" aria-label="Save current view as a PNG study sheet" disabled>${icons.save}<span>Save view</span></button></div>`;
    const controls=document.createElement('div');controls.className='lab-controls';
    controls.innerHTML=`<div id="lab-explore"><p class="lab-idle-hint">${icons.explore}An idea is only the beginning. Assemble it, slice it, or try a different direction.</p></div>
      <div id="lab-assembly" hidden><div class="lab-controls-row"><button id="assembly-play" aria-pressed="false">Play assembly</button><label for="assembly-progress">Sequence <input id="assembly-progress" type="range" min="0" max="100" step="1" value="35"><output id="assembly-percent" for="assembly-progress">35%</output></label><span class="lab-stage-label" id="assembly-stage"></span></div><p class="lab-disclosure">A visual tour of the member graph. The sequence is illustrative, not an erection method.</p></div>
      <div id="lab-section" hidden><div class="lab-controls-row"><label for="section-axis">Cut along <select id="section-axis"><option value="width">Width · X</option><option value="length">Length · Z</option><option value="height">Height · Y</option></select></label><label for="section-position">Position <input id="section-position" type="range" min="0" max="100" value="50"><output id="section-percent" for="section-position">50%</output></label></div><p class="lab-disclosure">Move the plane to look inside. Cut faces are open; this is a visual section of concept geometry.</p></div>
      <div id="lab-compare" hidden><div class="lab-controls-row"><button id="compare-pin">Pin current design as A</button><p>Edit the dimensions to explore B. Your reference stays put.</p><div class="lab-legend"><span><i></i>A · Reference</span><span><i></i>B · Your design</span></div></div></div>`;
    const share=document.createElement('div');share.id='lab-share';share.className='lab-share';share.hidden=true;
    share.innerHTML='<label for="lab-share-url">Your design link · restores the template and every model parameter</label><input id="lab-share-url" readonly aria-label="Shareable design URL" spellcheck="false">';
    const shell=document.querySelector('.playground-shell');shell.before(rail,controls,share);
    $('playground-canvas-wrap').insertAdjacentHTML('beforeend','<div class="assembly-hud" id="assembly-hud" hidden><strong id="assembly-count"></strong><span>members assembled</span></div><div class="section-hud" id="section-hud" hidden></div>');
    const results=document.createElement('div');results.className='lab-compare-results';results.id='compare-results';results.hidden=true;
    results.innerHTML='<div class="comparison-heading"><h3>What changes. What it takes.</h3><span>Same scale. Linked views. Quantities from each model.</span></div><table class="comparison-table"><caption class="visually-hidden">Reference A and current design B quantities</caption><thead><tr><th scope="col">Study</th><th scope="col">A · Reference</th><th scope="col">B · Your design</th><th scope="col">Difference</th></tr></thead><tbody id="comparison-rows"></tbody></table><p class="comparison-note" id="comparison-note"></p>';
    shell.append(results);
  }

  bind(){
    document.querySelectorAll('[data-lab-mode]').forEach(button=>button.addEventListener('click',()=>this.setMode(button.dataset.labMode)));
    $('assembly-progress').addEventListener('input',()=>{this.pause();this.setProgress(Number($('assembly-progress').value)/100);});
    $('assembly-play').addEventListener('click',()=>this.playing?this.pause():this.play());
    $('section-axis').addEventListener('change',()=>this.applySection());
    $('section-position').addEventListener('input',()=>this.applySection());
    $('compare-pin').addEventListener('click',()=>{this.baseline=Object.freeze({...this.params});this.reference?.buildStructure(this.baseline);this.updateComparison();this.status('Reference A updated');});
    $('playground-wire').addEventListener('click',()=>this.reference?.setWire($('playground-wire').getAttribute('aria-pressed')==='true'));
    $('lab-share-button').addEventListener('click',()=>this.share());
    $('lab-share-url').addEventListener('click',e=>e.target.select());
    $('lab-save').addEventListener('click',()=>this.saveView());
  }

  sceneReady(){
    const scene=this.getScene();scene.onOrbit=({yaw,pitch})=>this.reference?.setOrbit(yaw,pitch);
    document.querySelectorAll('[data-lab-mode]').forEach(button=>button.disabled=false);$('lab-save').disabled=false;
    this.update(this.getParams(),scene.model);
  }

  update(params,model){
    this.params=normalize(params);this.model=model;
    if(this.playing)this.pause();
    if(this.mode==='assembly')this.setProgress(this.progress);
    if(this.mode==='section')this.applySection();
    if(this.mode==='compare')this.updateComparison();
    if(!$('lab-share').hidden)$('lab-share-url').value=designLink(location.href,this.params);
  }

  setMode(mode){
    if(!this.getScene()||this.mode===mode)return;
    this.pause();this.mode=mode;
    document.querySelectorAll('[data-lab-mode]').forEach(button=>{const active=button.dataset.labMode===mode;button.classList.toggle('active',active);button.setAttribute('aria-pressed',active);$('lab-'+button.dataset.labMode).hidden=!active;});
    $('assembly-hud').hidden=mode!=='assembly';$('section-hud').hidden=mode!=='section';$('compare-results').hidden=mode!=='compare';
    const scene=this.getScene();scene.setAssembly(mode==='assembly'?this.progress:1);
    if(mode==='section')this.applySection();else scene.setSection(null);
    if(mode==='assembly')this.setProgress(this.progress);
    if(mode==='compare')this.startComparison();else this.endComparison();
  }

  setProgress(value){
    this.progress=Math.max(0,Math.min(1,value));this.getScene()?.setAssembly(this.progress);
    const state=assemblyState(this.model,this.progress),percent=Math.round(this.progress*100);
    $('assembly-progress').value=percent;$('assembly-percent').value=percent+'%';
    if(!this.playing)$('assembly-play').textContent=this.progress>=1?'Replay assembly':'Play assembly';
    $('assembly-stage').textContent=state.stage;$('assembly-count').textContent=`${state.count} / ${state.total}`;
    $('assembly-progress').setAttribute('aria-valuetext',`${state.count} of ${state.total} members assembled. ${state.stage}.`);
  }

  play(){
    if(this.progress>=1)this.setProgress(0);
    this.playing=true;$('assembly-play').textContent='Pause';$('assembly-play').setAttribute('aria-pressed','true');
    let previous=performance.now();
    const tick=time=>{if(!this.playing)return;const elapsed=Math.min(time-previous,80);previous=time;this.setProgress(this.progress+elapsed/11000);if(this.progress>=1){this.pause();this.status('Assembly complete');}else this.animation=requestAnimationFrame(tick);};
    this.animation=requestAnimationFrame(tick);
  }

  pause(){this.playing=false;cancelAnimationFrame(this.animation);$('assembly-play').textContent=this.progress>=1?'Replay assembly':'Play assembly';$('assembly-play').setAttribute('aria-pressed','false');}

  applySection(){
    const axis=$('section-axis').value,fraction=Number($('section-position').value)/100;
    this.getScene()?.setSection(axis,fraction);$('section-percent').value=Math.round(fraction*100)+'%';
    const coordinate=this.getScene()?.sectionCoordinate??0;
    $('section-hud').textContent=`${axis[0].toUpperCase()+axis.slice(1)} section · ${{width:'X',height:'Y',length:'Z'}[axis]} ${signed(coordinate,2)} m`;
  }

  startComparison(){
    this.baseline??=Object.freeze({...this.params});
    const wrap=$('playground-canvas-wrap');wrap.classList.add('is-comparing');
    const reference=document.createElement('div');reference.className='comparison-reference';reference.id='comparison-reference';
    reference.innerHTML='<canvas id="reference-canvas" tabindex="0" aria-label="Pinned reference A. Drag or use arrow keys to rotate both models."></canvas><div class="reference-label"><b>A</b><span id="reference-name"></span></div><span class="reference-dimensions" id="reference-dimensions"></span><span class="comparison-tag">PINNED REFERENCE</span>';
    wrap.prepend(reference);
    try{
      this.reference=new Sculpture($('reference-canvas'),{mode:'structure',onOrbit:({yaw,pitch})=>this.getScene()?.setOrbit(yaw,pitch)});
      this.reference.buildStructure(this.baseline);this.reference.setOrbit(this.getScene().yaw,this.getScene().pitch);
      this.reference.setWire($('playground-wire').getAttribute('aria-pressed')==='true');
      const badge=document.createElement('b');badge.className='current-label-badge';badge.textContent='B';badge.id='current-label-badge';$('drawing-name').before(badge);
      this.updateComparison();requestAnimationFrame(()=>{this.getScene()?.resize();this.reference?.resize();});
    }catch(error){this.reference?.dispose();this.reference=null;reference.remove();wrap.classList.remove('is-comparing');this.setMode('explore');this.notify('Comparison could not open. Your current design is still available.');console.warn('Comparison renderer unavailable:',error.message);}
  }

  updateComparison(){
    if(!this.reference)return;
    $('reference-name').textContent=names[this.baseline.template];$('reference-dimensions').textContent=dimensions(this.baseline);
    const frame=comparisonFrame(this.baseline,this.params);this.reference.setComparisonFrame(frame);this.getScene()?.setComparisonFrame(frame);
    const data=compareDesigns(this.baseline,this.params);
    $('comparison-rows').innerHTML=[['area','Footprint','m²',1],['mass','Member mass','kg',0],['members','Steel members','',0],['intensity','Mass / footprint','kg/m²',1]].map(([key,label,unit,digits])=>{const row=data[key],difference=Math.abs(row.delta)<.0001?0:row.delta;return `<tr data-comparison="${key}"><th scope="row">${label}</th><td>${number(row.a,digits)} ${unit}</td><td>${number(row.b,digits)} ${unit}</td><td class="${difference<0?'delta-less':difference>0?'delta-more':''}">${signed(difference,digits)} ${unit}${key==='mass'?` <small>(${signed(row.percent,1)}%)</small>`:''}</td></tr>`;}).join('');
    $('comparison-note').textContent=(data.sameFootprint?'Both designs share the same footprint. ':'The footprints differ; compare mass per square metre alongside total mass. ')+(this.baseline.template!==this.params.template?'These templates serve different uses. ':'')+'Nominal member mass excludes plates, bolts, coatings and waste. Quantities do not indicate structural capacity.';
  }

  endComparison(){
    this.reference?.dispose();this.reference=null;$('comparison-reference')?.remove();$('current-label-badge')?.remove();
    $('playground-canvas-wrap').classList.remove('is-comparing');this.getScene()?.setComparisonFrame(null);
    requestAnimationFrame(()=>this.getScene()?.resize());
  }

  status(message){$('lab-status').textContent=message;clearTimeout(this.statusTimer);this.statusTimer=setTimeout(()=>$('lab-status').textContent='',4500);}

  async share(){
    const link=designLink(location.href,this.params);$('lab-share').hidden=false;$('lab-share-url').value=link;
    try{await navigator.clipboard.writeText(link);this.status('Design link copied');this.notify('Design link copied. Your exact parameters travel with it.');}
    catch{$('lab-share-url').focus();$('lab-share-url').select();this.status('Select and copy the link');}
  }

  async saveView(){
    const scene=this.getScene();if(!scene)return;
    this.pause();$('lab-save').disabled=true;
    try{
      await document.fonts.ready;scene.draw();this.reference?.draw();
      const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1000;const ctx=canvas.getContext('2d');
      ctx.fillStyle='#171e1c';ctx.fillRect(0,0,1600,1000);
      const text=(value,x,y,size=20,color='#e3e9df')=>{ctx.fillStyle=color;ctx.font=`${size}px Manrope, sans-serif`;ctx.fillText(value,x,y);};
      text('SteelSmart.',64,81,34);text('DESIGN STUDY / '+this.mode.toUpperCase(),1110,77,17,'#a6bcaa');
      ctx.strokeStyle='#48604d';ctx.beginPath();ctx.moveTo(64,110);ctx.lineTo(1536,110);ctx.stroke();
      const view=(source,x,y,w,h)=>{ctx.fillStyle='#1c2521';ctx.fillRect(x,y,w,h);const scale=Math.min(w/source.width,h/source.height);ctx.drawImage(source,x+(w-source.width*scale)/2,y+(h-source.height*scale)/2,source.width*scale,source.height*scale);};
      if(this.reference){
        view(this.reference.canvas,64,200,720,550);view(scene.canvas,816,200,720,550);
        text('A / '+names[this.baseline.template],64,160,25);text(dimensions(this.baseline),64,190,18,'#a6bcaa');
        text('B / '+names[this.params.template],816,160,25,'#f69a72');text(dimensions(this.params),816,190,18,'#a6bcaa');
        const data=compareDesigns(this.baseline,this.params);
        text('A  '+number(data.mass.a)+' kg',64,802,28);text('B  '+number(data.mass.b)+' kg',816,802,28);
        text(`Difference  ${signed(data.mass.delta)} kg (${signed(data.mass.percent,1)}%)`,816,842,20,'#f4ad89');
        text('Member mass / plates, fasteners & waste excluded',64,842,17,'#a6bcaa');
      }else{
        text(names[this.params.template],64,162,30);text(dimensions(this.params),1060,162,23,'#a6bcaa');
        view(scene.canvas,64,190,1472,550);
        text(number(this.model.mass)+' kg of members',64,802,29);text(number(this.model.area)+' m² footprint',600,802,29);text(this.model.members.length+' members',1140,802,29);
        text(this.mode==='assembly'?$('assembly-count').textContent+' members assembled · '+$('assembly-stage').textContent:this.mode==='section'?$('section-hud').textContent:'Parametric steel concept · '+this.params.material,64,847,19,'#f4ad89');
      }
      ctx.beginPath();ctx.moveTo(64,900);ctx.lineTo(1536,900);ctx.stroke();
      text('CONCEPT GEOMETRY · Engineering validation required before fabrication.',64,944,17,'#a6bcaa');
      text('steelsmart / explore what’s possible',1160,944,15,'#a6bcaa');
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG could not be generated')),'image/png'));
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`steelsmart-${this.params.template}-${this.mode}.png`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);this.status('PNG study prepared');
    }catch(error){this.notify('The view could not be saved. Try again after the model finishes rendering.');console.warn('Study export failed:',error.message);}
    finally{$('lab-save').disabled=false;}
  }
}
