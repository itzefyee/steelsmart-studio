import {normalizeReviewMark} from './studio-tools-model.js';
import {drawingSheet} from './drawing-sheet.js';
import {byId,format,downloadFile} from './studio-utils.js';

const storageKey='steelsmart-review-v1';
export class ReviewPanel {
  constructor({root,output,api}){
    this.api=api;this.root=root;this.output=output;this.marks=[];this.storageOK=true;
    try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(saved))throw new Error('Invalid review collection');this.marks=saved.map(normalizeReviewMark).filter(Boolean).slice(-12);}catch{this.storageOK=false;}
    root.innerHTML='<div class="panel-title"><span><svg><use href="#i-file"/></svg>Review & present</span><span class="tag subtle">LOCAL</span></div><div class="tool-content"><p class="tool-subtitle">Keep the thought behind the geometry. A mark saves your note, design, camera and display settings.</p><label for="review-note">What deserves another look?</label><textarea id="review-note" maxlength="600" placeholder="Check the end-bay connection, compare a wider span…"></textarea><span id="review-anchor" class="review-anchor">Current design and camera</span><button class="button primary" id="save-review"><svg><use href="#i-plus"/></svg>Save review mark</button><p id="review-feedback" class="tool-small-note" role="status"></p><div class="review-list" id="review-list"></div><div class="tool-section-heading">Take the idea with you</div><button class="button ghost" id="drawing-export"><svg><use href="#i-file"/></svg>Concept drawing · SVG</button><button class="button ghost" id="studio-png"><svg><use href="#i-eye"/></svg>Current 3D view · PNG</button><button class="button ghost" id="review-export"><svg><use href="#i-down"/></svg>Review pack · JSON</button><p class="tool-small-note">Up to 12 marks stay in this browser. Exports contain concept geometry and your notes.</p></div>';
    output.innerHTML='<div class="tools-heading"><div><span class="tool-eyebrow">DRAWING ROOM</span><h2>Three views. The whole idea.</h2><p>Front elevation, side elevation and plan, projected from the current member graph.</p></div><span class="drawing-scope">CONCEPT / NOT FOR FABRICATION</span></div><div class="drawing-preview" id="drawing-preview"></div>';
    this.bind();this.renderMarks();
    if(!this.storageOK)byId('review-feedback').textContent='Saved marks could not be read. You can still create marks in this session.';
  }
  bind(){
    byId('save-review').addEventListener('click',()=>this.save());
    byId('review-list').addEventListener('click',e=>{const restore=e.target.closest('[data-restore-mark]'),remove=e.target.closest('[data-remove-mark]');if(restore)this.restore(restore.dataset.restoreMark);if(remove){this.marks=this.marks.filter(mark=>mark.id!==remove.dataset.removeMark);this.persist();this.renderMarks();this.api.notify('Review mark removed.');}});
    byId('drawing-export').addEventListener('click',()=>this.exportDrawing());
    byId('studio-png').addEventListener('click',()=>this.exportPNG());
    byId('review-export').addEventListener('click',()=>{downloadFile(JSON.stringify({schema:'steelsmart-review-v1',scope:'concept geometry and local review notes; not certified fabrication information',current:{params:this.model.params,camera:this.api.getViewport()?.getCameraState()},marks:this.marks},null,2),'steelsmart-review-pack.json','application/json');this.api.notify('Review pack prepared.');});
  }
  update(model){this.model=model;byId('studio-png').disabled=!this.api.getViewport();if(!this.output.hidden)this.renderDrawing();this.updateSelection(this.api.getViewport()?.selected);}
  renderDrawing(){if(this.model)byId('drawing-preview').innerHTML=drawingSheet(this.model);}
  updateSelection(member){byId('review-anchor').textContent=member?`Attached to ${member.id} · ${member.profile}`:'Current design and camera';}
  save(){
    const view=this.api.getViewport(),mark=normalizeReviewMark({id:crypto.randomUUID(),note:byId('review-note').value,params:this.model.params,camera:view?.getCameraState(),memberId:view?.selected?.id,created:Date.now(),view:{isolation:view?.isolation,colorByMass:view?.colorByMass,wireframe:view?.wire,exploded:view?.exploded,dimensions:view?.showDimensions,scaleReference:view?.person?.visible}});
    if(!mark){byId('review-feedback').textContent='Add a short note before saving this view.';byId('review-note').focus();return;}
    this.marks.push(mark);this.marks=this.marks.slice(-12);this.persist();byId('review-note').value='';this.renderMarks();byId('review-feedback').textContent=this.storageOK?'Review mark saved with this design and view.':'Saved for this session. Browser storage is unavailable.';
  }
  persist(){try{localStorage.setItem(storageKey,JSON.stringify(this.marks));this.storageOK=true;}catch{this.storageOK=false;}}
  renderMarks(){
    byId('review-list').replaceChildren();
    if(!this.marks.length){const empty=document.createElement('p');empty.className='tool-empty';empty.textContent='Your first review mark starts here.';byId('review-list').append(empty);return;}
    for(const mark of [...this.marks].reverse()){
      const article=document.createElement('article'),note=document.createElement('p'),detail=document.createElement('span'),actions=document.createElement('div'),restore=document.createElement('button'),remove=document.createElement('button');note.textContent=mark.note;detail.textContent=`${format(mark.params.width,1)} × ${format(mark.params.length,1)} m${mark.memberId?' · '+mark.memberId:''}`;restore.dataset.restoreMark=mark.id;restore.textContent='Restore design & view';remove.dataset.removeMark=mark.id;remove.textContent='×';remove.setAttribute('aria-label','Remove review mark');actions.append(restore,remove);article.append(note,detail,actions);byId('review-list').append(article);
    }
  }
  restore(id){
    const mark=this.marks.find(m=>m.id===id);if(!mark)return;
    this.api.applyDesign(mark.params,'Restored review mark');const view=this.api.getViewport();
    if(view){
      view.auto=false;byId('rotate').setAttribute('aria-pressed','false');view.setExploded(mark.view.exploded);view.setWireframe(mark.view.wireframe);view.setDimensions(mark.view.dimensions);view.setColorByMass(mark.view.colorByMass);view.setScaleReference(mark.view.scaleReference);view.setIsolation(mark.view.isolation);view.restoreCamera(mark.camera);view.selectMember(mark.memberId);
      for(const [id,value] of [['explode',mark.view.exploded],['wireframe',mark.view.wireframe],['dimensions',mark.view.dimensions]])byId(id).setAttribute('aria-pressed',value);
      byId('mass-colors').checked=mark.view.colorByMass;byId('mass-legend').hidden=!mark.view.colorByMass;byId('scale-reference').checked=mark.view.scaleReference;
      const camera=view.getCameraState(),namedView=[['front',0,.015],['top',0,Math.PI/2-.001],['perspective',-.66,.48]].find(([,yaw,pitch])=>Math.abs(camera.yaw-yaw)<1e-5&&Math.abs(camera.pitch-pitch)<1e-5)?.[0];
      document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===namedView;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',active);});
    }
    this.api.notify('Review design and camera restored. Undo returns to your previous design.');
  }
  exportDrawing(){if(!this.model)return;downloadFile(drawingSheet(this.model),'steelsmart-concept-drawing.svg','image/svg+xml');this.api.notify('Concept drawing sheet prepared.');}
  async exportPNG(){
    const view=this.api.getViewport();if(!view)return;byId('studio-png').disabled=true;
    try{
      await document.fonts.ready;view.resize();view.renderer.render(view.scene,view.camera);
      const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=1050;const context=canvas.getContext('2d');context.fillStyle='#f6f8fa';context.fillRect(0,0,1600,1050);
      const text=(value,x,y,size=20,color='#344c67')=>{context.fillStyle=color;context.font=`${size}px Manrope, sans-serif`;context.fillText(value,x,y);};
      text('SteelSmart / 3D study',58,70,32);text(this.model.params.name.slice(0,80),58,114,21);text(`${format(this.model.params.width,2)} × ${format(this.model.params.length,2)} × ${format(this.model.params.height,2)} m`,1120,70,21);
      const box={x:58,y:155,w:1484,h:685},scale=Math.min(box.w/view.canvas.width,box.h/view.canvas.height);context.fillStyle='#f1f3f6';context.fillRect(box.x,box.y,box.w,box.h);context.drawImage(view.canvas,box.x+(box.w-view.canvas.width*scale)/2,box.y+(box.h-view.canvas.height*scale)/2,view.canvas.width*scale,view.canvas.height*scale);
      text(format(this.model.mass)+' kg · '+this.model.members.length+' members · '+format(this.model.area,1)+' m² footprint',58,896,26);
      text(view.isolation?'VIEW FILTER / '+view.isolation.toUpperCase()+' ONLY · Quantities describe the complete model.':'Complete model · '+(view.colorByMass?'Colors show individual member mass.':'Nominal profile geometry.'),58,935,17,'#6a7c90');
      text('CONCEPT STUDY / Engineering validation required before fabrication.',58,1005,16,'#6a7c90');
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('No image returned')),'image/png'));downloadFile(blob,'steelsmart-3d-study.png','image/png');this.api.notify('3D study PNG prepared.');
    }catch{this.api.notify('The 3D view could not be captured. Try again once the model is visible.');}finally{byId('studio-png').disabled=false;}
  }
}
