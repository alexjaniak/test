varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Fresnel for edge detection
  float fresnel = 1.0 - abs(dot(viewDir, normal));
  
  // Chromatic aberration - split RGB at edges
  // Each color channel refracts slightly differently
  float redChannel = pow(fresnel, 2.8) * 0.9;
  float greenChannel = pow(fresnel, 3.2) * 0.85;
  float blueChannel = pow(fresnel, 3.6) * 1.0;
  
  // Offset the hue based on position for rainbow dispersion
  float dispersionOffset = vWorldPosition.y * 0.15 + vWorldPosition.x * 0.1;
  
  // Create chromatic dispersion effect
  vec3 dispersion;
  dispersion.r = pow(fresnel + dispersionOffset * 0.3, 2.5);
  dispersion.g = pow(fresnel, 3.0);
  dispersion.b = pow(fresnel - dispersionOffset * 0.3, 2.5);
  
  // Subtle interior tint (very dark, slight blue)
  vec3 interiorColor = vec3(0.02, 0.03, 0.06);
  
  // Edge highlight - white/bright at sharp angles
  float edgeHighlight = pow(fresnel, 4.0) * 0.6;
  
  // Combine: dark interior + chromatic edges + white highlights
  vec3 finalColor = interiorColor;
  finalColor += dispersion * 0.5;  // Subtle chromatic dispersion
  finalColor += vec3(edgeHighlight); // White edge highlights
  
  // Keep it subtle
  finalColor = clamp(finalColor, 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
