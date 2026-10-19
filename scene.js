import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';
import { ModelBuilder,v } from './geometry.js';
import { HomeModel } from './home-model.js';
import { DURATION } from './simulation.js';

const GOLD=0xffcb51,BLUE=0x60b7d1,STEAM=0xf3b16b;
const smooth=t=>t*t*(3-2*t);
const PHASES=[{z:-1.35,y:5.7},{z:0,y:6.7},{z:1.35,y:5.7}];

export class PowerScene extends ModelBuilder {
  constructor(canvas,onManual){
    const root=new THREE.Group();super(root);
    this.canvas=canvas;this.onManual=onManual;this.flows=[];this.pickables=[];this.glows=[];this.flames=[];this.dummy=new THREE.Object3D();this.currentView='overview';this.tween=null;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene=new THREE.Scene();this.scene.add(root);
    this.camera=new THREE.OrthographicCamera(-30,30,20,-20,.1,200);
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor(0xe9eee4,0);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.96;
    this.scene.add(new THREE.HemisphereLight(0xf9fff3,0x91a280,1.8));
    const sun=new THREE.DirectionalLight(0xfff1d5,2.1);sun.position.set(-15,35,23);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-38,right:38,top:25,bottom:-25,far:100});sun.shadow.normalBias=.025;sun.shadow.bias=-.0002;this.scene.add(sun);
    this.controls=new OrbitControls(this.camera,canvas);this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.minZoom=.4;this.controls.maxZoom=14;this.controls.maxPolarAngle=1.48;
    this.controls.addEventListener('start',()=>{this.cancelTween();this.currentView='manual';onManual();});
    this.buildLandscape();this.buildThermal();this.buildGrid();this.buildHome();
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas.parentElement);this.resize();this.overview(true);
    let pointer;
    canvas.addEventListener('pointerdown',e=>{pointer=[e.clientX,e.clientY];});
    canvas.addEventListener('pointerup',e=>{
      if(!pointer||Math.hypot(e.clientX-pointer[0],e.clientY-pointer[1])>6)return;
      const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);
      const hit=ray.intersectObjects(this.pickables,false)[0];if(hit){onManual();this.focus(hit.object.userData.focus);}
    });
    canvas.addEventListener('keydown',e=>{
      if(e.key==='Home'){e.preventDefault();onManual();this.overview();return;}
      const s=new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
      if(e.key==='ArrowLeft')s.theta-=.12;else if(e.key==='ArrowRight')s.theta+=.12;else if(e.key==='ArrowUp')s.phi=Math.max(.15,s.phi-.1);else if(e.key==='ArrowDown')s.phi=Math.min(1.48,s.phi+.1);
      else if(e.key==='+'||e.key==='=')this.camera.zoom=Math.min(14,this.camera.zoom*1.12);else if(e.key==='-')this.camera.zoom=Math.max(.4,this.camera.zoom/1.12);else return;
      e.preventDefault();onManual();this.cancelTween();this.currentView='manual';this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(s));this.camera.updateProjectionMatrix();
    });
  }
  pick(object,focus){object.userData.focus=focus;this.pickables.push(object);return object;}
  flow(points,stage,color=GOLD,{radius=.035,parent=this.root,curved=false,reverse=false}={}){
    const cable=this.path(points,radius,0x7c8e81,parent,curved),geo=cable.mesh.geometry.clone();
    const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:.87,toneMapped:false});
    const glow=new THREE.Mesh(geo,material);glow.scale.setScalar(1);parent.add(glow);
    const length=cable.curve.getLength(),count=Math.max(6,Math.min(100,Math.ceil(length*2.4)));
    const particles=new THREE.InstancedMesh(new THREE.SphereGeometry(Math.max(.052,radius*1.45),6,5),new THREE.MeshBasicMaterial({color,toneMapped:false}),count);
    particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);particles.frustumCulled=false;parent.add(particles);
    const samples=Array.from({length:501},(_,i)=>cable.curve.getPoint(i/500));
    this.flows.push({cable:cable.mesh,glow,particles,samples,count,length,stage,color,reverse,indexCount:geo.index.count});return cable;
  }
  pad(size,pos){return this.box(size,pos,0xdce1d1);}
  buildLandscape(){
    this.box([53,.7,23],[0,-.55,.6],0xbecbad);this.box([53.1,.07,23.1],[0,-.165,.6],0xdce5ce);
    this.box([51,.035,1.6],[0,-.1,7.6],0xc0cbbb);
    for(let x=-24;x<26;x+=2)this.box([.75,.009,.035],[x,-.075,7.6],0xe9eddf);
    this.box([.05,.02,1.4],[16.3,-.065,7.6],0xe5e8dd);
    this.pad([13,.17,9.4],[-18,.01,-1.7]);this.pad([8.6,.16,7.2],[6.4,0,-2.0]);
    for(const [x,z,s]of [[-24,5,.85],[-11.8,6.1,.7],[-3.7,6.3,.9],[2.4,7,.6],[12.2,6,.65],[25.1,1.2,.8],[-3.7,-8,.8],[16,-7.4,.8]])this.tree(x,z,s);
    for(let i=0;i<4;i++){
      const hill=this.mesh(new THREE.ConeGeometry(3.7-i*.3,1.3+i*.2,7),this.mat(0xc2d2ae),[-8+i*7,-.1,-8.5]);hill.scale.z=.46;
    }
  }
  tree(x,z,s){
    this.cyl(.09*s,1.15*s,[x,.4*s,z],0x9d9274);this.sphere(.65*s,[x,1.2*s,z],0x91ac73);this.sphere(.43*s,[x+.17*s,1.64*s,z],0xa4bb88);
  }
  buildThermal(){
    const cream=0xd8deca,metal=0x6f8a81,dark=0x516d65,copper=0xbb894e;
    // A steam thermal plant, with a modest front cutaway for the heat-to-motion step.
    this.pick(this.box([3.5,5.1,.18],[-21,2.72,-3.42],cream),'plant');
    this.pick(this.box([.18,5.1,3.1],[-22.7,2.72,-1.95],cream),'plant');
    this.box([3.6,.16,3.2],[-21,.27,-1.95],0x8a9c82);
    for(const x of [-22.8,-19.18])for(const z of [-3.55,-.35])this.box([.1,5.45,.1],[x,2.85,z],metal);
    for(const y of [1.5,3.4,5.45])this.segment([-22.8,y,-3.6],[-19.18,y,-3.6],.045,metal);
    this.box([3.7,.15,3.35],[-21,5.6,-1.95],cream);
    for(let i=0;i<7;i++){
      const x=-22.4+i*.44;
      this.path([[x,.7,-2.9],[x,4.9,-2.9],[x,5.04,-2.55]],.073,0x92aaa3);
      this.flow([[x,.7,-2.82],[x,4.92,-2.82]],'water',BLUE,{radius:.035});
    }
    this.cyl(.33,3.0,[-21,5.08,-2.6],0x9aafa1,this.root,'x');
    this.box([3,.12,2.45],[-21,.55,-1.8],dark);
    for(let i=0;i<9;i++){
      const flame=this.mesh(new THREE.ConeGeometry(.23,1.35,7),new THREE.MeshBasicMaterial({color:i%2?0xffbe4a:0xef863d,transparent:true,opacity:.85,toneMapped:false}),[-22.1+(i%5)*.54,1.05,-2.3+Math.floor(i/5)*.7]);
      this.flames.push(flame);
    }
    this.fireLight=new THREE.PointLight(0xffa232,0,6);this.fireLight.position.set(-21,1.9,-1.8);this.root.add(this.fireLight);
    // Chimney and the separate flue-gas duct establish the thermal-plant silhouette.
    this.cyl(.45,7.6,[-23.4,3.7,-4.25],cream);this.cyl(.49,.2,[-23.4,7.52,-4.25],metal);
    for(const y of [3.1,4.8,6.5])this.cyl(.456,.3,[-23.4,y,-4.25],0xb1beb1);
    this.path([[-21,5.4,-3.4],[-21,6.1,-4.25],[-23.4,6.1,-4.25]],.25,dark);
    this.cyl(.75,2.4,[-22.5,1.25,2.1],cream);this.cyl(.78,.1,[-22.5,2.5,2.1],metal);
    this.path([[-22.5,.5,2.1],[-21,.5,2.1],[-21,.7,-.5]],.09,dark);
    this.pad([6.3,.25,3.0],[-15.7,.35,-1.7]);
    for(const x of [-18.1,-15.6,-13.4])this.box([.55,1.1,1.5],[x,.95,-1.45],0x9eaf9c);
    const shellMat=this.mat(cream).clone();shellMat.side=THREE.DoubleSide;
    const shell=this.mesh(new THREE.CylinderGeometry(.85,.58,3.1,32,1,true,0,Math.PI),shellMat,[-17,2,-1.45]);shell.rotation.z=-Math.PI/2;this.pick(shell,'plant');
    this.rotor=new THREE.Group();this.rotor.position.set(-17,2,-1.45);this.root.add(this.rotor);
    this.cyl(.12,7.3,[1.3,0,0],0xa6b8ac,this.rotor,'x');
    for(let j=0;j<7;j++){
      const x=-1.2+j*.38,r=.45+j*.045;
      this.cyl(r*.37,.11,[x,0,0],dark,this.rotor,'x');
      for(let i=0;i<12;i++){const a=i/12*Math.PI*2,b=this.box([.07,r*.58,.08],[x,Math.cos(a)*r*.62,Math.sin(a)*r*.62],0x98afa5,this.rotor);b.rotation.x=a;b.rotation.y=.28;}
      this.torus(r,.032,[-17+x,2,-1.45],0x95a79a);
    }
    for(const x of [-18.7,-15.2,-12.9])this.cyl(.24,.23,[x,2,-1.45],cream,this.root,'x');
    const generatorShell=this.mesh(new THREE.CylinderGeometry(.75,.75,2.1,32,1,true,0,Math.PI),shellMat,[-13.7,2,-1.45]);generatorShell.rotation.z=-Math.PI/2;this.pick(generatorShell,'plant');
    this.cyl(.32,1.8,[3.3,0,0],dark,this.rotor,'x');
    this.box([1.7,.2,.42],[3.3,.3,0],0xc57958,this.rotor);this.box([1.7,.2,.42],[3.3,-.3,0],0x648f9b,this.rotor);
    this.coilMaterial=this.mat(copper).clone();this.coilMaterial.emissive.setHex(0xf2b543);
    for(const a of [0,.9,1.8,2.7,3.6,4.5,5.4]){
      const y=2+Math.cos(a)*.61,z=-1.45+Math.sin(a)*.61;
      this.path([[-14.6,y,z],[-12.8,y,z],[-12.72,y+.08,z+.05],[-14.68,y+.08,z+.05],[-14.6,y,z]],.035,this.coilMaterial);
    }
    for(const x of [-14.8,-12.6])this.torus(.77,.075,[x,2,-1.45],cream);
    this.box([3.1,.85,1.45],[-16.5,.85,.5],0x8faeaa);
    for(let i=0;i<8;i++)this.cyl(.05,2.8,[-16.5,.86,.02+i*.13],0x5d929e,this.root,'x');
    this.cyl(.25,.7,[-19,.65,1.35],dark,this.root,'x');
    this.flow([[-16,.8,.9],[-18.5,.8,1.4],[-19.2,.8,1.4],[-19.2,.8,-2.82],[-22.4,.8,-2.82]],'water',BLUE,{radius:.08});
    this.flow([[-19.5,5.08,-2.6],[-18.6,5.08,-2.6],[-18.5,3.4,-2.1],[-18.1,2.3,-1.45]],'steam',STEAM,{radius:.10,curved:true});
    this.flow([[-18.1,2.3,-1.45],[-17,2.4,-1.38],[-15.7,2.3,-1.38],[-15.6,1.2,.5]],'turbine',STEAM,{radius:.055,curved:true});
    // Cooling water is separate from the steam/feedwater circuit.
    this.path([[-18.4,.8,3.4],[-18.4,.8,.4],[-17.9,.8,.4]],.08,0x6c9d9b);
    this.path([[-15.1,.8,.4],[-14.4,.8,.4],[-14.4,.8,3.4]],.08,0x6c9d9b);
    this.box([5.0,.08,1.7],[-16.4,.04,3.9],0x9ebcbd);
  }
  transformer(x,z,scale,stage){
    const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);this.root.add(g);
    this.box([2.4,.22,2.4],[0,.18,0],0xc9d2bf,g);
    this.pick(this.box([1.7,1.7,1.25],[0,1.16,0],0x91a798,g),stage==='generation'?'plant':'substation');
    for(const s of [-1,1])for(let i=0;i<9;i++)this.box([.1,1.35,1.35],[s*(.92+i*.045),1.12,0],0x789483,g);
    this.cyl(.24,1.55,[0,2.34,-.48],0xb4c1ad,g,'x');
    for(const side of [-1,1])for(let phase=0;phase<3;phase++){
      const zz=(phase-1)*.4;this.cyl(.065,.62,[side*.55,2.2,zz],0x6f8f7f,g);
      for(let j=0;j<4;j++)this.cyl(.1,.035,[side*.55,1.99+j*.12,zz],0xd4dfc7,g);
    }
    const light=this.mat(0xb2bea8).clone();light.emissive.setHex(GOLD);this.box([.25,.12,.035],[0,1.6,.645],light,g);this.glows.push({material:light,stage});
    return g;
  }
  tower(x,z){
    const height=6.9,at=(y,sx,sz)=>[x+sx*(.78-.55*y/height),y,z+sz*(.78-.55*y/height)];
    for(const sx of [-1,1])for(const sz of [-1,1]){
      this.pad([.5,.2,.5],[x+sx*.78,.0,z+sz*.78]);this.segment(at(.1,sx,sz),at(height,sx,sz),.043,0x829b8b);
    }
    for(let y=.4;y<6.6;y+=1.1){
      const next=Math.min(y+1.1,height);
      for(const s of [-1,1]){
        this.segment(at(y,s,-1),at(next,s,1),.023,0x829b8b);this.segment(at(y,s,1),at(next,s,-1),.023,0x829b8b);
        this.segment(at(y,-1,s),at(next,1,s),.023,0x829b8b);this.segment(at(y,1,s),at(next,-1,s),.023,0x829b8b);
      }
    }
    for(const [y,width]of [[6.15,3.5],[7.15,.9]]){
      this.segment([x,y,z-width/2],[x,y,z+width/2],.045,0x829b8b);
      this.segment([x,y+.45,z],[x,y,z-width/2],.028,0x829b8b);this.segment([x,y+.45,z],[x,y,z+width/2],.028,0x829b8b);
    }
    for(const p of PHASES)for(let k=0;k<4;k++)this.cyl(.10,.04,[x,p.y+.07+k*.1,z+p.z],0xd5dfcb);
    const target=this.box([1.5,6.8,1.5],[x,3.4,z],new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));target.castShadow=false;this.pick(target,'transmission');
  }
  pole(x,z,transformer=false){
    this.cyl(.11,5.25,[x,2.5,z],0xa0ae9b);this.box([.13,.12,2.3],[x,4.8,z],0x6f897a);
    for(const zz of [-.7,0,.7]){this.cyl(.06,.25,[x,4.98,z+zz],0x597c70);this.cyl(.1,.05,[x,5.02,z+zz],0xd4dec8);}
    if(transformer){this.pick(this.cyl(.37,.9,[x,3.55,z+.38],0x9bb3a5),'distribution');this.cyl(.4,.07,[x,4.05,z+.38],0xc8d4be);this.box([.1,.4,.6],[x+.1,3.5,z],0x759681);}
  }
  buildGrid(){
    this.transformer(-10.8,-2,1,'generation');
    // Separate phase conductors on each side of each transformer. Internal
    // magnetic coupling and switchgear details are intentionally not modeled.
    for(let phase=0;phase<3;phase++){
      const d=(phase-1)*.4;
      this.flow([[-13.5,1.5,-.6+d],[-12.3,.8,-.6+d],[-11.35,2.51,-2+d]],'generation',GOLD,{radius:.055});
    }
    this.tower(-6.3,-3.4);this.tower(.1,-3.4);
    for(let i=0;i<3;i++){
      const p=PHASES[i],endZ=-2+(i-1)*.5;
      this.flow([[-10.25,2.51,-2+(i-1)*.4],[-8.4,3.7,-2.8+p.z],[-6.3,p.y,-3.4+p.z],[-3.2,p.y-.75,-3.4+p.z],[.1,p.y,-3.4+p.z],[2.0,4.6,endZ],[3.6,4.1,endZ]],'transmission',GOLD,{curved:true,radius:.035});
    }
    // Substation gantries and transformer exterior.
    for(const x of [3.6,9.4]){
      for(const z of [-4.0,0])this.box([.12,4.1,.12],[x,2,z],0x8a9f8c);
      this.box([.15,.15,4.25],[x,4.1,-2],0x8a9f8c);
    }
    this.transformer(6.25,-2,1.25,'substation');
    for(let i=0;i<3;i++){
      const zz=-2+(i-1)*.5;
      this.cyl(.1,.8,[4.4,1.35,zz],0x668d7d);this.cyl(.16,.08,[4.4,1.7,zz],0xc6d4bd);
      this.flow([[3.6,4.1,zz],[4.4,2.3,zz],[4.4,1.7,zz],[5.56,3.14,zz]],'substation',GOLD,{radius:.045});
      this.flow([[6.94,3.14,zz],[8.2,2.6,zz],[9.4,4.1,zz]],'substation',GOLD,{radius:.045});
    }
    this.box([1.35,1.4,1.3],[9,.8,-4.3],0xe2e5d6);this.box([.6,.7,.03],[9,.85,-3.63],0x9aab96);
    // A light perimeter fence, without obscuring the simple equipment.
    for(const z of [-5.45,1.45]){
      for(let x=2.2;x<10.7;x+=.55)this.cyl(.018,1.0,[x,.6,z],0xa2b09a);
      this.segment([2.2,1.1,z],[10.6,1.1,z],.018,0xa2b09a);
    }
    this.pole(11.7,.35);this.pole(15.5,.35,true);
    for(let i=0;i<3;i++){
      const dz=(i-1)*.7;
      this.flow([[9.4,4.1,-2+(i-1)*.5],[10.5,4.3,-.7+dz],[11.7,5.05,.35+dz],[13.5,4.6,.35+dz],[15.5,5.05,.35+dz]],'distribution',GOLD,{radius:.027,curved:true});
    }
    // Primary tap to the pole transformer is distinct from the low-voltage pair.
    this.flow([[15.5,5.05,-.35],[15.28,4.7,-.2],[15.28,4.08,.73]],'distribution',GOLD,{radius:.032});
    this.flow([[15.5,5.05,.35],[15.72,4.7,.35],[15.72,4.08,.73]],'distribution',GOLD,{radius:.032});
    this.flow([[15.25,3.15,.73],[16.2,2.8,1.2],[17.05,2.6,2],[17.1,1.9,2],[17.696,1.652,2.288]],'service',GOLD,{radius:.038,curved:true});
    this.flow([[17.7,1.68,2.4],[17.05,2.0,2.15],[16.2,2.7,1.4],[15.75,3.15,.73]],'service',BLUE,{radius:.032,curved:true,reverse:true});
  }
  buildHome(){
    const group=new THREE.Group();group.position.set(21,0,4.5);group.scale.setScalar(.7);this.root.add(group);this.home=new HomeModel(group);
    this.home.root.traverse(object=>{if(object.isMesh)this.pick(object,'house');});
    // The board is a separate closer focus target.
    const boardHit=this.home.box([2.15,1.15,.8],[-4,2,-3.4],new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));boardHit.castShadow=false;this.pick(boardHit,'board');
    const P=[-4.72,2.36,-3.16],B=[-3.15,2.6,-3.12];
    this.flow([P,[-4.72,1.89,-3.16],[-4.4,1.89,-3.16],[-4.4,2.36,-3.16],[-4.18,2.36,-3.16],[-4.18,1.89,-3.16],[-3.96,1.89,-3.16],[-3.96,2.6,-3.12],B],'home',GOLD,{radius:.035,parent:group});
    const paths=[
      [B,[-3.65,2.4,-3.12],[-3.65,1.96,-3.12],[-3.1,.57,-2.8],[-1.15,.57,-2.8],[-1.15,1.1,-1.8]],
      [B,[-3.33,2.4,-3.12],[-3.33,1.96,-3.12],[-2.8,.58,-3.5],[3.5,.58,-3.5],[3.5,1.4,-3.5],[4.15,1.4,-3]],
      [B,[-3.0,1.94,-3.12],[-3.65,1.94,-3.12],[-3.65,1.5,-3.12],[-2.6,.59,-2.45],[.5,.59,-2.45],[.5,.59,1.4],[4,.59,1.4],[4,1.2,2.2]]
    ];
    paths.forEach(path=>{
      this.flow(path,'home',GOLD,{radius:.035,parent:group});
      const back=path.slice(3).map(p=>[p[0]+.13,p[1]+.03,p[2]+.16]).reverse();back.push([-4.72,2.4,-3]);
      this.flow([path.at(-1),...back],'home',BLUE,{radius:.028,parent:group,reverse:true});
    });
    this.roomLamps=[];
    for(const [x,z]of [[-3.2,1.4],[2.7,-1.5],[3,2.5]]){
      const material=new THREE.MeshStandardMaterial({color:0xded4b2,emissive:0xffce76,emissiveIntensity:0});
      this.home.cyl(.27,.08,[x,2.5,z],material);
      const light=new THREE.PointLight(0xffdc8c,0,5);light.position.set(x,2.3,z);group.add(light);this.roomLamps.push({material,light});
      const pool=new THREE.Mesh(new THREE.CircleGeometry(1.0,32),new THREE.MeshBasicMaterial({color:0xffda80,transparent:true,opacity:0,depthWrite:false}));pool.rotation.x=-Math.PI/2;pool.position.set(x,.445,z);group.add(pool);this.roomLamps.at(-1).pool=pool;
    }
  }
  cancelTween(){this.tween=null;}
  resize(){
    const r=this.canvas.parentElement.getBoundingClientRect();this.width=r.width;this.height=r.height;this.aspect=r.width/r.height;this.renderer.setSize(r.width,r.height,false);
    if(this.currentView==='overview')this.overview(true);else this.setProjection(this.halfHeight||14);
  }
  setProjection(halfHeight){this.halfHeight=halfHeight;this.camera.left=-halfHeight*this.aspect;this.camera.right=halfHeight*this.aspect;this.camera.top=halfHeight;this.camera.bottom=-halfHeight;this.camera.updateProjectionMatrix();}
  overviewView(){
    const direction=v(this.aspect<.85?[55,42,18]:[19,34,50]).normalize();
    const target=v([0,1.8,0]),position=target.clone().addScaledVector(direction,75);
    const camera=this.camera.clone();camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const x of [-26.55,26.55])for(const y of [-.9,8.1])for(const z of [-11,12.15]){
      const p=v([x,y,z]).applyMatrix4(camera.matrixWorldInverse);minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
    }
    const usable=Math.max(.55,(this.height-115)/this.height);
    const half=Math.max((maxY-minY)/2/usable,(maxX-minX)/2/this.aspect)*1.06;
    const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(camera.quaternion);
    const offset=right.multiplyScalar((minX+maxX)/2).add(up.multiplyScalar((minY+maxY)/2-half*65/this.height));
    target.add(offset);position.add(offset);return {target,position,half};
  }
  overview(instant=false){this.currentView='overview';this.moveCamera(this.overviewView(),instant);}
  focusView(name){
    const views={plant:{target:[-18,2.2,-1.5],half:6.6},transmission:{target:[-3,3.3,-3],half:6.8},substation:{target:[6.5,1.7,-2],half:5.1},distribution:{target:[14.5,2.6,1],half:4.8},house:{target:[21,1,4.5],half:4.5},board:{target:[18.15,1.4,2.25],half:1.65}};
    const view=views[name]||views.house,target=v(view.target),direction=v(name==='board'?[0,3.5,10]:[10,12,16]).normalize();
    return {target,position:target.clone().addScaledVector(direction,65),half:view.half*Math.max(1,1/this.aspect)};
  }
  focus(name){this.currentView=name;this.moveCamera(this.focusView(name));}
  moveCamera(view,instant=false){
    this.camera.zoom=1;
    if(instant||this.reduced){this.camera.position.copy(view.position);this.controls.target.copy(view.target);this.setProjection(view.half);this.controls.update();this.tween=null;}
    else this.tween={from:this.camera.position.clone(),fromTarget:this.controls.target.clone(),fromHalf:this.halfHeight||view.half,...view,start:performance.now()};
  }
  tour(time){
    const nodes=[[0,'overview'],[3,'plant'],[9,'plant'],[14,'transmission'],[20,'substation'],[25,'distribution'],[30,'board'],[33,'house'],[36,'overview']];
    let i=0;while(i<nodes.length-2&&time>nodes[i+1][0])i++;
    const [ta,ka]=nodes[i],[tb,kb]=nodes[i+1];const a=ka==='overview'?this.overviewView():this.focusView(ka),b=kb==='overview'?this.overviewView():this.focusView(kb),t=smooth(Math.min(1,Math.max(0,(time-ta)/(tb-ta))));
    this.camera.zoom=1;this.camera.position.lerpVectors(a.position,b.position,t);this.controls.target.lerpVectors(a.target,b.target,t);this.setProjection(THREE.MathUtils.lerp(a.half,b.half,t));this.currentView=time>=DURATION?'overview':'tour';
  }
  render(frame,motion,follow,now){
    if(follow){this.tween=null;this.tour(frame.time);}else if(this.tween){
      const t=smooth(Math.min(1,(now-this.tween.start)/850)),a=this.tween;
      this.camera.position.lerpVectors(a.from,a.position,t);this.controls.target.lerpVectors(a.fromTarget,a.target,t);this.setProjection(THREE.MathUtils.lerp(a.fromHalf,a.half,t));if(t===1)this.tween=null;
    }
    this.controls.update();
    for(let i=0;i<this.flames.length;i++){
      const flame=this.flames[i];flame.visible=frame.fire>0;flame.scale.y=(.7+.22*Math.sin(motion*9+i*2))*frame.fire;flame.scale.x=.85+.12*Math.sin(motion*7+i);flame.position.y=.65+flame.scale.y*.65;
    }
    this.fireLight.intensity=frame.fire*20;this.rotor.rotation.x=Math.max(0,motion-6)*2.6*frame.turbine;this.coilMaterial.emissiveIntensity=frame.generation*.8;
    for(const flow of this.flows){
      const amount=frame[flow.stage],active=amount>0;flow.glow.visible=active;flow.particles.visible=active;
      flow.glow.geometry.setDrawRange(0,Math.floor(flow.indexCount*amount/6)*6);
      if(!active)continue;
      for(let i=0;i<flow.count;i++){
        const position=((motion*(flow.stage==='steam'?3.5:2.5)/flow.length+i/flow.count)%1+1)%1;
        // Reverse paths are drawn from appliance back to source; the leading
        // energization front still begins at the upstream end of that circuit.
        const visible=flow.reverse?position>=1-amount:position<=amount;
        this.dummy.position.copy(flow.samples[Math.floor(position*500)]);this.dummy.scale.setScalar(visible?1:0);this.dummy.updateMatrix();flow.particles.setMatrixAt(i,this.dummy.matrix);
      }
      flow.particles.instanceMatrix.needsUpdate=true;
      if(flow.reverse){const start=Math.floor(flow.indexCount*(1-amount)/6)*6;flow.glow.geometry.setDrawRange(start,flow.indexCount-start);}
    }
    for(const {material,stage}of this.glows)material.emissiveIntensity=frame[stage]*1.8;
    for(const {material}of this.home.lights){material.emissiveIntensity=frame.light*.9;material.color.setHex(frame.light>0?0xffde9f:0x8d9c90);}
    for(const {material,light,pool}of this.roomLamps){material.emissiveIntensity=frame.light*2.8;light.intensity=frame.light*9;pool.material.opacity=frame.light*.34;}
    this.renderer.render(this.scene,this.camera);
  }
}
