import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DURATION, TIMING, LESSON_DURATION, LESSON_STAGES, getFrame, getLessonFrame, advancePlayback } from '../simulation.js';

test('reset extinguishes all stages, even after a completed run', () => {
  const frame = getFrame(DURATION, false);
  for (const key of Object.keys(TIMING)) assert.equal(frame[key], 0);
  assert.equal(frame.complete, false);
});

test('generation is ready at four seconds and grid stages energize in source-to-load order', () => {
  assert.equal(getFrame(4).generation, 1);
  assert.equal(DURATION, 22);
  const keys = ['generation', 'transmission', 'substation', 'distribution', 'service', 'home'];
  for (let i = 1; i < keys.length; i++) {
    const frame = getFrame(TIMING[keys[i]][0]);
    assert.equal(frame[keys[i]], 0);
    assert.equal(frame[keys[i - 1]], 1);
  }
});

test('house lights wait for service and panel supply', () => {
  assert.equal(getFrame(17).home, 0);
  assert.equal(getFrame(19).light, 0);
  const frame = getFrame(DURATION);
  assert.equal(frame.service, 1);
  assert.equal(frame.home, 1);
  assert.equal(frame.light, 1);
  assert.equal(frame.complete, true);
});

test('pause freezes story and mechanical/particle motion together in either mode', () => {
  for (const mode of ['journey', 'lesson']) {
    const state = { started: true, playing: false, mode, time: 17, motion: 17, speed: 2 };
    assert.deepEqual(advancePlayback(state, .1), state);
    assert.deepEqual(advancePlayback({ ...state, started: false, playing: true }, .1), { ...state, started: false, playing: true });
  }
});

test('speed affects both story and animation motion', () => {
  const state = { started: true, playing: true, time: 5, motion: 5, speed: 2 };
  const next = advancePlayback(state, .1);
  assert.equal(next.time, 5.2);
  assert.equal(next.motion, 5.2);
});

test('each playback mode caps its own timeline but continues visible operation', () => {
  for (const [mode, duration] of [['journey', DURATION], ['lesson', LESSON_DURATION]]) {
    const state = { started: true, playing: true, mode, time: duration - .05, motion: 45, speed: 1 };
    const next = advancePlayback(state, .1);
    assert.equal(next.time, duration);
    assert.equal(next.motion, 45.1);
    assert.equal(advancePlayback(next, .1).time, duration);
  }
});

test('scrubbing the journey backward reproducibly extinguishes downstream equipment', () => {
  const before = getFrame(6);
  getFrame(DURATION);
  assert.deepEqual(getFrame(6), before);
  assert.equal(before.home, 0);
  assert.equal(before.light, 0);
  assert(before.transmission > 0);
});

test('invalid or negative time cannot energize journey stages', () => {
  for (const time of [-3, NaN]) {
    for (const key of Object.keys(TIMING)) assert.equal(getFrame(time)[key], 0);
  }
});

test('normal home supply is balanced, with all three branches powered', () => {
  const frame = getLessonFrame(3);
  assert.equal(frame.key, 'normal');
  assert.deepEqual(frame.currents, [4, 6, 3]);
  assert.equal(frame.outgoingA, 13);
  assert.equal(frame.returningA, 13);
  assert.equal(frame.leakageMA, 0);
  assert.deepEqual(frame.live, { main: true, branches: [true, true, true] });
  assert.equal(frame.activeBreaker, null);
});

test('contract overload trips the whole house while each branch remains below its own rating', () => {
  assert.deepEqual(getLessonFrame(7.9).demand, [4, 6, 3]);
  const before = getLessonFrame(8);
  assert.deepEqual(before.currents, [12, 11, 13]);
  assert(before.currents.every((amps, index) => amps < before.ratings[index]));
  assert.equal(before.totalCurrent, 36);
  assert(before.totalCurrent > before.contractA);
  assert.equal(before.overloadActive, true);
  assert.equal(before.tripped.amp, false);
  const after = getLessonFrame(11);
  assert.equal(after.tripped.amp, true);
  assert.deepEqual(after.demand, [12, 11, 13]);
  assert.deepEqual(after.currents, [0, 0, 0]);
  assert.equal(after.outgoingA, 0);
  assert.equal(after.returningA, 0);
  assert.deepEqual(after.live, { main: false, branches: [false, false, false] });
});

