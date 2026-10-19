import { PowerScene } from './scene.js';
import { DURATION,getFrame,advancePlayback } from './simulation.js';
const $=s=>document.querySelector(s);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state={started:false,playing:false,time:0,motion:0,speed:1,follow:false};
let world,last=performance.now();
function updateControls(){
  $('#start span').textContent=state.started?'最初から':'スタート';
  $('#pause').disabled=!state.started;$('#timeline').disabled=!state.started;
  $('#pause').innerHTML=state.playing?'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>':'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></svg>';
  $('#pause').setAttribute('aria-label',state.playing?'一時停止':'再開');$('#pause').title=state.playing?'一時停止':'再開';
  $('#follow').classList.toggle('active',state.follow);$('#follow').setAttribute('aria-pressed',String(state.follow));
  $('#timeline').value=state.time;
}
function setFollow(value){state.follow=value;world?.cancelTween();updateControls();}
$('#start').addEventListener('click',()=>{state={...state,started:true,playing:true,time:0,motion:0};world?.overview(true);updateControls();});
$('#pause').addEventListener('click',()=>{state.playing=!state.playing;updateControls();});
$('#reset').addEventListener('click',()=>{state={...state,started:false,playing:false,time:0,motion:0,follow:false};world?.overview(true);updateControls();});
$('#speed').addEventListener('change',e=>{state.speed=Number(e.target.value);});
$('#follow').addEventListener('click',()=>{setFollow(!state.follow);if(!state.follow)world?.overview();});
$('#overview').addEventListener('click',()=>{setFollow(false);world?.overview();});
$('#timeline').addEventListener('input',e=>{state.time=Number(e.target.value);state.motion=state.time;state.playing=false;updateControls();});
try{
  world=new PowerScene($('#scene'),()=>setFollow(false));$('#loading').hidden=true;
}catch(error){
  console.error(error);$('#loading').className='error';$('#loading').innerHTML='3Dを表示できませんでした。<button id="retry">再読み込み</button>';$('#retry').addEventListener('click',()=>location.reload());
  document.querySelectorAll('.playback button,.playback input,.playback select').forEach(el=>{el.disabled=true;});
}
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.08);last=now;if(document.hidden)return;
  state=advancePlayback(state,dt);const frame=getFrame(state.time,state.started);
  world?.render(frame,reduced?state.time:state.motion,state.follow&&state.started,now);
  $('#timeline').value=state.time;
}
updateControls();requestAnimationFrame(animate);
document.addEventListener('visibilitychange',()=>{last=performance.now();});
