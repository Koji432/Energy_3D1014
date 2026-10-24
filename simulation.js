// Story time illustrates the route, not real startup or propagation speed.
export const DURATION = 22;
export const TIMING = {
  fire: [0, .6], water: [.3, 1.1], steam: [1.1, 1.6], turbine: [1.6, 2.2],
  generation: [2.2, 4], transmission: [4, 9], substation: [9, 11],
  distribution: [11, 15], service: [15, 18], home: [18, 19],
  return: [19, 21], light: [21, 22]
};

// Connected sections inside a stage must energize in this order.
export const ROUTE_SPANS = {
  substationIn: [0, .6], substationOut: [.6, 1],
  distributionLine: [0, .84], transformerTap: [.84, 1],
  feedwater: [0, .45], boiler: [.45, 1]
};

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

export function routeProgress(frame, stage, span = [0, 1]) {
  return progress(frame[stage] ?? 0, ...span);
}

export function advancePlayback(state, delta) {
  if (state.mode === 'lesson' || !state.playing || !state.started) return state;
  const elapsed = (Number.isFinite(delta) ? Math.max(0, Math.min(delta, .1)) : 0)
    * (Number.isFinite(state.speed) ? Math.max(0, state.speed) : 1);
  return { ...state, time: Math.min(DURATION, state.time + elapsed), motion: state.motion + elapsed };
}

export const ROOM_KEYS = ['living', 'kitchen', 'utility'];
export const LEAK_TEST_DELAY = 1.2; // Slowed only so detection is observable.

export function createPanelState() {
  return {
    switches: { amp: true, rcd: true, living: true, kitchen: true, utility: true },
    testElapsed: null, detected: false, motion: 0
  };
}

export function operatePanel(state, action) {
  if (action === 'reset') return createPanelState();
  if (action === 'test') {
    if (!state.switches.amp || !state.switches.rcd || state.testElapsed !== null) return state;
    // The RCD test circuit creates an imbalance independently of room switches.
    return { ...state, testElapsed: 0, detected: false };
  }
  if (!Object.hasOwn(state.switches, action)) return state;
  const switches = { ...state.switches, [action]: !state.switches[action] };
  return {
    ...state, switches,
    testElapsed: switches.amp && switches.rcd ? state.testElapsed : null,
    detected: action === 'rcd' ? false : state.detected
  };
}

export function advancePanel(state, delta) {
  const elapsed = Number.isFinite(delta) ? Math.max(0, delta) : 0;
  const next = { ...state, motion: state.motion + elapsed };
  if (state.testElapsed === null) return next;
  next.testElapsed += elapsed;
  if (next.testElapsed >= LEAK_TEST_DELAY) {
    next.switches = { ...state.switches, rcd: false };
    next.testElapsed = null;
    next.detected = true;
  }
  return next;
}

export function getPanelFrame(state) {
  const main = state.switches.amp && state.switches.rcd;
  return {
    switches: state.switches,
    live: { main, branches: ROOM_KEYS.map(key => main && state.switches[key]) },
    testing: state.testElapsed !== null,
    detected: state.detected,
    testAvailable: main && state.testElapsed === null
  };
}
