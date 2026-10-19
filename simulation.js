// Story time illustrates energy conversion, not real startup or propagation speed.
export const DURATION=36;
export const TIMING={fire:[0,2],water:[1,4],steam:[3,6],turbine:[6,8],generation:[8,11],transmission:[11,18],substation:[18,21],distribution:[21,26],service:[26,30],home:[30,34],light:[33,35]};
export function progress(time,start,end){return Math.max(0,Math.min(1,(time-start)/(end-start)));}
export function getFrame(time,started=true){
  const t=Number.isFinite(time)?Math.max(0,time):0,frame={time:t,started};
  for(const [key,[start,end]]of Object.entries(TIMING))frame[key]=started?progress(t,start,end):0;
  frame.complete=started&&t>=DURATION;return frame;
}
export function advancePlayback(state,delta){
  if(!state.playing||!state.started)return state;
  const elapsed=Math.max(0,Math.min(delta,.1))*state.speed;
  return {...state,time:Math.min(DURATION,state.time+elapsed),motion:state.motion+elapsed};
}
