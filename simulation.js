// A deterministic teaching model. Time is a story position, not real trip time.
export const DURATION = 12;
export const FAULT_AT = 4;
export const TRIP_DELAY = 3;
export const SENSITIVITY_MA = 30;
export const CIRCUITS = [
  { id: 'living', name: 'リビング', appliance: '照明・エアコン', limit: 20 },
  { id: 'kitchen', name: 'キッチン', appliance: 'レンジ・ケトル', limit: 20 },
  { id: 'utility', name: '洗面室', appliance: '洗濯機', limit: 20 },
];
export const SCENARIOS = [
  { id: 'normal', number: '01', title: 'いつもの電気', subtitle: '電気はどこを通る？', icon: '⌂', loads: [6, 8, 4], contract: 30, fault: 'none', earth: true, touch: false,
    lesson: '分電盤で電気を分ける', description: '電源から届いた電気は、分電盤を通って各部屋へ。家電を通った電流は、もう一本の線で電源へ戻ります。' },
  { id: 'total', number: '02', title: '家全体で使いすぎ', subtitle: 'アンペアブレーカー', icon: '⚡', loads: [13, 14, 10], contract: 30, fault: 'none', earth: true, touch: false,
    lesson: '家全体の合計を見ている', description: '各回路は20 A未満でも、合計は37 A。契約の30 Aを超えると、アンペアブレーカーが家全体への電気を止めます。' },
  { id: 'branch', number: '03', title: '一つの回路で使いすぎ', subtitle: '配線用遮断器', icon: '⑂', loads: [4, 26, 4], contract: 40, fault: 'none', earth: true, touch: false,
    lesson: '使いすぎた回路だけを止める', description: 'キッチンの回路だけが20 Aを超えます。この例では配線用遮断器がキッチンを遮断し、他の部屋には電気が流れ続けます。' },
  { id: 'short', number: '04', title: 'ショートが起きたら', subtitle: '配線用遮断器', icon: '↯', loads: [4, 6, 4], contract: 40, fault: 'short', earth: true, touch: false,
    lesson: '急に増えた電流を止める', description: 'キッチンで2本の電線が直接つながると、家電を通らず大きな電流が流れます。配線用遮断器が回路を切り離す例です。' },
  { id: 'earth', number: '05', title: '漏電とアース線', subtitle: '漏電遮断器', icon: '⏚', loads: [4, 6, 4], contract: 30, fault: 'leak', earth: true, touch: false,
    lesson: '「行き」と「戻り」の差を見つける', description: '洗濯機の絶縁が壊れると、金属ケースからアース線へ電流が流れます。漏電遮断器は電流の差を検知し、家全体を遮断します。' },
  { id: 'shock', number: '06', title: 'アースがないと？', subtitle: '感電が起こるしくみ', icon: '♙', loads: [4, 6, 4], contract: 30, fault: 'leak', earth: false, touch: true,
    lesson: '人の体が、電気の通り道になる', description: 'アースがない金属ケースは、故障しても電流の逃げ道がないと遮断されないことがあります。人が触れて大地への経路ができると、体に電流が流れます。' },
];

