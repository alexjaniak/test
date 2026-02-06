import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import vertexShader from './shaders/vertex.glsl?raw';
import fragmentShader from './shaders/fragment.glsl?raw';

class TorusPrismExperiment {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private torusKnot: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Start head-on
    this.camera.position.set(0, 0, 6);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000); // Pure black

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

    // Create torus knot (original geometry, not trefoil)
    this.material = this.createMaterial();
    this.torusKnot = this.createTorusKnot();
    this.scene.add(this.torusKnot);

    // Post-processing with subtle bloom
    this.composer = this.createPostProcessing();

    // Events
    window.addEventListener('resize', this.onResize.bind(this));
    this.setupExportButton();

    this.animate();
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
    });
  }

  private createTorusKnot(): THREE.Mesh {
    // Original torus knot - p=2, q=3 gives the classic multi-ring look
    const geometry = new THREE.TorusKnotGeometry(
      1.2,   // radius
      0.4,   // tube
      200,   // tubularSegments
      32,    // radialSegments
      2,     // p - more rings
      3      // q
    );
    return new THREE.Mesh(geometry, this.material);
  }

  private createPostProcessing(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    // Bloom for glass glow effect
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,   // strength
      0.8,   // radius (wider glow)
      0.3    // threshold (catch more of the glow)
    );
    composer.addPass(bloomPass);

    return composer;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
  }

  private setupExportButton(): void {
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportHighRes());
    }
  }

  private exportHighRes(): void {
    const scale = 4;
    const width = window.innerWidth * scale;
    const height = window.innerHeight * scale;

    // Resize
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Render
    this.composer.render();

    // Export
    const link = document.createElement('a');
    link.download = `torus-prism-${Date.now()}.png`;
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.click();

    // Restore
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.composer.render();
  }
}

new TorusPrismExperiment();
