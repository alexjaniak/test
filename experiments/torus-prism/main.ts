import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import vertexShader from './shaders/vertex.glsl?raw';
import fragmentShader from './shaders/fragment.glsl?raw';

// Film grain shader
const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0.08 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;
    
    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float grain = random(vUv + uTime) * uIntensity;
      color.rgb += grain - uIntensity * 0.5;
      gl_FragColor = color;
    }
  `,
};

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
  private composer: EffectComposer;
  private grainPass: ShaderPass;

  constructor() {
    // Scene with gradient background
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510);

    // Camera - front view showing horizontal part of knot
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 8);

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
    const dpr = Math.min(window.devicePixelRatio, 2);
    const rtOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    };
    this.backRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * dpr,
      window.innerHeight * dpr,
      rtOptions
    );
    this.mainRenderTarget = new THREE.WebGLRenderTarget(
      window.innerWidth * dpr,
      window.innerHeight * dpr,
      rtOptions
    );

    // Background elements (hidden but provide refraction color)
    this.backgroundGroup = this.createBackgroundObjects();
    this.scene.add(this.backgroundGroup);

    // Ambient light
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    this.scene.add(ambient);

    // Create torus knot
    this.material = this.createMaterial();
    this.torusKnot = this.createTorusKnot();
    this.scene.add(this.torusKnot);

    // Post-processing with grain
    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    
    this.grainPass = new ShaderPass(FilmGrainShader);
    this.composer.addPass(this.grainPass);

    // Events
    window.addEventListener('resize', this.onResize.bind(this));
    this.setupExportButton();

    this.animate();
  }

  private createBackgroundObjects(): THREE.Group {
    const group = new THREE.Group();
    
    // Gradient strips positioned behind and around - not directly visible
    // These provide the light/color that gets refracted
    
    // Colored light strips far behind (not visible, but refract nicely)
    const stripGeometry = new THREE.PlaneGeometry(20, 20);
    
    // White/bright plane far behind
    const whiteMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffffff,
      side: THREE.DoubleSide 
    });
    const whitePlane = new THREE.Mesh(stripGeometry, whiteMaterial);
    whitePlane.position.set(0, 0, -15);
    group.add(whitePlane);
    
    // Subtle colored accents at edges (positioned to not be directly visible)
    const colors = [0xff6b6b, 0x4ecdc4, 0xffe66d, 0x95e1d3];
    colors.forEach((color, i) => {
      const mat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), mat);
      const angle = (i / colors.length) * Math.PI * 2;
      plane.position.set(
        Math.cos(angle) * 12,
        Math.sin(angle) * 12,
        -10
      );
      group.add(plane);
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
    this.composer.setSize(window.innerWidth, window.innerHeight);
    
    this.backRenderTarget.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
    this.mainRenderTarget.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
    
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
    const link = document.createElement('a');
    link.download = `torus-prism-${Date.now()}.png`;
    link.href = this.renderer.domElement.toDataURL('image/png');
    link.click();
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();

    // Update grain time
    this.grainPass.uniforms.uTime.value = performance.now() * 0.001;

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

    // Set texture and render front side
    this.material.uniforms.uTexture.value = this.mainRenderTarget.texture;
    this.material.side = THREE.FrontSide;

    this.renderer.setRenderTarget(null);
    
    // Render through composer for grain effect
    this.composer.render();
  }
}

new TorusPrismExperiment();
