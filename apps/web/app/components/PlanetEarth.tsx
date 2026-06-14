'use client';

import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BackSide,
  Color,
  type Mesh,
  type ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
} from 'three';

// Textures live in /public/textures/ (MIT-licensed, from the three.js examples repo). No runtime CDN — DSGVO clean.

// Sun at (0.6, 0.4, -0.7): upper-back position keeps the visible hemisphere in twilight,
// avoiding the flat look of a front-facing light source.
const SETTINGS = {
  SUN_DIRECTION: new Vector3(0.6, 0.4, -0.7),
  PLANET_BRIGHTNESS: 0.55,
  TERMINATOR_RANGE: [-0.25, 0.5] as [number, number],
  NIGHT_LIGHTS_BOOST: 1.0,
  AMBIENT_LIGHT: 0.0,

  ATMOSPHERE_DAY_COLOR: '#4db2ff',
  ATMOSPHERE_TWILIGHT_COLOR: '#bc490b',
  ATMOSPHERE_INTENSITY: 0.6,
  ATMOSPHERE_THICKNESS: 1,
  ATMOSPHERE_FALLOFF_START: 0.0,
  ATMOSPHERE_SHARPNESS: 1.0,
  ATMOSPHERE_SOFTNESS: 0.7,

  CLOUDS_DENSITY: 2.0,

  ROTATION_SPEED: 0.04,
  AXIS_TILT: 0.32,
  // SphereGeometry places lon 0° (prime meridian) at +Z (camera side) when rotation.y = 0.
  // A negative offset rotates the globe so that eastern longitudes face forward:
  // -0.26 rad ≈ 15°E, centring Europe/Atlantic in the initial view.
  INITIAL_ROTATION_Y: -0.26,

  CAMERA_POSITION: [0, 0.5, 4] as [number, number, number],
  CAMERA_FOV: 35,
};

const SUN_DIRECTION = SETTINGS.SUN_DIRECTION.clone().normalize();
const ATMOSPHERE_DAY = new Color(SETTINGS.ATMOSPHERE_DAY_COLOR);
const ATMOSPHERE_TWILIGHT = new Color(SETTINGS.ATMOSPHERE_TWILIGHT_COLOR);

// Vertex shader passes world-space position + normal to the fragment via
// varyings. modelMatrix is only available in vertex shaders by default,
// so we compute world data here and forward it.
const EARTH_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const EARTH_FRAGMENT = /* glsl */ `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D bumpCloudsTexture;
  uniform vec3 sunDirection;
  uniform vec3 atmosphereDay;
  uniform vec3 atmosphereTwilight;
  uniform float brightness;
  uniform float cloudsDensity;
  uniform vec2 terminatorRange;
  uniform float nightLightsBoost;
  uniform float ambientLight;
  varying vec2 vUv;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;

  float ss(float a, float b, float x) { return smoothstep(a, b, x); }

  void main() {
    vec3 normal = normalize(vNormalWorld);
    float sunOrient = dot(normal, normalize(sunDirection));

    vec4 day = texture2D(dayTexture, vUv);
    vec4 night = texture2D(nightTexture, vUv);
    vec4 bumpClouds = texture2D(bumpCloudsTexture, vUv);

    float cloudsStrength = ss(0.2, 1.0, bumpClouds.b);
    vec3 dayColor = mix(day.rgb, vec3(1.0), cloudsStrength * cloudsDensity);

    float dayStrength = ss(terminatorRange.x, terminatorRange.y, sunOrient);
    vec3 surfaceColor = mix(night.rgb * nightLightsBoost, dayColor, dayStrength);
    // Ambient: always-on base light from the day texture, independent of sun.
    // Lets the dark side stay visible when the sun is behind the planet.
    surfaceColor += day.rgb * ambientLight;

    vec3 atmoColor = mix(atmosphereTwilight, atmosphereDay, ss(-0.25, 0.75, sunOrient));

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = 1.0 - abs(dot(normal, viewDir));
    fresnel = pow(fresnel, 2.0);

    float atmoStrength = clamp(ss(-0.5, 1.0, sunOrient) * fresnel, 0.0, 1.0);

    vec3 finalColor = mix(surfaceColor, atmoColor, atmoStrength);
    // Global darkening — gives the visible hemisphere a muted, moody feel
    // (rather than full daylight blast).
    finalColor *= brightness;
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;
  void main() {
    vNormalWorld = normalize(mat3(modelMatrix) * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform vec3 sunDirection;
  uniform vec3 atmosphereDay;
  uniform vec3 atmosphereTwilight;
  uniform float atmosphereIntensity;
  uniform float atmosphereFalloffStart;
  uniform float atmosphereSharpness;
  uniform float atmosphereSoftness;
  varying vec3 vNormalWorld;
  varying vec3 vWorldPos;

  float ss(float a, float b, float x) { return smoothstep(a, b, x); }

  void main() {
    vec3 normal = normalize(vNormalWorld);
    float sunOrient = dot(normal, normalize(sunDirection));

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = 1.0 - abs(dot(normal, viewDir));

    // Two-layer halo: A) tight rim band (sharp), B) wide soft cloud (extends
    // far into the planet body). Softness blends between them — the cloud
    // uses a much gentler exponent so the difference is dramatic.
    float bandAlpha = pow(smoothstep(atmosphereFalloffStart, 1.0, fresnel), atmosphereSharpness);
    float cloudAlpha = pow(fresnel, 0.3);
    float alpha = mix(bandAlpha, cloudAlpha, atmosphereSoftness);

    alpha *= ss(-0.7, 1.0, sunOrient);
    alpha *= atmosphereIntensity;

    vec3 atmoColor = mix(atmosphereTwilight, atmosphereDay, ss(-0.25, 0.75, sunOrient));
    gl_FragColor = vec4(atmoColor, alpha);
  }
`;

