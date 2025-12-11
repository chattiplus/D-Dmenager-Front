<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import type { DiceRollResponse } from '../types/api';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const props = defineProps<{
  modelPath: string;
  sides: number;
  faceOrientations: Record<number, [number, number, number, number]>;
  baseColor?: number;
  rollFn?: () => Promise<DiceRollResponse>;
}>();

const containerRef = ref<HTMLDivElement | null>(null);
const lastRoll = ref<DiceRollResponse | null>(null);
const CALIBRATION_MODE = false; // impostalo a true per calibrare le rotazioni
const error = ref('');
const rolling = ref(false);
const modelLoaded = ref(false);

let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let dicePivot: THREE.Group | null = null;
let animationFrameId: number | null = null;

// --- DEBUG: dumpQuat per mappare le facce dei dadi ------------------------

const dumpQuat = (face?: number) => {
  if (!dicePivot) {
    console.warn('dicePivot non inizializzato');
    return;
  }

  const q = dicePivot.quaternion;
  const raw = [q.x, q.y, q.z, q.w];

  const rounded = raw.map((v) => Number(v.toFixed(16)));

  if (typeof face === 'number') {
    console.log(
      `  ${face}: [${rounded[0]}, ${rounded[1]}, ${rounded[2]}, ${rounded[3]}],`,
    );
  } else {
    console.log('quat:', rounded);
  }
};

const DEFAULT_BASE_COLOR = 0x7f1d1d;
const CRITICAL_COLOR = 0x22c55e;
const FAIL_COLOR = 0xef4444;

const currentBaseColor = computed(() => props.baseColor ?? DEFAULT_BASE_COLOR);
const baseRotationSpeed = 0;
let extraRotationSpeed = 0;
let lastTimestamp = 0;

const ORIENT_DURATION = 700;
const ORIENT_DELAY = 1000;
let orienting = false;
const orientStartQuat = new THREE.Quaternion();
const orientEndQuat = new THREE.Quaternion();
let orientStartTime = 0;
let orientTimeoutId: number | null = null;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const getTargetQuat = (value: number): THREE.Quaternion | null => {
  const arr = props.faceOrientations?.[value];
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

  // base: velocità rotazione
  let rotateSpeed = 0.01;

  // per il d4 rallentiamo un po' il drag, così non impazzisce
  if (props.sides === 4) {
    rotateSpeed = 0.006;
  }

  dicePivot.rotation.y -= deltaX * rotateSpeed;
  dicePivot.rotation.x -= deltaY * rotateSpeed;

  // clamp sull'inclinazione verticale per evitare ribaltamenti strani
  const maxTilt = Math.PI / 2;
  dicePivot.rotation.x = Math.max(-maxTilt, Math.min(maxTilt, dicePivot.rotation.x));
};

const handlePointerUp = () => {
  isDragging.value = false;
};

const handleCanvasClick = () => {
  // in calibrazione non voglio tiri, solo rotazione + dumpQuat
  if (CALIBRATION_MODE) {
    suppressNextClick = false;
    return;
  }

  if (suppressNextClick) {
    suppressNextClick = false;
    return;
  }

  void handleRollClick();
};

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
        mat.metalness = 0.6;
        mat.roughness = 0.35;
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



const loadDiceModel = async (sceneRef: THREE.Scene) => {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(props.modelPath);
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

// dimensione di base
  let targetSize = 3.5;

// per il d6 lo rimpiccioliamo un po'
// (se serve puoi ritoccare 3.0 -> 2.8 / 3.2 finché ti piace)
  if (props.sides === 6) {
    targetSize =2.6;
  }

// per il d4 magari lo lasciamo leggermente più piccolo del d20
  if (props.sides === 4) {
    targetSize = 3.0;
  }

  const scale = targetSize / maxDim;


  dicePivot = new THREE.Group();

  root.scale.setScalar(scale);

  const scaledCenter = center.clone().multiplyScalar(scale);
  root.position.copy(scaledCenter.multiplyScalar(-1));

  dicePivot.add(root);
  dicePivot.rotation.set(0.6, 0.8, 0.2);

  sceneRef.add(dicePivot);
  modelLoaded.value = true;
  setDiceColor(currentBaseColor.value);
};







