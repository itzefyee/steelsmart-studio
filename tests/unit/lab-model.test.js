import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,buildAssembly} from '../../model.js';
import {assemblyOrder,assemblyState,compareDesigns,designLink,readDesignLink} from '../../lab-model.js';

test('assembly sequence accounts for every unique member and ends complete',()=>{
  const model=buildAssembly(DEFAULTS),order=assemblyOrder(model);
  assert.equal(order.length,model.members.length);
  assert.equal(new Set(order.map(m=>m.id)).size,model.members.length);
  assert.equal(assemblyState(model,0).count,0);
  assert.equal(assemblyState(model,1).count,model.members.length);
  assert.equal(order[0].kind,'column');
  assert.ok(order.findIndex(m=>m.kind==='purlin')>order.findIndex(m=>m.kind==='brace'));
});
test('comparison uses independent geometry and signed differences',()=>{
  const base={...DEFAULTS},current={...DEFAULTS,length:36};
  const result=compareDesigns(base,current);
  assert.equal(result.area.delta,216);
  assert.ok(result.mass.delta>0);
  assert.equal(result.members.delta,0);
  assert.equal(compareDesigns(base,base).mass.delta,0);
  assert.equal(base.length,24);
});
test('share link round-trips exact supported parameters and handles corrupt input',()=>{
  const p={...DEFAULTS,template:'rack',width:12,length:18,height:7.5,bays:3,pitch:12.5,bracing:false,material:'S235'};
  const url=designLink('http://localhost:4310/?obsolete=1',p);
  const decoded=readDesignLink(new URL(url).search);
  for(const key of ['template','width','length','height','bays','pitch','material','bracing'])assert.equal(decoded[key],p[key]);
  assert.equal(new URL(url).hash,'#playground');
  assert.equal(new URL(url).searchParams.has('obsolete'),false);
  assert.equal(readDesignLink(''),null);
  assert.equal(readDesignLink('?study=1&width=Infinity&template=bad').width,18);
});

test('equal area does not imply equal footprint dimensions',()=>{
  const result=compareDesigns(DEFAULTS,{...DEFAULTS,width:12,length:36});
  assert.equal(result.area.delta,0);
  assert.equal(result.sameFootprint,false);
});