function Earth() {
  const earthRef = useRef<Mesh>(null);
  const earthMatRef = useRef<ShaderMaterial>(null);
  const atmoMatRef = useRef<ShaderMaterial>(null);

  const [dayTex, nightTex, bumpCloudsTex] = useLoader(TextureLoader, [
    '/textures/earth-day.jpg',
    '/textures/earth-night.jpg',
    '/textures/earth-bump-clouds.jpg',
  ]);
  // Match three.js example colourspace settings
  dayTex.colorSpace = SRGBColorSpace;
  nightTex.colorSpace = SRGBColorSpace;
  dayTex.anisotropy = 8;
  nightTex.anisotropy = 8;
  bumpCloudsTex.anisotropy = 8;

  const earthUniforms = useMemo(
    () => ({
      dayTexture: { value: dayTex },
      nightTexture: { value: nightTex },
      bumpCloudsTexture: { value: bumpCloudsTex },
      sunDirection: { value: SUN_DIRECTION },
      atmosphereDay: { value: ATMOSPHERE_DAY },
      atmosphereTwilight: { value: ATMOSPHERE_TWILIGHT },
      brightness: { value: SETTINGS.PLANET_BRIGHTNESS },
      cloudsDensity: { value: SETTINGS.CLOUDS_DENSITY },
      terminatorRange: { value: SETTINGS.TERMINATOR_RANGE },
      nightLightsBoost: { value: SETTINGS.NIGHT_LIGHTS_BOOST },
      ambientLight: { value: SETTINGS.AMBIENT_LIGHT },
    }),
    [dayTex, nightTex, bumpCloudsTex]
  );

  const atmoUniforms = useMemo(
    () => ({
      sunDirection: { value: SUN_DIRECTION },
      atmosphereDay: { value: ATMOSPHERE_DAY },
      atmosphereTwilight: { value: ATMOSPHERE_TWILIGHT },
      atmosphereIntensity: { value: SETTINGS.ATMOSPHERE_INTENSITY },
      atmosphereFalloffStart: { value: SETTINGS.ATMOSPHERE_FALLOFF_START },
      atmosphereSharpness: { value: SETTINGS.ATMOSPHERE_SHARPNESS },
      atmosphereSoftness: { value: SETTINGS.ATMOSPHERE_SOFTNESS },
    }),
    []
  );

  useFrame((_, delta) => {
    // Skip animation during screenshot tests (Playwright sets ?screenshot=1)
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('screenshot')) {
      return;
    }
    if (earthRef.current) earthRef.current.rotation.y += delta * SETTINGS.ROTATION_SPEED;
  });

  return (
    <>
      <mesh ref={earthRef} rotation={[SETTINGS.AXIS_TILT, SETTINGS.INITIAL_ROTATION_Y, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          ref={earthMatRef}
          vertexShader={EARTH_VERTEX}
          fragmentShader={EARTH_FRAGMENT}
          uniforms={earthUniforms}
        />
      </mesh>

      <mesh scale={SETTINGS.ATMOSPHERE_THICKNESS}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          ref={atmoMatRef}
          vertexShader={ATMOSPHERE_VERTEX}
          fragmentShader={ATMOSPHERE_FRAGMENT}
          uniforms={atmoUniforms}
          side={BackSide}
          blending={AdditiveBlending}
          transparent
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

export default function PlanetEarth() {
  const isScreenshot = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('screenshot');
  return (
    <Canvas
      camera={{ position: SETTINGS.CAMERA_POSITION, fov: SETTINGS.CAMERA_FOV }}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      gl={{ antialias: true, alpha: true }}
      frameloop={isScreenshot ? 'demand' : 'always'}
    >
      <Suspense fallback={null}>
        <Earth />
      </Suspense>
    </Canvas>
  );
}
