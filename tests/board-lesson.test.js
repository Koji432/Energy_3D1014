import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import { BoardLesson } from '../board-lesson.js';
import { getLessonFrame } from '../simulation.js';

const board=new BoardLesson(new THREE.Group());
const lamps=()=>board.loadLights.map(light=>light.material.emissiveIntensity>0);

test('contract trip opens the whole-house contact and extinguishes all rooms',()=>{
  board.render(getLessonFrame(12),12);
  assert(board.switches.amp.contact.rotation.z>0);
  assert.equal(board.switches.rcd.contact.rotation.z,0);
  assert.deepEqual(lamps(),[false,false,false]);
  assert(board.flows.every(flow=>!flow.particles.visible));
});

test('branch trip opens only the kitchen contact and retains other room flows',()=>{
  board.render(getLessonFrame(21),21);
  assert.equal(board.switches.amp.contact.rotation.z,0);
  assert(board.switches.kitchen.contact.rotation.z>0);
  assert.equal(board.switches.living.contact.rotation.z,0);
  assert.deepEqual(lamps(),[true,false,true]);
  assert(board.flows.filter(flow=>flow.kind==='branch'&&flow.branch===1).every(flow=>!flow.particles.visible));
  assert(board.flows.filter(flow=>flow.kind==='branch'&&flow.branch===0).every(flow=>flow.particles.visible));
});

test('earth current reaches the source before the RCD opens both conductors',()=>{
  board.render(getLessonFrame(35),35);
  assert(board.flows.filter(flow=>flow.kind==='earth').every(flow=>flow.particles.visible));
  assert(board.leakFlash.visible);
  board.render(getLessonFrame(36),36);
  assert(board.switches.rcd.contact.rotation.z>0);
  assert(board.switches.rcd.neutralContact.rotation.z>0);
  assert.equal(board.switches.amp.contact.rotation.z,0);
  assert.deepEqual(lamps(),[false,false,false]);
  assert(board.flows.filter(flow=>flow.kind==='earth').every(flow=>!flow.particles.visible));
});

test('rewinding restores closed contacts and normal room lighting',()=>{
  board.render(getLessonFrame(12),12);
  board.render(getLessonFrame(1),1);
  assert(Object.values(board.switches).every(device=>device.contact.rotation.z===0));
  assert.deepEqual(lamps(),[true,true,true]);
  assert.equal(board.leakFlash.visible,false);
});
