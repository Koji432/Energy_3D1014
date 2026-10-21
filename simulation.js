// Story time illustrates energy conversion, not real startup or propagation speed.
export const DURATION = 22;
export const TIMING = {
  fire: [0, .6], water: [.3, 1.2], steam: [.7, 1.7], turbine: [1.2, 2.2],
  generation: [2.2, 4], transmission: [4, 9], substation: [9, 11],
  distribution: [11, 15], service: [15, 18], home: [18, 20], light: [19, 21]
};

export const LESSON_DURATION = 42;
export const LESSON_STAGES = [
  { key: 'normal', start: 0, end: 6, title: '正常な電流', breaker: null },
  { key: 'amp', start: 6, end: 15, title: 'アンペアブレーカー', breaker: 'amp' },
  { key: 'branch', start: 15, end: 24, title: '配線用遮断器 · 過負荷', breaker: 'branch' },
  { key: 'short', start: 24, end: 32, title: '配線用遮断器 · 短絡', breaker: 'branch' },
  { key: 'leak', start: 32, end: 42, title: '漏電遮断器', breaker: 'rcd' }
];

const NORMAL_DEMAND = [4, 6, 3];
const FAULT_START = 2;
// Deliberately slowed for observation; these are not breaker operating curves.
const TRIP_AT = { amp: 5, branch: 5, short: 3.25, leak: 3.5 };
const BRANCH_KEYS = ['living', 'kitchen', 'utility'];

export function progress(time, start, end) {
  return Math.max(0, Math.min(1, (time - start) / (end - start)));
}

export function getFrame(time, started = true) {
  const t = Number.isFinite(time) ? Math.max(0, time) : 0;
  const frame = { time: t, started };
  for (const [key, [start, end]] of Object.entries(TIMING)) {
    frame[key] = started ? progress(t, start, end) : 0;
  }
  frame.complete = started && t >= DURATION;
  return frame;
}

function lessonMessage(key, fault, tripped, started) {
  if (!started) return '再生すると、電流とブレーカーの動きを確認できます。';
  if (key === 'normal') return '行きと帰りの電流が等しく、3つの回路に電気が流れます。';
  if (!fault) return '家全体で30A、各回路で20Aを超えていません。';
  if (key === 'amp') return tripped
    ? '契約電流を超えたため、アンペアブレーカーが家全体の電気を止めました。'
    : '各回路は20A以下でも、家全体の36Aが契約の30Aを超えます。';
  if (key === 'branch') return tripped
    ? '台所の配線用遮断器だけが切れ、ほかの回路には電気が流れます。'
    : '台所の26Aが配線用遮断器の20Aを超えています。';
  if (key === 'short') return tripped
    ? 'この例では台所の配線用遮断器が先に切れ、短絡電流を止めます。'
    : '台所で短絡が起き、大きな電流が流れています。';
  return tripped
    ? '行きと帰りの差を検知した漏電遮断器が、家全体の電気を止めました。'
    : '洗濯機のケースからアースへ50mAが漏れ、帰りの電流が少なくなります。';
}

export function getLessonFrame(time, started = true) {
  const t = Number.isFinite(time) ? Math.min(LESSON_DURATION, Math.max(0, time)) : 0;
  const stage = LESSON_STAGES.find(({ end }) => t < end) ?? LESSON_STAGES.at(-1);
  const elapsed = t - stage.start;
  const fault = started && stage.key !== 'normal' && elapsed >= FAULT_START;
  const trip = fault && elapsed >= TRIP_AT[stage.key];
  const demand = [...NORMAL_DEMAND];
  if (fault && stage.key === 'amp') demand.splice(0, 3, 12, 11, 13);
  if (fault && stage.key === 'branch') demand.splice(0, 3, 1, 26, 1);
  if (fault && stage.key === 'short') demand[1] = 150;

  const tripped = { amp: false, rcd: false, living: false, kitchen: false, utility: false };
  if (trip) tripped[stage.breaker === 'branch' ? 'kitchen' : stage.breaker] = true;
  const main = started && !tripped.amp && !tripped.rcd;
  const branches = BRANCH_KEYS.map(key => main && !tripped[key]);
  const leakageActive = fault && stage.key === 'leak' && main;
  const leakageMA = leakageActive ? 50 : 0;
  // demand is the appliance/fault demand; currents includes the earth-fault path.
  const currents = demand.map((amps, index) => branches[index] ? amps : 0);
  if (leakageActive) currents[2] += leakageMA / 1000;
  const totalCurrent = currents.reduce((sum, amps) => sum + amps, 0);
  const outgoingA = totalCurrent;
  const returningA = Number((outgoingA - leakageMA / 1000).toFixed(6));

  return {
    time: t, key: stage.key, title: stage.title,
    message: lessonMessage(stage.key, fault, trip, started),
    elapsed, stageStart: stage.start, stageEnd: stage.end,
    activeBreaker: stage.breaker, contractA: 30, ratings: [20, 20, 20],
    demand, currents, totalCurrent, outgoingA, returningA, leakageMA,
    leakageActive, shortActive: fault && stage.key === 'short' && !trip,
    overloadActive: fault && ['amp', 'branch'].includes(stage.key) && !trip,
    tripped, live: { main, branches },
    tripProgress: fault ? progress(elapsed, FAULT_START, TRIP_AT[stage.key]) : 0,
    complete: started && t >= LESSON_DURATION
  };
}

export function advancePlayback(state, delta) {
  if (!state.playing || !state.started) return state;
  const duration = state.mode === 'lesson' ? LESSON_DURATION : DURATION;
  const elapsed = (Number.isFinite(delta) ? Math.max(0, Math.min(delta, .1)) : 0)
    * (Number.isFinite(state.speed) ? Math.max(0, state.speed) : 1);
  return { ...state, time: Math.min(duration, state.time + elapsed), motion: state.motion + elapsed };
}
