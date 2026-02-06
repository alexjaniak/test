import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Import shaders as raw strings
import vertexShader from './shaders/vertex.glsl?raw';
import fragmentShader from './shaders/fragment.glsl?raw';

// Minimal color palette
const PALETTE = {
  background: new THREE.Color(0x0a0a0a),
  primary: new THREE.Color(0xf5f5f0),     // Off-white for halftone dots
  rim: new THREE.Color(0x4a7cff),          // Subtle blue accent
};

class TrefoilHalftoneExperiment {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private trefoilKnot: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    // Scene setup
    this.scene = new THREE.Scene();

    // Camera - positioned to show trefoil shape well
    this.camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Angle that shows the 3-lobe trefoil nicely
    this.camera.position.set(2.5, 2, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // Disable AA for crisp halftone dots
      preserveDrawingBuffer: true, // Needed for export
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1); // Keep at 1 for clean dots
    this.renderer.setClearColor(PALETTE.background);

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
    this.controls.autoRotate = false;
    this.controls.target.set(0, 0, 0);

    // Create trefoil knot
    this.material = this.createMaterial();
    this.trefoilKnot = this.createTrefoilKnot();
    this.scene.add(this.trefoilKnot);

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
        uPrimaryColor: { value: PALETTE.primary },
        uBackgroundColor: { value: PALETTE.background },
        uRimColor: { value: PALETTE.rim },
        uDotDensity: { value: 6.0 },      // Pixels per dot cell
        uMaxDotSize: { value: 0.45 },     // Max radius relative to cell (0-0.5)
      },
    });
  }

  private createTrefoilKnot(): THREE.Mesh {
    // TorusKnotGeometry(radius, tube, tubularSegments, radialSegments, p, q)
    // p=3, q=2 creates a trefoil knot (3 lobes, wraps around twice)
    const geometry = new THREE.TorusKnotGeometry(
      1.0,    // radius - overall size
      0.35,   // tube radius
      200,    // tubular segments (smoothness along knot)
      32,     // radial segments (tube roundness)
      3,      // p - winds around axis of symmetry
      2       // q - winds around interior
    );
    return new THREE.Mesh(geometry, this.material);
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

    // Store original values
    const originalWidth = this.renderer.domElement.width;
    const originalHeight = this.renderer.domElement.height;
    const originalDotDensity = this.material.uniforms.uDotDensity.value;

    // Resize for high-res render
    this.renderer.setSize(width, height);
    this.material.uniforms.uResolution.value.set(width, height);
    // Scale dot density to maintain visual appearance at higher res
    this.material.uniforms.uDotDensity.value = originalDotDensity * scale;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // Render
    this.renderer.render(this.scene, this.camera);

    // Export
    const link = document.createElement('a');
    link.download = `trefoil-halftone-${Date.now()}.png`;
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.click();

    // Restore original size
    this.renderer.setSize(originalWidth / scale, originalHeight / scale);
    this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    this.material.uniforms.uDotDensity.value = originalDotDensity;
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
new TrefoilHalftoneExperiment();
