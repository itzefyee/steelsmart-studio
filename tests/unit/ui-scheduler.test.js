import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameTask} from '../../ui-scheduler.js';

function clock(){let next=0;const jobs=new Map();return {request:fn=>{jobs.set(++next,fn);return next;},cancel:id=>jobs.delete(id),tick(){const pending=[...jobs.values()];jobs.clear();pending.forEach(fn=>fn());},get size(){return jobs.size;}};}
test('a frame task coalesces bursts and uses the latest complete arguments',()=>{
  const timer=clock(),calls=[],task=createFrameTask((...args)=>calls.push(args),timer);
  for(let i=0;i<50;i++)task(i,'model');assert.equal(timer.size,1);assert.deepEqual(calls,[]);
  timer.tick();assert.deepEqual(calls,[[49,'model']]);assert.equal(timer.size,0);
});
test('flush commits once immediately and cancellation prevents obsolete work',()=>{
  const timer=clock(),calls=[],task=createFrameTask(value=>calls.push(value),timer);
  task('drag');task.flush();timer.tick();assert.deepEqual(calls,['drag']);
  task('obsolete');task.cancel();timer.tick();task.flush();assert.deepEqual(calls,['drag']);
  task('new');timer.tick();assert.deepEqual(calls,['drag','new']);
});
test('a callback can schedule a new frame without losing it',()=>{
  const timer=clock(),calls=[],task=createFrameTask(value=>{calls.push(value);if(value===1)task(2);},timer);
  task(1);timer.tick();assert.deepEqual(calls,[1]);assert.equal(timer.size,1);timer.tick();assert.deepEqual(calls,[1,2]);
});
