precision highp float;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;
varying vec2 vUv;

uniform vec2 uResolution;
uniform vec3 uPrimaryColor;
uniform vec3 uBackgroundColor;
uniform vec3 uRimColor;
uniform float uDotDensity;
uniform float uMaxDotSize;

// Halftone pattern
float halftone(vec2 screenCoord, float intensity) {
  // Create grid coordinates
  vec2 grid = screenCoord / uDotDensity;
  vec2 gridCell = floor(grid);
  vec2 gridPos = fract(grid);
  
  // Distance from center of cell
  float dist = length(gridPos - 0.5);
  
  // Dot size based on darkness (inverted intensity)
  // Dark areas = big dots, bright areas = small/no dots
  float darkness = 1.0 - intensity;
  float dotSize = darkness * uMaxDotSize;
  
  // Smooth edge for anti-aliasing
  float edge = fwidth(dist) * 1.5;
  return 1.0 - smoothstep(dotSize - edge, dotSize + edge, dist);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Directional light from upper-right-front
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.6));
  float diffuse = max(dot(normal, lightDir), 0.0);
  
  // Secondary fill light from opposite side
  vec3 fillLightDir = normalize(vec3(-0.3, 0.2, 0.5));
  float fill = max(dot(normal, fillLightDir), 0.0) * 0.3;
  
  // Ambient
  float ambient = 0.15;
  
  // Combine lighting
  float lighting = diffuse * 0.7 + fill + ambient;
  lighting = clamp(lighting, 0.0, 1.0);
  
  // Fresnel/rim effect
  float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
  fresnel = pow(fresnel, 3.0);
  
  // Get screen coordinates for halftone
  vec2 screenCoord = gl_FragCoord.xy;
  
  // Main halftone pattern
  float dots = halftone(screenCoord, lighting);
  
  // Base color from halftone
  vec3 color = mix(uBackgroundColor, uPrimaryColor, dots);
  
  // Rim glow - subtle tinted edge
  // Only apply rim where there's some dot coverage for cleaner look
  float rimIntensity = fresnel * 0.5;
  vec3 rimContribution = uRimColor * rimIntensity;
  
  // Add rim as additive glow
  color += rimContribution * (0.3 + dots * 0.4);
  
  gl_FragColor = vec4(color, 1.0);
}
