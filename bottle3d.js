/**
 * bottle3d.js — 3D bottle: textured box with amber glass sides + Villa Sjövik-like float-spin
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ── GOLD SPARKS (matches logo3d.js) ── */
function mkSparks(scene){
  const N=40, pos=new Float32Array(N*3), alp=new Float32Array(N);
  const lt=new Float32Array(N), ag=new Float32Array(N);
  const dx=new Float32Array(N), dy=new Float32Array(N), dz=new Float32Array(N);
  for(let i=0;i<N;i++){alp[i]=0;ag[i]=999;}
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('alpha',new THREE.BufferAttribute(alp,1));
  const mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    vertexShader:`attribute float alpha;varying float vA;void main(){vA=alpha;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=3.5*(300./-mv.z);gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(.83,.66,.29,vA*smoothstep(.5,0.,d)*.7);}`});
  scene.add(new THREE.Points(geo,mat));
  let tmr=0;
  return(dt,bx)=>{if(!bx)return;tmr+=dt;
    if(tmr>1.8+Math.random()*2){tmr=0;let n=2+Math.floor(Math.random()*3);
      for(let i=0;i<N&&n>0;i++)if(ag[i]>=lt[i]){pos[i*3]=(Math.random()-.5)*bx.w*1.1;pos[i*3+1]=(Math.random()-.5)*bx.h*1.1;pos[i*3+2]=(Math.random()-.5)*30;dx[i]=(Math.random()-.5)*.4;dy[i]=.15+Math.random()*.45;dz[i]=(Math.random()-.5)*.3;lt[i]=1.2+Math.random()*1.5;ag[i]=0;n--;}}
    for(let i=0;i<N;i++){if(ag[i]<lt[i]){ag[i]+=dt;const t=ag[i]/lt[i];alp[i]=(t<.12?t/.12:1-Math.pow((t-.12)/.88,2))*.5;pos[i*3]+=dx[i]*dt;pos[i*3+1]+=dy[i]*dt;pos[i*3+2]+=dz[i]*dt;}else alp[i]=0;}
    geo.attributes.position.needsUpdate=true;geo.attributes.alpha.needsUpdate=true;};
}

