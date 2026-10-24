import * as THREE from './vendor/three.module.min.js';
import { ModelBuilder } from './geometry.js';
import { ROOM_KEYS } from './simulation.js';

const GOLD=0xffcb51, GREEN=0x71b484, RED=0xe56f53, INK=0x344c43, CREAM=0xeeeadd;

/** Opaque breaker faces, with external room lamps. No internal mechanisms. */
export class BoardLesson extends ModelBuilder {
  constructor(parent){
    const root=new THREE.Group();super(root);parent.add(root);
    this.root.name='board-lesson';this.switches={};this.pickables=[];this.loadLights=[];this.roomWires=[];
    this.anchors={amp:[-3.65,2.75,.8],rcd:[-1.35,2.75,.8],branch:[2.6,2.75,.8],
      living:[1,-2.35,.8],kitchen:[2.6,-2.35,.8],utility:[4.2,-2.35,.8],test:[-1.35,-.64,.8]};
    this.buildPanel();this.buildRooms();
  }

  pick(mesh,action){mesh.userData.action=action;this.pickables.push(mesh);return mesh;}

  buildPanel(){
    this.box([10.4,3.3,.36],[.25,1.22,-.22],CREAM);
    this.box([10.55,.13,.43],[.25,2.9,-.17],0xb0bdab);
    this.box([10.55,.13,.43],[.25,-.45,-.17],0xb0bdab);
    for(const x of [-4.96,5.46])this.box([.13,3.3,.43],[x,1.23,-.17],0xb0bdab);
    for(const x of [-4.68,5.16])for(const y of [-.19,2.64]){
      this.cyl(.055,.035,[x,y,.003],0x879b8c,this.root,'z');
      this.box([.06,.012,.014],[x,y,.026],0x536a60);
    }
    this.makeSwitch('amp',-3.65,1.6,0x9c312b);
    this.makeSwitch('rcd',-1.35,1.95,0x737d74);
    ROOM_KEYS.forEach((key,i)=>this.makeSwitch(key,1+i*1.6,1.12,0xe5dfce));
    this.testButton=this.pick(this.cyl(.14,.12,[-.8,.68,.47],0xe9bd48,this.root,'z'),'test');
    this.testButton.material=this.testButton.material.clone();
    this.detectionLamp=this.sphere(.11,[-.8,.29,.49],new THREE.MeshStandardMaterial({color:0x77544a,emissive:RED,emissiveIntensity:0}));
  }

  makeSwitch(key,x,width,face){
    this.pick(this.box([width,2.36,.25],[x,1.15,.08],0xd7d9cc),key);
    this.pick(this.box([width-.13,2.16,.08],[x,1.15,.25],face),key);
    const leverX=key==='rcd'?x-.32:x;
    this.pick(this.box([.66,1.35,.09],[leverX,1.12,.34],0x1e2c27),key);
    const lever=new THREE.Group();lever.position.set(leverX,1.1,.42);this.root.add(lever);
    this.pick(this.box([.5,.62,.2],[0,.17,.06],0xd8dcce,lever),key);
    this.pick(this.box([.46,.075,.05],[0,.36,.175],0xf2f1df,lever),key);
    const status=this.sphere(.065,[x,.2,.34],new THREE.MeshStandardMaterial({color:GREEN,emissive:GREEN,emissiveIntensity:.8}));
    this.switches[key]={lever,status};
  }

  buildRooms(){
    // Outside the enclosure, each visible cable leads to exactly one room.
    for(let i=0;i<3;i++){
      const x=1+i*1.6;
      const cable=this.path([[x,-.46,.09],[x,-.85,.09]],.035,this.mat(0xa2ad98).clone()).mesh;
      this.roomWires.push(cable);
      this.box([1.4,1.35,.16],[x,-1.58,.02],0xd8e0cf);
      this.box([1.46,.11,.6],[x,-2.29,.14],0xaebfa2);
      this.path([[x-.7,-1.07,.1],[x,-.76,.1],[x+.7,-1.07,.1]],.045,0x8ea580);
      const material=new THREE.MeshStandardMaterial({color:0x8b9988,emissive:GOLD,emissiveIntensity:0});
      this.sphere(.22,[x,-1.12,.31],material);
      const halo=this.sphere(.33,[x,-1.12,.27],new THREE.MeshBasicMaterial({color:GOLD,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
      this.loadLights.push({material,halo});
    }
    // Familiar room appliances, with no exposed electrical parts.
    this.box([.83,.53,.12],[1,-1.75,.24],INK);
    this.box([.7,.4,.03],[1,-1.75,.32],0x8da69b);
    this.box([.08,.16,.12],[1,-2.1,.22],INK);this.box([.4,.04,.2],[1,-2.16,.22],INK);
    this.box([.9,.38,.46],[2.6,-1.98,.19],CREAM);
    this.cyl(.24,.39,[2.6,-1.6,.25],0xb9c5b8);this.cyl(.26,.035,[2.6,-1.39,.25],INK);
    const handle=this.torus(.16,.04,[2.9,-1.58,.25],INK,this.root,'z');handle.scale.x=.65;
    this.box([.83,.95,.5],[4.2,-1.77,.23],CREAM);
    this.box([.71,.12,.035],[4.2,-1.45,.495],0x97afa0);
    this.torus(.24,.05,[4.2,-1.88,.51],INK,this.root,'z');
    this.cyl(.195,.025,[4.2,-1.88,.5],0x77998d,this.root,'z');
    this.sphere(.04,[4.44,-1.45,.53],0xd6b55b);
    // A house-shaped scope indicator ties both main breakers to all room lamps.
    this.scope=this.path([[.1,-2.52,-.08],[.1,-.97,-.08],[2.6,-.54,-.08],[5.1,-.97,-.08],[5.1,-2.52,-.08],[.1,-2.52,-.08]],.027,this.mat(0x879e7f).clone()).mesh;
  }

  render(frame,motion){
    if(!frame)return;
    for(const [key,device]of Object.entries(this.switches)){
      const on=frame.switches[key];device.lever.rotation.x=on?-.48:.62;
      device.status.material.color.setHex(on?GREEN:0x725e50);
      device.status.material.emissiveIntensity=on?.9:0;
    }
    this.loadLights.forEach(({material,halo},i)=>{
      const on=frame.live.branches[i];material.color.setHex(on?0xffe29c:0x829080);material.emissiveIntensity=on?4.5:0;
      halo.material.opacity=on?.17:0;
      this.roomWires[i].material.color.setHex(on?GOLD:0x8f9c88);
      this.roomWires[i].material.emissive.setHex(on?GOLD:0);this.roomWires[i].material.emissiveIntensity=on?.7:0;
    });
    this.scope.material.color.setHex(frame.live.main?0xb2ac6b:0x7e8e77);
    const signal=frame.detected?1:frame.testing?(.55+.45*Math.sin(motion*18)):0;
    this.detectionLamp.material.color.setHex(signal>0?RED:0x77544a);
    this.detectionLamp.material.emissiveIntensity=signal*3;
    this.testButton.material.color.setHex(frame.testAvailable?0xe9bd48:0x9d9470);
  }
}
