import * as T from './vendor/three.module.js';
import {buildAssembly,memberBasis,PROFILES,DEFAULTS} from './model.js';
import {clamp} from './experience-math.js';
import {assemblyOrder} from './lab-model.js';
import {bindPointerDrag} from './pointer-drag.js';

function environment(renderer){
  const room=new T.Scene();room.background=new T.Color('#888d92');
  const shell=new T.Mesh(new T.BoxGeometry(30,30,30),new T.MeshBasicMaterial({color:0x40434a,side:T.BackSide}));room.add(shell);
  for(const [x,y,z,w,h,power] of [[-8,6,0,7,14,7],[5,4,-8,10,9,5],[0,12,0,12,7,5],[6,-2,9,3,10,3]]){const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(power,power*.98,power*.94),side:T.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,0,0);room.add(panel);}
  const generator=new T.PMREMGenerator(renderer),target=generator.fromScene(room,.03);generator.dispose();room.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return target;
}
function steelMaterial(color,roughness=.34,metalness=.82){return new T.MeshStandardMaterial({color,roughness,metalness});}
function box(parent,size,position,material){const m=new T.Mesh(new T.BoxGeometry(...size),material);m.position.set(...position);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function iBeam(parent,a,b,width,depth,thick,material,bevel=.008){
  const length=Math.hypot(...b.map((v,i)=>v-a[i])),w=width/2,h=depth/2,t=thick/2,f=thick;
  const points=[[-w,-h],[w,-h],[w,-h+f],[t,-h+f],[t,h-f],[w,h-f],[w,h],[-w,h],[-w,h-f],[-t,h-f],[-t,-h+f],[-w,-h+f]],shape=new T.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:length-2*bevel,bevelEnabled:bevel>0,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,steps:1,curveSegments:1});geometry.translate(0,0,-(length-2*bevel)/2);const mesh=new T.Mesh(geometry,material),{u,v,d}=memberBasis({a,b,length});mesh.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(...u),new T.Vector3(...v),new T.Vector3(...d)));mesh.position.set(...a.map((n,i)=>(n+b[i])/2));mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function rod(parent,a,b,radius,material,segments=8){const va=new T.Vector3(...a),vb=new T.Vector3(...b),mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,va.distanceTo(vb),segments),material);mesh.position.copy(va).add(vb).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),vb.sub(va).normalize());mesh.castShadow=true;parent.add(mesh);return mesh;}
