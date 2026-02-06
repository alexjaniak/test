import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Import shaders as raw strings
import vertexShader from './shaders/vertex.glsl?raw';
import fragmentShader from './shaders/fragment.glsl?raw';

// Color palette - retro graphic poster vibe
const PALETTE = {
  bg1: new THREE.Color(0x0a0a0f),
  bg2: new THREE.Color(0x1a1a2e),
  color1: new THREE.Color(0x0a0a0f),  // Darkest
  color2: new THREE.Color(0x4a4a6a),  // Mid
  color3: new THREE.Color(0xe8e8e8),  // Light
  rim: new THREE.Color(0x6366f1),     // Accent purple
};

class TorusKnotExperiment {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private torusKnot: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Disable AA for crisp dithering
      preserveDrawingBuffer: true, // Needed for export
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1); // Keep at 1 for clean pixel dithering
    this.renderer.setClearColor(PALETTE.bg1);

    const container = document.getElementById('canvas-container');
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enableZoom = true;
    this.controls.enablePan = false;

    // Create torus knot
    this.material = this.createMaterial();
    this.torusKnot = this.createTorusKnot();
    this.scene.add(this.torusKnot);

    // Add background gradient plane
    this.addBackground();

    // Event listeners
    window.addEventListener('resize', this.onResize.bind(this));
    this.setupExportButton();

    // Start animation
    this.animate();
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uColor1: { value: PALETTE.color1 },
        uColor2: { value: PALETTE.color2 },
        uColor3: { value: PALETTE.color3 },
        uRimColor: { value: PALETTE.rim },
      },
    });
  }

  private createTorusKnot(): THREE.Mesh {
    const geometry = new THREE.TorusKnotGeometry(1.2, 0.4, 200, 32, 2, 3);
    return new THREE.Mesh(geometry, this.material);
  }

  private addBackground(): void {
    // Subtle radial gradient background
    const bgGeometry = new THREE.PlaneGeometry(50, 50);
    const bgMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          float gradient = smoothstep(0.0, 0.7, dist);
          vec3 color = mix(uColor2, uColor1, gradient);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      uniforms: {
        uColor1: { value: PALETTE.bg1 },
        uColor2: { value: PALETTE.bg2 },
      },
      depthWrite: false,
    });

    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -10;
    this.scene.add(bgMesh);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  }

  private setupExportButton(): void {
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportHighRes());
    }
  }

  private exportHighRes(): void {
    const scale = 4; // 4x resolution
    const width = window.innerWidth * scale;
    const height = window.innerHeight * scale;

    // Store original size
    const originalWidth = this.renderer.domElement.width;
    const originalHeight = this.renderer.domElement.height;

    // Resize for high-res render
    this.renderer.setSize(width, height);
    this.material.uniforms.uResolution.value.set(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Render
    this.renderer.render(this.scene, this.camera);

    // Export
    const link = document.createElement('a');
    link.download = `torus-knot-${Date.now()}.png`;
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.click();

    // Restore original size
    this.renderer.setSize(originalWidth / scale, originalHeight / scale);
    this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize
new TorusKnotExperiment();
