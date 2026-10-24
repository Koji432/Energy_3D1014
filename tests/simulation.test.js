import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DURATION,TIMING,ROUTE_SPANS,getFrame,routeProgress,advancePlayback,createPanelState,operatePanel,advancePanel,getPanelFrame,LEAK_TEST_DELAY } from '../simulation.js';

test('grid stages wait for preceding sections, including the return route and house lighting',()=>{
  const keys=['generation','transmission','substation','distribution','service','home','return','light'];
  assert.equal(getFrame(4).generation,1);
  for(let i=1;i<keys.length;i++){
    const frame=getFrame(TIMING[keys[i]][0]);
    assert.equal(frame[keys[i]],0);assert.equal(frame[keys[i-1]],1);
  }
  assert.equal(getFrame(20).light,0);assert.equal(getFrame(DURATION).light,1);
});

test('substation outlet and transformer taps cannot start before their incoming paths finish',()=>{
  for(const [stage,first,second]of [['substation','substationIn','substationOut'],['distribution','distributionLine','transformerTap'],['water','feedwater','boiler']]){
    for(let t=0;t<DURATION;t+=.013){
      const frame=getFrame(t);
      if(routeProgress(frame,stage,ROUTE_SPANS[first])<1)assert.equal(routeProgress(frame,stage,ROUTE_SPANS[second]),0);
    }
  }
});

test('reset and reverse scrubbing extinguish downstream flows reproducibly',()=>{
  for(const key of Object.keys(TIMING))assert.equal(getFrame(DURATION,false)[key],0);
  const before=getFrame(7);getFrame(DURATION);assert.deepEqual(getFrame(7),before);
  assert.equal(before.distribution,0);assert.equal(before.light,0);
  for(const t of [-2,NaN])for(const key of Object.keys(TIMING))assert.equal(getFrame(t)[key],0);
});

test('playback pauses in panel mode and respects speed and endpoint',()=>{
  const state={mode:'journey',started:true,playing:true,time:5,motion:5,speed:2};
  assert.equal(advancePlayback(state,.1).time,5.2);
  for(const change of [{playing:false},{started:false},{mode:'lesson'}]){
    const paused={...state,...change};assert.deepEqual(advancePlayback(paused,.1),paused);
  }
  assert.equal(advancePlayback({...state,time:DURATION},.1).time,DURATION);
});

test('main switch cuts all rooms and preserves the selected branch switches on restoration',()=>{
  let state=operatePanel(createPanelState(),'kitchen');
  assert.deepEqual(getPanelFrame(state).live.branches,[true,false,true]);
  state=operatePanel(state,'amp');assert.deepEqual(getPanelFrame(state).live.branches,[false,false,false]);
  state=operatePanel(state,'amp');assert.deepEqual(getPanelFrame(state).live.branches,[true,false,true]);
});

test('each branch independently switches exactly one room',()=>{
  for(const [i,key]of ['living','kitchen','utility'].entries()){
    let state=operatePanel(createPanelState(),key);
    assert.deepEqual(getPanelFrame(state).live.branches,[0,1,2].map(n=>n!==i));
    state=operatePanel(state,key);assert.deepEqual(getPanelFrame(state).live.branches,[true,true,true]);
  }
});

test('leak test detects, opens the RCD only, and stays off until explicitly restored',()=>{
  let state=operatePanel(createPanelState(),'test');
  assert.equal(getPanelFrame(state).testing,true);
  assert.deepEqual(getPanelFrame(state).live.branches,[true,true,true]);
  assert.equal(operatePanel(state,'test'),state); // repeated tests cannot postpone the trip
  state=advancePanel(state,LEAK_TEST_DELAY-.01);assert.equal(state.switches.rcd,true);
  state=advancePanel(state,.02);assert.equal(state.detected,true);
  assert.deepEqual(state.switches,{amp:true,rcd:false,living:true,kitchen:true,utility:true});
  assert.deepEqual(getPanelFrame(state).live.branches,[false,false,false]);
  state=advancePanel(state,60);assert.equal(state.switches.rcd,false);
  state=operatePanel(state,'rcd');assert.equal(state.detected,false);
  assert.deepEqual(getPanelFrame(state).live.branches,[true,true,true]);
});

test('RCD can be manually switched and its internal test is independent of room loads',()=>{
  let state=createPanelState();
  for(const key of ['living','kitchen','utility'])state=operatePanel(state,key);
  state=advancePanel(operatePanel(state,'test'),LEAK_TEST_DELAY);
  assert.equal(state.detected,true);assert.equal(state.switches.rcd,false);
  state=operatePanel(state,'rcd');assert.equal(state.switches.rcd,true);
  state=operatePanel(state,'rcd');assert.equal(state.switches.rcd,false);assert.equal(state.detected,false);
});

test('leak tests require upstream power and are cancelled if it is switched off',()=>{
  let state=operatePanel(createPanelState(),'amp');assert.equal(operatePanel(state,'test'),state);
  state=operatePanel(operatePanel(createPanelState(),'test'),'amp');
  state=advancePanel(state,5);assert.equal(state.detected,false);assert.equal(state.testElapsed,null);
  assert.equal(state.switches.rcd,true);
});

test('reset clears a detected fault and all manual choices',()=>{
  let state=operatePanel(createPanelState(),'kitchen');
  state=advancePanel(operatePanel(state,'test'),2);
  assert.deepEqual(operatePanel(state,'reset'),createPanelState());
});
