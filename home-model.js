import * as THREE from './vendor/three.module.min.js';
import { ModelBuilder } from './geometry.js';

export class HomeModel extends ModelBuilder {
  constructor(root) {
    super(root);this.lights=[];this.breakers={};this.buildHouse();this.buildFurniture();this.buildBoard();
  }
  pick(object) { return object; }
  buildHouse() {
    this.box([11.45, .38, 8.4], [0, .15, 0], 0xe9e5d9);
    this.box([5.65, .08, 8], [-2.75, .38, 0], 0xd7bf98);
    this.box([5.3, .08, 3.95], [2.75, .38, -2.03], 0xe1d7bb);
    this.box([5.3, .08, 3.8], [2.75, .38, 2.05], 0xcbd7ce);
    for (let z = -3.8; z < 4; z += .38) this.box([5.5, .006, .014], [-2.75, .425, z], 0xcbb38e);
    for (let x = .25; x < 5.5; x += .6) this.box([.012, .009, 3.8], [x, .427, 2.05], 0xbac9bd);
    for (let z = .25; z < 4; z += .6) this.box([5.25, .009, .012], [2.75, .428, z], 0xbac9bd);
    // Back wall with two real openings, and low cutaway walls towards the viewer.
    this.box([11.4, 1.05, .18], [0, .92, -4], 0xe7e9df);
    this.box([11.4, .45, .18], [0, 3.0, -4], 0xe7e9df);
    for (const [x, width] of [[-5.12, .95], [-1.65, 2.0], [2.25, 1.55], [5.1, .8]]) this.box([width, 1.38, .18], [x, 2.12, -4], 0xe7e9df);
    for (const [x, width] of [[-3.45, 2.3], [.6, 2.2], [3.95, 1.8]]) {
      const glass = this.mat(0xb9d4ce).clone(); glass.transparent = true; glass.opacity = .42;
      this.box([width, 1.17, .06], [x, 2.08, -4.02], glass);
      for (const yy of [1.47, 2.7]) this.box([width + .15, .07, .26], [x, yy, -4], 0xf7f5e9);
      this.box([.05, 1.2, .1], [x, 2.1, -3.95], 0xf7f5e9);
    }
    this.box([.16, 1.2, 8.15], [-5.6, 1.0, 0], 0xe5e7db);
    this.box([.16, .65, 8.15], [5.6, .73, 0], 0xe7e9df);
    this.box([11.25, .35, .15], [0, .57, 4.08], 0xf0f0e4);
    this.box([.14, 1.0, 3.1], [.05, .92, -2.45], 0xe6e8dd);
    this.box([.14, .68, 2.2], [.05, .76, 2.95], 0xe6e8dd);
    this.box([3.55, .82, .14], [3.78, .83, .05], 0xe7e9e0);
    this.box([.18, .05, 3.1], [.05, 1.44, -2.45], 0xfbf9eb);
    this.box([3.6, .05, .19], [3.78, 1.26, .05], 0xfbf9eb);
    this.box([1.4, .08, .52], [-1.7, .02, 4.6], 0xd4d8c6);
    this.box([1.3, .08, .4], [-1.7, -.01, 5.05], 0xd4d8c6);
    // Small garden details keep the house readable as a physical miniature.
    for (const [x,z] of [[-6.4,3.4], [6.6,-3.1]]) {
      this.cyl(.33, .4, [x,.18,z], 0xbdab88);
      this.sphere(.52, [x,.83,z], 0x8eab72); this.sphere(.36, [x+.26,1.14,z], 0x9bb77c);
    }
  }
  buildFurniture() {
    // Living room: upholstery, rug, low table, TV and air conditioner.
    this.box([3.6,.025,2.5], [-2.65,.455,.9], 0xece2c8);
    this.box([2.9,.35,1.1], [-3.6,.7,.15], 0x73917f);
    this.box([3.0,.8,.24], [-3.6,1.12,-.33], 0x6a8775);
    for (const x of [-5.0,-2.2]) this.box([.24,.65,1.2], [x,.98,.15], 0x799783);
    for (const x of [-4.45,-3.6,-2.75]) this.box([.78,.16,.85], [x,.93,.22], 0x89a48b);
    for (const x of [-4.45,-2.75]) this.box([.48,.4,.14], [x,1.25,-.12], 0xd4d9b5).rotation.z = .1;
    this.box([1.5,.13,.86], [-3.45,.88,1.85], 0xb89d77);
    for (const x of [-4.03,-2.87]) for (const z of [1.57,2.12]) this.box([.07,.4,.07], [x,.65,z], 0x9d8567);
    this.box([.4,.035,.3], [-3.3,.97,1.8], 0xf2efdb);
    this.cyl(.10,.16,[-3.8,1.02,1.8],0xe5ece0);
    this.box([1.5,.4,.55], [-1.0,.64,-1.9], 0xc1ad8b);
    this.box([1.45,.85,.10], [-1.0,1.35,-1.95], 0x344d48);
    const tvMat = this.mat(0x759e99).clone(); tvMat.emissive = new THREE.Color(0x8eccc0);
    this.box([1.32,.72,.02], [-1.0,1.35,-1.885], tvMat); this.lights.push({ material: tvMat, circuit: 0 });
    this.box([.09,.2,.09], [-1,.93,-1.95], 0x344d48);
    this.box([1.35,.5,.35], [-1.65,2.65,-3.73], 0xf3f0df);
    for(let i=0;i<4;i++) this.box([1.1,.025,.02],[-1.65,2.5+i*.05,-3.54],0xb9c4b4);
    this.cyl(.22,.07,[-4.8,.49,2.65],0xaeb29c); this.cyl(.035,1.7,[-4.8,1.35,2.65],0xaeb29c);
    this.mesh(new THREE.ConeGeometry(.4,.45,32,1,true),this.mat(0xf3e8c7),[-4.8,2.15,2.65]);
    // Kitchen cabinets and counter.
    this.box([3.7,.82,.85],[3.15,.85,-3.25],0xb2c1ad);
    this.box([3.85,.1,.96],[3.15,1.31,-3.25],0xf4f0df);
    for (const x of [1.7,2.4,3.1,3.8,4.5]) { this.box([.018,.7,.02],[x, .85,-2.815],0x98aa92); this.box([.23,.035,.05],[x+.24,1.08,-2.79],0x748a7c); }
    this.box([.85,.05,.56],[2.3,1.38,-3.2],0x91a5a0);
    this.segment([2.3,1.43,-3.47],[2.3,1.85,-3.47],.035,0xb8c5b8); this.segment([2.3,1.85,-3.47],[2.3,1.85,-3.2],.035,0xb8c5b8);
    this.box([.95,.54,.62],[4.2,1.62,-3.24],0xe8e7dd);
    this.box([.65,.35,.02],[4.1,1.62,-2.92],0x465d57);
    this.cyl(.045,.03,[4.56,1.7,-2.9],0x9baa95,this.root,'z');
    this.cyl(.18,.32,[3.1,1.54,-3.17],0xf4eee0);this.cyl(.12,.03,[3.1,1.72,-3.17],0x6d8276);
    this.segment([3.22,1.62,-3.17],[3.4,1.7,-3.17],.06,0xe2dfd0);
    this.box([.92,1.95,.85],[4.72,1.42,-1.85],0xe7ece4);
    this.box([.94,.025,.02],[4.72,1.65,-1.415],0xb2c2b4);
    this.box([.055,.4,.065],[4.36,2.0,-1.39],0x9cb0a4);
    this.box([1.4,.12,1.0],[1.55,1.08,-1.65],0xc8b18b);
    for(const x of [1.0,2.1])for(const z of [-2,-1.3])this.box([.075,.62,.075],[x,.74,z],0xb69c75);
    // Washing machine: visible door, control panel, conductive outer casing.
    this.washerMaterial = this.mat(0xe8ebe3).clone();
    this.pick(this.box([1.15,1.25,1.05],[4.1,1.08,2.25],this.washerMaterial),'earth');
    this.box([1.2,.1,1.1],[4.1,1.75,2.25],0xf5f2e7);
    this.cyl(.4,.07,[4.1,1.02,2.8],0x80958e,this.root,'z');
    this.cyl(.31,.08,[4.1,1.02,2.85],0x3b5d60,this.root,'z');
    this.cyl(.23,.09,[4.1,1.02,2.90],0x86b3b5,this.root,'z');
    this.cyl(.065,.04,[4.37,1.55,2.79],0x6d887a,this.root,'z');
    this.washerIndicator = this.box([.25,.08,.025],[3.82,1.55,2.79],this.mat(0x74a886).clone());
    this.lights.push({ material:this.washerIndicator.material, circuit:2 });
    this.box([1.2,.75,.7],[1.0,.84,3.2],0xb1c2b5); this.box([1.28,.12,.78],[1.0,1.25,3.2],0xf1f0e4);
    this.cyl(.045,.35,[1.0,1.48,3.43],0xa2b4a8);this.segment([1,1.65,3.43],[1,1.65,3.15],.04,0xa2b4a8);
    for (let i=0;i<3;i++) {
      const light = this.mat(0xf8e4a6).clone();light.emissive = new THREE.Color(0xffce60);
      const positions=[[-2.2,.46,2.5],[2.8,.46,-.8],[2.8,.46,3.3]];
      const disk=this.cyl(.2,.015,positions[i],light);disk.castShadow=false;this.lights.push({material:light,circuit:i});
    }
  }
  buildBoard() {
    this.pick(this.box([2.15,1.15,.22],[-4.0,2.0,-3.64],0xf8f7ee),'board');
    this.box([2.0,.99,.08],[-4.0,2.0,-3.48],0xdce2d5);
    const list=[['amp',-4.72,2.13,.4],['rcd',-4.18,2.13,.4],['living',-3.65,2.17,.23],['kitchen',-3.33,2.17,.23],['utility',-3.65,1.72,.23]];
    for (const [id,x,y,width] of list) {
      this.pick(this.box([width,.4,.14],[x,y,-3.37],0xf1f0e3),id);
      const pivot = new THREE.Group(); pivot.position.set(x,y,-3.25);this.root.add(pivot);
      this.pick(this.box([width*.64,.13,.12],[0,.07,0],0x405d4c,pivot),id);
      this.box([width*.45,.02,.015],[0,.085,.07],0xdae5cd,pivot);
      this.breakers[id]=pivot;
    }
  }
}
