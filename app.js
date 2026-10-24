import { PowerScene } from './scene.js';
import { DURATION,getFrame,advancePlayback,createPanelState,operatePanel,advancePanel,getPanelFrame } from './simulation.js';
const $=s=>document.querySelector(s);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state={mode:'journey',started:false,playing:false,time:0,motion:0,speed:1,follow:true};
let panel=createPanelState(),savedJourney=null;
let world,last=performance.now(),lastLessonSignature='';
function updateControls(){
  const lesson=state.mode==='lesson';
  document.body.classList.toggle('lesson-mode',lesson);$('#lesson-panel').hidden=!lesson;$('#board-labels').hidden=!lesson;$('#journey-labels').hidden=lesson;
  $('.playback').hidden=lesson;
  $('#start span').textContent=state.started?'最初から':'スタート';
  $('#pause').disabled=!state.started;$('#timeline').disabled=!state.started;
  $('#pause').innerHTML=state.playing?'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>':'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></svg>';
  $('#pause').setAttribute('aria-label',state.playing?'一時停止':'再開');$('#pause').title=state.playing?'一時停止':'再開';
  $('#follow').classList.toggle('active',state.follow);$('#follow').setAttribute('aria-pressed',String(state.follow));$('#timeline').value=state.time;
}
function setFollow(value){state.follow=value;world?.cancelTween();updateControls();}
function enterLesson(){
  if(state.mode==='lesson')return;
  savedJourney={...state};
  state={...state,mode:'lesson',playing:false,follow:false};
  world?.setMode('lesson');lastLessonSignature='';updateControls();
}
function backToJourney(){
  if(state.mode!=='lesson')return;
  state={...savedJourney,mode:'journey',follow:false};savedJourney=null;
  world?.setMode('journey');world?.overview();updateControls();
}
function overview(){setFollow(false);world?.overview();}
function operate(action){panel=operatePanel(panel,action);lessonUI(getPanelFrame(panel));}
$('#start').addEventListener('click',()=>{
  state={...state,started:true,playing:true,time:0,motion:0,follow:true};world?.overview(true);updateControls();
});
$('#pause').addEventListener('click',()=>{state.playing=!state.playing;updateControls();});
$('#reset').addEventListener('click',()=>{state={...state,started:false,playing:false,time:0,motion:0,follow:true};world?.overview(true);updateControls();});
$('#speed').addEventListener('change',e=>{state.speed=Number(e.target.value);});
$('#follow').addEventListener('click',()=>{setFollow(!state.follow);if(!state.follow)world?.overview();});
$('#overview').addEventListener('click',overview);
$('#back-journey').addEventListener('click',backToJourney);
$('#panel-reset').addEventListener('click',()=>operate('reset'));
for(const id of ['#home','#label-house'])$(id).addEventListener('click',enterLesson);
for(const button of document.querySelectorAll('[data-action]'))button.addEventListener('click',()=>operate(button.dataset.action));
$('#timeline').addEventListener('input',e=>{state.time=Number(e.target.value);state.motion=state.time;state.playing=false;updateControls();});
$('#scene').addEventListener('keydown',e=>{if(e.key==='Home'&&state.mode==='lesson'){e.preventDefault();backToJourney();}});
function lessonUI(f){
  const signature=JSON.stringify(f);if(signature===lastLessonSignature)return;lastLessonSignature=signature;
  for(const key of ['amp','rcd','living','kitchen','utility']){
    const el=$(`#board-${key}`),on=f.switches[key];
    el.setAttribute('aria-pressed',String(on));el.classList.toggle('off',!on);
  }
  $('#board-rcd').classList.toggle('tripped',f.detected);$('#board-rcd').classList.toggle('testing',f.testing);
  for(const [i,key]of ['living','kitchen','utility'].entries())$(`#board-${key}`).classList.toggle('unpowered',!f.live.branches[i]);
  $('#board-test').disabled=!f.testAvailable;$('#board-test').setAttribute('aria-pressed',String(f.testing));
  $('#board-rcd').setAttribute('aria-label',f.detected?'漏電遮断器を復帰':`漏電遮断器を${f.switches.rcd?'切る':'入れる'}`);
}
function place(id,point,parent){
  const el=$(id),p=world.project(point,parent);el.style.visibility=p.visible?'visible':'hidden';el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;
}
function annotations(){
  if(!world)return;
  if(state.mode==='journey'){
    place('#label-plant',[-20.2,7.1,-2]);place('#label-substation',[6.4,4.8,-1.8]);place('#label-house',[21,4.8,4.5]);
  }else{
    for(const [key,anchor]of Object.entries(world.lesson.anchors))place(`#board-${key}`,anchor,world.lesson.root);
  }
}
try{world=new PowerScene($('#scene'),()=>setFollow(false),enterLesson,operate);$('#loading').hidden=true;}
catch(error){console.error(error);$('#loading').className='error';$('#loading').innerHTML='3Dを表示できませんでした。<button id="retry">再読み込み</button>';$('#retry').addEventListener('click',()=>location.reload());document.querySelectorAll('.playback button,.playback input,.playback select,.house-link').forEach(el=>{el.disabled=true;});}
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.08);last=now;if(document.hidden)return;
  const lesson=state.mode==='lesson';
  state=advancePlayback(state,dt);if(lesson)panel=advancePanel(panel,dt);
  const frame=getFrame(lesson?DURATION:state.time,lesson||state.started),detail=lesson?getPanelFrame(panel):null;
  const motion=lesson?panel.motion:reduced?state.time:state.motion;
  world?.render(frame,motion,state.follow&&state.started,now,detail);
  if(detail)lessonUI(detail);annotations();$('#timeline').value=state.time;
}
updateControls();requestAnimationFrame(animate);document.addEventListener('visibilitychange',()=>{last=performance.now();});
