// ========== HERO 3D CAROUSEL — Three.js ==========

const FRUITS = [
  {
    id: 'mangue',
    name: 'Mangue',
    tagline: 'La reine des tropiques',
    bg: ['#FF8C00', '#FFB300', '#E65100'],
    accent: '#FFD700',
    textLight: true,
    product: 'Jus · Confiture · Séché',
    modelPath: 'mango/scene_web.glb',
    modelType: 'gltf',
    scale: 3,
  },
  {
    id: 'banane',
    name: 'Banane',
    tagline: 'Douceur dorée ivoirienne',
    bg: ['#F9A825', '#FFF176', '#F57F17'],
    accent: '#FFF176',
    textLight: false,
    product: 'Chips · Confiture · Séché',
    modelPath: 'banana-3d-scan/source/Banana_final.glb',
    texturePath: 'banana-3d-scan/textures/Banana_web.jpg',
    modelType: 'gltf',
    scale: 3,
  },
  {
    id: 'ananas',
    name: 'Ananas',
    tagline: "Le trésor sucré de Côte d'Ivoire",
    bg: ['#2E7D32', '#66BB6A', '#1B5E20'],
    accent: '#A5D6A7',
    textLight: true,
    product: 'Jus · Confiture · Séché · Cookies',
    modelPath: 'pineapple/scene_web.glb',
    modelType: 'gltf',
    scale: 3,
    yOffset: -0.7,   // pineapple crown sits too high — shift down
  },
  {
    id: 'orange',
    name: 'Orange',
    tagline: 'Fraîcheur vitaminée',
    bg: ['#E64A19', '#FF7043', '#BF360C'],
    accent: '#FFAB91',
    textLight: true,
    product: 'Jus · Confiture · Liqueur',
    modelPath: 'cara_cara_orange/scene_web.glb',
    modelType: 'gltf',
    scale: 3,
  }
];

let scene, camera, renderer, currentMesh, animFrame;
let currentFruitIndex = 0;
let autoplayTimer;
let gltfLoader, objLoader, textureLoader;
let particlePoints, particlePositions;   // for animated particles
let isTransitioning = false;
let pendingFruitIndex = null;

const TRANSITION_DURATION = 750;
const loadedModels = {};

// ========== EASING HELPERS ==========
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInCubic(t)  { return t * t * t; }
// Gentle overshoot spring
function easeSpring(t) {
  const c = 2.5, d = 0.8;
  return 1 + Math.pow(2, -c * t) * (-1) * Math.cos(d * Math.PI * 2 * t);
}

// ========== INIT ==========
function initHero3D() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || typeof THREE === 'undefined') return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 200);
  camera.position.set(0, 0, 8);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;

  // Lights — slightly warmer, higher contrast
  scene.add(new THREE.AmbientLight(0xfff5e0, 0.8));
  const dirLight = new THREE.DirectionalLight(0xffffff, 2.5);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);
  const rimLight = new THREE.DirectionalLight(0xffeedd, 0.8);
  rimLight.position.set(-5, -2, -5);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(0, -5, 3);
  scene.add(fillLight);

  // Loaders
  gltfLoader = new THREE.GLTFLoader();
  const dracoLoader = new THREE.DRACOLoader();
  dracoLoader.setDecoderPath('js/libs/draco/');
  gltfLoader.setDRACOLoader(dracoLoader);
  objLoader = new THREE.OBJLoader();
  textureLoader = new THREE.TextureLoader();

  addParticles();
  preloadAll();
  animate();
  window.addEventListener('resize', onResize);

  // Controls
  document.querySelectorAll('.hero-dot').forEach((dot, i) => {
    dot.addEventListener('click', () => goToFruit(i));
  });
  document.getElementById('heroPrev')?.addEventListener('click', () => {
    goToFruit((currentFruitIndex - 1 + FRUITS.length) % FRUITS.length);
  });
  document.getElementById('heroNext')?.addEventListener('click', () => {
    goToFruit((currentFruitIndex + 1) % FRUITS.length);
  });

  startAutoplay();
  canvas.addEventListener('mouseenter', () => clearTimeout(autoplayTimer));
  canvas.addEventListener('mouseleave', startAutoplay);
}

// ========== PARTICLES (animated) ==========
function addParticles() {
  const count = 90;
  particlePositions = new Float32Array(count * 3);
  const seeds = new Float32Array(count); // random phase seeds
  for (let i = 0; i < count; i++) {
    particlePositions[i * 3]     = (Math.random() - 0.5) * 22;
    particlePositions[i * 3 + 1] = (Math.random() - 0.5) * 14;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 4;
    seeds[i] = Math.random() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(particlePositions.slice(), 3));
  geo.userData.seeds = seeds;
  geo.userData.basePositions = particlePositions.slice();
  const mat = new THREE.PointsMaterial({
    color: 0xC9901A, size: 0.1,
    transparent: true, opacity: 0.65,
    sizeAttenuation: true,
  });
  particlePoints = new THREE.Points(geo, mat);
  scene.add(particlePoints);
}