export function getFrame(config, time, manual = {}) {
  const changed = time >= FAULT_AT;
  const requested = changed ? [...config.loads] : [4, 6, 4];
  // Ordinary operation starts directly at the selected loads.
  if (config.id === 'normal') requested.splice(0, 3, ...config.loads);
  const short = changed && config.fault === 'short';
  if (short) requested[1] = 150; // Illustrative only; no fault-impedance calculation.
  const fault = changed && config.fault === 'leak';
  const contact = fault && config.touch && time >= 5.5;
  const faultSupply = manual.amp !== false && manual.rcd !== false && manual.utility !== false;
  // These illustrative paths preserve Kirchhoff's current balance; they are not
  // body/earth resistance calculations or safety thresholds.
  const earthDemand = fault && config.earth && faultSupply ? 50 : 0;
  const bodyDemand = contact && faultSupply ? (config.earth ? 5 : 50) : 0;
  const leakageDemand = earthDemand + bodyDemand;
  const mainEnabled = manual.amp !== false && manual.rcd !== false;
  const branchTrip = requested.map((a, i) => mainEnabled && manual[CIRCUITS[i].id] !== false && a > CIRCUITS[i].limit && time >= FAULT_AT + TRIP_DELAY);
  const rcdAt = config.earth ? FAULT_AT : 5.5;
  const rcdTrip = leakageDemand >= SENSITIVITY_MA && time >= rcdAt + TRIP_DELAY;
  const connectedDemand = requested.reduce((sum, a, i) => sum + (manual[CIRCUITS[i].id] === false ? 0 : a), 0);
  // Branch protection is illustrated first if both limits are exceeded; real
  // selectivity depends on devices, fault current and time-current curves.
  const branchOverload = requested.some((a, i) => manual[CIRCUITS[i].id] !== false && a > CIRCUITS[i].limit);
  const ampTrip = mainEnabled && !branchOverload && connectedDemand > config.contract && time >= FAULT_AT + TRIP_DELAY;
  const ampOn = manual.amp !== false && !ampTrip;
  const rcdOn = manual.rcd !== false && !rcdTrip;
  const branchOn = CIRCUITS.map((c, i) => manual[c.id] !== false && !branchTrip[i]);
  const powered = branchOn.map(on => on && ampOn && rcdOn);
  const loads = requested.map((a, i) => powered[i] ? a : 0);
  const earthMA = powered[2] ? earthDemand : 0;
  const bodyMA = powered[2] ? bodyDemand : 0;
  const leakageMA = earthMA + bodyMA;
  const returning = loads.reduce((a, b) => a + b, 0);
  const outgoing = returning + leakageMA / 1000;
  const caseLive = fault && powered[2];
  const anyTrip = ampTrip || rcdTrip || branchTrip.some(Boolean);
  const anomaly = changed && (fault || short || connectedDemand > config.contract || branchOverload);
  const stage = anyTrip ? 'tripped' : anomaly ? 'fault' : 'normal';
  return { time, stage, requested, loads, ampOn, rcdOn, branchOn, powered,
    ampTrip, rcdTrip, branchTrip, anyTrip, fault, short, contact, caseLive,
    earthMA, bodyMA, leakageMA, outgoing, returning,
    detectedLeakageMA: leakageDemand, connectedDemand, sourceOn: true };
}

export function explain(config, frame) {
  if (frame.rcdTrip) return { title: '漏電遮断器が家全体を遮断', text: '行きと戻りの差を検知して遮断しました。現在の電流は0です。漏電遮断器は感電を完全に防ぐものではなく、アースとの併用が大切です。' };
  if (frame.ampTrip) return { title: 'アンペアブレーカーが遮断', text: `家全体の合計 ${frame.connectedDemand} A が契約 ${config.contract} A を超えました。すべての部屋への電気が止まります。` };
  if (frame.branchTrip.some(Boolean)) { const names=CIRCUITS.filter((c,i)=>frame.branchTrip[i]).map(c=>c.name).join('・');return { title: `${names}の配線用遮断器が遮断`, text: `${names}の電流は0 Aになりました。他の回路が入なら電気は流れ続けます。実際の遮断順序は機器の特性や故障の条件で変わります。` }; }
  if (frame.bodyMA > 0) return { title: '体を通って大地へ流れる＝感電', text: `金属ケース → 手 → 体 → 足 → 大地 → 電源へ。人体にも ${frame.bodyMA} mA が流れる例です。遮断までの短い間にも感電は起こります。` };
  if (frame.earthMA > 0) return { title: 'アース線に漏れた電流が流れる', text: '金属ケース → アース線 → 接地極 → 大地 → 電源の接地点。戻り線を通らない電流のため、漏電遮断器で差が生じます。' };
  if (frame.caseLive) return { title: '電流が流れなくても、触れると危険', text: 'この理想化した例では、大地への経路がないため漏れ電流は0。ケースに電圧が現れていても、漏電遮断器はまだ検知できません。' };
  if (frame.short && frame.powered[1]) return { title: '家電を通らない近道に大きな電流', text: 'ショートした回路に150 Aが流れる例です。行きと戻りは等しく、漏電による差はありません。過電流を検知して遮断します。' };
  if (frame.stage === 'fault') return { title: '電流が上限を超えました', text: config.description };
  if (!frame.powered.some(Boolean)) return { title: '手動で電気の通り道を切りました', text: '家電へ流れる電流は0です。遮断したブレーカーより電源側には、電圧が残っています。' };
  return { title: '電源から家電へ、そして電源へ戻る', text: '黄色は行きの線、青色は戻りの線。通常は同じ大きさの電流が流れ、緑色のアース線には電流は流れません。' };
}
