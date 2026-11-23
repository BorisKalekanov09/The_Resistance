import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Html, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { AMCC_ANCHOR, getAnatomy, getLoadedHead, loadHead } from './anatomy';

/* ---------- Transparent head: porcelain shader over a 3D scan ---------- */

const headVertex = /* glsl */ `
  attribute float cavity;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  varying float vCav;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vN = normalize(mat3(modelMatrix) * normal);
    vV = normalize(cameraPosition - wp.xyz);
    vP = position;
    vCav = cavity;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const headFragment = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uShade;
  uniform vec3 uRim;
  uniform float uOpacity;
  uniform float uFill;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  varying float vCav;
  void main() {
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    vec3 v = normalize(vV);
    float facing = clamp(dot(n, v), 0.0, 1.0);
    float fres = pow(1.0 - facing, 2.4);

    // soft wrap lighting from the key (front-top, subject's right) plus a cool-free fill
    vec3 L = normalize(vec3(-0.55, 0.65, 0.55));
    float key = clamp((dot(n, L) + 0.4) / 1.4, 0.0, 1.0);
    float fill = clamp((dot(n, normalize(vec3(0.6, 0.2, 0.4))) + 0.5) / 1.5, 0.0, 1.0);
    float ao = 1.0 - 0.55 * vCav;
    vec3 col = mix(uShade, uBase, clamp(0.1 + 0.75 * key + 0.15 * fill, 0.0, 1.0)) * ao;
    col = mix(col, uRim, fres * 0.6);
    float spec = pow(max(dot(n, normalize(L + v)), 0.0), 36.0) * 0.18;
    col += spec;

    // keep the full neck, dissolve the shoulders of the bust
    // (the cut is tilted with the neck: the nape dissolves before the trapezius, the throat stays)
    float fade = smoothstep(-1.8, -1.42, vP.y + 0.5 * vP.z)
      * (1.0 - smoothstep(0.42, 0.72, abs(vP.x)) * (1.0 - smoothstep(-1.5, -1.3, vP.y)));
    // shaded and occluded areas get denser so the facial planes keep their modelling
    float a = uFill + 0.5 * fres + 0.45 * vCav + 0.16 * (1.0 - key) + spec;
    gl_FragColor = vec4(col, clamp(a, 0.0, 0.92) * uOpacity * fade);
    #include <colorspace_fragment>
  }
`;

function makeHeadMaterial(side: THREE.Side, fill: number) {
  return new THREE.ShaderMaterial({
    vertexShader: headVertex,
    fragmentShader: headFragment,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    side,
    uniforms: {
      uBase: { value: new THREE.Color('#f4eadb') },
      uShade: { value: new THREE.Color('#c4ab94') },
      uRim: { value: new THREE.Color('#8a7360') },
      uOpacity: { value: 0 },
      uFill: { value: fill },
    },
  });
}

function Head({ opacity }: { opacity: number }) {
  const [geo, setGeo] = useState(getLoadedHead);
  useEffect(() => {
    if (geo) return;
    let alive = true;
    loadHead()
      .then((g) => alive && setGeo(g))
      .catch((e) => console.error('Could not load head scan', e));
    return () => {
      alive = false;
    };
  }, [geo]);

  // inner (back) faces very faint, outer faces carry the facial form
  const back = useMemo(() => makeHeadMaterial(THREE.BackSide, 0.025), []);
  const front = useMemo(() => makeHeadMaterial(THREE.FrontSide, 0.1), []);
  useFrame((_, dt) => {
    for (const m of [back, front]) {
      const u = m.uniforms.uOpacity;
      u.value += (opacity - u.value) * Math.min(1, dt * 2.5);
    }
  });
  if (!geo) return null;
  return (
    <>
      <mesh geometry={geo} material={back} renderOrder={4} />
      <mesh geometry={geo} material={front} renderOrder={5} />
    </>
  );
}

/* ---------- Glow sprite texture ---------- */

