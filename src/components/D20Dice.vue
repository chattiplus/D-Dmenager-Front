<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed, watch } from 'vue';
import * as THREE from 'three';
import type { DiceRollResponse } from '../types/api';
import { rollD20 } from '../api/diceApi';
import { extractApiErrorMessage } from '../utils/errorMessage';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const props = defineProps<{
  baseColor?: number; // es: 0x7f1d1d
}>();

const containerRef = ref<HTMLDivElement | null>(null);

const lastRoll = ref<DiceRollResponse | null>(null);
const error = ref('');
const rolling = ref(false);
const modelLoaded = ref(false);

// three.js core
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let dicePivot: THREE.Group | null = null;

let animationFrameId: number | null = null;

// rotazione
const DEFAULT_BASE_COLOR = 0x7f1d1d; // rosso scuro metallico
const currentBaseColor = computed(
    () => props.baseColor ?? DEFAULT_BASE_COLOR,
);
const baseRotationSpeed = 0;
let extraRotationSpeed = 0;
let lastTimestamp = 0;

// orientamento verso la faccia corretta
const ORIENT_DURATION = 700; // ms
let orienting = false;
const orientStartQuat = new THREE.Quaternion();
const orientEndQuat = new THREE.Quaternion();
let orientStartTime = 0;
const ORIENT_DELAY = 1000;         // nuovo: ms prima di iniziare ad allinearsi

let orientTimeoutId: number | null = null; // nuovoF

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

// mappa valore -> quaternion [x, y, z, w]
const FACE_ORIENTATIONS: Record<number, [number, number, number, number]> = {
  1:  [0.9421335142759254, -0.10259206741534796, 0.314283637911893, -0.05554371181696102],
  2:  [-0.10406504951832918, 0.31582315520379456, -0.05070304123807941, -0.9417300046802574],
  3:  [0.37374789764749744, 0.3092407020956317, 0.22175755657008098, 0.8458760448644613],
  4:  [0.88297806667845, -0.03333376153117322, -0.15133049220810513, -0.44310007474048385],
  5:  [0.11948913535150461, -0.023959944934203788, -0.0976409637512653, -0.9877320030096343],
  6:  [0.07948355466170498, 0.8106879545914567, 0.055327409753588165, 0.5774134416071544],
  7:  [0.19640608616492458, -0.7521029191951396, -0.37659705674403965, 0.5039250987073898],
  8:  [-0.10413736898433965, 0.4317858735282178, -0.8819571760172702, 0.15769561653430808],
  9:  [0.28886497963506813, 0.7089141805210825, 0.3298137788706279, 0.5524677180285111],
  10: [-0.7998771250805912, -0.041904619883691874, -0.5886581381984072, -0.10918875371574077],
  11: [-0.09552356835596054, 0.6015401652590574, -0.037543417485377054, 0.7922216667525375],
  12: [-0.5532096904970845, 0.32095904204220005, -0.7156365507488139, 0.28072879956252006],
  13: [0.16192792628529823, 0.8764134374803982, 0.44002249839768476, 0.10981363392855487],
  14: [-0.4047697176868532, 0.5361703779921378, -0.275284224720821, 0.687678265635413],
  15: [0.07602513164811511, 0.5827125000094251, -0.09338841658793012, -0.8037069897281296],
  16: [0.9911576063064937, -0.10197856728400163, -0.023881712878676187, 0.08146554526586361],
  17: [-0.42843702446032145, 0.19984626862332727, -0.008650459349988343, -0.8811517205010458],
  18: [-0.8226660298522379, 0.24047043379062416, -0.339255834524708, 0.38768550726155615],
  19: [0.044213420307456605, 0.9435159455045995, -0.13872236686035289, 0.29762214127302355],
  20: [0.051345038253693104, 0.322352128175079, 0.10084872967245852, 0.9398310094007197],
};

const getTargetQuat = (value: number): THREE.Quaternion | null => {
  const arr = FACE_ORIENTATIONS[value];
  if (!arr) return null;
  return new THREE.Quaternion(arr[0], arr[1], arr[2], arr[3]);
};

const startOrientation = (target: THREE.Quaternion) => {
  if (!dicePivot) return;
  orienting = true;
  extraRotationSpeed = 0;
  orientStartQuat.copy(dicePivot.quaternion);
  orientEndQuat.copy(target);
  orientStartTime = performance.now();
};

