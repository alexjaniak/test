import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

class TorusPrismExperiment {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private torusKnot: THREE.Mesh;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    
    // Gradient background
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0d1117');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const bgTexture = new THREE.CanvasTexture(canvas);
    this.scene.background = bgTexture;

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 6);

    // Renderer with tone mapping for HDR
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

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

    // Lighting
    this.setupLighting();

    // Create torus knot with glass material
    this.torusKnot = this.createTorusKnot();
    this.scene.add(this.torusKnot);

    // Post-processing
    this.composer = this.createPostProcessing();

    // Events
    window.addEventListener('resize', this.onResize.bind(this));
    this.setupExportButton();

    this.animate();
  }

  private setupLighting(): void {
    // Ambient
    const ambient = new THREE.AmbientLight(0x404050, 0.5);
    this.scene.add(ambient);

    // Key light - warm
    const keyLight = new THREE.DirectionalLight(0xffffff, 2);
    keyLight.position.set(5, 5, 5);
    this.scene.add(keyLight);

    // Fill light - cool
    const fillLight = new THREE.DirectionalLight(0x8888ff, 1);
    fillLight.position.set(-5, 0, -5);
    this.scene.add(fillLight);

    // Rim light - for edge definition
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    rimLight.position.set(0, -5, -3);
    this.scene.add(rimLight);

    // Point lights for rainbow caustics effect
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff];
    colors.forEach((color, i) => {
      const light = new THREE.PointLight(color, 0.3, 10);
      const angle = (i / colors.length) * Math.PI * 2;
      light.position.set(Math.cos(angle) * 4, Math.sin(angle) * 2, Math.sin(angle) * 4);
      this.scene.add(light);
    });
  }

  private createTorusKnot(): THREE.Mesh {
    const geometry = new THREE.TorusKnotGeometry(
      1.2,   // radius
      0.4,   // tube
      200,   // tubularSegments
      32,    // radialSegments
      2,     // p
      3      // q
    );

    // Physical glass material with transmission
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.0,
      transmission: 0.95,      // Glass transparency
      thickness: 1.5,          // Refraction depth
      ior: 2.4,                // Index of refraction (diamond-like for more dispersion)
      iridescence: 0.3,        // Rainbow iridescence
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 800],
      specularIntensity: 1,
      specularColor: 0xffffff,
      envMapIntensity: 1,
      clearcoat: 0.1,
      clearcoatRoughness: 0.1,
      transparent: true,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geometry, material);
  }

  private createPostProcessing(): EffectComposer {
    const composer = new EffectComposer(this.renderer);
    
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    // Very subtle bloom
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.2,   // strength
      0.3,   // radius
      0.8    // threshold
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

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.composer.render();

    const link = document.createElement('a');
    link.download = `torus-prism-${Date.now()}.png`;
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.click();

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