// ========== PRELOAD ==========
function preloadAll() {
  FRUITS.forEach((fruit, i) => {
    loadModel(fruit, (obj) => {
      obj.userData.floatOffset = Math.random() * Math.PI * 2;
      scene.add(obj);
      centerAndScale(obj, fruit.scale);
      if (fruit.yOffset) obj.position.y += fruit.yOffset;
      obj.userData.finalScale = obj.scale.x;
      obj.userData.baseY = obj.position.y;   // store centered+offset Y for float animation
      obj.visible = false;
      loadedModels[fruit.id] = obj;
      if (i === 0) {
        obj.visible = true;
        tweenIn(obj);
        currentMesh = obj;
        updateHeroUI(fruit, 0);
      }
    });
  });
}

function loadModel(fruit, cb) {
  if (fruit.modelType === 'procedural') {
    setTimeout(() => cb(fruit.createMesh(THREE)), 0);
    return;
  }
  if (fruit.modelType === 'gltf') {
    gltfLoader.load(
      fruit.modelPath,
      (gltf) => {
        const obj = gltf.scene;
        const applyMat = (m, tex) => { if (tex) m.map = tex; m.needsUpdate = true; };
        const finish = (tex) => {
          obj.traverse(child => {
            if (child.isMesh && child.material) {
              if (Array.isArray(child.material)) child.material.forEach(m => applyMat(m, tex));
              else applyMat(child.material, tex);
            }
          });
          cb(obj);
        };
        if (fruit.texturePath) {
          const tex = textureLoader.load(fruit.texturePath);
          tex.encoding = THREE.sRGBEncoding;
          finish(tex);
        } else {
          finish(null);
        }
      },
      undefined,
      (err) => { console.warn('GLTF load error for', fruit.id, err); cb(makeFallback(fruit)); }
    );
  } else if (fruit.modelType === 'obj') {
    if (fruit.texturePath) {
      const tex = textureLoader.load(fruit.texturePath);
      tex.encoding = THREE.sRGBEncoding;
      objLoader.load(fruit.modelPath, (obj) => {
        obj.traverse(c => { if (c.isMesh) c.material = new THREE.MeshStandardMaterial({ map: tex }); });
        cb(obj);
      }, undefined, () => cb(makeFallback(fruit)));
    } else {
      objLoader.load(fruit.modelPath, cb, undefined, () => cb(makeFallback(fruit)));
    }
  }
}

function makeFallback(fruit) {
  const geo = new THREE.SphereGeometry(1, 32, 32);
  const mat = new THREE.MeshStandardMaterial({ color: parseInt(fruit.accent.replace('#', '0x')), roughness: 0.4, metalness: 0.1 });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, mat));
  return group;
}

function centerAndScale(obj, targetScale) {
  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3().expandByObject(obj);
  if (box.isEmpty()) return;
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (!isFinite(maxDim) || maxDim === 0) return;
  obj.scale.setScalar((targetScale || 3) / maxDim);
  obj.updateWorldMatrix(true, true);
  const box2 = new THREE.Box3().expandByObject(obj);
  const center2 = new THREE.Vector3();
  box2.getCenter(center2);
  obj.position.sub(center2);
}

// ========== TRANSITIONS ==========
function tweenIn(mesh, onComplete) {
  const baseScale = mesh.userData.finalScale || mesh.scale.x || 1;
  const baseY     = mesh.userData.baseY || 0;
  const start     = performance.now();
  mesh.scale.setScalar(0.01);
  mesh.position.y = baseY - 2.0;   // enter from below
  mesh.rotation.y = Math.PI * 1.2; // start rotated

  function tick() {
    const t = Math.min((performance.now() - start) / TRANSITION_DURATION, 1);
    const es = easeSpring(t);         // scale with gentle overshoot
    const ep = easeOutCubic(t);       // position smooth
    mesh.scale.setScalar(Math.max(0.01, es * baseScale));
    mesh.position.y = baseY - 2.0 + ep * 2.0;
    mesh.rotation.y = (1 - ep) * Math.PI * 1.2;
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      mesh.scale.setScalar(baseScale);
      mesh.position.y = baseY;
      mesh.rotation.y = 0;
      if (onComplete) onComplete();
    }
  }
  requestAnimationFrame(tick);
}

