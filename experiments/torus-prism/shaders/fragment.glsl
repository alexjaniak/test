varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

// Convert HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Fresnel effect - stronger at edges
  float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.5);
  
  // Base lighting (soft)
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diffuse = max(dot(normal, lightDir), 0.0) * 0.5 + 0.5; // Soft wrap lighting
  
  // Rainbow gradient based on position + normal
  float hue = fract(vWorldPosition.y * 0.3 + vWorldPosition.x * 0.2 + fresnel * 0.4);
  vec3 rainbow = hsv2rgb(vec3(hue, 0.7, 1.0));
  
  // Mix rainbow with fresnel glow
  vec3 baseColor = vec3(0.08, 0.08, 0.12); // Dark base
  vec3 glowColor = rainbow * fresnel * 1.2;
  vec3 surfaceColor = rainbow * diffuse * 0.3;
  
  vec3 finalColor = baseColor + surfaceColor + glowColor;
  
  // Keep it from being too bright
  finalColor = clamp(finalColor, 0.0, 1.0);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
