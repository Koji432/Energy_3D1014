import * as THREE from './vendor/three.module.min.js';
import { ModelBuilder,v } from './geometry.js';

const GOLD=0xffc54d, BLUE=0x5caecb, CORAL=0xee7059, GREEN=0x70b88b;
const CREAM=0xe8e9dc, INK=0x526d64, COPPER=0xa78654;
const clamp=n=>Math.max(0,Math.min(1,n));

/** A separate, front-facing single-phase teaching panel; all positions are local. */
export class BoardLesson extends ModelBuilder {
  constructor(parent){
    const root=new THREE.Group();super(root);parent.add(root);
    this.root.name='board-lesson';this.flows=[];this.switches={};this.loadLights=[];
    this.dummy=new THREE.Object3D();
    this.anchors={amp:[-3.65,2.5,.9],rcd:[-1.45,2.5,.9],branch:[2.55,2.7,.9],living:[1,-1.9,.9],kitchen:[2.6,-1.9,.9],utility:[4.2,-1.9,.9],source:[-5.35,2.7,.6],earth:[4.8,-2.65,.6]};
    this.buildPanel();this.buildLoads();this.buildWires();this.render(null,0);
  }

  material(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:opacity<1,opacity,toneMapped:false,depthWrite:opacity===1});}

  buildPanel(){
    // The lower open area holds three illustrative loads, outside the panel enclosure.
    this.box([9.95,3.15,.22],[.3,1.2,-.2],CREAM);
    this.box([10.15,.14,.38],[.3,2.84,-.11],0xadbda9);
    this.box([10.15,.14,.38],[.3,-.4,-.11],0xadbda9);
    for(const x of [-4.7,5.3])this.box([.14,3.1,.38],[x,1.23,-.11],0xadbda9);
    for(const x of [-4.45,5.0])for(const y of [-.15,2.59]){
      this.cyl(.065,.035,[x,y,-.055],0x8a9d90,this.root,'z');this.box([.075,.012,.013],[x,y,-.03],0x5f756a);
    }
    this.box([9.5,.17,.07],[0,.83,-.02],0xb9c5b7);
    this.makeSwitch('amp',[-3.65,1.43,0],[1.6,2.02],GOLD);
    this.makeSwitch('rcd',[-1.45,1.43,0],[2.05,2.02],GREEN);
    ['living','kitchen','utility'].forEach((key,i)=>this.makeSwitch(key,[1+i*1.6,1.43,0],[1.02,1.9],BLUE));

    // Both L and N pass through the SAME toroidal core, in opposite directions.
    // Their front-to-back sections visibly penetrate its aperture, not its body.
    const coreMat=this.mat(0x82988b).clone();this.rcdCore=this.torus(.46,.085,[-1.45,1.44,.65],coreMat,this.root,'z');
    for(let i=0;i<12;i++){
      const a=i/12*Math.PI*2,coil=this.torus(.09,.026,[-1.45+Math.cos(a)*.46,1.44+Math.sin(a)*.46,.65],COPPER,this.root,'z');
      coil.rotation.x=Math.PI/2;coil.rotation.y=-a;
    }
    this.sensorGlow=this.torus(.59,.025,[-1.45,1.44,.65],this.material(GREEN,.7),this.root,'z');
    // A small, physically separate test button identifies the wider RCD body.
    this.cyl(.095,.09,[-.79,.73,.45],0xddae52,this.root,'z');
    this.box([.16,.04,.03],[-.79,.73,.507],0xf3edcd);this.cyl(.095,.09,[-.79,.45,.45],0xbf493b,this.root,'z');
    // Thermal sensing strips and a magnetic trip coil are visible cutaways.
    this.ampHeat=this.box([.75,.1,.06],[-3.65,1.16,.48],this.mat(0xc2a77c).clone());
    this.branchHeat=this.box([.63,.085,.055],[2.6,1.2,.49],this.mat(0xc2a77c).clone());
    for(let i=0;i<7;i++)this.torus(.12,.025,[2.6,1.72+i*.035,.47],COPPER,this.root,'y');
    this.magneticGlow=this.sphere(.19,[2.6,1.81,.47],this.material(CORAL,.28));
  }

  makeSwitch(key,p,size,accent){
    const [x,y,z]=p,[w,h]=size;
    this.box([w,h,.32],[x,y,z+.13],0xd5dfd1);
    this.box([w-.1,h-.1,.035],[x,y,z+.305],key==='amp'?0x9f352b:key==='rcd'?0x6b736e:0xeae7d7);
    this.box([w-.15,.12,.045],[x,y+h/2-.11,z+.34],accent);
    for(const yy of [y-h/2+.15,y+h/2-.15]){
      this.box([.32,.13,.08],[x,yy,z+.36],0xa7b4a5);
      this.cyl(.035,.035,[x,yy,z+.417],0x6f8477,this.root,'z');
    }
    const contactY=key==='rcd'?2.13:y+.12,contactX=key==='rcd'?x-.43:x;
    const contact=this.makeContact([contactX,contactY,z+.58],key==='rcd'?.37:.45);
    const lever=new THREE.Group();lever.position.set(key==='rcd'?x-.64:x,y-.53,z+.47);this.root.add(lever);
    this.cyl(.11,key==='rcd'?.27:.38,[0,0,0],INK,lever,'x');
    this.box([key==='rcd'?.3:.42,.42,.12],[0,.14,.045],0x273c35,lever);
    this.box([key==='rcd'?.23:.34,.065,.07],[0,.27,.08],accent,lever);
    const lightMat=new THREE.MeshStandardMaterial({color:GREEN,emissive:GREEN,emissiveIntensity:.35,roughness:.4});
    const status=this.sphere(.057,[x+w/2-.16,y-h/2+.29,z+.4],lightMat);
    let neutralContact=null;
    if(key==='rcd')neutralContact=this.makeContact([x+.43,.91,z+.58],.33);
    this.switches[key]={lever,contact,neutralContact,status};
  }

  makeContact(p,width){
    const [x,y,z]=p;
    this.sphere(.062,[x-width/2,y,z],COPPER);this.sphere(.062,[x+width/2,y,z],COPPER);
    const pivot=new THREE.Group();pivot.position.set(x-width/2,y,z);this.root.add(pivot);
    this.box([width,.07,.06],[width/2,0,0],COPPER,pivot);
    return pivot;
  }

  buildLoads(){
    for(let i=0;i<3;i++){
      const x=1+i*1.6;this.box([1.28,1.32,.12],[x,-1.39,.02],0xd5dfcb);
      this.box([1.34,.12,.65],[x,-2.08,.2],0xb9c7ae);
      const mat=new THREE.MeshStandardMaterial({color:0xc7cbb2,emissive:GOLD,emissiveIntensity:0});
      this.loadLights.push({material:mat,glow:this.sphere(.28,[x,-.82,.36],mat)});
    }
    this.houseOutline=this.path([[.14,-2.3,-.05],[.14,-.69,-.05],[2.6,-.32,-.05],[5.06,-.69,-.05],[5.06,-2.3,-.05],[.14,-2.3,-.05]],.038,this.mat(0x809c80).clone()).mesh;
    // Living room: pendant bulb and television.
    this.segment([1,-.43,.3],[1,-.66,.3],.022,INK);this.cyl(.15,.09,[1,-.64,.3],CREAM);
    this.box([.78,.49,.12],[1,-1.5,.32],INK);this.box([.65,.37,.03],[1,-1.5,.396],0x829e92);
    this.box([.32,.04,.12],[1,-1.82,.32],INK);this.box([.05,.16,.07],[1,-1.74,.32],INK);
    // Kitchen: a resistive appliance with a visible heater.
    this.box([.78,.63,.48],[2.6,-1.5,.31],CREAM);
    this.cyl(.23,.36,[2.6,-1.27,.3],0xc1cbc1);this.cyl(.25,.04,[2.6,-1.07,.3],INK);
    const handle=this.torus(.16,.035,[2.94,-1.3,.3],INK,this.root,'z');handle.scale.x=.65;
    this.kitchenCoil=this.path([[2.29,-1.65,.57],[2.4,-1.56,.57],[2.5,-1.7,.57],[2.6,-1.56,.57],[2.7,-1.7,.57],[2.83,-1.58,.57]],.028,this.mat(0xa89c7e).clone()).mesh;
    // Utility: a metal-cased washing machine. Earth attaches to this case.
    this.washerCase=this.box([.83,.98,.58],[4.2,-1.38,.29],this.mat(0xc7d1c8).clone());
    this.box([.68,.12,.03],[4.2,-1.0,.6],0x9baea2);
    this.torus(.25,.055,[4.2,-1.45,.61],INK,this.root,'z');this.cyl(.205,.02,[4.2,-1.45,.6],0x7b9991,this.root,'z');
    this.sphere(.045,[4.43,-1.0,.64],0xe5d078);
    this.cyl(.065,.08,[4.65,-1.46,.57],GREEN,this.root,'z');
    this.leakFlash=this.sphere(.13,[4.45,-1.46,.64],this.material(CORAL,.65));
    // Source terminals and the source-side earth connection are kept outside the board.
    this.box([.7,.8,.2],[-5.35,1.85,.11],0xb8c9b0);
    this.sphere(.095,[-5.35,2.04,.29],GOLD);this.sphere(.095,[-5.35,1.65,.29],BLUE);
    for(const [x,y]of [[4.9,-2.5],[-5.35,-2.5]]){
      this.segment([x,y+.16,.3],[x,y-.16,.3],.035,GREEN);
      for(let i=0;i<3;i++)this.segment([x-.2+i*.045,y-.16-i*.09,.3],[x+.2-i*.045,y-.16-i*.09,.3],.025,GREEN);
    }
  }

  wire(points,kind,color=GOLD,{branch=null,dotted=false,radius=.026,fault=false}={}){
    const cable=this.path(points,radius,dotted?this.material(color,.09):this.mat(color).clone());
    if(dotted){
      cable.mesh.visible=false;
      const length=cable.curve.getLength();
      for(let d=0;d<length;d+=.21)this.segment(cable.curve.getPoint(d/length).toArray(),cable.curve.getPoint(Math.min(1,(d+.085)/length)).toArray(),radius,this.material(color,.35));
    }
    const length=cable.curve.getLength(),count=Math.max(7,Math.ceil(length*4));
    const particles=new THREE.InstancedMesh(new THREE.SphereGeometry(.045,6,5),this.material(color),count);
    particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);particles.frustumCulled=false;this.root.add(particles);
    const samples=Array.from({length:301},(_,i)=>cable.curve.getPoint(i/300));
    const flow={mesh:cable.mesh,particles,samples,count,length,kind,branch,color,dotted,fault};this.flows.push(flow);return flow;
  }

  buildWires(){
    // Contacts are left as real gaps in the tube geometry. Moving blades bridge them.
    this.wire([[-5.35,2.04,.35],[-4.58,2.04,.55],[-4.58,1.55,.58],[-3.875,1.55,.58]],'main');
    this.wire([[-3.425,1.55,.58],[-2.75,1.55,.58],[-2.75,2.13,.58],[-2.065,2.13,.58]],'main');
    this.wire([[-1.695,2.13,.58],[-1.68,2.13,.27],[-1.68,1.44,.27],[-1.68,1.44,1.04],[-.34,1.44,1.04],[-.34,2.56,.58],[4.2,2.56,.58]],'main');
    // Neutral remains electrically separate from earth everywhere in this board.
    this.wire([[4.55,-.18,.76],[-.42,-.18,.76],[-.42,.91,.58],[-.855,.91,.58]],'return',BLUE);
    this.wire([[-1.185,.91,.58],[-1.22,.91,1.04],[-1.22,1.44,1.04],[-1.22,1.44,.27],[-2.55,.2,.27],[-5.35,.2,.27],[-5.35,1.65,.35]],'return',BLUE);
    for(let i=0;i<3;i++){
      const x=1+i*1.6;
      this.wire([[x,2.56,.58],[x-.225,2.56,.58],[x-.225,1.55,.58]],'branch',GOLD,{branch:i});
      this.wire([[x+.225,1.55,.58],[x+.4,1.55,.68],[x+.4,.35,.68],[x-.4,.35,.68],[x-.4,-.83,.67]],'branch',GOLD,{branch:i});
      // Each branch passes THROUGH the modeled load. Only the red fault path bypasses it.
      const loadPaths=[
        [[x-.4,-.83,.67],[x-.15,-.83,.67],[x-.06,-.73,.67],[x+.04,-.91,.67],[x+.14,-.83,.67],[x+.35,-.83,.67]],
        [[x-.4,-.83,.67],[x-.4,-1.65,.67],[x-.31,-1.65,.67],[x-.2,-1.56,.67],[x-.1,-1.7,.67],[x,-1.56,.67],[x+.1,-1.7,.67],[x+.23,-1.58,.67],[x+.35,-1.58,.67],[x+.35,-.83,.67]],
        [[x-.4,-.83,.67],[x-.4,-1.45,.7],[x-.19,-1.45,.7],[x-.13,-1.29,.7],[x+.02,-1.26,.7],[x+.17,-1.42,.7],[x+.05,-1.61,.7],[x-.12,-1.58,.7],[x-.19,-1.45,.7],[x+.35,-1.45,.7],[x+.35,-.83,.67]]
      ];
      this.wire(loadPaths[i],'load',GOLD,{branch:i});
      this.wire([[x+.35,-.83,.67],[x+.35,-.18,.76]],'branchReturn',BLUE,{branch:i});
      this.sphere(.052,[x-.4,-.83,.67],COPPER);this.sphere(.052,[x+.35,-.83,.67],COPPER);
    }
    this.shortWire=this.wire([[2.2,-.83,.67],[2.2,-.71,.7],[2.37,-.56,.73],[2.6,-.72,.73],[2.78,-.56,.73],[2.95,-.71,.7],[2.95,-.83,.67]],'short',CORAL,{branch:1,fault:true,radius:.042});
    this.leakWire=this.wire([[3.8,-.83,.67],[3.9,-1.1,.72],[4.02,-1.23,.72],[4.45,-1.46,.64],[4.65,-1.46,.57]],'leak',CORAL,{branch:2,fault:true,radius:.037});
    this.wire([[4.65,-1.46,.57],[4.9,-1.46,.57],[4.9,-2.5,.3]],'earth',GREEN,{radius:.036});
    // Ground is a return path to the SOURCE neutral, not a sink for electricity.
    this.wire([[4.9,-2.66,.3],[4.9,-2.96,.3],[-5.35,-2.96,.3],[-5.35,-2.66,.3]],'earth',GREEN,{dotted:true,radius:.022});
    this.wire([[-5.35,-2.5,.3],[-5.35,.2,.27]],'earth',GREEN,{radius:.03});
  }

  render(frame,motion=0){
    const live=frame?.live||{main:false,branches:[false,false,false]};
    const trip=frame?.tripped||{};
    const key=frame?.key||'normal';
    const branchCurrent=frame?.currents||[0,0,0];
    const leakage=Boolean(frame?.leakageActive);
    const short=Boolean(frame?.shortActive);
    const faultVisible=key==='leak'&&(leakage||trip.rcd);
    const shortVisible=key==='short'&&(short||trip.kitchen);
    for(const [name,switchModel]of Object.entries(this.switches)){
      const open=trip[name]?Math.max(.05,clamp(frame?.tripProgress??1)):0;
      switchModel.contact.rotation.z=open*.88;
      if(switchModel.neutralContact)switchModel.neutralContact.rotation.z=open*.88;
      switchModel.lever.rotation.x=open*2.25;
      const active=name==='amp'||name==='rcd'?live.main:live.branches[['living','kitchen','utility'].indexOf(name)];
      const color=trip[name]?CORAL:active?GREEN:0x96a398;
      switchModel.status.material.color.setHex(color);switchModel.status.material.emissive.setHex(color);switchModel.status.material.emissiveIntensity=trip[name]?.75:active?.25:0;
    }
    this.houseOutline.material.emissive.setHex(GOLD);this.houseOutline.material.emissiveIntensity=live.main?.55:0;
    this.ampHeat.material.color.setHex(key==='amp'&&(frame?.overloadActive||trip.amp)?CORAL:0xc2a77c);
    this.branchHeat.material.color.setHex(key==='branch'&&(frame?.overloadActive||trip.kitchen)?CORAL:0xc2a77c);
    this.magneticGlow.visible=shortVisible;this.magneticGlow.scale.setScalar(short?1+.15*Math.sin(motion*18):1);
    this.rcdCore.material.color.setHex(faultVisible?0xbc7665:0x82988b);
    this.sensorGlow.material.color.setHex(faultVisible?CORAL:GREEN);
    this.sensorGlow.material.opacity=faultVisible?.8:live.main?.42:.16;
    this.sensorGlow.scale.setScalar(leakage?1+.05*Math.sin(motion*13):1);
    this.washerCase.material.color.setHex(faultVisible?0xe2a68c:0xc7d1c8);
    this.leakFlash.visible=leakage&&live.branches[2];
    this.leakFlash.scale.setScalar(.85+.15*Math.sin(motion*17));
    this.kitchenCoil.material.color.setHex(shortVisible?CORAL:live.branches[1]?0xe9b563:0xa89c7e);
    this.loadLights.forEach((light,i)=>{
      const on=live.branches[i]&&!(i===1&&short);
      light.material.color.setHex(on?0xffedac:0x60786b);light.material.emissiveIntensity=on?1.7:0;
      light.glow.scale.setScalar(on?1:0.86);
    });
    for(const flow of this.flows){
      let active=Boolean(live.main),current=frame?.totalCurrent||0;
      if(flow.branch!==null){active=Boolean(live.branches[flow.branch]);current=branchCurrent[flow.branch]||0;}
      if(flow.kind==='load'&&flow.branch===1&&short)active=false;
      if(flow.kind==='short'){active=active&&short;flow.mesh.visible=shortVisible;}
      if(flow.kind==='leak'){active=active&&leakage;flow.mesh.visible=faultVisible;}
      if(flow.kind==='earth')active=Boolean(live.branches[2]&&leakage);
      if(flow.kind==='return')current=frame?.returningA||0;
      flow.particles.visible=active;
      // Every energized route has persistent traces; current is moving light, not wire color alone.
      if(!flow.dotted&&flow.mesh.material.emissive){flow.mesh.material.color.setHex(active?flow.color:flow.kind==='earth'?0x83a58c:0xa0aea2);flow.mesh.material.emissive.setHex(flow.color);flow.mesh.material.emissiveIntensity=active?.4:0;}
      if(!active)continue;
      const density=flow.kind==='leak'||flow.kind==='earth'?.65:clamp(.23+current/35);
      const shown=Math.max(3,Math.floor(flow.count*density));
      flow.particles.count=shown;
      const speed=flow.kind==='earth'||flow.kind==='leak'?1.7:1.35+Math.min(current,50)*.025;
      for(let i=0;i<shown;i++){
        const t=(i/shown+motion*speed/flow.length)%1;
        const idx=Math.min(299,Math.floor(t*300)),mix=t*300-idx;
        this.dummy.position.copy(flow.samples[idx]).lerp(flow.samples[idx+1],mix);
        this.dummy.scale.setScalar(flow.kind==='short'?1.55:flow.kind==='leak'?1.25:1);
        this.dummy.updateMatrix();flow.particles.setMatrixAt(i,this.dummy.matrix);
      }
      flow.particles.instanceMatrix.needsUpdate=true;
    }
  }
}
