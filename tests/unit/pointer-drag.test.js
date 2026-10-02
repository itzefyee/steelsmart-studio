import test from 'node:test';
import assert from 'node:assert/strict';
import {bindPointerDrag} from '../../pointer-drag.js';

function fixture(){const target=new EventTarget(),owner=new EventTarget(),captured=new Set(),moves=[],ends=[];target.setPointerCapture=id=>captured.add(id);target.hasPointerCapture=id=>captured.has(id);target.releasePointerCapture=id=>captured.delete(id);const dispose=bindPointerDrag(target,{onMove:(x,y)=>moves.push([x,y]),onEnd:(event,total,cancelled)=>ends.push({total,cancelled})},owner);const event=(type,id,x=0,y=0,button=0)=>{const e=new Event(type);Object.assign(e,{pointerId:id,clientX:x,clientY:y,button});target.dispatchEvent(e);};return {target,owner,captured,moves,ends,event,dispose};}
test('a drag owns its pointer and ignores other pointers and secondary buttons',()=>{
  const f=fixture();f.event('pointerdown',8,0,0,2);f.event('pointermove',8,30);assert.deepEqual(f.moves,[]);
  f.event('pointerdown',1,10,20);f.event('pointerdown',2,100,200);f.event('pointermove',2,300);f.event('pointerup',2,300);f.event('pointermove',1,15,27);f.event('pointerup',1,15,27);
  assert.deepEqual(f.moves,[[5,7]]);assert.deepEqual(f.ends,[{total:12,cancelled:false}]);assert.equal(f.captured.size,0);f.dispose();
});
test('cancel, capture loss and blur release the drag and allow the next gesture',()=>{
  for(const reason of ['pointercancel','lostpointercapture','blur']){const f=fixture();f.event('pointerdown',1);reason==='blur'?f.owner.dispatchEvent(new Event('blur')):f.event(reason,1);f.event('pointermove',1,100);assert.deepEqual(f.moves,[]);assert.equal(f.ends[0].cancelled,true);assert.equal(f.captured.size,0);f.event('pointerdown',2);f.event('pointermove',2,3,4);assert.deepEqual(f.moves,[[3,4]]);f.dispose();f.event('pointerdown',3);f.event('pointermove',3,8);assert.equal(f.moves.length,1);}
});
