import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DURATION,TIMING,getFrame,advancePlayback } from '../simulation.js';
test('reset extinguishes all stages, even after a completed run',()=>{
  const f=getFrame(DURATION,false);for(const key of Object.keys(TIMING))assert.equal(f[key],0);assert.equal(f.complete,false);
});
test('grid stages energize in physical source-to-load order',()=>{
  const keys=['generation','transmission','substation','distribution','service','home'];
  for(let i=1;i<keys.length;i++){const f=getFrame(TIMING[keys[i]][0]);assert.equal(f[keys[i]],0);assert.equal(f[keys[i-1]],1);}
});
test('house lights wait for the service and panel',()=>{
  assert.equal(getFrame(29).home,0);assert.equal(getFrame(32).light,0);
  const f=getFrame(36);assert.equal(f.service,1);assert.equal(f.home,1);assert.equal(f.light,1);
});
test('pause freezes story and mechanical/particle motion together',()=>{
  const s={started:true,playing:false,time:17,motion:17,speed:2};assert.deepEqual(advancePlayback(s,.1),s);
});
test('speed affects both story and animation motion',()=>{
  const s={started:true,playing:true,time:5,motion:5,speed:2},next=advancePlayback(s,.1);assert.equal(next.time,5.2);assert.equal(next.motion,5.2);
});
test('completed tour keeps operating until paused',()=>{
  const s={started:true,playing:true,time:36,motion:40,speed:1},next=advancePlayback(s,.1);assert.equal(next.time,36);assert.equal(next.motion,40.1);
});
test('scrubbing backward reproducibly extinguishes downstream equipment',()=>{
  const before=getFrame(12);getFrame(36);assert.deepEqual(getFrame(12),before);assert.equal(before.home,0);assert.equal(before.light,0);assert(before.transmission>0);
});
test('invalid or negative time cannot energize stages',()=>{
  for(const time of [-3,NaN])for(const key of Object.keys(TIMING))assert.equal(getFrame(time)[key],0);
});
