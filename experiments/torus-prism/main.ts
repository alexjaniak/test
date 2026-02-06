import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import vertexShader from './shaders/vertex.glsl?raw';
import fragmentShader from './shaders/fragment.glsl?raw';

class TorusPrismExperiment {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private torusKnot: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private backRenderTarget: THREE.WebGLRenderTarget;
  private mainRenderTarget: THREE.WebGLRenderTarget;
  private backgroundGroup: THREE.Group;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(4, -2, 7);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

    // Render targets for refraction
    const rtOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    };
    this.backRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      rtOptions
    );
    this.mainRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * Math.min(window.devicePixelRatio, 2),
      window.innerHeight * Math.min(window.devicePixelRatio, 2),
      rtOptions
    );

    // Background objects for refraction effect
    this.backgroundGroup = this.createBackgroundObjects();
    this.scene.add(this.backgroundGroup);

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambient);

    // Create torus knot
    this.material = this.createMaterial();
    this.torusKnot = this.createTorusKnot();
    this.scene.add(this.torusKnot);

    // Events
    window.addEventListener('resize', this.onResize.bind(this));
    this.setupExportButton();

    this.animate();
  }

  private createBackgroundObjects(): THREE.Group {
    const group = new THREE.Group();
    
    // White spheres behind the torus for refraction
    const positions = [
      [-4, -3, -4],
      [4, -3, -4],
      [-5, 3, -4],
      [5, 3, -4],
    ];

    positions.forEach(pos => {
      const geometry = new THREE.IcosahedronGeometry(2, 16);
      const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos[0], pos[1], pos[2]);
      group.add(mesh);
    });

    return group;
  }

  private createMaterial(): THREE.ShaderMaterial {
    const dpr = Math.min(window.devicePixelRatio, 2);
    
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTexture: { value: null },
        uIorR: { value: 1.15 },
        uIorY: { value: 1.16 },
        uIorG: { value: 1.18 },
        uIorC: { value: 1.22 },
        uIorB: { value: 1.22 },
        uIorP: { value: 1.22 },
        uRefractPower: { value: 0.25 },
        uChromaticAberration: { value: 0.5 },
        uSaturation: { value: 1.14 },
        uShininess: { value: 15.0 },
        uDiffuseness: { value: 0.2 },
        uFresnelPower: { value: 8.0 },
        uLight: { value: new THREE.Vector3(-1.0, 1.0, 1.0) },
        winResolution: { 
          value: new THREE.Vector2(
            window.innerWidth * dpr,
            window.innerHeight * dpr
          )
        },
      },
    });
  }

  private createTorusKnot(): THREE.Mesh {
    // Knotted torus - the good one
    const geometry = new THREE.TorusKnotGeometry(
      2,     // radius
      0.6,   // tube
      200,   // tubularSegments
      32,    // radialSegments
      2,     // p
      3      // q
    );
    return new THREE.Mesh(geometry, this.material);
  }

  private onResize(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Resize render targets
    this.backRenderTarget.setSize(
      window.innerWidth * dpr,
      window.innerHeight * dpr
    );
    this.mainRenderTarget.setSize(
      window.innerWidth * dpr,
      window.innerHeight * dpr
    );
    
    this.material.uniforms.winResolution.value.set(
      window.innerWidth * dpr,
      window.innerHeight * dpr
    );
  }

  private setupExportButton(): void {
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportHighRes());
    }
  }

  private exportHighRes(): void {
    // For export, just render current frame
    const link = document.createElement('a');
    link.download = `torus-prism-${Date.now()}.png`;
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.click();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();

    // Hide torus, render background to backRenderTarget
    this.torusKnot.visible = false;
    this.renderer.setRenderTarget(this.backRenderTarget);
    this.renderer.render(this.scene, this.camera);

    // Set texture and render back side
    this.material.uniforms.uTexture.value = this.backRenderTarget.texture;
    this.material.side = THREE.BackSide;
    this.torusKnot.visible = true;

    this.renderer.setRenderTarget(this.mainRenderTarget);
    this.renderer.render(this.scene, this.camera);

    // Set texture and render front side to screen
    this.material.uniforms.uTexture.value = this.mainRenderTarget.texture;
    this.material.side = THREE.FrontSide;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
  }
}

new TorusPrismExperiment();
