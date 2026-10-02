import {normalize,buildAssembly} from './model.js';

export function designVariants(input){
  const p=normalize(input),base=buildAssembly(p),proposals=[
    {id:'frames',title:p.bays>2?'Fewer frames':'Closer frames',description:p.bays>2?'One less bay. Explore the material tradeoff.':'One extra bay. Explore a denser frame rhythm.',params:{...p,bays:p.bays>2?p.bays-1:p.bays+1}},
    {id:'height',title:p.height<12?'More headroom':'Lower the roof',description:p.height<12?'An extra metre of clear eave height.':'Bring the eaves down by one metre.',params:{...p,height:p.height<12?Math.min(12,p.height+1):11}}
  ];
  for(const factor of [1.2,.8]){const width=Math.round(Math.min(36,Math.max(6,p.width*factor))*10)/10,length=base.area/width;if(Math.abs(width-p.width)>.01&&length>=6&&length<=60){proposals.push({id:'proportion',title:'Same area. New proportions.',description:'Keep the footprint area and change its aspect ratio.',params:{...p,width,length}});break;}}
  return proposals.map(v=>{const params=normalize(v.params),model=buildAssembly(params);return {...v,params,model,deltaMass:model.mass-base.mass};});
}

export function challengeProgress(model){
  const areaRatio=Math.min(1,model.area/600),massRatio=Math.min(1,13000/Math.max(1,model.mass));
  return {areaRatio,massRatio,complete:model.params.template==='portal'&&model.area>=600&&model.mass<=13000};
}

export function modelPreview(model){
  const project=p=>[p[0]*.8-p[2]*.6,-p[1]+p[0]*.22+p[2]*.28],points=model.members.flatMap(m=>[project(m.a),project(m.b)]),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),scale=Math.min(274/(maxX-minX||1),110/(maxY-minY||1)),offsetX=(320-(maxX-minX)*scale)/2,offsetY=(150-(maxY-minY)*scale)/2;
  const point=p=>{const [x,y]=project(p);return [(x-minX)*scale+offsetX,(y-minY)*scale+offsetY];};
  return `<svg viewBox="0 0 320 150" aria-hidden="true">${model.members.map(m=>{const a=point(m.a),b=point(m.b);return `<path d="M${a[0].toFixed(2)} ${a[1].toFixed(2)}L${b[0].toFixed(2)} ${b[1].toFixed(2)}" stroke="${['rafter','beam'].includes(m.kind)?'#d65a35':m.kind==='brace'?'#a3aebc':'#4a617f'}" stroke-width="${m.kind==='brace'?.7:1.3}"/>`;}).join('')}</svg>`;
}

export function modelNodes(model){
  const nodes=new Map();for(const m of model.members)for(const position of [m.a,m.b]){const id='N:'+position.map(v=>Math.round(v*1e6)/1e6).join('|');if(!nodes.has(id))nodes.set(id,{id,position:[...position],label:position.map(v=>Number(v.toFixed(2))).join(', ')+' m'});}
  return [...nodes.values()];
}
export function measureNodes(a,b){
  if(![a?.position,b?.position].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))throw new TypeError('Two finite model coordinates are required.');
  const delta=b.position.map((v,i)=>v-a.position[i]);return {distance:Math.hypot(...delta),delta};
}

export function normalizeReviewMark(value){
  if(!value||typeof value!=='object'||typeof value.note!=='string'||!value.note.trim()||!value.params||typeof value.params!=='object')return null;
  const note=value.note.trim().slice(0,600),params=normalize(value.params),model=buildAssembly(params),source=value.camera||{},finite=(n,fallback)=>Number.isFinite(n)?n:fallback;
  const yaw=finite(source.yaw,-.66),camera={yaw:Math.atan2(Math.sin(yaw),Math.cos(yaw)),pitch:Math.max(.001,Math.min(Math.PI/2-.001,finite(source.pitch,.48))),zoom:Math.max(.45,Math.min(3,finite(source.zoom,1))),focusId:model.members.some(m=>m.id===source.focusId)?source.focusId:null};
  const created=Number.isFinite(value.created)?value.created:0,id=typeof value.id==='string'&&/^[\w-]{1,80}$/.test(value.id)?value.id:'review-'+Math.abs([...note].reduce((h,c)=>(Math.imul(h,31)+c.codePointAt(0))|0,0)).toString(36),memberId=model.members.some(m=>m.id===value.memberId)?value.memberId:null,view=value.view||{};
  return {id,note,params,camera,memberId,created,view:{isolation:['column','rafter','beam','brace','purlin'].includes(view.isolation)?view.isolation:null,colorByMass:!!view.colorByMass,wireframe:!!view.wireframe,exploded:!!view.exploded,dimensions:view.dimensions!==false,scaleReference:!!view.scaleReference}};
}
