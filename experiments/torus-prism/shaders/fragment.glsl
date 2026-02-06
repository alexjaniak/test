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
  
  // Fresnel effect - glass-like edge glow
  float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 3.0);
  
  // Rainbow hue shifts based on view angle (like light through glass)
  float hue = fract(fresnel * 0.8 + vWorldPosition.y * 0.15);
  vec3 rainbow = hsv2rgb(vec3(hue, 0.9, 1.0));
  
  // Glass effect: mostly transparent/black, rainbow only at edges
  float edgeIntensity = smoothstep(0.0, 0.6, fresnel);
  vec3 glowColor = rainbow * edgeIntensity * 1.5;
  
  // Subtle inner glow for depth
  float innerGlow = pow(fresnel, 1.5) * 0.15;
  vec3 innerColor = rainbow * innerGlow;
  
  // Pure black base + edge glow only
  vec3 finalColor = glowColor + innerColor;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
