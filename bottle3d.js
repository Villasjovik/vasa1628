/**
 * bottle3d.js — Real 3D bottle: LatheGeometry glass + inner amber liquid + curved labels + cork
 * Matches Villa Sjövik float-spin animation.
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

/* ── CURVED LABEL: PlaneGeometry bent around Y axis ── */
function makeCurvedLabel(width, height, radius, arc, segments=28){
  const geo = new THREE.PlaneGeometry(width, height, segments, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = x / (width / 2);                 // -1 .. +1
    const angle = t * (arc / 2);               // -arc/2 .. +arc/2
    pos.setX(i, Math.sin(angle) * radius);
    pos.setZ(i, Math.cos(angle) * radius);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
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

  // Lights — same warm 3-point as logo3d.js
  scene.add(new THREE.AmbientLight(0xfff8f0, 0.55));
  const keyLight = new THREE.DirectionalLight(0xfff2e0, 4.5);
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
  const rimLight = new THREE.DirectionalLight(0xffd9a5, 1.8);
  rimLight.position.set(-400, 400, -600);
  scene.add(rimLight);

  if (hasShadow) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  const updSparks = hasSparks ? mkSparks(scene) : null;

  const pivot = new THREE.Group();
  scene.add(pivot);

  // Ground shadow plane
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

  /* ────────────────────────────────
     BUILD BOTTLE
     ──────────────────────────────── */
  const bottleGroup = new THREE.Group();
  pivot.add(bottleGroup);

  // Bottle dimensions — tuned to match Vasa1628 silhouette
  const bH = 520;     // total bottle height
  const bR = 92;      // max body radius

  // Silhouette profile (normalized radius × height). Y: -1 bottom → +1 top
  const profile = [
    [0.00, -1.00],
    [0.78, -0.99],
    [0.90, -0.96],
    [0.97, -0.91],
    [1.00, -0.82],
    [1.00,  0.26],   // straight body
    [0.97,  0.32],   // shoulder start
    [0.78,  0.40],
    [0.54,  0.50],
    [0.40,  0.58],
    [0.36,  0.62],   // neck start
    [0.36,  0.84],   // neck straight
    [0.39,  0.87],   // lip
    [0.37,  0.90],
    [0.34,  0.91]    // close top
  ];
  const glassPoints = profile.map(([r, y]) =>
    new THREE.Vector2(Math.max(0.002, r * bR), y * bH / 2)
  );

  // LIQUID — inner amber, opaque (fills body up to ~70%)
  const liquidProfile = [];
  for (const [r, y] of profile) {
    if (y < 0.25) liquidProfile.push([r * 0.93, y]);
  }
  const lastR = liquidProfile[liquidProfile.length - 1][0];
  liquidProfile.push([lastR, 0.25]);
  liquidProfile.push([0.001, 0.25]);
  const liquidPoints = liquidProfile.map(([r, y]) =>
    new THREE.Vector2(Math.max(0.002, r * bR), y * bH / 2)
  );
  const liquidGeo = new THREE.LatheGeometry(liquidPoints, 64);
  const liquidMat = new THREE.MeshStandardMaterial({
    color: 0xb0621a,
    metalness: 0.4,
    roughness: 0.2,
    emissive: 0x3d1a04,
    emissiveIntensity: 0.45
  });
  const liquid = new THREE.Mesh(liquidGeo, liquidMat);
  if (hasShadow) liquid.castShadow = true;
  bottleGroup.add(liquid);

  // GLASS — semi-transparent amber shell around liquid
  const glassGeo = new THREE.LatheGeometry(glassPoints, 72);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x3a1c08,
    metalness: 0.0,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    envMapIntensity: 1.6,
    depthWrite: false
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.renderOrder = 2;
  bottleGroup.add(glass);

  // CORK — cylindrical, dark brown wax finish
  const corkH = bH * 0.095;
  const corkGeo = new THREE.CylinderGeometry(bR * 0.36, bR * 0.32, corkH, 32);
  const corkMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a0c,
    metalness: 0.2,
    roughness: 0.62
  });
  const cork = new THREE.Mesh(corkGeo, corkMat);
  cork.position.y = bH * 0.455 + corkH / 2;
  if (hasShadow) cork.castShadow = true;
  bottleGroup.add(cork);

  // SUNKEN-band around cork neck — thin beige paper band
  const bandGeo = new THREE.CylinderGeometry(bR * 0.385, bR * 0.385, bH * 0.042, 32, 1, true);
  const bandMat = new THREE.MeshStandardMaterial({
    color: 0xc9b38a,
    metalness: 0.05,
    roughness: 0.75,
    side: THREE.DoubleSide
  });
  const band = new THREE.Mesh(bandGeo, bandMat);
  band.position.y = bH * 0.42;
  bottleGroup.add(band);

  /* ────────────────────────────────
     CURVED LABELS (front + back)
     Texture: crop center of vasa.png (the label region)
     ──────────────────────────────── */
  let bottleBox = null;

  new THREE.TextureLoader().load(imgPath, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // vasa.png label region. Image 1916x2633.
    // Label roughly x:370-1540 (0.193-0.804), y(top):800-1720 (0.304-0.653)
    // Three.js UV bottom-origin → offset.y = 1 - y_top_bottom = 1 - 0.653 = 0.347
    const uvX = 0.193, uvW = 0.611;
    const uvY = 0.347, uvH = 0.349;

    const mkLabelMat = (mirror) => {
      const t = tex.clone();
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      t.repeat.set(mirror ? -uvW : uvW, uvH);
      t.offset.set(mirror ? uvX + uvW : uvX, uvY);
      t.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        map: t,
        metalness: 0.02,
        roughness: 0.6,
        side: THREE.FrontSide,
        transparent: true,
        alphaTest: 0.05
      });
    };

    const labelW = bR * 1.75;
    const labelH = bH * 0.36;
    const labelArc = Math.PI * 0.58;     // ~104° wrap
    const labelR = bR * 1.015;           // sit barely outside glass
    const labelY = -bH * 0.14;

    // Front label
    const frontGeo = makeCurvedLabel(labelW, labelH, labelR, labelArc);
    const labelFront = new THREE.Mesh(frontGeo, mkLabelMat(false));
    labelFront.position.y = labelY;
    labelFront.renderOrder = 1;
    bottleGroup.add(labelFront);

    // Back label — rotate 180° around Y
    const backGeo = makeCurvedLabel(labelW, labelH, labelR, labelArc);
    const labelBack = new THREE.Mesh(backGeo, mkLabelMat(true));
    labelBack.position.y = labelY;
    labelBack.rotation.y = Math.PI;
    labelBack.renderOrder = 1;
    bottleGroup.add(labelBack);

    bottleBox = { w: bR * 2.2, h: bH };

    if (shadowPlane) {
      shadowPlane.position.y = shadowYAbs != null
        ? parseFloat(shadowYAbs)
        : -bH / 2 - 40 + yOffset;
      shadowPlane.scale.set(bR * 2 / 380, 1, 1);
    }
  });

  // Immediate bottleBox so sparks fire before texture resolves
  bottleBox = { w: bR * 2.2, h: bH };
  if (shadowPlane) {
    shadowPlane.position.y = shadowYAbs != null
      ? parseFloat(shadowYAbs)
      : -bH / 2 - 40 + yOffset;
    shadowPlane.scale.set(bR * 2 / 380, 1, 1);
  }

  let rotAngle = 0;
  let elapsed = 0;
  const clock = new THREE.Clock();

  (function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    const t = elapsed;

    // Variable-speed spin (slow front/back, fast on the sides) — label readable most of the time
    const angle = rotAngle % (Math.PI * 2);
    const facing = Math.cos(angle);
    const tt = Math.max(0, Math.min(1, (0.88 - facing) / 1.45));
    const fast = tt * tt * tt * (tt * (tt * 6 - 15) + 10);
    const speedMul = 1.0 + fast * 12.0;
    rotAngle += rotateSpeed * 0.012 * speedMul;
    pivot.rotation.y = rotAngle;

    // Float + subtle tilt matching Villa Sjövik float-spin
    const floatY = Math.sin(t * 0.55) * 30 + Math.sin(t * 1.4) * 5;
    const floatX = Math.sin(t * 0.35) * 8 + Math.sin(t * 0.8) * 2.5;
    const depthExpansion = Math.abs(Math.sin(rotAngle)) * 12;
    pivot.position.x = floatX + nudgeX + (nudgeX > 0 ? depthExpansion : -depthExpansion);
    pivot.position.y = floatY + yOffset;
    pivot.rotation.x = -0.08 + Math.sin(t * 0.47) * 0.035;
    pivot.rotation.z = Math.sin(t * 0.31) * 0.022;

    if (shadowPlane && bottleBox) {
      const c = Math.cos(rotAngle);
      const rotScale = c * c;
      const floatY2 = pivot.position.y;
      const floatNorm = (floatY2 + 50) / 100;
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
