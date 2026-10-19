import * as THREE from './vendor/three.module.min.js';
export const v = p => new THREE.Vector3(...p);

export class ModelBuilder {
  constructor(root) { this.root=root;this.materials=new Map(); }
  mat(color,roughness=.65,metalness=0) {
    const key=`${color}:${roughness}:${metalness}`;
    if(!this.materials.has(key))this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));
    return this.materials.get(key);
  }
  mesh(geometry,material,pos,parent=this.root) {
    const object=new THREE.Mesh(geometry,material);object.position.copy(v(pos));object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
  }
  box(size,pos,color,parent=this.root) { return this.mesh(new THREE.BoxGeometry(...size),typeof color==='number'?this.mat(color):color,pos,parent); }
  cyl(r,height,pos,color,parent=this.root,axis='y') {
    const object=this.mesh(new THREE.CylinderGeometry(r,r,height,20),typeof color==='number'?this.mat(color):color,pos,parent);
    if(axis==='x')object.rotation.z=Math.PI/2;if(axis==='z')object.rotation.x=Math.PI/2;return object;
  }
  sphere(r,pos,color,parent=this.root) {return this.mesh(new THREE.SphereGeometry(r,16,10),typeof color==='number'?this.mat(color):color,pos,parent);}
  torus(r,t,pos,color,parent=this.root,axis='x') {
    const m=this.mesh(new THREE.TorusGeometry(r,t,8,32),typeof color==='number'?this.mat(color):color,pos,parent);
    if(axis==='x')m.rotation.y=Math.PI/2;if(axis==='y')m.rotation.x=Math.PI/2;return m;
  }
  segment(a,b,r,color,parent=this.root) {
    const delta=v(b).sub(v(a)),object=this.cyl(r,delta.length(),v(a).add(v(b)).multiplyScalar(.5).toArray(),color,parent);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return object;
  }
  path(points,r,color,parent=this.root,curved=false) {
    const curve=curved?new THREE.CatmullRomCurve3(points.map(v),false,'centripetal'):new THREE.CurvePath();
    if(!curved)points.slice(1).forEach((p,i)=>curve.add(new THREE.LineCurve3(v(points[i]),v(p))));
    const mesh=this.mesh(new THREE.TubeGeometry(curve,Math.max(40,points.length*12),r,7,false),typeof color==='number'?this.mat(color):color,[0,0,0],parent);
    mesh.castShadow=false;return {curve,mesh};
  }
}
