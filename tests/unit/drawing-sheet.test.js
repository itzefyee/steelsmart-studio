import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULTS,buildAssembly} from '../../model.js';
import {drawingSheet,projectedViews} from '../../drawing-sheet.js';
import {normalizeReviewMark} from '../../studio-tools-model.js';

test('drawing projections use actual model coordinates and all three axes',()=>{
  const views=projectedViews(buildAssembly(DEFAULTS));
  assert.equal(views.length,3);assert.equal(views[0].width,18);assert.equal(views[1].width,24);assert.equal(views[2].height,24);
  assert.ok(views.every(v=>v.segments.length===60));
});
test('drawing sheets escape editable names and retain concept scope and quantities',()=>{
  const svg=drawingSheet(buildAssembly({...DEFAULTS,name:'<script>alert(1)</script> & "quote"'}));
  assert.match(svg,/&lt;script&gt;/);assert.doesNotMatch(svg,/<script>/);assert.match(svg,/CONCEPT CENTERLINES/);assert.match(svg,/432/);assert.match(svg,/PLAN VIEW/);assert.ok(!svg.includes('NaN'));
});
test('saved review marks normalize corrupt fields and keep note text inert',()=>{
  const input={id:'r1',note:'<img src=x onerror=alert(1)>',params:{...DEFAULTS,width:99},camera:{yaw:12,pitch:0,zoom:20,focusId:'C001'},memberId:'C001',created:123};
  const mark=normalizeReviewMark(input);assert.equal(mark.params.width,36);assert.equal(mark.camera.zoom,3);assert.ok(mark.camera.yaw>=-Math.PI&&mark.camera.yaw<=Math.PI);assert.equal(mark.note,input.note);assert.equal(mark.memberId,'C001');assert.equal(mark.created,123);
  assert.equal(normalizeReviewMark(null),null);assert.equal(normalizeReviewMark({note:'',params:DEFAULTS}),null);
  assert.equal(normalizeReviewMark({note:'x',params:DEFAULTS,camera:{zoom:Infinity}}).camera.zoom,1);
});
