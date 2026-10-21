import { PowerScene } from './scene.js';
import { DURATION,LESSON_DURATION,LESSON_STAGES,getFrame,getLessonFrame,advancePlayback } from './simulation.js';
const $=s=>document.querySelector(s);
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let state={mode:'journey',started:false,playing:false,time:0,motion:0,speed:1,follow:true};
let world,last=performance.now(),lastLessonSignature='';
const names={normal:'通常',amp:'アンペア',branch:'配線用',short:'ショート',leak:'漏電'};
for(const stage of LESSON_STAGES){const button=document.createElement('button');button.textContent=names[stage.key];button.dataset.stage=stage.key;button.setAttribute('aria-pressed','false');button.addEventListener('click',()=>enterLesson(stage.key));$('#lesson-tabs').append(button);}
function updateControls(){
  const lesson=state.mode==='lesson';
  document.body.classList.toggle('lesson-mode',lesson);$('#lesson-panel').hidden=!lesson;$('#board-labels').hidden=!lesson;$('#journey-labels').hidden=lesson;
  $('#start span').textContent=state.started?'最初から':'スタート';
  $('#pause').disabled=!state.started;$('#timeline').disabled=!state.started;$('#timeline').max=lesson?LESSON_DURATION:DURATION;
  $('#pause').innerHTML=state.playing?'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>':'<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7Z"/></svg>';
  $('#pause').setAttribute('aria-label',state.playing?'一時停止':'再開');$('#pause').title=state.playing?'一時停止':'再開';
  $('#follow').classList.toggle('active',state.follow);$('#follow').setAttribute('aria-pressed',String(state.follow));$('#timeline').value=state.time;
}
function setFollow(value){state.follow=value;world?.cancelTween();updateControls();}
function enterLesson(key='normal'){
  const stage=LESSON_STAGES.find(s=>s.key===key)||LESSON_STAGES[0];
  state={...state,mode:'lesson',started:true,playing:true,time:stage.start,motion:stage.start,follow:false};
  world?.setMode('lesson');lastLessonSignature='';updateControls();
}
function overview(){
  if(state.mode==='lesson'){state={...state,mode:'journey',time:DURATION,motion:DURATION,started:true,playing:false};world?.setMode('journey');}
  setFollow(false);world?.overview();
}
$('#start').addEventListener('click',()=>{
  if(state.mode==='lesson'){enterLesson();return;}
  state={...state,started:true,playing:true,time:0,motion:0,follow:true};world?.overview(true);updateControls();
});
$('#pause').addEventListener('click',()=>{if(state.mode==='lesson'&&state.time>=LESSON_DURATION){enterLesson();return;}state.playing=!state.playing;updateControls();});
$('#reset').addEventListener('click',()=>{state={...state,mode:'journey',started:false,playing:false,time:0,motion:0,follow:true};world?.setMode('journey');world?.overview(true);updateControls();});
$('#speed').addEventListener('change',e=>{state.speed=Number(e.target.value);});
$('#follow').addEventListener('click',()=>{setFollow(!state.follow);if(!state.follow)world?.overview();});
$('#overview').addEventListener('click',overview);
for(const id of ['#home','#label-house'])$(id).addEventListener('click',()=>enterLesson());
$('#timeline').addEventListener('input',e=>{state.time=Number(e.target.value);state.motion=state.time;state.playing=false;updateControls();});
$('#scene').addEventListener('keydown',e=>{if(e.key==='Home'&&state.mode==='lesson')overview();});
function lessonUI(f){
  const trip=Object.values(f.tripped).some(Boolean),signature=[f.key,f.elapsed>=2,trip].join(':');
  if(signature===lastLessonSignature)return;lastLessonSignature=signature;
  for(const key of ['amp','rcd','branch']){$(`#board-${key}`).classList.toggle('active',f.activeBreaker===key);$(`#board-${key}`).classList.toggle('tripped',key==='branch'?f.tripped.kitchen:f.tripped[key]);}
  for(const [i,key,label]of [[0,'living','居間'],[1,'kitchen','台所'],[2,'utility','洗面室']]){const el=$(`#board-${key}`);el.textContent=label;el.classList.toggle('off',!f.live.branches[i]);}
  for(const button of $('#lesson-tabs').children)button.setAttribute('aria-pressed',String(button.dataset.stage===f.key));
}
function place(id,point,parent){
  const el=$(id),p=world.project(point,parent);el.style.visibility=p.visible?'visible':'hidden';el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;
}
function annotations(){
  if(!world)return;
  if(state.mode==='journey'){
    place('#label-plant',[-20.2,7.1,-2]);place('#label-substation',[6.4,4.8,-1.8]);place('#label-house',[21,4.8,4.5]);
  }else{
    for(const key of ['amp','rcd','branch','living','kitchen','utility','source','earth']){
      const anchor=world.lesson.anchors[key];if(anchor)place(`#board-${key}`,anchor,world.lesson.root);
    }
  }
}
try{world=new PowerScene($('#scene'),()=>setFollow(false),()=>enterLesson());$('#loading').hidden=true;}
catch(error){console.error(error);$('#loading').className='error';$('#loading').innerHTML='3Dを表示できませんでした。<button id="retry">再読み込み</button>';$('#retry').addEventListener('click',()=>location.reload());document.querySelectorAll('.playback button,.playback input,.playback select,.house-link').forEach(el=>{el.disabled=true;});}
function animate(now){
  requestAnimationFrame(animate);const dt=Math.min((now-last)/1000,.08);last=now;if(document.hidden)return;
  state=advancePlayback(state,dt);
  const lesson=state.mode==='lesson',frame=getFrame(lesson?DURATION:state.time,state.started),detail=lesson?getLessonFrame(state.time,state.started):null;
  if(lesson&&detail.complete&&state.playing){state.playing=false;updateControls();}
  world?.render(frame,reduced?state.time:state.motion,state.follow&&state.started,now,detail);
  if(detail)lessonUI(detail);annotations();$('#timeline').value=state.time;
}
updateControls();requestAnimationFrame(animate);document.addEventListener('visibilitychange',()=>{last=performance.now();});