const startOrientationForValue = (value: number) => {
  const target = getTargetQuat(value);
  if (!target) return;
  startOrientation(target);
};

// rotazione con il mouse
const isDragging = ref(false);
const lastX = ref(0);
const lastY = ref(0);
let suppressNextClick = false;

const handlePointerDown = (event: PointerEvent) => {
  if (!dicePivot || !modelLoaded.value) return;
  isDragging.value = true;
  suppressNextClick = false;
  lastX.value = event.clientX;
  lastY.value = event.clientY;
};

const handlePointerMove = (event: PointerEvent) => {
  if (!isDragging.value || !dicePivot || rolling.value || orienting) return;

  const deltaX = event.clientX - lastX.value;
  const deltaY = event.clientY - lastY.value;
  lastX.value = event.clientX;
  lastY.value = event.clientY;

  if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
    suppressNextClick = true;
  }

  const rotateSpeed = 0.01;
  dicePivot.rotation.y -= deltaX * rotateSpeed;
  dicePivot.rotation.x -= deltaY * rotateSpeed;
};

const handlePointerUp = () => {
  isDragging.value = false;
};

const handleCanvasClick = () => {
  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }
  void handleRollClick();
};

// materiali
const setDiceColor = (hex: number) => {
  if (!dicePivot) return;

  dicePivot.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;

    const mats: THREE.Material[] = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

    mats.forEach((m) => {
      const mat = m as THREE.MeshStandardMaterial;
      if ('color' in mat) {
        mat.color.set(hex);
        mat.metalness = 0.6;   // meno metallico
        mat.roughness = 0.35;  // leggermente più opaco, diffonde meglio la luce
      }
    });
  });
};

watch(
    currentBaseColor,
    (newColor) => {
      if (modelLoaded.value) {
        setDiceColor(newColor);
      }
    },
    { immediate: false },
);

// carica e centra il modello
const loadDiceModel = async (scene: THREE.Scene) => {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync('/models/d20.glb');
  const root = gltf.scene;

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const targetSize = 3.5;
  const scale = targetSize / maxDim;

  dicePivot = new THREE.Group();

  root.scale.setScalar(scale);

  const scaledCenter = center.clone().multiplyScalar(scale);
  root.position.copy(scaledCenter.multiplyScalar(-1));

  dicePivot.add(root);

  dicePivot.rotation.set(0.6, 0.8, 0.2);

  scene.add(dicePivot);
  modelLoaded.value = true;
  setDiceColor(currentBaseColor.value);
};

// scena
const initScene = async () => {
  const container = containerRef.value;
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = null;

  const width = container.clientWidth || 220;
  const height = container.clientHeight || 220;

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(0, 0, 6);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // luce ambiente morbida
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x202020, 0.35);
  scene.add(hemiLight);

  // key light frontale (vicino alla camera) per illuminare la faccia visibile
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
  keyLight.position.set(2, 4, 7); // quasi dalla stessa direzione della camera
  keyLight.target.position.set(0, 0, 0);
  scene.add(keyLight);
  scene.add(keyLight.target);

  // rim light posteriore per dare bordo al dado
  const rimLight = new THREE.DirectionalLight(0xfff7d6, 0.8);
  rimLight.position.set(-3, -3, -6);
  scene.add(rimLight);


  try {
    await loadDiceModel(scene);
  } catch (e) {
    console.error('Errore caricamento modello d20', e);
    error.value =
        'Impossibile caricare il modello del dado. Controlla che /public/models/d20.glb esista.';
  }

  lastTimestamp = performance.now();
  animate(lastTimestamp);

  window.addEventListener('resize', handleResize);
};

