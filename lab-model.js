import {DEFAULTS,normalize,buildAssembly} from './model.js';

const stages=['column','rafter','beam','brace','purlin'];
export function assemblyOrder(model){return [...model.members].sort((a,b)=>stages.indexOf(a.kind)-stages.indexOf(b.kind)||a.id.localeCompare(b.id));}
export function assemblyState(model,progress){const p=Math.max(0,Math.min(1,Number(progress)||0)),order=assemblyOrder(model),count=Math.floor(p*order.length+1e-8),kind=order[Math.min(count,order.length-1)]?.kind;return {count,total:order.length,stage:p>=1?'Assembly complete':p===0?'Base plates':({column:'Columns',rafter:'Primary frame',beam:'Primary frame',brace:'Cross bracing',purlin:'Roof purlins'}[kind]||'Base plates')};}
export function compareDesigns(a,b){const A=buildAssembly(a),B=buildAssembly(b),row=(x,y)=>({a:x,b:y,delta:y-x,percent:x?(y-x)/x*100:0});return {area:row(A.area,B.area),mass:row(A.mass,B.mass),members:row(A.members.length,B.members.length),intensity:row(A.mass/A.area,B.mass/B.area),sameFootprint:Math.abs(A.params.width-B.params.width)<.001&&Math.abs(A.params.length-B.params.length)<.001};}
export function comparisonFrame(a,b){const models=[buildAssembly(a),buildAssembly(b)],extent=Math.max(...models.flatMap(m=>[m.params.width,m.params.length,m.params.height+m.rise])),scale=6/extent,radius=Math.max(...models.map(m=>Math.hypot(m.params.width+1,m.params.length+1,m.params.height+m.rise+1)/2))*scale;return {scale,radius};}
const keys=['template','width','length','height','bays','pitch','material','bracing'];
export function designLink(base,params){const url=new URL(base),p=normalize(params);url.search='';url.hash='playground';url.searchParams.set('study','1');for(const k of keys)url.searchParams.set(k,String(p[k]));return url.href;}
export function readDesignLink(search){const query=new URLSearchParams(search);if(query.get('study')!=='1')return null;const p={...DEFAULTS};for(const k of keys)if(query.has(k))p[k]=k==='bracing'?query.get(k)!=='false':query.get(k);return normalize(p);}
