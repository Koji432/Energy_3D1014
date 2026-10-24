import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import { BoardLesson } from '../board-lesson.js';
import { createPanelState,operatePanel,advancePanel,getPanelFrame } from '../simulation.js';
import { arcSamples,revealRange } from '../flow-path.js';

const board=new BoardLesson(new THREE.Group());
const lamps=()=>board.loadLights.map(light=>light.material.emissiveIntensity>0);

test('whole-house switch and room switch states render consistently',()=>{
  let state=operatePanel(createPanelState(),'kitchen');
  board.render(getPanelFrame(state),1);
  assert.deepEqual(lamps(),[true,false,true]);assert(board.switches.kitchen.lever.rotation.x>0);
  state=operatePanel(state,'amp');board.render(getPanelFrame(state),1);
  assert.deepEqual(lamps(),[false,false,false]);assert(board.switches.amp.lever.rotation.x>0);
  assert(board.switches.living.lever.rotation.x<0);
  board.render(getPanelFrame(createPanelState()),1);assert.deepEqual(lamps(),[true,true,true]);
});

test('RCD detection lamp and closed breaker exteriors reflect the tested trip',()=>{
  const state=advancePanel(operatePanel(createPanelState(),'test'),2);
  board.render(getPanelFrame(state),2);
  assert(board.detectionLamp.material.emissiveIntensity>0);
  assert(board.switches.rcd.lever.rotation.x>0);assert.deepEqual(lamps(),[false,false,false]);
  const actions=new Set(board.pickables.map(mesh=>mesh.userData.action));
  assert.deepEqual([...actions].sort(),['amp','kitchen','living','rcd','test','utility']);
});

test('curved wire particles use exactly the tube center at each arc-length ring',()=>{
  const curve=new THREE.CatmullRomCurve3([[0,0,0],[.1,4,1],[12,3,0],[12.4,0,0]].map(p=>new THREE.Vector3(...p)));
  const geometry=new THREE.TubeGeometry(curve,100,.1,8,false),samples=arcSamples(curve);
  const vertices=geometry.attributes.position;
  for(let ring=0;ring<=100;ring+=5){
    const center=new THREE.Vector3();
    for(let radial=0;radial<8;radial++)center.add(new THREE.Vector3().fromBufferAttribute(vertices,ring*9+radial));
    center.divideScalar(8);assert(center.distanceTo(samples[ring*5])<.00001);
  }
});

test('flow reveal draws only complete rings and never extends beyond the arrival front',()=>{
  const curve=new THREE.LineCurve3(new THREE.Vector3(),new THREE.Vector3(10,0,0));
  const geometry=new THREE.TubeGeometry(curve,40,.1,7,false);
  for(let p=0;p<=1;p+=.017){
    const range=revealRange(geometry,p);assert.equal(range.count%42,0);assert(range.front<=p);
    const reverse=revealRange(geometry,p,true);assert.equal(reverse.start+reverse.count,geometry.index.count);
  }
  assert.equal(revealRange(geometry,1).count,geometry.index.count);
  assert.equal(revealRange(geometry,0).count,0);
});
