import test from 'node:test';
import assert from 'node:assert/strict';
import {storyState,projectConfig} from '../../experience-math.js';
test('scroll choreography is finite, bounded and continuous',()=>{
  for(let i=-10;i<=110;i++){const s=storyState(i/100);assert.ok(Object.values(s).every(Number.isFinite));assert.ok(s.explosion>=0&&s.explosion<=1);assert.ok(s.structure>=0&&s.structure<=1);}
  assert.equal(storyState(0).chapter,0);assert.equal(storyState(.5).chapter,1);assert.equal(storyState(1).chapter,2);assert.equal(storyState(1).structure,1);
});
test('gallery configurations are supported model inputs',()=>{
  assert.equal(projectConfig('portal').template,'portal');assert.equal(projectConfig('canopy').template,'canopy');assert.equal(projectConfig('rack').template,'rack');assert.equal(projectConfig('bad').template,'portal');
});