const handleResize = () => {
  const container = containerRef.value;
  if (!container || !camera || !renderer) return;

  const width = container.clientWidth || 220;
  const height = container.clientHeight || 220;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

// loop animazione
const animate = (timestamp: number) => {
  if (!scene || !camera || !renderer) return;

  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  const speed = baseRotationSpeed + extraRotationSpeed;

  if (dicePivot && extraRotationSpeed !== 0) {
    dicePivot.rotation.y += speed * delta;
    dicePivot.rotation.x += (speed * delta) / 2;
  }

  if (extraRotationSpeed > 0) {
    extraRotationSpeed -= 0.0000015 * delta; // frena ancora più lentamente
    if (extraRotationSpeed < 0) extraRotationSpeed = 0;
  }



  if (orienting && dicePivot) {
    const elapsed = timestamp - orientStartTime;
    let tRaw = elapsed / ORIENT_DURATION;
    if (tRaw >= 1) {
      tRaw = 1;
      orienting = false;
    }
    const eased = easeOutCubic(tRaw);
    dicePivot.quaternion.slerpQuaternions(orientStartQuat, orientEndQuat, eased);
  }

  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(animate);
};

// roll
const handleRollClick = async () => {
  if (rolling.value || !scene || !dicePivot) return;

  rolling.value = true;
  error.value = '';
  setDiceColor(currentBaseColor.value);

  extraRotationSpeed = 0.008; // più lenta ma ancora visibile
  orienting = false;

  try {
    const result = await rollD20();
    lastRoll.value = result;

    if (result.value === 20) {
      setDiceColor(0x22c55e); // critico verde
    } else if (result.value === 1) {
      setDiceColor(0xef4444); // 1 naturale rosso acceso
    } else {
      setDiceColor(currentBaseColor.value);
    }

    // cancella eventuale orientamento pendente da un lancio precedente
    if (orientTimeoutId !== null) {
      clearTimeout(orientTimeoutId);
      orientTimeoutId = null;
    }

    // fai girare un po' il dado prima di agganciarlo alla faccia corretta
    orientTimeoutId = window.setTimeout(() => {
      startOrientationForValue(result.value);
      orientTimeoutId = null;
    }, ORIENT_DELAY);
  } catch (e) {
    error.value = extractApiErrorMessage(e);
  } finally {
    setTimeout(() => {
      rolling.value = false;
    }, 600);
  }
};

// lifecycle
onMounted(() => {
  initScene();
});

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  window.removeEventListener('resize', handleResize);

  if (renderer) {
    renderer.dispose();
  }

  if (scene && dicePivot) {
    scene.remove(dicePivot);
    dicePivot.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        const geom = mesh.geometry as THREE.BufferGeometry;
        geom.dispose();
        const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
        mats.forEach((m) => {
          const mat = m as THREE.Material & { map?: THREE.Texture | null };
          if (mat.map) mat.map.dispose();
          mat.dispose();
        });
      }
    });
  }

  scene = null;
  camera = null;
  renderer = null;
  dicePivot = null;
});
</script>

<template>
  <div class="d20-three-widget">
    <div
        ref="containerRef"
        class="d20-canvas"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointerleave="handlePointerUp"
        @click.stop="handleCanvasClick"
        :class="{ 'is-rolling': rolling || !modelLoaded }"
        :title="modelLoaded ? 'Clicca il dado per tirare il d20' : 'Caricamento modello del dado...'"
    ></div>

    <!--<div class="d20-info">
      <p v-if="lastRoll" class="d20-result">
        Hai tirato <strong>{{ lastRoll.value }}</strong>/<span>{{ lastRoll.sides }}</span>
      </p>
      <p v-else class="d20-placeholder">
        {{ modelLoaded ? 'Clicca il dado per tirare il d20' : 'Caricamento modello del dado...' }}
      </p>

      <p v-if="error" class="d20-error">
        {{ error }}
      </p>
    </div>-->
  </div>
</template>

<style scoped>
.d20-three-widget {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
}

.d20-canvas {
  width: 220px;
  height: 220px;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.6);
  cursor: pointer;
  transition:
      transform 0.15s ease-out,
      box-shadow 0.15s ease-out;
  background: transparent;
}

.d20-canvas:hover {
  transform: translateY(-2px);
  box-shadow:
      0 16px 35px rgba(0, 0, 0, 0.8),
      0 0 0 1px rgba(148, 163, 184, 0.4);
}

.d20-canvas.is-rolling {
  transform: translateY(-3px) scale(1.01);
}

.d20-info {
  font-size: 0.85rem;
  text-align: right;
}

.d20-result strong {
  font-weight: 700;
}

.d20-placeholder {
  opacity: 0.8;
  font-style: italic;
}

.d20-error {
  margin-top: 0.1rem;
  color: #b91c1c;
  font-size: 0.8rem;
}
</style>
