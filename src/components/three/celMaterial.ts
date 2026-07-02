import { useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const CEL_VERTEX = /* glsl */ `
  varying vec3 vNormal;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CEL_FRAGMENT = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uShade;
  uniform vec3 uHighlight;
  uniform vec3 uLightDir;
  uniform float uShadeEdge;
  uniform float uShadeSoftness;
  uniform float uSpecEdge;
  uniform float uSpecStrength;
  varying vec3 vNormal;

  void main() {
    vec3 n = normalize(vNormal);
    // Half-Lambert wrap: the away side still receives light, so shading
    // reads ambient rather than a single harsh key light.
    float wrapped = dot(n, uLightDir) * 0.5 + 0.5;
    // Two tones with a soft terminator instead of a razor step.
    float lit = smoothstep(uShadeEdge - uShadeSoftness, uShadeEdge + uShadeSoftness, wrapped);
    vec3 color = mix(uShade, uBase, lit);

    // Blinn blob, crisp but antialiased. The camera is orthographic and
    // on-axis, so the view vector is a constant +Z in view space.
    vec3 h = normalize(uLightDir + vec3(0.0, 0.0, 1.0));
    float spec = smoothstep(uSpecEdge - 0.008, uSpecEdge + 0.008, dot(n, h)) * lit;
    color = mix(color, uHighlight, spec * uSpecStrength);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** One paper-cream highlight across all fills, like the reference art. */
export const CREAM_HIGHLIGHT = "#f7f1e3";

type CelOptions = {
  highlight?: string;
  /** NdotH threshold for the highlight blob; > 1 disables it. */
  specEdge?: number;
};

/**
 * Cel shading with a soft terminator: lit tone is the exact --nb-* hex,
 * shade tone is the same hue pulled toward ink (blended over a half-Lambert
 * wrap so lighting stays gentle), plus an optional crisp cream specular blob.
 * The trailing colorspace_fragment include is required — raw ShaderMaterials
 * don't get the sRGB output conversion that keeps colors true to CSS.
 */
export function useCelMaterial(
  color: string,
  ink: string,
  { highlight = CREAM_HIGHLIGHT, specEdge = 0.98 }: CelOptions = {},
): THREE.ShaderMaterial {
  const invalidate = useThree((state) => state.invalidate);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CEL_VERTEX,
        fragmentShader: CEL_FRAGMENT,
        uniforms: {
          uBase: { value: new THREE.Color() },
          uShade: { value: new THREE.Color() },
          uHighlight: { value: new THREE.Color() },
          uLightDir: { value: new THREE.Vector3(-0.45, 0.7, 0.55).normalize() },
          // Thresholds act on wrapped (half-Lambert) NdotL in [0, 1].
          uShadeEdge: { value: 0.42 },
          uShadeSoftness: { value: 0.18 },
          uSpecEdge: { value: 0.98 },
          // Partial blend keeps the glint a subtle sheen, not a mirror ping.
          uSpecStrength: { value: 0.45 },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  // Theme colors arrive as hex-string props; mutate uniforms, never recreate.
  useEffect(() => {
    material.uniforms.uBase!.value.set(color);
    material.uniforms.uShade!.value.set(color).lerp(new THREE.Color(ink), 0.28);
    material.uniforms.uHighlight!.value.set(highlight);
    material.uniforms.uSpecEdge!.value = specEdge;
    // Imperative uniform changes don't schedule a frame under
    // frameloop="demand" (reduced motion / offscreen).
    invalidate();
  }, [material, color, ink, highlight, specEdge, invalidate]);

  return material;
}