function addBolt(parent,x,y,z,material,scale=1){
  const g=new T.Group();g.position.set(x,y,z);parent.add(g);
  const shaft=new T.Mesh(new T.CylinderGeometry(.045*scale,.045*scale,.34*scale,12),material);shaft.rotation.z=Math.PI/2;g.add(shaft);
  for(const side of [-1,1]){const head=new T.Mesh(new T.CylinderGeometry(.086*scale,.086*scale,.07*scale,6),material);head.rotation.z=Math.PI/2;head.position.x=side*.17*scale;g.add(head);const washer=new T.Mesh(new T.CylinderGeometry(.10*scale,.10*scale,.013*scale,24),material);washer.rotation.z=Math.PI/2;washer.position.x=side*.123*scale;g.add(washer);}
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
export class Sculpture {
  constructor(canvas,{mode='joint',onInteract=()=>{},onOrbit=()=>{}}={}){
    this.canvas=canvas;this.mode=mode;this.onInteract=onInteract;this.onOrbit=onOrbit;this.assemblyProgress=1;this.sectionState=null;this.comparisonRadius=null;this.active=true;this.dirty=true;this.yaw=0;this.pitch=0;this.explosion=0;this.mix=0;this.zoom=1;this.wire=false;this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setClearColor(0x000000,0);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.2;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.scene=new T.Scene();this.environmentTarget=environment(this.renderer);this.env=this.environmentTarget.texture;this.scene.environment=this.env;this.renderer.localClippingEnabled=true;
    this.camera=new T.PerspectiveCamera(34,1,.05,200);this.camera.position.set(7,4,9);this.target=new T.Vector3(.6,0,0);this.scene.add(new T.HemisphereLight(0xf2f6ff,0x323a4c,1.4));const key=new T.DirectionalLight(0xffedda,4);key.position.set(-5,8,6);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:1,far:30});key.shadow.bias=-.001;this.scene.add(key);const rim=new T.DirectionalLight(0x90b4ea,3);rim.position.set(4,3,-6);this.scene.add(rim);
    this.steel=steelMaterial(0x858f9b,.31,.95);this.orange=steelMaterial(0xe75b2f,.33,.38);this.bolts=steelMaterial(0xb8c1cf,.22,.98);this.dark=steelMaterial(0x354051,.39,.9);this.joint=new T.Group();this.structure=new T.Group();this.scene.add(this.joint,this.structure);this.parts=[];
    if(mode==='joint')this.buildJoint();this.buildStructure(DEFAULTS);this.structure.visible=mode!=='joint';this.joint.visible=mode==='joint';
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(canvas.parentElement);this.visibility=new IntersectionObserver(entries=>{this.active=entries.at(-1).isIntersecting;if(this.active)this.invalidate();},{rootMargin:'100px'});this.visibility.observe(canvas);this.bind();this.resize();this.invalidate();
  }
  buildJoint(){
    const column=new T.Group();this.joint.add(column);iBeam(column,[0,-2.2,0],[0,2.25,0],.86,1.02,.105,this.steel,.017);box(column,[1.55,.12,1.40],[0,-2.2,0],this.dark);box(column,[.075,.74,.66],[.54,.56,0],this.steel);
    const main=new T.Group();this.joint.add(main);iBeam(main,[.70,.6,0],[3.65,1.36,0],.7,.92,.085,this.orange,.016);box(main,[.12,1.30,.85],[.68,.60,0],this.orange);this.track(main,[1.6,.3,0]);
    const back=new T.Group();this.joint.add(back);iBeam(back,[-.60,.50,0],[-2.2,.50,0],.70,.80,.085,this.dark,.015);box(back,[.10,1.04,.84],[-.60,.50,0],this.steel);this.track(back,[-1.1,0,0]);
    const stiffener=new T.Group();this.joint.add(stiffener);box(stiffener,[.88,.075,.67],[0,.24,0],this.steel);box(stiffener,[.88,.075,.67],[0,.88,0],this.steel);this.track(stiffener,[0,0,1.2]);
    for(const y of [.16,.60,1.04])for(const z of [-.27,.27]){const bolt=addBolt(this.joint,.76,y,z,this.bolts);this.track(bolt,[2.2,(y-.6)*.5,z*1.5]);}
    for(const y of [.18,.80])for(const z of [-.25,.25])addBolt(column,-.59,y,z,this.bolts,.84);
    for(const x of [-.56,.56])for(const z of [-.48,.48]){const b=new T.Mesh(new T.CylinderGeometry(.075,.075,.15,6),this.bolts);b.position.set(x,-2.08,z);column.add(b);}
    // Thin weld beads follow the actual end-plate edges.
    for(const z of [-.34,.34])rod(main,[.73,.20,z],[.73,.98,z],.023,this.dark,6);
    this.joint.rotation.set(.04,-.4,-.06);
  }
  track(object,offset){this.parts.push({object,base:object.position.clone(),offset:new T.Vector3(...offset)});}
  buildStructure(params){
    for(const obj of [...this.structure.children]){obj.traverse(o=>o.geometry?.dispose());this.structure.remove(obj);}
    const model=buildAssembly(params);params=model.params;this.model=model;const s=6/Math.max(params.width,params.length,params.height+model.rise);this.structureBaseScale=s;this.structure.scale.setScalar(s);this.structure.position.y=-params.height*s*.42;
    for(const m of model.members){const p=PROFILES[m.kind];let mesh;if(['column','rafter','beam'].includes(m.kind))mesh=iBeam(this.structure,m.a,m.b,p.width,p.depth,p.flange,m.kind==='rafter'?this.orange:this.steel,0);else mesh=rod(this.structure,m.a,m.b,m.kind==='brace'?.027:.052,m.kind==='brace'?this.dark:this.steel,6);mesh.userData.member=m;}
    for(const plate of model.plates)box(this.structure,[.52,.07,.52],plate.position,this.dark);
    this.orderMap=new Map(assemblyOrder(model).map((m,i)=>[m.id,i]));this.structureParts=this.structure.children.map(object=>({object,base:object.position.clone()}));this.structure.rotation.set(this.pitch,-.23+this.yaw,0);
    this.sectionBounds=new T.Box3();for(const mesh of this.structure.children){mesh.updateMatrix();mesh.geometry.computeBoundingBox();this.sectionBounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix));}
    this.localBounds=new T.Box3(new T.Vector3(-params.width/2-.5,-.2,-params.length/2-.5),new T.Vector3(params.width/2+.5,params.height+model.rise+.5,params.length/2+.5));
    this.updateParts();if(this.sectionState)this.setSection(this.sectionState.axis,this.sectionState.fraction);this.invalidate();return model;
  }
  updateParts(){
    for(const part of this.parts)part.object.position.copy(part.base).addScaledVector(part.offset,this.explosion);
    for(const part of this.structureParts||[]){const mesh=part.object;mesh.position.copy(part.base).multiplyScalar(1+this.explosion*.20);if(this.sectionState?.fraction===0){mesh.visible=false;continue;}const index=this.orderMap.get(mesh.userData.member?.id);if(index===undefined){mesh.visible=true;continue;}const local=clamp(this.assemblyProgress*this.model.members.length-index);mesh.visible=this.assemblyProgress>=1||local>0;if(mesh.visible&&local<1&&!this.reduced)mesh.position.y+=(1-local)*(1-local)*1.2;}
  }
  setAssembly(progress){this.assemblyProgress=clamp(progress);this.updateParts();this.invalidate();}
  setComparisonFrame(frame){this.comparisonRadius=frame?.radius??null;const s=frame?.scale??this.structureBaseScale;this.structure.scale.setScalar(s);this.structure.position.y=-this.model.params.height*s*.42;this.invalidate();}
  setOrbit(yaw,pitch){this.yaw=yaw;this.pitch=pitch;this.joint.rotation.set(.04+pitch,-.4+yaw,-.06);this.structure.rotation.set(pitch,-.23+yaw,0);this.invalidate();}
  setSection(axis,fraction=.5){
    const materials=[this.steel,this.orange,this.dark,this.bolts];
    if(!['width','length','height'].includes(axis)){this.sectionState=null;if(this.sectionRoot)this.sectionRoot.visible=false;for(const m of materials){m.clippingPlanes=null;m.needsUpdate=true;}this.updateParts();this.invalidate();return;}
    this.sectionState={axis,fraction:clamp(fraction)};
    // Fully cull the empty endpoint: MSAA can retain fragments beyond a clipped face.
    this.updateParts();
    if(!this.sectionRoot){this.sectionRoot=new T.Group();this.sectionRoot.matrixAutoUpdate=false;this.scene.add(this.sectionRoot);this.sectionVisual=new T.Group();this.sectionRoot.add(this.sectionVisual);this.sectionPlane=new T.Plane();this.sectionFill=new T.MeshBasicMaterial({color:0xf5683c,transparent:true,opacity:.09,side:T.DoubleSide,depthWrite:false});this.sectionEdge=new T.LineBasicMaterial({color:0xf5683c,transparent:true,opacity:.8});}
    if(!this.sectionVisual.children.length){const planeGeometry=new T.PlaneGeometry(1,1);this.sectionVisual.add(new T.Mesh(planeGeometry,this.sectionFill));this.sectionVisual.add(new T.LineSegments(new T.EdgesGeometry(planeGeometry),this.sectionEdge));}
    const {width:w,length:l,height:h}=this.model.params,top=h+this.model.rise,dims=axis==='width'?[l+.8,top+.8]:axis==='height'?[w+.8,l+.8]:[w+.8,top+.8];for(const child of this.sectionVisual.children)child.scale.set(dims[0],dims[1],1);
    const clipped=this.sectionState.fraction!==1;for(const m of materials){if(Boolean(m.clippingPlanes?.length)!==clipped){m.clippingPlanes=clipped?[this.sectionPlane]:null;m.needsUpdate=true;}m.clipShadows=true;}this.sectionRoot.visible=true;this.updateSectionWorld();this.invalidate();
  }
  updateSectionWorld(){
    if(!this.sectionState)return;const {axis,fraction}=this.sectionState,{height:h}=this.model.params,top=h+this.model.rise,key={width:'x',height:'y',length:'z'}[axis],range=[this.sectionBounds.min[key],this.sectionBounds.max[key]],position=range[0]-.001+(range[1]-range[0]+.002)*fraction,normal=axis==='width'?new T.Vector3(-1,0,0):axis==='height'?new T.Vector3(0,-1,0):new T.Vector3(0,0,-1);this.sectionCoordinate=position;
    this.structure.updateMatrixWorld(true);this.sectionPlane.set(normal,position).applyMatrix4(this.structure.matrixWorld);this.sectionRoot.matrix.copy(this.structure.matrixWorld);this.sectionRoot.matrixWorldNeedsUpdate=true;this.sectionVisual.position.set(axis==='width'?position:0,axis==='height'?position:top/2,axis==='length'?position:0);this.sectionVisual.rotation.set(axis==='height'?Math.PI/2:0,axis==='width'?Math.PI/2:0,0);
  }
  dispose(){this.disposed=true;this.unbindDrag?.();this.resizeObserver.disconnect();this.visibility.disconnect();this.scene.traverse(o=>{o.geometry?.dispose();});for(const m of [this.steel,this.orange,this.bolts,this.dark,this.sectionFill,this.sectionEdge])m?.dispose();this.environmentTarget.dispose();this.renderer.dispose();this.renderer.forceContextLoss();}

  setProgress(state){this.mix=state.structure;this.joint.visible=state.structure<.98;this.structure.visible=state.structure>.02;const scale=1-state.structure;this.joint.scale.setScalar(Math.max(.01,scale));this.structure.scale.setScalar(this.structureBaseScale*(.3+state.structure*.7));if(!this.reduced){this.joint.rotation.y=state.rotation+this.yaw;this.joint.rotation.z=-.06+state.progress*.12;this.structure.rotation.y=-.23+state.progress*.35+this.yaw;}this.setExplosion(state.explosion);this.invalidate();}
  setExplosion(value){this.explosion=clamp(value);this.updateParts();this.invalidate();}
  setFinish(value){const colors={signal:[0xe75b2f,0x858f9b],graphite:[0x354052,0x778493],silver:[0xabb4bf,0xabb4bf]};const c=colors[value]||colors.signal;this.orange.color.setHex(c[0]);this.steel.color.setHex(c[1]);this.orange.metalness=value==='signal'?.38:.88;this.invalidate();}
  setWire(value){this.wire=value;for(const m of [this.steel,this.orange,this.dark,this.bolts])m.wireframe=value;this.invalidate();}
  resize(){const r=this.canvas.getBoundingClientRect();if(!r.width||!r.height)return;this.renderer.setSize(r.width,r.height,false);this.camera.aspect=r.width/r.height;this.camera.fov=this.mode==='joint'?34:38;this.compact=r.width<600;this.camera.updateProjectionMatrix();this.invalidate();}
  bind(){this.unbindDrag=bindPointerDrag(this.canvas,{canStart:event=>!this.contextLost&&(event.pointerType!=='touch'||!!this.canvas.closest('[data-touch-orbit=true]')),onStart:()=>this.onInteract(),onMove:(dx,dy)=>{this.yaw+=dx*.007;this.pitch=clamp(this.pitch+dy*.006,-.7,.8);this.joint.rotation.y=-.4+this.yaw;this.joint.rotation.x=.04+this.pitch;this.structure.rotation.y=-.23+this.yaw;this.structure.rotation.x=this.pitch;this.onOrbit({yaw:this.yaw,pitch:this.pitch});this.invalidate();}});this.canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();this.onInteract();if(e.key==='Home'){this.yaw=0;this.pitch=0;}else if(e.key==='ArrowLeft')this.yaw-=.15;else if(e.key==='ArrowRight')this.yaw+=.15;else if(e.key==='ArrowUp')this.pitch=Math.min(.8,this.pitch+.1);else this.pitch=Math.max(-.7,this.pitch-.1);this.joint.rotation.set(.04+this.pitch,-.4+this.yaw,-.06);this.structure.rotation.set(this.pitch,-.23+this.yaw,0);this.onOrbit({yaw:this.yaw,pitch:this.pitch});this.invalidate();});this.canvas.addEventListener('webglcontextlost',e=>{if(this.disposed)return;e.preventDefault();this.contextLost=true;this.canvas.dispatchEvent(new CustomEvent('sculptureavailability',{detail:false}));this.canvas.parentElement.classList.add('render-failed');this.canvas.parentElement.querySelector('.canvas-fallback')?.removeAttribute('hidden');});this.canvas.addEventListener('webglcontextrestored',()=>{if(this.disposed)return;this.contextLost=false;this.canvas.parentElement.classList.remove('render-failed');const fallback=this.canvas.parentElement.querySelector('.canvas-fallback');if(fallback)fallback.hidden=true;this.canvas.dispatchEvent(new CustomEvent('sculptureavailability',{detail:true}));this.invalidate();});}
  invalidate(){if(this.disposed||this.contextLost)return;this.dirty=true;if(this.scheduled)return;this.scheduled=true;requestAnimationFrame(()=>{this.scheduled=false;if(this.disposed||this.contextLost||document.hidden)return;
      // A queued observer entry can lag a layout change; check the current drawing bounds.
      const r=this.canvas.getBoundingClientRect();this.active=r.width>0&&r.height>0&&r.bottom>-100&&r.top<innerHeight+100&&r.right>-100&&r.left<innerWidth+100;if(this.active)this.draw();});}
  draw(){
    if(this.mode==='structure'){
      this.structure.updateMatrixWorld(true);const bounds=this.localBounds.clone().applyMatrix4(this.structure.matrixWorld),sphere=bounds.getBoundingSphere(new T.Sphere()),vertical=T.MathUtils.degToRad(this.camera.fov/2),horizontal=Math.atan(Math.tan(vertical)*this.camera.aspect),angle=Math.min(vertical,horizontal),distance=(this.comparisonRadius??sphere.radius)*(1+this.explosion*.2)/Math.sin(angle)*1.12,direction=new T.Vector3(7,4.5,10).normalize();this.camera.position.copy(sphere.center).addScaledVector(direction,distance);this.camera.lookAt(sphere.center);
    }else{const k=this.compact?.87:1;this.camera.position.set(7.5*k,4.5*k,10*k);this.camera.lookAt(.55,0,0);}
    this.updateSectionWorld();this.renderer.render(this.scene,this.camera);this.canvas.dataset.rendered='true';this.dirty=false;
  }
}
