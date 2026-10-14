import * as THREE from './vendor/three.module.min.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const COLORS = { live: 0xe3ad39, neutral: 0x419dc9, earth: 0x48a477, fault: 0xe0634d, idle: 0xb3b9a7 };
const v = p => new THREE.Vector3(...p);

export class HouseScene {
  constructor(canvas, labels, onSelect) {
    this.canvas = canvas; this.labelRoot = labels; this.onSelect = onSelect;
    this.flows = []; this.labels = []; this.breakers = {}; this.lights = []; this.pickables = [];
    this.showLabels = true; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene = new THREE.Scene();
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.camera = new THREE.PerspectiveCamera(38, 1, .1, 150);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0xf1f4eb, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = .95;
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true; this.controls.dampingFactor = .08;
    this.controls.minDistance = 3; this.controls.maxDistance = 45;
    this.controls.maxPolarAngle = Math.PI * .49;
    this.controls.target.set(-.7, .6, 0);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb4bea0, 2.0));
    const sun = new THREE.DirectionalLight(0xfff7df, 2.4); sun.position.set(-4, 16, 10);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, far: 50 });
    sun.shadow.bias = -.0004; sun.shadow.normalBias = .025; this.scene.add(sun);
    this.materials = {};
    this.buildHouse(); this.buildFurniture(); this.buildBoard(); this.buildSource(); this.buildHuman(); this.buildWiring();
    this.addLabel('living', 'リビング', [-2.6, .8, 3.5], '照明・エアコン', 'house');
    this.addLabel('kitchen', 'キッチン', [3.7, 2.5, -2.5], 'レンジ・ケトル', 'house');
    this.addLabel('utility', '洗面室', [5.0, 2.25, 1.5], '洗濯機', 'earth');
    this.addLabel('board', '分電盤', [-4.0, 3.1, -3.55], '3つの役割で家を守る', 'board');
    this.addLabel('source', '電源', [-7.4, 4.5, -2.6], '変圧器側の接地へ戻る', 'source');
    this.addLabel('electrode', '接地極', [6.15, .15, 3.6], '大地へ', 'earth');
    this.addLabel('earthreturn', '大地を通る経路（模式）→ 電源へ', [-1.4, .12, 5.1], '', null, true);
    this.addLabel('human', '人の体も通り道になる', [1.2, 2.3, 3.25], '', 'earth');
    this.setView('house', true); this.resize();
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas.parentElement);
    this.controls.addEventListener('start', () => { this.tween = null; });
    this.pointer = null;
    canvas.addEventListener('pointerdown', e => { this.pointer = [e.clientX, e.clientY]; });
    canvas.addEventListener('pointerup', e => {
      if (!this.pointer || Math.hypot(e.clientX - this.pointer[0], e.clientY - this.pointer[1]) > 5) return;
      const bounds = canvas.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX - bounds.left) / bounds.width * 2 - 1, -(e.clientY - bounds.top) / bounds.height * 2 + 1), this.camera);
      const hit = ray.intersectObjects(this.pickables)[0]; if (hit) this.onSelect(hit.object.userData.select);
    });
    canvas.addEventListener('keydown', e => {
      const offset = this.camera.position.clone().sub(this.controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      if (e.key === 'ArrowLeft') spherical.theta -= .12;
      else if (e.key === 'ArrowRight') spherical.theta += .12;
      else if (e.key === 'ArrowUp') spherical.phi = Math.max(.15, spherical.phi - .1);
      else if (e.key === 'ArrowDown') spherical.phi = Math.min(1.48, spherical.phi + .1);
      else if (e.key === '+' || e.key === '=') spherical.radius = Math.max(3, spherical.radius * .9);
      else if (e.key === '-') spherical.radius = Math.min(45, spherical.radius * 1.1);
      else return;
      e.preventDefault(); this.tween = null; this.camera.position.copy(this.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    });
  }

  mat(color, roughness = .65, metalness = 0) {
    const key = `${color}-${roughness}-${metalness}`;
    return this.materials[key] ||= new THREE.MeshStandardMaterial({ color, roughness, metalness });
  }
  mesh(geo, material, pos, parent = this.root) {
    const m = new THREE.Mesh(geo, material); m.position.copy(v(pos)); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  box(size, pos, color, parent = this.root) { return this.mesh(new THREE.BoxGeometry(...size), typeof color === 'number' ? this.mat(color) : color, pos, parent); }
  cyl(r, height, pos, color, parent = this.root, axis = 'y') {
    const m = this.mesh(new THREE.CylinderGeometry(r, r, height, 24), typeof color === 'number' ? this.mat(color) : color, pos, parent);
    if (axis === 'z') m.rotation.x = Math.PI / 2; if (axis === 'x') m.rotation.z = Math.PI / 2; return m;
  }
  sphere(r, pos, color, parent = this.root) { return this.mesh(new THREE.SphereGeometry(r, 20, 12), typeof color === 'number' ? this.mat(color) : color, pos, parent); }
  segment(a, b, radius, color, parent = this.root) {
    const delta = v(b).sub(v(a)); const m = this.cyl(radius, delta.length(), v(a).add(v(b)).multiplyScalar(.5).toArray(), color, parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()); return m;
  }
  pick(object, name) { object.userData.select = name; this.pickables.push(object); return object; }
  addLabel(id, title, point, sub, select, staticLabel = false) {
    const el = document.createElement(select ? 'button' : 'div'); el.className = `scene-label${staticLabel ? ' static' : ''}`;el.dataset.labelId=id;
    el.innerHTML = `<span>${title}</span>${sub ? `<small>${sub}</small>` : ''}`;
    if (select) { el.tabIndex = -1; el.addEventListener('click', () => this.onSelect(select)); }
    this.labelRoot.append(el); this.labels.push({ id, point: v(point), el });
  }
  floorText(text, pos, size = [2, .44]) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const ctx = c.getContext('2d');
    ctx.fillStyle = '#87917d'; ctx.font = '500 43px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 64);
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
    const m = this.mesh(new THREE.PlaneGeometry(...size), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), pos);
    m.rotation.x = -Math.PI / 2; m.castShadow = false;
  }
  buildHouse() {
    this.box([16.2, .52, 11.0], [-.4, -.38, .2], 0xcbd4bd);
    this.box([16.25, .08, 11.05], [-.4, -.09, .2], 0xe0e6d3);
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
    this.floorText('LIVING', [-2.1, .44, 3.1]);
    this.floorText('KITCHEN', [2.4, .44, -.3], [1.8, .4]);
    this.floorText('UTILITY', [3.9, .44, 3.7], [1.7, .4]);
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
    this.floorText('L  /  N',[-5.0,.46,-2.5],[.7,.2]);
  }
  buildSource() {
    this.cyl(.15,4.35,[-7.4,2.1,-2.7],0xa7b39e);
    this.box([1.65,.14,.16],[-7.4,3.9,-2.7],0x8b9b86);
    this.cyl(.4,.8,[-7.4,3.1,-2.37],0xa2b4a8);
    this.cyl(.43,.08,[-7.4,3.54,-2.37],0xbec9b9);
    this.cyl(.18,.2,[-7.4,3.73,-2.37],0xe4e9dc);
    for (const x of [-7.95,-6.9]) { this.cyl(.08,.3,[x,4.1,-2.7],0xcbd6c1);this.cyl(.13,.055,[x,4.12,-2.7],0xeaf0df); }
    this.box([.4,.58,.2],[-5.65,1.8,-2.75],0xf1f0e3);
    this.box([.27,.21,.03],[-5.65,1.9,-2.62],0x95ac9a);
    this.cyl(.06,.9,[6.25,-.2,3.2],0xb38e5d);
    this.cyl(.06,.7,[-7.15,-.2,-1.8],0xb38e5d);
    this.box([.47,.09,.47],[6.25,.06,3.2],0xc1c9b2);
    this.floorText('アース', [6.25,.115,4.0],[1.0,.3]);
  }
  buildHuman() {
    this.human = new THREE.Group();this.root.add(this.human);
    this.humanMat = this.mat(0xa9a299).clone();
    this.sphere(.19,[2.7,2.02,2.45],0xd2b996,this.human);
    this.cyl(.075,.12,[2.7,1.79,2.45],0xd2b996,this.human);
    this.box([.43,.58,.28],[2.7,1.47,2.45],this.humanMat,this.human);
    this.segment([2.57,1.18,2.45],[2.48,.5,2.6],.095,0x8b998d,this.human);
    this.segment([2.82,1.18,2.45],[2.96,.5,2.38],.095,0x8b998d,this.human);
    this.box([.2,.1,.33],[2.48,.48,2.66],0x6d7f72,this.human);
    this.box([.2,.1,.33],[2.96,.48,2.44],0x6d7f72,this.human);
    this.segment([2.9,1.66,2.45],[3.2,1.42,2.48],.07,this.humanMat,this.human);
    this.segment([3.2,1.42,2.48],[3.53,1.44,2.47],.065,0xd2b996,this.human);
    this.segment([2.49,1.66,2.45],[2.3,1.2,2.46],.07,this.humanMat,this.human);
    this.sphere(.075,[3.52,1.44,2.47],0xd2b996,this.human);
  }
  wire(points, kind, active, options = {}) {
    const curve = new THREE.CurvePath();
    points.slice(1).forEach((p,i)=>curve.add(new THREE.LineCurve3(v(points[i]),v(p))));
    const material = new THREE.MeshStandardMaterial({ color: COLORS[kind], roughness: .5, emissive: COLORS[kind], emissiveIntensity: .05, transparent: true, opacity: .6 });
    const cable = this.mesh(new THREE.TubeGeometry(curve,Math.max(32,points.length*10),options.radius || .025,7,false),material,[0,0,0]);cable.castShadow=false;
    const length=curve.getLength(), count=Math.max(4,Math.ceil(length*2));
    const particles = new THREE.InstancedMesh(new THREE.SphereGeometry(options.radius ? options.radius*1.8 : .052,7,5),new THREE.MeshBasicMaterial({color:kind==='live'?0xffd267:COLORS[kind],toneMapped:false}),count);
    particles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);particles.frustumCulled=false;this.root.add(particles);
    const samples=Array.from({length:501},(_,i)=>curve.getPoint(i/500));
    const flow={cable,material,particles,count,samples,length,kind,active,...options};this.flows.push(flow);return flow;
  }
  buildWiring() {
    const live=(p,on,opts)=>this.wire(p,'live',on,opts), neutral=(p,on,opts)=>this.wire(p,'neutral',on,opts);
    const P=[-4.72,2.36,-3.16], A=[-4.72,1.89,-3.16], R=[-4.18,1.89,-3.16], B=[-3.2,2.55,-3.12];
    // Supply remains live up to the first open switch, even after a trip.
    live([[-7.55,3.55,-2.3],[-6.7,3.3,-2.8],[-5.8,2.45,-3.05],P],f=>f.outgoing>0,{energized:()=>true});
    live([P,A,[-4.45,1.89,-3.16],[-4.45,2.36,-3.16],[-4.18,2.36,-3.16]],f=>f.outgoing>0,{energized:f=>f.ampOn});
    live([[-4.18,2.36,-3.16],R,[-3.98,1.89,-3.16],[-3.98,2.55,-3.12],B],f=>f.outgoing>0,{energized:f=>f.ampOn&&f.rcdOn});
    const N=[-3.07,2.575,-2.96];
    neutral([N,[-4.15,2.4,-3.0],[-4.72,2.4,-3],[-5.8,2.5,-2.9],[-6.7,3.45,-2.6],[-7.25,3.55,-2.3]],f=>f.returning>0);
    const paths=[
      [B,[-3.65,2.55,-3.12],[-3.65,2.38,-3.12],[-3.65,1.96,-3.12],[-3.2,.57,-2.8],[-1.15,.57,-2.8],[-1.15,.57,-2],[-1.15,1.1,-1.8]],
      [B,[-3.33,2.38,-3.12],[-3.33,1.96,-3.12],[-2.8,.58,-3.5],[3.5,.58,-3.5],[3.5,1.38,-3.5],[4.15,1.38,-3]],
      [B,[-3.0,1.94,-3.12],[-3.65,1.94,-3.12],[-3.65,1.5,-3.12],[-2.6,.59,-2.45],[.5,.59,-2.45],[.5,.59,1.4],[4.0,.59,1.4],[4.0,1.2,2.2]]
    ];
    paths.forEach((path,i)=>{
      const liveCurrent=f=>f.powered[i]&&(f.loads[i]>0||(i===2&&f.leakageMA>0));
      if(i===1){
        live(path.slice(0,-1),liveCurrent,{circuit:i});
        live(path.slice(-2),f=>liveCurrent(f)&&!f.short,{circuit:i});
      }else live(path,liveCurrent,{circuit:i});
      const back=path.slice(i===1?3:4).map(p=>[p[0]+.13,p[1]+.025,p[2]+.16]).reverse();back.push(N);
      if(i===1){
        neutral(back.slice(0,2),f=>f.powered[i]&&f.loads[i]>0&&!f.short,{circuit:i});
        neutral(back.slice(1),f=>f.powered[i]&&f.loads[i]>0,{circuit:i});
      }else neutral(back,f=>f.powered[i]&&f.loads[i]>0,{circuit:i});
      // A visible bridge through each load completes its ordinary circuit.
      this.wire([path.at(-1),back[0]],'live',f=>f.powered[i]&&f.loads[i]>0&&!(i===1&&f.short),{circuit:i});
    });
    this.wire([[4.0,1.2,2.2],[3.57,1.45,2.47]],'fault',f=>f.fault&&f.powered[2]&&(f.earthMA+f.bodyMA>0),{visible:f=>f.fault});
    this.wire([[3.57,1.45,2.47],[4.7,.6,2.7],[5.7,.26,2.7],[6.25,.26,3.2],[6.25,-.55,3.2]],'earth',f=>f.earthMA>0,{visible:(f,c)=>c.earth});
    this.wire([[3.53,1.44,2.56],[3.2,1.42,2.57],[2.9,1.66,2.62],[2.7,1.47,2.62],[2.57,1.18,2.61],[2.48,.5,2.72],[2.48,.02,2.72],[2.48,.02,5.1]],'fault',f=>f.bodyMA>0,{visible:f=>f.contact,radius:.036});
    // A visible surface trace represents the underground return path, not a wire
    // joining the appliance earth terminal to the neutral terminal in the home.
    this.wire([[6.25,.02,3.2],[6.25,.02,5.1],[2.48,.02,5.1]],'earth',f=>f.earthMA>0,{ground:true});
    this.wire([[2.48,.02,5.1],[-7.15,.02,5.1],[-7.15,.02,-1.8],[-7.25,3.55,-2.3]],'earth',f=>f.leakageMA>0,{ground:true});
    this.wire([[3.5,1.38,-3.5],[3.63,1.405,-3.34]],'fault',f=>f.short&&f.powered[1],{visible:f=>f.short,radius:.07});
  }
  setView(view, instant = false) {
    const views={house:{pos:[15,17,21],target:[-.8,.6,0]},board:{pos:[-4.4,4.0,4.2],target:[-4,1.95,-3.25]},earth:{pos:[11,9,14],target:[2.4,.55,2.3]},source:{pos:[-12,7,7],target:[-5.5,1.6,-1.8]}};
    const next=views[view]||views.house;this.view=view;
    const pos=v(next.pos),target=v(next.target);
    if(view==='house') { const aspect=this.canvas.clientWidth/Math.max(1,this.canvas.clientHeight);pos.multiplyScalar(aspect>1.7?.76:aspect>1.3?.85:1); }
    if(instant||this.reduced){this.camera.position.copy(pos);this.controls.target.copy(target);this.tween=null;this.controls.update();}
    else this.tween={from:this.camera.position.clone(),fromTarget:this.controls.target.clone(),pos,target,start:performance.now()};
  }
  zoom(factor){this.tween=null;const offset=this.camera.position.clone().sub(this.controls.target);offset.setLength(Math.max(3,Math.min(45,offset.length()*factor)));this.camera.position.copy(this.controls.target).add(offset);}
  resize(){const r=this.canvas.parentElement.getBoundingClientRect();this.width=r.width;this.height=r.height;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.updateProjectionMatrix();}
  render(frame,config,phase,now) {
    if(this.tween){const t=Math.min(1,(now-this.tween.start)/850),s=t*t*(3-2*t);this.camera.position.lerpVectors(this.tween.from,this.tween.pos,s);this.controls.target.lerpVectors(this.tween.fromTarget,this.tween.target,s);if(t===1)this.tween=null;}
    this.controls.update();
    const dummy=new THREE.Object3D();
    for(const flow of this.flows){
      const visible=flow.visible?flow.visible(frame,config):true;
      const active=visible&&flow.active(frame,config);
      flow.cable.visible=visible;flow.particles.visible=active;
      const energized=active||(flow.energized&&flow.energized(frame));
      flow.material.color.setHex(energized?COLORS[flow.kind]:COLORS.idle);
      flow.material.emissiveIntensity=active?.3:0;flow.material.opacity=energized?1:flow.kind==='earth'?.42:.35;
      if(!active)continue;
      const speed=flow.kind==='fault'||flow.kind==='earth'?1.5:2.0;
      for(let i=0;i<flow.count;i++){
        const t=((i/flow.count+phase*speed/flow.length)%1+1)%1;
        dummy.position.copy(flow.samples[Math.floor(t*500)]);dummy.scale.setScalar(1);dummy.updateMatrix();flow.particles.setMatrixAt(i,dummy.matrix);
      }flow.particles.instanceMatrix.needsUpdate=true;
    }
    for(const [id,pivot]of Object.entries(this.breakers)){
      const on=id==='amp'?frame.ampOn:id==='rcd'?frame.rcdOn:frame.branchOn[['living','kitchen','utility'].indexOf(id)];
      pivot.rotation.x=on?-.35:.7;
    }
    for(const light of this.lights){light.material.emissiveIntensity=frame.powered[light.circuit]?.35:0;light.material.color.setHex(frame.powered[light.circuit]?0xe9ce8a:0x93a18d);}
    this.washerMaterial.color.setHex(frame.caseLive?0xe8b09b:0xe8ebe3);
    this.washerMaterial.emissive.setHex(frame.caseLive?0xb64e31:0);this.washerMaterial.emissiveIntensity=frame.caseLive?.15:0;
    this.human.visible=config.touch;this.humanMat.color.setHex(frame.bodyMA>0?0xd47755:0xa9a299);
    this.human.position.x=frame.contact?0:-.35;
    for(const label of this.labels){
      const p=label.point.clone().project(this.camera);
      const hidden=!this.showLabels||p.z>1||p.z< -1||p.y>.9||p.y<-.9||(label.id==='human'&&!config.touch)||(label.id==='earthreturn'&&frame.leakageMA===0)||(this.view==='board'&&label.id!=='board');
      label.el.style.display=hidden?'none':'';
      label.el.style.left=`${(p.x*.5+.5)*this.width}px`;label.el.style.top=`${(-p.y*.5+.5)*this.height}px`;
      const i=['living','kitchen','utility'].indexOf(label.id);
      if(i>=0){label.el.classList.toggle('powered',frame.powered[i]);label.el.classList.toggle('unpowered',!frame.powered[i]);label.el.querySelector('small').textContent=`${frame.loads[i]} A · ${frame.powered[i]?'通電中':'停電'}`;}
      label.el.classList.toggle('danger',label.id==='human'&&frame.bodyMA>0||label.id==='utility'&&frame.caseLive);
    }
    this.renderer.render(this.scene,this.camera);
  }
}
