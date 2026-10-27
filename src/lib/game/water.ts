import * as THREE from "three";

export function createWater(): { mesh: THREE.Mesh; update: (time: number) => void } {
  const geometry = new THREE.PlaneGeometry(500, 500, 80, 80);
  geometry.rotateX(-Math.PI / 2);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(0x0d4f7a) },
      uShallow: { value: new THREE.Color(0x2f9ec4) },
      uFoam: { value: new THREE.Color(0xeaf6fb) },
    },
    vertexShader: `
      uniform float uTime;
      varying float vHeight;
      varying float vDist;
      void main() {
        vec3 pos = position;
        float wave = sin(pos.x * 0.12 + uTime * 1.4) * 0.22
                   + sin(pos.z * 0.09 + uTime * 1.1) * 0.18
                   + sin((pos.x + pos.z) * 0.2 + uTime * 2.2) * 0.08;
        pos.y += wave;
        vHeight = wave;
        vDist = length(pos.xz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uFoam;
      varying float vHeight;
      varying float vDist;
      void main() {
        float shore = smoothstep(52.0, 40.0, vDist);
        vec3 color = mix(uDeep, uShallow, shore);
        float crest = smoothstep(0.28, 0.42, vHeight);
        color = mix(color, uFoam, crest * 0.65 + shore * 0.25);
        gl_FragColor = vec4(color, 0.88);
      }
    `,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = -0.35;
  return {
    mesh,
    update: (time: number) => {
      material.uniforms.uTime.value = time;
    },
  };
}