function initBottle3D(container){
  const imgPath = container.dataset.img;
  const rotateSpeed = parseFloat(container.dataset.rotateSpeed || '0.3');
  const hasSparks = container.dataset.sparks !== 'false';
  const hasShadow = container.dataset.shadow !== 'false';
  const nudgeX = parseFloat(container.dataset.nudgeX || '0');
  const yOffset = parseFloat(container.dataset.yOffset || '0');
  const shadowYAbs = container.dataset.shadowY;

  try { const c=document.createElement('canvas'); if(!c.getContext('webgl2')&&!c.getContext('webgl'))throw 0; }
  catch { container.innerHTML=`<img src="${imgPath}" style="width:100%;height:100%;object-fit:contain;">`; return; }

  const W = container.clientWidth || 500;
  const H = container.clientHeight || 330;

  const IS_MOBILE = window.matchMedia('(max-width:768px)').matches || window.matchMedia('(pointer:coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:IS_MOBILE?'low-power':'high-performance' });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.1, 5000);
  camera.position.set(0, 0, 1050);

  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

  // Lights — same warm setup as logo3d.js
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.65));
  const keyLight = new THREE.DirectionalLight(0xfff2e0, 5.0);
  keyLight.position.set(900, 800, 500);
  keyLight.castShadow = hasShadow;
  if (hasShadow) {
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 100;
    keyLight.shadow.camera.far = 2500;
    keyLight.shadow.camera.left = -400;
    keyLight.shadow.camera.right = 400;
    keyLight.shadow.camera.top = 400;
    keyLight.shadow.camera.bottom = -400;
    keyLight.shadow.bias = -0.001;
    keyLight.shadow.radius = 8;
  }
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xffeedd, 1.0);
  fillLight.position.set(-500, -200, 400);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffd9a5, 1.6);
  rimLight.position.set(-400, 400, -600);
  scene.add(rimLight);

  if (hasShadow) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const updSparks = hasSparks ? mkSparks(scene) : null;

  const pivot = new THREE.Group();
  scene.add(pivot);

  // Ground shadow plane (same as logo3d.js)
  let shadowPlane = null;
  if (hasShadow) {
    const shadowGeo = new THREE.PlaneGeometry(400, 50);
    const shadowMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uOpacity: { value: 0.55 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uOpacity;
        void main(){
          vec2 p = (vUv - 0.5) * 2.0;
          float d = length(vec2(p.x * 0.7, p.y * 2.5));
          float a = smoothstep(1.0, 0.0, d);
          gl_FragColor = vec4(0.0, 0.0, 0.0, a * uOpacity);
        }`
    });
    shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    scene.add(shadowPlane);
  }

  let bottleBox = null;
  let rotAngle = 0;
  let elapsed = 0;

  // Load bottle texture, build geometry
  new THREE.TextureLoader().load(imgPath, (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const imgW = texture.image.naturalWidth || texture.image.width;
    const imgH = texture.image.naturalHeight || texture.image.height;
    const aspect = imgW / imgH; // ~0.73 for the Vasa bottle

    // Size bottle to fit nicely in hero-right
    // Target visual width ~62% of camera visible width
    const vFOV = camera.fov * Math.PI / 180;
    const visH = 2 * Math.tan(vFOV / 2) * camera.position.z;
    const visW = visH * camera.aspect;

    const fillH = 0.78;
    const bH = visH * fillH;
    const bW = bH * aspect;
    const bD = bW * 0.22; // bottle depth ~22% of width → gives glass-edge on rotation

    // Dark amber glass material for sides (matches liquid tone)
    const amberMat = new THREE.MeshStandardMaterial({
      color: 0x1a0d05,
      metalness: 0.45,
      roughness: 0.28
    });
    // Darker for top/bottom (bottle ends are not visible)
    const endMat = new THREE.MeshStandardMaterial({
      color: 0x0a0603,
      metalness: 0.3,
      roughness: 0.55
    });
    // Front + back material use the bottle photo
    const faceMat = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.1,
      roughness: 0.42,
      color: 0xffffff
    });
    // Back face: mirrored texture so rotation looks symmetric
    const backTexture = texture.clone();
    backTexture.wrapS = THREE.RepeatWrapping;
    backTexture.repeat.x = -1;
    backTexture.offset.x = 1;
    backTexture.needsUpdate = true;
    backTexture.colorSpace = THREE.SRGBColorSpace;
    const backMat = new THREE.MeshStandardMaterial({
      map: backTexture,
      metalness: 0.1,
      roughness: 0.42,
      color: 0xffffff
    });

    // BoxGeometry face order: [+X, -X, +Y, -Y, +Z, -Z] → right, left, top, bottom, front, back
    const materials = [amberMat, amberMat, endMat, endMat, faceMat, backMat];
    const geometry = new THREE.BoxGeometry(bW, bH, bD);
    const bottle = new THREE.Mesh(geometry, materials);
    if (hasShadow) bottle.castShadow = true;
    pivot.add(bottle);

    bottleBox = { w: bW, h: bH };

    if (shadowPlane) {
      shadowPlane.position.y = shadowYAbs != null
        ? parseFloat(shadowYAbs)
        : -bH / 2 - 40 + yOffset;
      shadowPlane.scale.set(bW / 380, 1, 1);
    }
  });

  const clock = new THREE.Clock();

  (function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (pivot.children.length > 0) {
      const t = elapsed;

      // Variable-speed spin (slow front/back, fast on the sides) — readable bottle face most of the time
      const angle = rotAngle % (Math.PI * 2);
      const facing = Math.cos(angle);
      const tt = Math.max(0, Math.min(1, (0.88 - facing) / 1.45));
      const fast = tt * tt * tt * (tt * (tt * 6 - 15) + 10);
      const speedMul = 1.0 + fast * 12.0;
      rotAngle += rotateSpeed * 0.012 * speedMul;
      pivot.rotation.y = rotAngle;

      // Float + subtle tilt matching float-spin pattern
      const floatY = Math.sin(t * 0.55) * 30 + Math.sin(t * 1.4) * 5;
      const floatX = Math.sin(t * 0.35) * 8 + Math.sin(t * 0.8) * 2.5;
      const depthExpansion = Math.abs(Math.sin(rotAngle)) * 12;
      pivot.position.x = floatX + nudgeX + (nudgeX > 0 ? depthExpansion : -depthExpansion);
      pivot.position.y = floatY + yOffset;
      pivot.rotation.x = -0.08 + Math.sin(t * 0.47) * 0.035;
      pivot.rotation.z = Math.sin(t * 0.31) * 0.022;
    }

    if (shadowPlane && bottleBox) {
      const c = Math.cos(rotAngle);
      const rotScale = c * c;
      const floatY = pivot.position.y;
      const floatNorm = (floatY + 50) / 100;
      const heightFactor = 1.3 - Math.max(0, Math.min(1, floatNorm)) * 0.6;
      const baseScale = bottleBox.w / 380;
      shadowPlane.position.x = pivot.position.x;
      shadowPlane.scale.x = Math.max(0.05, baseScale * rotScale * heightFactor);
      shadowPlane.scale.y = heightFactor;
      shadowPlane.material.uniforms.uOpacity.value = 0.15 + rotScale * heightFactor * 0.5;
    }

    if (updSparks) updSparks(dt, bottleBox);
    renderer.render(scene, camera);
  })();

  new ResizeObserver(() => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }).observe(container);
}

document.querySelectorAll('.bottle-3d').forEach(initBottle3D);
