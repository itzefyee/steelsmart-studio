import {modelNodes,measureNodes} from './studio-tools-model.js';
import {byId,format} from './studio-utils.js';

const labels={column:'Columns',rafter:'Rafters',beam:'Beams',brace:'Bracing',purlin:'Purlins'};
export class InspectorPanel {
  constructor({root,api}){
    this.api=api;this.root=root;this.selected=null;this.measureActive=false;
    root.innerHTML=`<div class="panel-title"><span><svg><use href="#i-eye"/></svg>Inspect the assembly</span><span class="tag subtle" id="inspect-count"></span></div><div class="tool-content"><p class="tool-subtitle">Every member has a story. Pick one to see what it contributes.</p><label class="sr-only" for="member-search">Search member ID, profile or family</label><input id="member-search" type="search" placeholder="Find a member or profile…" autocomplete="off"><label class="sr-only" for="member-family">Member family</label><select id="member-family"><option value="">All member families</option>${Object.entries(labels).map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select><div class="member-list" id="member-list" aria-label="Model members"></div><div class="member-detail" id="member-detail">Select a member here or in the drawing.</div><div class="inspector-actions"><button id="member-focus" disabled>Focus member</button><button id="member-isolate" aria-pressed="false" disabled>Isolate family</button></div><div class="tool-section-heading">Read the structure</div><label class="tool-check"><input type="checkbox" id="mass-colors"><span>Color by member mass</span></label><div id="mass-legend" class="mass-legend" hidden><i></i><span id="mass-range"></span><small>Individual member mass · not stress</small></div><label class="tool-check"><input type="checkbox" id="scale-reference"><span>1.75 m scale reference</span></label><details class="measure-details"><summary>Measure between model nodes <svg><use href="#i-plus"/></svg></summary><p class="tool-small-note">Select two actual member endpoints. Coordinates are X, Y, Z in metres.</p><label for="measure-from">From</label><select id="measure-from"></select><label for="measure-to">To</label><select id="measure-to"></select><button class="button ghost" id="measure-toggle" aria-pressed="false">Show measurement</button><output id="measure-result" class="measure-result"></output><p class="tool-small-note" id="measure-note">Measures original geometry, including when the view is exploded.</p></details><p class="tool-small-note">Isolation changes the view. Quantities and exports still include every member.</p></div>`;
    this.bind();
  }
  bind(){
    byId('member-search').addEventListener('input',()=>this.renderList());
    byId('member-family').addEventListener('change',()=>{if(this.api.getViewport()?.isolation)this.api.getViewport().setIsolation(byId('member-family').value);this.renderList();this.updateSelection(this.selected);});
    byId('member-list').addEventListener('click',e=>{const button=e.target.closest('[data-member-id]');if(button)this.api.getViewport()?.selectMember(button.dataset.memberId);});
    byId('member-focus').addEventListener('click',()=>{if(this.selected){this.api.getViewport()?.focusMember(this.selected.id);byId('viewport').scrollIntoView({block:'center',behavior:'instant'});byId('viewport').focus({preventScroll:true});}});
    byId('member-isolate').addEventListener('click',()=>{const view=this.api.getViewport();if(!view)return;view.setIsolation(view.isolation?null:byId('member-family').value||this.selected?.kind);this.updateSelection(this.selected);});
    byId('mass-colors').addEventListener('change',()=>{this.api.getViewport()?.setColorByMass(byId('mass-colors').checked);byId('mass-legend').hidden=!byId('mass-colors').checked;});
    byId('scale-reference').addEventListener('change',()=>this.api.getViewport()?.setScaleReference(byId('scale-reference').checked));
    byId('measure-toggle').addEventListener('click',()=>{this.measureActive=!this.measureActive;this.measure();});
    for(const id of ['measure-from','measure-to'])byId(id).addEventListener('change',()=>this.measure());
  }
  update(model){
    this.model=model;this.nodes=modelNodes(model);byId('inspect-count').textContent=model.members.length+' PCS';
    const family=byId('member-family');if(family.value&&!model.members.some(member=>member.kind===family.value))family.value='';this.renderList();
    let invalidated=false;for(const [index,id] of ['measure-from','measure-to'].entries()){const previous=byId(id).value;byId(id).replaceChildren(...this.nodes.map((node,i)=>{const option=document.createElement('option');option.value=node.id;option.textContent=`N${String(i+1).padStart(3,'0')} · ${node.label}`;return option;}));if(this.nodes.some(n=>n.id===previous))byId(id).value=previous;else{if(previous)invalidated=true;byId(id).selectedIndex=Math.min(index,this.nodes.length-1);}}
    if(invalidated&&this.measureActive){this.measureActive=false;byId('measure-note').textContent='The selected endpoints changed. Choose new nodes to measure this revision.';}
    this.measure();const masses=model.members.map(m=>m.mass);byId('mass-range').textContent=`${format(Math.min(...masses),1)} — ${format(Math.max(...masses),1)} kg`;
    const available=!!this.api.getViewport();for(const id of ['mass-colors','scale-reference','measure-toggle'])byId(id).disabled=!available;
    this.updateSelection(this.api.getViewport()?.selected||null);
  }
  renderList(){
    if(!this.model)return;const search=byId('member-search').value.trim().toLowerCase(),family=byId('member-family').value,members=this.model.members.filter(m=>(!family||m.kind===family)&&`${m.id} ${m.profile} ${labels[m.kind]}`.toLowerCase().includes(search));
    byId('member-list').innerHTML=members.length?members.map(m=>`<button data-member-id="${m.id}" aria-pressed="${this.selected?.id===m.id}"><span><b>${m.id}</b><small>${m.profile}</small></span><span>${format(m.length,2)} m<small>${format(m.mass,1)} kg</small></span></button>`).join(''):'<p class="tool-empty">No matching members. Try an ID or another profile.</p>';
  }
  updateSelection(member){
    this.selected=member;byId('member-detail').replaceChildren();
    if(member){const title=document.createElement('strong');title.textContent=`${member.id} · ${labels[member.kind]}`;const detail=document.createElement('span');detail.textContent=`${member.profile} / ${format(member.length,3)} m / ${format(member.mass,1)} kg`;byId('member-detail').append(title,detail);}else byId('member-detail').textContent='Select a member here or in the drawing.';
    const viewport=this.api.getViewport();byId('member-focus').disabled=!member||!viewport;byId('member-isolate').disabled=!viewport||(!member&&!byId('member-family').value&&!viewport.isolation);byId('member-isolate').setAttribute('aria-pressed',!!viewport?.isolation);byId('member-isolate').textContent=viewport?.isolation?'Show all members':'Isolate family';
    document.querySelectorAll('[data-member-id]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.memberId===member?.id));
  }
  measure(){
    const a=this.nodes?.find(n=>n.id===byId('measure-from').value),b=this.nodes?.find(n=>n.id===byId('measure-to').value);
    byId('measure-toggle').setAttribute('aria-pressed',this.measureActive);byId('measure-toggle').textContent=this.measureActive?'Hide measurement':'Show measurement';this.api.getViewport()?.setMeasurement(this.measureActive?a:null,this.measureActive?b:null);
    if(a&&b){const result=measureNodes(a,b);byId('measure-result').innerHTML=`<strong>${format(result.distance,3)} <small>m</small></strong><span>ΔX ${format(result.delta[0],3)} · ΔY ${format(result.delta[1],3)} · ΔZ ${format(result.delta[2],3)}</span>`;}
  }
}
