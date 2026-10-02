import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,normalize,buildAssembly,parsePrompt,billOfMaterials,exportOBJ,exportCSV,memberBasis} from '../../model.js';

test('portal geometry is finite, bounded and has one column pair per frame',()=>{
  const m=buildAssembly(DEFAULTS);
  assert.equal(m.members.filter(x=>x.kind==='column').length,(DEFAULTS.bays+1)*2);
  assert.ok(m.members.every(x=>[...x.a,...x.b,x.mass].every(Number.isFinite)&&x.mass>0));
  assert.ok(m.members.every(x=>x.a[1]>=0&&x.b[1]>=0));
});
test('bounds reject hostile or corrupt stored dimensions',()=>{
  const p=normalize({width:Infinity,length:-2,height:'bad',bays:100,template:'oops'});
  assert.equal(p.width,DEFAULTS.width);assert.equal(p.length,6);assert.equal(p.height,DEFAULTS.height);assert.equal(p.bays,8);assert.equal(p.template,'portal');
});
test('natural language changes explicit dimensions and leaves others intact',()=>{
  const r=parsePrompt('Create a warehouse 24m wide, 36m long and 8m high with 6 bays',DEFAULTS);
  assert.equal(r.params.width,24);assert.equal(r.params.length,36);assert.equal(r.params.height,8);assert.equal(r.params.bays,6);
  assert.equal(parsePrompt('make a spaceship',DEFAULTS).ok,false);
});
test('templates create distinct assemblies and quantity totals equal generated geometry',()=>{
  for(const template of ['portal','canopy','rack']){
    const m=buildAssembly({...DEFAULTS,template});const bom=billOfMaterials(m);
    assert.ok(m.members.length>10);assert.equal(bom.reduce((n,x)=>n+x.quantity,0),m.members.length);
    assert.ok(Math.abs(bom.reduce((n,x)=>n+x.mass,0)-m.mass)<1e-6);
  }
  assert.notEqual(buildAssembly({...DEFAULTS,template:'canopy'}).members.length,buildAssembly(DEFAULTS).members.length);
});
test('exports contain member vertices, valid faces and matching quantities',()=>{
  const m=buildAssembly(DEFAULTS),obj=exportOBJ(m),csv=exportCSV(m);
  assert.equal((obj.match(/^o /gm)||[]).length,m.members.length);
  assert.equal((obj.match(/^v /gm)||[]).length,m.members.length*8);
  assert.match(csv,/Member,Profile,Quantity,Total length \(m\),Mass \(kg\)/);
});
test('unsupported units are rejected and decimal pitch remains intact',()=>{
  assert.equal(parsePrompt('warehouse width 24 feet').ok,false);
  assert.equal(parsePrompt('warehouse 12.5 degrees').params.pitch,12.5);
  assert.equal(parsePrompt('warehouse -10m wide').params.width,6);
});
test('shared section basis puts rafter depth in its vertical plane',()=>{
  const rafter=buildAssembly(DEFAULTS).members.find(m=>m.kind==='rafter');
  const {u,v,d}=memberBasis(rafter);
  assert.ok(Math.abs(u[2])>.99);
  assert.ok(Math.abs(v[2])<1e-10);
  assert.ok(Math.abs(u.reduce((s,x,i)=>s+x*d[i],0))<1e-10);
});