function tweenOut(mesh, cb) {
  const baseScale = mesh.userData.finalScale || mesh.scale.x || 1;
  const baseY     = mesh.userData.baseY || mesh.position.y;
  const start     = performance.now();
  const dur       = TRANSITION_DURATION * 0.5;

  function tick() {
    const t  = Math.min((performance.now() - start) / dur, 1);
    const ep = easeInCubic(t);
    mesh.scale.setScalar(Math.max(0, (1 - ep) * baseScale));
    mesh.position.y = baseY + ep * 1.5;  // drift upward while shrinking
    mesh.rotation.y += 0.04;             // spin out faster
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      mesh.visible = false;
      mesh.scale.setScalar(baseScale);   // reset for next use
      mesh.position.y = baseY;
      cb();
    }
  }
  requestAnimationFrame(tick);
}

// ========== NAVIGATION ==========
function goToFruit(index) {
  if (index === currentFruitIndex && currentMesh && currentMesh.visible) return;

  // Prevent overlapping transitions — queue the last intent
  if (isTransitioning) {
    pendingFruitIndex = index;
    return;
  }

  isTransitioning = true;
  pendingFruitIndex = null;

  const prevMesh = currentMesh;
  currentFruitIndex = index;
  const fruit = FRUITS[index];

  const showNext = () => {
    // Safety: hide every loaded model, then show only the target
    Object.values(loadedModels).forEach(m => { m.visible = false; });
    const next = loadedModels[fruit.id];
    if (next) {
      next.visible = true;
      next.scale.setScalar(next.userData.finalScale || 1);
      tweenIn(next, () => {
        currentMesh = next;
        isTransitioning = false;
        // Process any navigation queued during this transition
        if (pendingFruitIndex !== null && pendingFruitIndex !== currentFruitIndex) {
          const pending = pendingFruitIndex;
          pendingFruitIndex = null;
          goToFruit(pending);
        }
      });
      currentMesh = next;
    } else {
      isTransitioning = false;
    }
  };

  if (prevMesh && prevMesh.visible) {
    tweenOut(prevMesh, showNext);
  } else {
    showNext();
  }

  updateHeroUI(fruit, index);
  resetAutoplay();
}

function updateHeroUI(fruit, index) {
  const hero = document.getElementById('heroSection');
  if (hero) {
    hero.style.transition = 'background 0.8s ease';
    hero.style.background = `linear-gradient(135deg, ${fruit.bg[0]} 0%, ${fruit.bg[1]} 50%, ${fruit.bg[2]} 100%)`;
  }
  const heroContent = document.getElementById('heroContent');
  if (heroContent) heroContent.style.color = fruit.textLight ? '#fff' : '#1A1A1A';

  const fade = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transition = 'opacity 0.25s ease';
    el.style.opacity = '0';
    setTimeout(() => { el.textContent = val; el.style.opacity = '1'; }, 260);
  };
  fade('heroFruitName', fruit.name);
  fade('heroTagline', fruit.tagline);
  fade('heroProduct', fruit.product);

  document.querySelectorAll('.hero-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
    dot.style.background = i === index ? fruit.accent : 'rgba(255,255,255,0.4)';
  });
}

function startAutoplay() {
  clearTimeout(autoplayTimer);
  autoplayTimer = setTimeout(() => {
    goToFruit((currentFruitIndex + 1) % FRUITS.length);
    startAutoplay();
  }, 5000);
}

function resetAutoplay() {
  clearTimeout(autoplayTimer);
  startAutoplay();
}

// ========== RENDER LOOP ==========
function animate() {
  animFrame = requestAnimationFrame(animate);
  const t = performance.now() * 0.001;

  // Animate current fruit: float + slow rotation + subtle scale breathe
  if (currentMesh && currentMesh.visible) {
    const offset = currentMesh.userData.floatOffset || 0;
    const baseY  = currentMesh.userData.baseY || 0;
    // Only apply idle float when NOT in transition (tweenIn handles position during transition)
    if (!isTransitioning) {
      currentMesh.position.y = baseY + Math.sin(t * 0.9 + offset) * 0.22;
      currentMesh.rotation.y += 0.007;
      // Subtle scale breathe
      const breathe = 1 + Math.sin(t * 1.3 + offset) * 0.025;
      currentMesh.scale.setScalar((currentMesh.userData.finalScale || 1) * breathe);
    }
  }

  // Animate particles: gentle drift
  if (particlePoints) {
    const pos    = particlePoints.geometry.attributes.position;
    const base   = particlePoints.geometry.userData.basePositions;
    const seeds  = particlePoints.geometry.userData.seeds;
    const count  = pos.count;
    for (let i = 0; i < count; i++) {
      pos.setX(i, base[i * 3]     + Math.sin(t * 0.4 + seeds[i]) * 0.35);
      pos.setY(i, base[i * 3 + 1] + Math.cos(t * 0.3 + seeds[i] * 1.3) * 0.25);
    }
    pos.needsUpdate = true;
    // Particle opacity pulses gently
    particlePoints.material.opacity = 0.45 + Math.sin(t * 0.7) * 0.2;
  }

  renderer.render(scene, camera);
}

function onResize() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas || !renderer) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

document.addEventListener('DOMContentLoaded', initHero3D);
