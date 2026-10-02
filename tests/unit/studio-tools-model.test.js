import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS} from '../../model.js';
import {designVariants,challengeProgress,modelNodes,measureNodes} from '../../studio-tools-model.js';

test('variants preserve family and user input while producing distinct valid assemblies',()=>{
  const input={...DEFAULTS,bracing:false,material:'S235'},before=structuredClone(input),variants=designVariants(input);
  assert.equal(variants.length,3);assert.deepEqual(input,before);
  assert.equal(new Set(variants.map(v=>JSON.stringify(v.params))).size,3);
  for(const v of variants){assert.equal(v.params.template,'portal');assert.equal(v.params.bracing,false);assert.equal(v.params.material,'S235');assert.ok(v.model.members.length>0);assert.ok(Number.isFinite(v.deltaMass));}
  assert.equal(variants.find(v=>v.id==='frames').params.bays,3);
  assert.equal(variants.find(v=>v.id==='height').params.height,7);
  const proportion=variants.find(v=>v.id==='proportion');assert.ok(Math.abs(proportion.params.width*proportion.params.length-432)<1e-8);
});
test('variants at dimensional bounds avoid unchanged or clamped area proposals',()=>{
  const variants=designVariants({...DEFAULTS,width:36,length:60,height:12,bays:2});
  assert.equal(variants.some(v=>v.id==='proportion'),false);
  assert.equal(variants.find(v=>v.id==='height').params.height,11);
  assert.equal(variants.find(v=>v.id==='frames').params.bays,3);
});
test('challenge requires both targets and the supported portal family',()=>{
  assert.equal(challengeProgress({area:600,mass:13000,params:{template:'portal'}}).complete,true);
  assert.equal(challengeProgress({area:599,mass:9000,params:{template:'portal'}}).complete,false);
  assert.equal(challengeProgress({area:600,mass:13001,params:{template:'portal'}}).complete,false);
  assert.equal(challengeProgress({area:600,mass:9000,params:{template:'rack'}}).complete,false);
});

test('member endpoints deduplicate shared nodes with stable coordinate identities',()=>{
  const members=[{a:[0,0,0],b:[3,4,0]},{a:[3,4,0],b:[3,4,12]}];
  const nodes=modelNodes({members});assert.equal(nodes.length,3);
  const reversed=modelNodes({members:[...members].reverse()});
  assert.equal(nodes.find(n=>n.position[2]===12).id,reversed.find(n=>n.position[2]===12).id);
});
test('endpoint measurements report physical distance and directional offsets',()=>{
  assert.deepEqual(measureNodes({position:[0,0,0]},{position:[3,4,12]}),{distance:13,delta:[3,4,12]});
  assert.deepEqual(measureNodes({position:[3,4,12]},{position:[0,0,0]}),{distance:13,delta:[-3,-4,-12]});
  assert.throws(()=>measureNodes({position:[NaN,0,0]},{position:[0,0,0]}));
});