function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(176,80,52,0.9)');
  grd.addColorStop(0.35, 'rgba(176,80,52,0.35)');
  grd.addColorStop(1, 'rgba(176,80,52,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- Brain ---------- */

interface BrainProps {
  highlight: boolean;
  showLabel: boolean;
}


function Brain({ highlight, showLabel }: BrainProps) {
  const a = getAnatomy();
  const { camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const amccGroup = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Sprite>(null);
  const hl = useRef(0);

  // centre of the aMCC tube: it shrinks / swells around this point, not around the origin
  const amccCenter = useMemo(() => {
    a.amcc.computeBoundingBox();
    return a.amcc.boundingBox!.getCenter(new THREE.Vector3());
  }, [a]);

  const tissue = useMemo(() => {
    const make = () =>
      new THREE.MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.62,
        metalness: 0,
        clearcoat: 0.25,
        clearcoatRoughness: 0.6,
        sheen: 0.4,
        sheenColor: new THREE.Color('#ffd9c8'),
        sheenRoughness: 0.5,
        transparent: true,
      });
    return { left: make(), right: make(), other: make() };
  }, []);

  const ccMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e6d2c6', roughness: 0.6, transparent: true, opacity: 0 }),
    [],
  );
  const amccMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#b4583c',
        emissive: '#a5452b',
        emissiveIntensity: 0.4,
        roughness: 0.45,
        transparent: true,
        opacity: 0,
      }),
    [],
  );
  const xrayMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#b4583c',
        transparent: true,
        opacity: 0,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  const glow = useMemo(() => {
    const m = new THREE.SpriteMaterial({ map: makeGlowTexture(), transparent: true, depthTest: false, depthWrite: false, opacity: 0 });
    return m;
  }, []);

  const tmp = useMemo(() => new THREE.Vector3(), []);
  const axis = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    hl.current += ((highlight ? 1 : 0) - hl.current) * Math.min(1, dt * 1.8);
    const h = hl.current;
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.1);

    // fade whichever hemisphere faces the camera so the medial wall becomes visible
    if (group.current) {
      camera.getWorldPosition(tmp);
      group.current.worldToLocal(tmp).normalize();
      for (const [mat, side] of [
        [tissue.left, 1],
        [tissue.right, -1],
      ] as const) {
        axis.set(side, 0, 0);
        const near = THREE.MathUtils.smoothstep(tmp.dot(axis), 0.05, 0.55);
        const target = 1 - h * near * 0.78;
        mat.opacity += (target - mat.opacity) * Math.min(1, dt * 3);
        mat.depthWrite = mat.opacity > 0.97;
      }
    }
    // the highlight is a fixed anatomical reference: it never grows, shrinks or changes colour
    const beat = pulse;
    ccMat.opacity = h * 0.38;
    amccMat.opacity = h;
    amccMat.emissiveIntensity = 0.25 + 0.45 * beat * h;
    xrayMat.opacity = h * (0.22 + 0.12 * beat);
    glow.opacity = h * (0.35 + 0.25 * beat);
  });

  return (
    <group ref={group} position={[0, 0.23, -0.1]} scale={[0.97, 1.1, 1.07]}>
      <mesh geometry={a.left} material={tissue.left} renderOrder={2} />
      <mesh geometry={a.right} material={tissue.right} renderOrder={2} />
      <mesh geometry={a.cerebellum} material={tissue.other} position={[0, -0.43, -0.47]} rotation={[0.3, 0, 0]} />
      <mesh geometry={a.brainstem} material={tissue.other} position={[0, -0.18, -0.2]} rotation={[0.3, 0, 0]} />
      <mesh geometry={a.cc} material={ccMat} renderOrder={1} />
      <group position={amccCenter}>
        <group ref={amccGroup} scale={[0.55, 1, 1]}>
          <group position={[-amccCenter.x, -amccCenter.y, -amccCenter.z]}>
            <mesh geometry={a.amcc} material={amccMat} renderOrder={1} />
            <mesh geometry={a.amcc} material={xrayMat} renderOrder={20} />
          </group>
        </group>
      </group>
      <sprite ref={glowRef} material={glow} position={[0, 0.215, 0.27]} scale={[0.75, 0.55, 1]} renderOrder={19} />
      {showLabel && (
        <Html position={AMCC_ANCHOR} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="annot">
            <span className="annot-dot" />
            <span className="annot-line" />
            <span className="annot-text">
              <b>aMCC</b>
              <i>anterior midcingulate cortex</i>
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

/* ---------- Keep the whole head in frame on tall / narrow canvases ---------- */

function ResponsiveFov() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const aspect = size.width / Math.max(1, size.height);
    cam.fov = aspect < 1.05 ? Math.min(46, 30 * Math.pow(1.05 / aspect, 0.85)) : 30;
    cam.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

/* ---------- Camera intro: fly in from afar ---------- */

function CameraIntro({ distance }: { distance: number }) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);
  useEffect(() => {
    camera.position.setLength(distance * 2.4);
  }, [camera, distance]);
  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = Math.min(1, (state.clock.elapsedTime - start.current) / 2.6);
    if (t >= 1) return;
    const e = 1 - Math.pow(1 - t, 3);
    camera.position.setLength(THREE.MathUtils.lerp(distance * 2.4, distance, e));
  });
  return null;
}

