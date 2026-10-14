import { HouseScene } from './scene.js';
import { SCENARIOS, CIRCUITS, DURATION, getFrame, explain } from './simulation.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const state = { config: structuredClone(SCENARIOS[0]), time: 0, playing: !reduced, speed: 1, phase: 0, manual: {}, view: 'house' };
let scene, previous=performance.now(), lastUI=0;

$('#scenario-list').innerHTML=SCENARIOS.map(s=>`<button class="scenario${s.id==='normal'?' active':''}" data-scenario="${s.id}" aria-pressed="${s.id==='normal'}"><span class="scenario-number">${s.number}</span><span><strong>${s.title}</strong><small>${s.subtitle}</small></span><span class="scenario-arrow">›</span></button>`).join('');
$('#branch-breakers').innerHTML=CIRCUITS.map(c=>`<button class="breaker" id="breaker-${c.id}" data-breaker="${c.id}" aria-pressed="true"><strong>${c.name}</strong><span class="breaker-switch"><i></i><em>入</em></span><span class="breaker-rating">${c.limit} A</span><span class="branch-current" id="amps-${c.id}">0 A</span></button>`).join('');
$('#load-controls').innerHTML=CIRCUITS.map((c,i)=>`<label class="load-control"><span>${c.name}<output id="load-value-${i}" for="load-${i}">0 A</output></span><input id="load-${i}" data-load="${i}" type="range" min="0" max="30" step="1" aria-label="${c.name}の使用電流" value="${state.config.loads[i]}"></label>`).join('');

