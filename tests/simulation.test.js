import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS, getFrame } from '../simulation.js';
const s=id=>SCENARIOS.find(s=>s.id===id);
test('normal: all branches remain supplied, with equal outgoing/return current',()=>{
  for(const t of [0,5,12]){const f=getFrame(s('normal'),t);assert.equal(f.outgoing,18);assert.equal(f.returning,18);assert.equal(f.leakageMA,0);assert.deepEqual(f.powered,[true,true,true]);assert.equal(f.anyTrip,false);}
});
test('whole-home overload: each branch below 20 A, only contract breaker trips',()=>{
  const before=getFrame(s('total'),5);assert.equal(before.outgoing,37);assert(before.requested.every(a=>a<20));
  const f=getFrame(s('total'),8);assert.equal(f.ampTrip,true);assert.equal(f.rcdTrip,false);assert.deepEqual(f.branchTrip,[false,false,false]);assert.deepEqual(f.loads,[0,0,0]);
});
test('branch overload: kitchen stops, other rooms keep their supply',()=>{
  const f=getFrame(s('branch'),8);assert.equal(f.ampTrip,false);assert.equal(f.rcdTrip,false);assert.deepEqual(f.branchTrip,[false,true,false]);assert.deepEqual(f.loads,[4,0,4]);
});
test('short circuit: equal L/N currents and branch isolation in this teaching example',()=>{
  const before=getFrame(s('short'),5);assert.equal(before.loads[1],150);assert.equal(before.leakageMA,0);assert.equal(before.outgoing,before.returning);
  const f=getFrame(s('short'),9);assert.deepEqual(f.loads,[4,0,4]);assert.equal(f.rcdTrip,false);
});
test('earth leakage: the imbalance equals the earth path, then all load currents stop',()=>{
  const before=getFrame(s('earth'),5);assert.equal(before.earthMA,50);assert.equal(before.bodyMA,0);assert(Math.abs(before.outgoing-before.returning-.05)<1e-10);
  const f=getFrame(s('earth'),8);assert.equal(f.rcdTrip,true);assert.equal(f.outgoing,0);assert.equal(f.earthMA,0);assert.equal(f.detectedLeakageMA,50);assert.equal(f.caseLive,false);
});
test('without earth: case can be live before touch even though leakage is zero',()=>{
  const f=getFrame(s('shock'),5);assert.equal(f.caseLive,true);assert.equal(f.leakageMA,0);assert.equal(f.anyTrip,false);
  const floating={...s('shock'),touch:false};assert.equal(getFrame(floating,12).rcdTrip,false);assert.equal(getFrame(floating,12).caseLive,true);
});
test('touch creates a body path before RCD trip, with no earth-wire current',()=>{
  const before=getFrame(s('shock'),6);assert.equal(before.bodyMA,50);assert.equal(before.earthMA,0);assert.equal(before.rcdTrip,false);
  const after=getFrame(s('shock'),9);assert.equal(after.rcdTrip,true);assert.equal(after.bodyMA,0);assert.equal(after.outgoing,0);
});
test('earth does not imply zero body current when both paths are present',()=>{
  const f=getFrame({...s('earth'),touch:true},6);assert.equal(f.bodyMA,5);assert.equal(f.earthMA,50);assert.equal(f.leakageMA,55);assert(Math.abs(f.outgoing-f.returning-.055)<1e-10);
});
test('manual branch isolation removes leakage while retaining other rooms',()=>{
  const f=getFrame(s('earth'),10,{utility:false});assert.equal(f.leakageMA,0);assert.equal(f.rcdTrip,false);assert.deepEqual(f.powered,[true,true,false]);
});
test('manual main isolation prevents load or fault current',()=>{
  for(const id of ['amp','rcd']){const f=getFrame(s('shock'),6,{[id]:false});assert.equal(f.outgoing,0);assert.equal(f.bodyMA,0);assert.equal(f.caseLive,false);}
});
test('a manually open upstream breaker prevents automatic overcurrent trips',()=>{
  for(const scenario of ['total','branch','short'])for(const id of ['amp','rcd']){const f=getFrame(s(scenario),12,{[id]:false});assert.equal(f.anyTrip,false);assert.equal(f.outgoing,0);}
});
test('scrubbing back from a trip restores the earlier state deterministically',()=>{
  const a=getFrame(s('earth'),5);getFrame(s('earth'),12);assert.deepEqual(getFrame(s('earth'),5),a);
});