/* ---------- Gentle idle sway around the three-quarter view (never shows the back of the head) ---------- */

/** Default azimuth: a three-quarter profile from the subject's right (0 = facing the camera). */
const BASE_AZIMUTH = -1.06;
const TARGET = new THREE.Vector3(0, -0.28, 0.05);

// `?az=<degrees>` pins the camera for inspection
const DEBUG_AZ = (() => {
  const v = new URLSearchParams(window.location.search).get('az');
  return v === null || Number.isNaN(Number(v)) ? null : (Number(v) * Math.PI) / 180;
})();
const START_AZIMUTH = DEBUG_AZ ?? BASE_AZIMUTH;

interface SwayControls {
  target: THREE.Vector3;
  addEventListener: (t: string, f: () => void) => void;
  removeEventListener: (t: string, f: () => void) => void;
}

function IdleSway() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as SwayControls | null;
  const idleSince = useRef(performance.now());
  const phase = useRef(0);
  const dragging = useRef(false);
  const sph = useMemo(() => new THREE.Spherical(), []);
  const off = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => {
    if (!controls) return;
    const start = () => (dragging.current = true);
    const end = () => {
      dragging.current = false;
      idleSince.current = performance.now();
    };
    controls.addEventListener('start', start);
    controls.addEventListener('end', end);
    return () => {
      controls.removeEventListener('start', start);
      controls.removeEventListener('end', end);
    };
  }, [controls]);
  useFrame((_, dt) => {
    if (!controls || dragging.current || DEBUG_AZ !== null) return;
    if (performance.now() - idleSince.current < 3500) return;
    phase.current += Math.min(dt, 0.1) * 0.2;
    const goal = BASE_AZIMUTH + 0.3 * Math.sin(phase.current);
    off.copy(camera.position).sub(controls.target);
    sph.setFromVector3(off);
    // ease back toward the sway path from wherever the user left the head
    let d = goal - sph.theta;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    sph.theta += d * Math.min(1, dt * 0.8);
    off.setFromSpherical(sph);
    camera.position.copy(controls.target).add(off);
  });
  return null;
}

export interface BrainSceneProps {
  highlight: boolean;
  showLabel: boolean;
  headOpacity?: number;
}

export default function BrainScene({ highlight, showLabel, headOpacity = 1 }: BrainSceneProps) {
  const distance = 5.7;
  return (
    <Canvas
      camera={{
        position: [TARGET.x + Math.sin(START_AZIMUTH) * 5.5, 0.6, TARGET.z + Math.cos(START_AZIMUTH) * 5.5],
        fov: 30,
        near: 0.1,
        far: 50,
      }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
    >
      <ambientLight intensity={0.55} color="#fff4ea" />
      <hemisphereLight args={['#fffaf3', '#c9b6a6', 0.75]} />
      <directionalLight position={[-3, 4, 3]} intensity={1.7} color="#fff3e6" />
      <directionalLight position={[3, 1.5, -3]} intensity={0.7} color="#ffe3d2" />
      <directionalLight position={[0, -3, 2]} intensity={0.25} color="#e8d6c8" />

      <group position={[0, 0.15, 0]}>
        <Brain highlight={highlight} showLabel={showLabel} />
        <Head opacity={headOpacity} />
      </group>

      <ContactShadows position={[0, -2.15, 0]} opacity={0.22} scale={5} blur={3} far={3} color="#5a4a3e" />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={2.6}
        maxDistance={7}
        minPolarAngle={0.5}
        maxPolarAngle={2.2}
        target={TARGET}
      />
      <CameraIntro distance={distance} />
      <IdleSway />
      <ResponsiveFov />
    </Canvas>
  );
}