test('one branch can overload below the contract rating and only that branch stops', () => {
  const before = getLessonFrame(17);
  assert.deepEqual(before.currents, [1, 26, 1]);
  assert.equal(before.totalCurrent, 28);
  assert(before.totalCurrent < before.contractA);
  assert.equal(before.tripped.kitchen, false);
  const after = getLessonFrame(20);
  assert.deepEqual(after.demand, [1, 26, 1]);
  assert.deepEqual(after.currents, [1, 0, 1]);
  assert.equal(after.totalCurrent, 2);
  assert.equal(after.tripped.kitchen, true);
  assert.equal(after.tripped.amp, false);
  assert.equal(after.tripped.rcd, false);
  assert.deepEqual(after.live, { main: true, branches: [true, false, true] });
});

test('short circuit is isolated by the branch breaker in this selected-coordination example', () => {
  const before = getLessonFrame(26);
  assert.equal(before.currents[1], 150);
  assert.equal(before.shortActive, true);
  assert.equal(before.tripped.kitchen, false);
  const after = getLessonFrame(27.25);
  assert.equal(after.shortActive, false);
  assert.deepEqual(after.currents, [4, 0, 3]);
  assert.equal(after.tripped.kitchen, true);
  assert.equal(after.tripped.amp, false);
  assert.equal(after.live.main, true);
});

test('earth leakage is detected as a current imbalance then the RCD cuts all supply', () => {
  const before = getLessonFrame(34);
  assert.equal(before.leakageActive, true);
  assert.equal(before.leakageMA, 50);
  assert.equal(before.outgoingA, 13.05);
  assert.equal(before.returningA, 13);
  assert(Math.abs((before.outgoingA - before.returningA) * 1000 - before.leakageMA) < 1e-8);
  assert(before.totalCurrent < before.contractA);
  assert(before.currents.every((amps, index) => amps < before.ratings[index]));
  const after = getLessonFrame(35.5);
  assert.equal(after.tripped.rcd, true);
  assert.equal(after.tripped.amp, false);
  assert.equal(after.leakageActive, false);
  assert.equal(after.leakageMA, 0);
  assert.equal(after.outgoingA, 0);
  assert.equal(after.returningA, 0);
  assert.deepEqual(after.currents, [0, 0, 0]);
  assert.deepEqual(after.live, { main: false, branches: [false, false, false] });
});

test('every new lesson stage independently restores normal supply before its demonstration', () => {
  for (const stage of LESSON_STAGES) {
    const frame = getLessonFrame(stage.start);
    assert.equal(frame.key, stage.key);
    assert.equal(frame.activeBreaker, stage.breaker);
    assert.equal(frame.elapsed, 0);
    assert.deepEqual(frame.currents, [4, 6, 3]);
    assert.equal(Object.values(frame.tripped).some(Boolean), false);
    assert.equal(frame.tripProgress, 0);
  }
});

test('lesson scrubbing restores the precise pre-trip state without history dependence', () => {
  for (const time of [8.5, 17.5, 26.5, 34.5]) {
    const before = getLessonFrame(time);
    assert(before.tripProgress > 0 && before.tripProgress < 1);
    getLessonFrame(LESSON_DURATION);
    assert.deepEqual(getLessonFrame(time), before);
  }
});

test('stopped lessons never supply current or retain a previous trip', () => {
  for (const time of [0, 12, 21, 28, 40]) {
    const frame = getLessonFrame(time, false);
    assert.deepEqual(frame.currents, [0, 0, 0]);
    assert.equal(frame.outgoingA, 0);
    assert.equal(frame.returningA, 0);
    assert.equal(frame.leakageMA, 0);
    assert.equal(Object.values(frame.tripped).some(Boolean), false);
    assert.equal(frame.live.main, false);
    assert.equal(frame.complete, false);
  }
});

test('lesson time clamps to its endpoints and the final state remains isolated', () => {
  for (const time of [-3, NaN, Infinity]) assert.deepEqual(getLessonFrame(time), getLessonFrame(0));
  const frame = getLessonFrame(100);
  assert.equal(frame.time, LESSON_DURATION);
  assert.equal(frame.complete, true);
  assert.equal(frame.tripped.rcd, true);
  assert.equal(frame.totalCurrent, 0);
});