const initScene = async () => {
  const container = containerRef.value;
  if (!container) return;

  scene = new THREE.Scene();
  scene.background = null;

  const width = container.clientWidth || 220;
  const height = container.clientHeight || 220;

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);

// distanza base
  let cameraZ = 6;

// il d6 lo guardiamo da un filo più lontano
  if (props.sides === 6) {
    cameraZ = 7;
  }

// se vuoi, anche il d4 leggermente più distante
  if (props.sides === 4) {
    cameraZ = 6.5;
  }

  camera.position.set(0, 0, cameraZ);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0);

  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x202020, 0.35);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.7);
  keyLight.position.set(2, 4, 7);
  keyLight.target.position.set(0, 0, 0);
  scene.add(keyLight);
  scene.add(keyLight.target);

  const rimLight = new THREE.DirectionalLight(0xfff7d6, 0.8);
  rimLight.position.set(-3, -3, -6);
  scene.add(rimLight);

  try {
    await loadDiceModel(scene);
  } catch (e) {
    console.error('Errore caricamento modello dado', e);
    error.value = `Impossibile caricare il modello ${props.modelPath}.`;
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
    extraRotationSpeed -= 0.0000015 * delta;
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

const rollOnce = async (): Promise<DiceRollResponse> => {
  if (props.rollFn) {
    return props.rollFn();
  }
  const value = Math.floor(Math.random() * props.sides) + 1;
  return {
    value,
    sides: props.sides,
    rolledAt: new Date().toISOString(),
  };
};

const handleRollClick = async () => {
  if (rolling.value || !scene || !dicePivot) return;

  rolling.value = true;
  error.value = '';
  setDiceColor(currentBaseColor.value);

  extraRotationSpeed = 0.008;
  orienting = false;

  try {
    const result = await rollOnce();
    lastRoll.value = result;

    if (result.value === props.sides) {
      setDiceColor(CRITICAL_COLOR);
    } else if (result.value === 1) {
      setDiceColor(FAIL_COLOR);
    } else {
      setDiceColor(currentBaseColor.value);
    }

    if (orientTimeoutId !== null) {
      clearTimeout(orientTimeoutId);
      orientTimeoutId = null;
    }

    orientTimeoutId = window.setTimeout(() => {
      startOrientationForValue(result.value);
      orientTimeoutId = null;
    }, ORIENT_DELAY);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Errore durante il lancio del dado.';
  } finally {
    setTimeout(() => {
      rolling.value = false;
    }, 600);
  }
};

onMounted(() => {
  initScene();
  (window as any).dumpQuat = dumpQuat;
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
  <div class="dice-three-widget">
    <div
      ref="containerRef"
      class="dice-canvas"
      :class="{ 'is-rolling': rolling || !modelLoaded }"
      :title="modelLoaded ? 'Clicca il dado per tirare' : 'Caricamento modello del dado...'"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointerleave="handlePointerUp"
      @click.stop="handleCanvasClick"
    ></div>

    <div class="dice-info">
      <p v-if="lastRoll" class="dice-result">
        Hai tirato <strong>{{ lastRoll.value }}</strong>/<span>{{ props.sides }}</span>
      </p>
      <p v-else class="dice-placeholder">
        {{ modelLoaded ? 'Clicca il dado per tirare' : 'Caricamento modello del dado...' }}
      </p>

      <p v-if="error" class="dice-error">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.dice-three-widget {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
}

.dice-canvas {
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

.dice-canvas:hover {
  transform: translateY(-2px);
  box-shadow:
    0 16px 35px rgba(0, 0, 0, 0.8),
    0 0 0 1px rgba(148, 163, 184, 0.4);
}

.dice-canvas.is-rolling {
  transform: translateY(-3px) scale(1.01);
}

.dice-info {
  font-size: 0.85rem;
  text-align: right;
}

.dice-result strong {
  font-weight: 700;
}

.dice-placeholder {
  opacity: 0.8;
  font-style: italic;
}

.dice-error {
  margin-top: 0.1rem;
  color: #b91c1c;
  font-size: 0.8rem;
}
</style>
