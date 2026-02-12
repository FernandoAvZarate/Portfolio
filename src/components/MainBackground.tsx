import { useRef, useEffect } from "react";
import * as THREE from "three";

export default function CinematicParticleBackground() {
  // Referencia al div donde se montará el canvas de Three.js
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Salir si el div aún no existe
    if (!mountRef.current) return;

    // Contenedor y tamaño inicial
    const container = mountRef.current;
    const width = container.offsetWidth || window.innerWidth;
    const height = container.offsetHeight || window.innerHeight;

    // Crear la escena y cámara ortográfica
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Configuración del renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true, // fondo transparente
      antialias: false, // sin suavizado para mejorar rendimiento
      powerPreference: "high-performance", // prioriza GPU
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // ---- GEOMETRÍA DE PARTÍCULAS (DINÁMICO SEGÚN DISPOSITIVO) ----
    let count = 400000; // Default Desktop
    if (window.innerWidth <= 768) {
      count = 200000; // Mobile
    } else if (window.innerWidth <= 1024) {
      count = 300000; // Tablet
    }

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3); // X, Y, Z
    const uvs = new Float32Array(count * 2); // coordenadas UV

    // Inicializar posiciones y UVs aleatorias
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.random() * 2.2 - 1.1; // X [-1.1, 1.1]
      positions[i * 3 + 1] = Math.random() * 2.2 - 1.1; // Y [-1.1, 1.1]
      positions[i * 3 + 2] = 0; // Z = 0 (fondo 2D)
      uvs[i * 2] = (positions[i * 3] + 1.1) / 2.2; // normalizar UV X
      uvs[i * 2 + 1] = (positions[i * 3 + 1] + 1.1) / 2.2; // normalizar UV Y
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));

    // ---- SHADERS ----
    const vertexShader = `
      precision highp float;
      varying vec2 vUv;         // pasa UV al fragment shader
      varying float vBrightness; // brillo de la partícula
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uResolution;

      uniform vec2 uClickPos[5];
      uniform float uClickTime[5];

      uniform vec2 uAutoPos[5];
      uniform float uAutoTime[5];

      // Funciones para ruido Simplex
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ; m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Ajuste de aspecto según resolución
        float ratio = uResolution.x / uResolution.y;
        vec2 aspectUv = (uv - 0.5) * vec2(ratio, 1.0);

        // Ruido para movimiento suave
        float n = snoise(aspectUv * 0.7 + uTime * 0.04);
        float n2 = snoise(aspectUv * 1.5 - uTime * 0.02);
        pos.x += n * 0.08;
        pos.y += n2 * 0.08;

        // Interacción con el mouse
        vec2 aspectMouse = (uMouse - 0.5) * vec2(ratio, 1.0);
        float distMouse = distance(aspectUv, aspectMouse);
        float mouseInertia = smoothstep(0.35, 0.0, distMouse);
        pos.xy += normalize(aspectUv - aspectMouse + 0.001) * mouseInertia * 0.04;

        vBrightness = 0.0;

        // Efecto de clics recientes
        for(int i = 0; i < 5; i++) {
          float tClick = max(uTime - uClickTime[i], 0.0);
          float fadeClick = smoothstep(4.0, 3.0, tClick);
          vec2 aClick = (uClickPos[i] - 0.5) * vec2(ratio, 1.0);
          float dClick = distance(aspectUv, aClick);
          float impactClick = exp(-pow((dClick - tClick * 0.8) / 0.25, 2.0));
          float attenClick = exp(-tClick * 0.7) * fadeClick;
          vBrightness += impactClick * attenClick;
          pos.xy += normalize(aspectUv - aClick + 0.0001) * impactClick * attenClick * 0.07;
        }

        // Efecto de ondas automáticas
        for(int i = 0; i < 5; i++) {
          float tAuto = max(uTime - uAutoTime[i], 0.0);
          float fadeAuto = smoothstep(5.0, 4.0, tAuto);
          vec2 aAuto = (uAutoPos[i] - 0.5) * vec2(ratio, 1.0);
          float dAuto = distance(aspectUv, aAuto);
          float impactAuto = exp(-pow((dAuto - tAuto * 0.7) / 0.35, 2.0));
          float attenAuto = exp(-tAuto * 0.5) * fadeAuto;
          vBrightness += impactAuto * attenAuto;
          pos.xy += normalize(aspectUv - aAuto + 0.0001) * impactAuto * attenAuto * 0.06;
        }

        // Posición final de la partícula
        gl_Position = vec4(pos, 1.0);

        // Tamaño con un poco de ruido y brillo
        float sizeNoise = fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453);
        gl_PointSize = (0.5 + sizeNoise * 1.5 + (vBrightness * 0.3)) * (uResolution.y / 900.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      varying float vBrightness;

      void main() {
        // Dibuja cada partícula como un círculo
        float r = distance(gl_PointCoord, vec2(0.5));
        if (r > 0.5) discard;

        // Ajuste de opacidad según distancia al centro y brillo
        float alpha = (1.0 - smoothstep(0.0, 0.5, r)) * (0.15 + vBrightness * 0.15);

        // Color grisáceo con un toque de brillo
        vec3 color = vec3(0.7) + (vBrightness * 0.1);
        gl_FragColor = vec4(color, alpha);
      }
    `;

    // ---- UNIFORMS ----
    const uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uClickPos: { value: Array.from({ length: 5 }, () => new THREE.Vector2(-10, -10)) },
      uClickTime: { value: new Float32Array(5).fill(-10.0) },
      uAutoPos: { value: Array.from({ length: 5 }, () => new THREE.Vector2(-10, -10)) },
      uAutoTime: { value: new Float32Array(5).fill(-10.0) },
    };

    // ---- MATERIAL Y PUNTOS ----
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending, // brillo acumulativo
      depthWrite: false, // no escribe profundidad
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // ---- ANIMACIÓN ----
    let animationFrameId: number;
    const targetMousePos = new THREE.Vector2(0.5, 0.5);
    let clickIdx = 0;
    let autoIdx = 0;

    const animate = (time: number) => {
      uniforms.uTime.value = time * 0.001;
      uniforms.uMouse.value.lerp(targetMousePos, 0.05); // suaviza movimiento del mouse
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate(0);

    // ---- ONDAS AUTOMÁTICAS ----
    const triggerAutoWave = () => {
      const side = Math.floor(Math.random() * 4);
      let x = 0.5,
        y = 0.5;
      if (side === 0) {
        x = -0.2;
        y = Math.random();
      } else if (side === 1) {
        x = 1.2;
        y = Math.random();
      } else if (side === 2) {
        x = Math.random();
        y = 1.2;
      } else {
        x = Math.random();
        y = -0.2;
      }

      uniforms.uAutoPos.value[autoIdx].set(x, y);
      uniforms.uAutoTime.value[autoIdx] = uniforms.uTime.value;
      autoIdx = (autoIdx + 1) % 5;
    };

    const autoWaveInterval = setInterval(triggerAutoWave, 8000);

    // ---- EVENTOS DEL USUARIO ----
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetMousePos.set((e.clientX - rect.left) / rect.width, 1.0 - (e.clientY - rect.top) / rect.height);
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;

      uniforms.uClickPos.value[clickIdx].set(x, y);
      uniforms.uClickTime.value[clickIdx] = uniforms.uTime.value;
      clickIdx = (clickIdx + 1) % 5;
    };

    const handleResize = () => {
      const w = container.offsetWidth;
      const h = container.offsetHeight;
      renderer.setSize(w, h);
      uniforms.uResolution.value.set(w, h);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleClick);

    // ---- CLEANUP ----
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleClick);
      clearInterval(autoWaveInterval);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  // Div que contiene el canvas, full screen y sin interferir con UI
  return (
    <div
      ref={mountRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        backgroundColor: "transparent",
        opacity: "1",
        borderRadius: "8px",
      }}
    />
  );
}