function setView(view){state.view=view;scene?.setView(view);$$('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
function setControls(){
  $('#contract').value=state.config.contract;$('#fault-type').value=state.config.fault;
  $('#earth-connected').checked=state.config.earth;$('#human-touch').checked=state.config.touch;
  state.config.loads.forEach((a,i)=>{$(`#load-${i}`).value=a;$(`#load-value-${i}`).textContent=`${a} A`;});
}
function restart(clearManual=true){state.time=0;state.phase=0;state.playing=true;if(clearManual)state.manual={};updateUI();}
function selectScenario(id){
  state.config=structuredClone(SCENARIOS.find(s=>s.id===id));
  $$('[data-scenario]').forEach(b=>{const active=b.dataset.scenario===id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  $('#scene-number').textContent=`SCENE ${state.config.number}`;$('#scene-title').textContent=state.config.title;
  $('#breaker-detail').textContent=state.config.description;
  setControls();restart();setView(id==='earth'||id==='shock'?'earth':'house');
}
function changeConfig(){
  state.config={id:'custom',number:'＋',title:'自分で試す',loads:$$('[data-load]').map(el=>Number(el.value)),contract:Number($('#contract').value),fault:$('#fault-type').value,earth:$('#earth-connected').checked,touch:$('#human-touch').checked,description:'各回路の20 A、家全体の契約容量、行きと戻りの差を比べてください。'};
  $$('[data-scenario]').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false');});
  $('#scene-number').textContent='YOUR EXPERIMENT';$('#scene-title').textContent='条件を変えて観察';
  state.config.loads.forEach((a,i)=>{$(`#load-value-${i}`).textContent=`${a} A`;});
  $('#breaker-detail').textContent=state.config.description;restart();
}
function updateBreaker(id,on,tripped){
  const el=$(`#breaker-${id}`);el.classList.toggle('off',!on);el.classList.toggle('tripped',tripped);
  el.setAttribute('aria-pressed',String(on));el.querySelector('em').textContent=tripped?'遮断':on?'入':'切';
  const name=id==='amp'?'アンペアブレーカー':id==='rcd'?'漏電遮断器':`${CIRCUITS.find(c=>c.id===id).name}の配線用遮断器`;
  el.setAttribute('aria-label',`${name}：${tripped?'自動遮断':on?'入':'切'}。押して教材内で切り替え`);
}
function updateUI(){
  const f=getFrame(state.config,state.time,state.manual),story=explain(state.config,f);
  $('#timeline').value=state.time;$('#time-label').textContent=`${state.time.toFixed(1)} / 12`;
  $('#play-symbol').textContent=state.playing?'Ⅱ':'▶';$('#play-label').textContent=state.playing?'一時停止':state.time>=DURATION?'もう一度':'再生する';
  $('#play').setAttribute('aria-label',state.playing?'一時停止':state.time>=DURATION?'この場面をもう一度再生':'再生する');
  $('#status-badge').className=`status-badge ${f.stage}`;
  $('#status-badge').textContent=f.stage==='tripped'?'自動遮断':f.stage==='fault'?'異常を観察中':f.powered.every(Boolean)?'通電中':f.powered.some(Boolean)?'一部を手動で切':'手動で切';
  $('#story-title').textContent=story.title;$('#story-text').textContent=story.text;$('#story-icon').textContent=f.anyTrip?'切':state.config.number;
  $('#contract-rating').textContent=`${state.config.contract} A`;
  updateBreaker('amp',f.ampOn,f.ampTrip);updateBreaker('rcd',f.rcdOn,f.rcdTrip);
  CIRCUITS.forEach((c,i)=>{updateBreaker(c.id,f.branchOn[i],f.branchTrip[i]);$(`#amps-${c.id}`).textContent=`${f.loads[i]} A`;});
  $('#current-out').innerHTML=`${f.outgoing.toFixed(3)} <small>A</small>`;
  $('#current-back').innerHTML=`${f.returning.toFixed(3)} <small>A</small>`;
  $('#current-diff').innerHTML=`${f.leakageMA} <small>mA</small>`;
  $('#difference-bar').style.width=`${Math.min(100,f.leakageMA/60*100)}%`;
  $('#difference-bar').style.background=f.leakageMA>=30?'#d29264':'#aab991';
  $('#earth-current').textContent=`${f.earthMA} mA`;$('#body-current').textContent=`${f.bodyMA} mA`;
  $('#body-current').classList.toggle('danger',f.bodyMA>0);
  $('#meter-state').textContent=state.playing?'LIVE':'PAUSED';
  $('#meter-note').textContent=f.rcdTrip?`検知した差 ${f.detectedLeakageMA} mA → 遮断後は0 mA`:
    f.bodyMA>0?'人体にも電流が流れています。30 mAは安全の境界ではありません。':
    f.leakageMA>0?'戻り線を通らない電流がある → 漏電の差を検知':
    f.caseLive?'漏れ電流が0でも、ケースに電圧がかかっていて危険です。':'行きと戻りが同じ → 漏電による差は0';
  $('#fault-tick').textContent=state.config.id==='normal'?'各回路へ分かれる':'変化が起こる';
  $('#trip-tick').textContent=state.config.id==='normal'?'電源へ戻る':'遮断・結果を観察';
}

$$('[data-scenario]').forEach(b=>b.addEventListener('click',()=>selectScenario(b.dataset.scenario)));
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
$('#camera-reset').addEventListener('click',()=>setView('house'));
$('#zoom-in').addEventListener('click',()=>scene?.zoom(.82));$('#zoom-out').addEventListener('click',()=>scene?.zoom(1.22));
$('#labels-toggle').addEventListener('click',()=>{if(!scene)return;scene.showLabels=!scene.showLabels;$('#labels-toggle').setAttribute('aria-pressed',String(scene.showLabels));});
$('#play').addEventListener('click',()=>{if(state.time>=DURATION)restart(false);else state.playing=!state.playing;updateUI();});
$('#replay').addEventListener('click',()=>restart());
$('#timeline').addEventListener('input',e=>{state.time=Number(e.target.value);state.phase=state.time;state.playing=false;updateUI();});
$('#speed').addEventListener('change',e=>{state.speed=Number(e.target.value);});
['contract','fault-type','earth-connected','human-touch'].forEach(id=>$(`#${id}`).addEventListener('change',changeConfig));
$$('[data-load]').forEach(el=>el.addEventListener('input',changeConfig));
$$('[data-breaker]').forEach(el=>el.addEventListener('click',()=>{
  const id=el.dataset.breaker;const f=getFrame(state.config,state.time,state.manual);
  const on=id==='amp'?f.ampOn:id==='rcd'?f.rcdOn:f.branchOn[CIRCUITS.findIndex(c=>c.id===id)];
  state.manual[id]=!on;
  $('#breaker-detail').textContent=id==='amp'?'アンペアブレーカーは、家全体の使用量を契約容量と比べます。':id==='rcd'?'漏電遮断器は、行きと戻りの電流の差を検知します。':`${CIRCUITS.find(c=>c.id===id).name}の配線用遮断器は、この回路だけを入／切します。`;
  restart(false);
}));
$('#about-open').addEventListener('click',()=>$('#about-dialog').showModal());
$('#about-close').addEventListener('click',()=>$('#about-dialog').close());
$('#about-dialog').addEventListener('click',e=>{if(e.target===$('#about-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});

setControls();updateUI();
try {
  scene=new HouseScene($('#scene'),$('#labels'),id=>{
    if(['amp','rcd','living','kitchen','utility'].includes(id)){
      const el=$(`#breaker-${id}`);el.focus();
      $('#breaker-detail').textContent=id==='amp'?'家全体の合計と契約容量を比較するブレーカーです。':id==='rcd'?'行きと戻りの差から、漏電を見つけるブレーカーです。':`${CIRCUITS.find(c=>c.id===id).name}へ向かう一つの回路を守ります。`;
      setView('board');
    }else setView(id);
  });
  $('#loading').hidden=true;
} catch(error) {
  console.error(error);$('#loading').innerHTML='3D表示を開始できませんでした。<br>WebGL対応のブラウザーで開き直してください。<br>右側の分電盤と電流表示は操作できます。';
}
function animate(now){
  const delta=Math.min((now-previous)/1000,.08);previous=now;
  if(state.playing){state.time=Math.min(DURATION,state.time+delta*state.speed);if(!reduced)state.phase+=delta*state.speed;if(state.time>=DURATION){state.playing=false;updateUI();}}
  const frame=getFrame(state.config,state.time,state.manual);
  scene?.render(frame,state.config,state.phase,now);
  if(now-lastUI>100){updateUI();lastUI=now;}
  requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange',()=>{previous=performance.now();});
requestAnimationFrame(animate);
