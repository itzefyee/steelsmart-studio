import test from 'node:test';
import assert from 'node:assert/strict';
import {planStock,materialScenario,stockCSV} from '../../material-planner.js';

const member=(id,kind,length)=>({id,kind,profile:kind==='column'?'HEA 240':'IPE 240',length});
test('stock layouts conserve lengths, separate profiles and allocate every fitting member once',()=>{
  const model={members:[member('C1','column',4),member('C2','column',1.997),member('B1','beam',2),member('C3','column',7)]};
  const plan=planStock(model,{stockLength:6,kerf:.003});
  assert.equal(plan.bars.length,2);assert.deepEqual(plan.oversize.map(m=>m.id),['C3']);
  assert.deepEqual(plan.bars.flatMap(b=>b.cuts.map(c=>c.id)).sort(),['B1','C1','C2']);
  assert.equal(plan.stockLength,12);assert.ok(Math.abs(plan.usedLength-7.997)<1e-10);assert.ok(Math.abs(plan.kerfLength-.003)<1e-10);assert.ok(Math.abs(plan.wasteLength-4)<1e-10);
  assert.ok(plan.bars.every(b=>b.cuts.every(c=>c.profile===b.profile)));
  assert.match(stockCSV(plan),/C3.*OVERSIZE/);
});
test('saw kerf prevents falsely fitting exact-length pairs and one cut has no inter-cut kerf',()=>{
  const model={members:[member('C1','column',3),member('C2','column',3)]};
  assert.equal(planStock(model,{stockLength:6,kerf:0}).bars.length,1);
  const result=planStock(model,{stockLength:6,kerf:.003});assert.equal(result.bars.length,2);assert.equal(result.kerfLength,0);
});
test('material scenarios use explicit finite factors including zero',()=>{
  assert.deepEqual(materialScenario({mass:1000},{rate:2.2,carbonFactor:1.4}),{cost:2200,carbon:1400});
  assert.deepEqual(materialScenario({mass:1000},{rate:0,carbonFactor:0}),{cost:0,carbon:0});
  assert.throws(()=>materialScenario({mass:1000},{rate:-2,carbonFactor:1}));
  assert.throws(()=>planStock({members:[]},{stockLength:0,kerf:.003}));
  assert.throws(()=>planStock({members:[]},{stockLength:6,kerf:NaN}));
});
