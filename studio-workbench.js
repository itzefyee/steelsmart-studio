import {designVariants,challengeProgress,modelPreview} from './studio-tools-model.js';

import {byId,format} from './studio-utils.js';
import {InspectorPanel} from './studio-inspector.js';
import {MaterialPanel} from './studio-material-panel.js';
import {ReviewPanel} from './studio-review-panel.js';
import {StudioCommands} from './studio-commands.js';

const icons={brief:'i-spark',inspect:'i-eye',materials:'i-layers',explore:'i-grid',review:'i-file'};

export class StudioWorkbench {
  constructor(api){
    this.api=api;this.phase='explore';this.challengeActive=false;this.challengeWon=false;this.selected=null;
    this.mount();this.bind();const inspector=document.createElement('div');inspector.id='studio-inspect';inspector.setAttribute('role','tabpanel');inspector.setAttribute('aria-labelledby','mode-inspect');this.context.append(inspector);this.inspector=new InspectorPanel({root:inspector,api});byId('mode-inspect').disabled=false;const materials=document.createElement('div');materials.id='studio-materials';materials.setAttribute('role','tabpanel');materials.setAttribute('aria-labelledby','mode-materials');this.context.append(materials);const materialOutput=document.createElement('div');materialOutput.id='studio-materials-output';this.toolbox.append(materialOutput);this.materials=new MaterialPanel({root:materials,output:materialOutput,api});byId('mode-materials').disabled=false;const review=document.createElement('div');review.id='studio-review';review.setAttribute('role','tabpanel');review.setAttribute('aria-labelledby','mode-review');this.context.append(review);const reviewOutput=document.createElement('div');reviewOutput.id='studio-review-output';this.toolbox.append(reviewOutput);this.review=new ReviewPanel({root:review,output:reviewOutput,api});byId('mode-review').disabled=false;this.activate('inspect');this.commands=new StudioCommands(this);
  }
  mount(){
    const workspace=document.querySelector('.workspace');this.originalPrompt=workspace.querySelector('.prompt-panel');
    const rail=document.createElement('div');rail.className='studio-tools-rail';rail.id='studio-tools-rail';
    rail.innerHTML=`<div class="studio-modes" role="tablist" aria-label="Studio tools">${[['brief','Design brief'],['inspect','Inspect'],['materials','Materials'],['explore','Explore'],['review','Review']].map(([id,label])=>`<button id="mode-${id}" data-studio-mode="${id}" role="tab" aria-selected="${id==='explore'}" aria-controls="studio-${id}" ${!['brief','explore'].includes(id)?'disabled':''}><svg><use href="#${icons[id]}"/></svg>${label}</button>`).join('')}</div><div class="studio-rail-actions"><span class="tool-live">One model. Every decision.</span></div>`;
    workspace.before(rail);this.originalPrompt.id='studio-brief';this.originalPrompt.setAttribute('role','tabpanel');this.originalPrompt.setAttribute('aria-labelledby','mode-brief');
    this.context=document.createElement('aside');this.context.className='prompt-panel tool-context';this.context.hidden=true;workspace.prepend(this.context);
    this.toolbox=document.createElement('section');this.toolbox.className='studio-toolbox';workspace.after(this.toolbox);
    this.toolbox.innerHTML=`<div id="studio-explore" role="tabpanel" aria-labelledby="mode-explore"><div class="tools-heading"><div><span class="tool-eyebrow">DESIGN EXPLORER</span><h2>One idea. A few other possibilities.</h2><p>Real alternatives to your current model. Select one to keep exploring.</p></div><button class="button ghost" id="challenge-toggle" aria-pressed="false">Try a design challenge <svg><use href="#i-arrow"/></svg></button></div><div class="variant-grid" id="studio-variants"></div><div id="design-challenge" class="design-challenge" hidden><div><span class="tool-eyebrow">THE 600 M² CHALLENGE</span><h3>Make room. Mind the material.</h3><p>Design a portal frame with at least 600 m² of floor area and at most 13,000 kg of nominal members.</p></div><div class="challenge-targets"><div><span>Footprint ≥ 600 m²</span><strong id="challenge-area"></strong><progress id="challenge-area-progress" max="1" aria-label="Footprint target"></progress></div><div><span>Member mass ≤ 13,000 kg</span><strong id="challenge-mass"></strong><progress id="challenge-mass-progress" max="1" aria-label="Member mass target"></progress></div></div><p id="challenge-result" role="status"></p><small>A geometry and material puzzle with fixed profiles. Meeting these targets does not establish structural adequacy.</small></div></div>`;
  }
  bind(){
    const buttons=[...document.querySelectorAll('[data-studio-mode]')];
    buttons.forEach(button=>{button.addEventListener('click',()=>this.activate(button.dataset.studioMode));button.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const enabled=buttons.filter(b=>!b.disabled),index=enabled.indexOf(button),next=e.key==='Home'?0:e.key==='End'?enabled.length-1:(index+(e.key==='ArrowRight'?1:-1)+enabled.length)%enabled.length;enabled[next].click();enabled[next].focus();});});
    byId('challenge-toggle').addEventListener('click',()=>{this.challengeActive=!this.challengeActive;byId('challenge-toggle').setAttribute('aria-pressed',this.challengeActive);byId('design-challenge').hidden=!this.challengeActive;this.updateChallenge();});
    byId('studio-variants').addEventListener('click',e=>{const button=e.target.closest('[data-variant]');if(!button)return;const variant=this.variants.find(v=>v.id===button.dataset.variant);this.api.applyDesign(variant.params,'Explored '+variant.title.toLowerCase());this.api.notify('Alternative applied. Undo returns to your previous design.');});
  }
  activate(phase){
    if(this.commands?.focused)this.commands.toggleFocus(false);
    this.phase=phase;document.querySelectorAll('[data-studio-mode]').forEach(button=>{const active=button.dataset.studioMode===phase;button.setAttribute('aria-selected',active);button.tabIndex=active?0:-1;});
    this.originalPrompt.hidden=!['brief','explore'].includes(phase);this.context.hidden=['brief','explore'].includes(phase);
    for(const panel of this.context.children)panel.hidden=panel.id!=='studio-'+phase;
    for(const panel of this.toolbox.children)panel.hidden=panel.id!=='studio-'+phase&&panel.id!=='studio-'+phase+'-output';
    this.toolbox.hidden=phase==='brief'||phase==='inspect';
    if(phase==='explore')this.updateExplore();if(phase==='materials')this.materials?.update(this.model);if(phase==='review')this.review?.renderDrawing();
  }
  update(model){this.model=model;this.inspector?.update(model);if(this.materials){this.materials.model=model;if(this.phase==='materials')this.materials.update(model);}this.review?.update(model);if(this.phase==='explore')this.updateExplore();this.updateChallenge();}
  onSelection(member){this.selected=member;this.inspector?.updateSelection(member);this.review?.updateSelection(member);}
  updateExplore(){
    if(!this.model)return;this.variants=designVariants(this.model.params);
    byId('studio-variants').innerHTML=this.variants.map(v=>`<article class="variant-card"><div class="variant-preview">${modelPreview(v.model)}<span>${format(v.params.width,1)} × ${format(v.params.length,1)} × ${format(v.params.height,1)} m</span></div><div class="variant-body"><h3>${v.title}</h3><p>${v.description}</p><div class="variant-stats"><strong>${format(v.model.mass)} <small>kg</small></strong><span>${v.deltaMass>0?'+':'−'}${format(Math.abs(v.deltaMass))} kg from current</span></div><button class="button ghost" data-variant="${v.id}">Explore this direction <svg><use href="#i-arrow"/></svg></button></div></article>`).join('');
  }
  updateChallenge(){
    if(!this.model||!this.challengeActive)return;const progress=challengeProgress(this.model);
    byId('challenge-area').textContent=format(this.model.area)+' m²';byId('challenge-mass').textContent=format(this.model.mass)+' kg';byId('challenge-area-progress').value=progress.areaRatio;byId('challenge-mass-progress').value=progress.massRatio;
    byId('design-challenge').classList.toggle('is-complete',progress.complete);byId('challenge-result').textContent=progress.complete?'Both targets met. Nicely considered.':this.model.params.template!=='portal'?'Choose a portal frame to take on this challenge.':'Adjust dimensions or explore a variant. Every change counts.';
    if(progress.complete&&!this.challengeWon)this.api.notify('Challenge complete: room made, material target met.');this.challengeWon=progress.complete;
  }
}
