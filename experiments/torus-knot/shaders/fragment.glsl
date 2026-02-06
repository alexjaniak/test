precision highp float;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec2 vUv;

uniform vec2 uResolution;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec3 uRimColor;

// 8x8 Bayer matrix for ordered dithering
const int bayerMatrix[64] = int[64](
   0, 32,  8, 40,  2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44,  4, 36, 14, 46,  6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
   3, 35, 11, 43,  1, 33,  9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47,  7, 39, 13, 45,  5, 37,
  63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 coord) {
  int x = int(mod(coord.x, 8.0));
  int y = int(mod(coord.y, 8.0));
  return float(bayerMatrix[y * 8 + x]) / 64.0;
}

vec3 dither(float value, vec2 screenCoord, vec3 darkColor, vec3 lightColor) {
  float threshold = getBayerValue(screenCoord);
  return value > threshold ? lightColor : darkColor;
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  
  // Simple directional light
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
  float diffuse = max(dot(normal, lightDir), 0.0);
  
  // Rim lighting
  float rim = 1.0 - max(dot(viewDir, normal), 0.0);
  rim = pow(rim, 3.0);
  
  // Ambient occlusion fake
  float ao = 0.5 + 0.5 * normal.y;
  
  // Combine lighting
  float lighting = diffuse * 0.7 + ao * 0.3;
  
  // Get screen coordinates for dithering
  vec2 screenCoord = gl_FragCoord.xy;
  
  // Multi-level dithering for gradient effect
  vec3 color;
  
  if (lighting < 0.33) {
    // Dark to mid transition
    float t = lighting / 0.33;
    color = dither(t, screenCoord, uColor1, uColor2);
  } else if (lighting < 0.66) {
    // Mid to light transition
    float t = (lighting - 0.33) / 0.33;
    color = dither(t, screenCoord, uColor2, uColor3);
  } else {
    // Light areas
    color = uColor3;
  }
  
  // Add dithered rim light
  vec3 rimContribution = dither(rim, screenCoord * 0.5, vec3(0.0), uRimColor);
  color += rimContribution * 0.6;
  
  gl_FragColor = vec4(color, 1.0);
}
