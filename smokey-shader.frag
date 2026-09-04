#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;        // pointer in buffer px, y-up
uniform vec3 u_colors[8];
uniform int u_colorCount;
uniform float u_speed;
uniform float u_scale;
uniform float u_hover;      // pointer push strength; 0 = off
uniform float u_pointer;    // eased pointer presence, 0..1
uniform float u_reach;      // influence radius in UV units (half short side = 1)
uniform float u_glowEdge;   // density where the glow ramp starts

// Warp fields are low-frequency — octaves past the 4th cancel out inside the
// 4.0 * q feedback. Measured: p50 density 0.541 at 4 octaves vs 0.538 at 8,
// for 40% fewer noise samples per pixel.
const int WARP_OCTAVES = 4;
const int DETAIL_OCTAVES = 8;

// Measured 2nd/98th percentile of the density value over the frame. Raw density only
// ever covers ~0.44 of 0..1, so feeding it to the gradient as-is means the
// first and last colour in the array are NEVER reached — the Colors control
// would be lying about its own endpoints.
const float D_LO = 0.33;
const float D_HI = 0.77;

vec3 gradientColor(float t){
    if (u_colorCount <= 1) return u_colors[0];
    float segments = float(u_colorCount - 1);
    float scaled = clamp(t, 0.0, 1.0) * segments;
    float idx = floor(scaled);
    float f = fract(scaled);
    vec3 c0 = u_colors[0];
    vec3 c1 = u_colors[0];
    for (int i = 0; i < 8; i++) {
        if (float(i) == idx) c0 = u_colors[i];
        if (float(i) == idx + 1.0) c1 = u_colors[i];
    }
    return mix(c0, c1, f);
}

float hash(vec2 p){
    p = fract(p * vec2(127.1, 311.7));
    p += dot(p, p + 34.45);
    return fract(p.x * p.y);
}

float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Each octave is rotated by a fixed irrational angle before doubling frequency,
// so the layered noise never lines back up into a repeating lattice — without
// this a noise fbm is self-similar, and zooming (u_scale) just reveals the
// same tile stamped over itself over and over.
const mat2 OCTAVE_ROTATE = mat2(0.6603, -0.7509, 0.7509, 0.6603);

float fbm(vec2 p, int octaves){
    float sum = 0.0;
    float amp = 0.5;
    vec2 pp = p;
    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        sum += amp * noise(pp);
        pp = OCTAVE_ROTATE * pp * 2.0 + vec2(3.1, 1.7);
        amp *= 0.5;
    }
    return sum;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    // UV and the pointer both live in UNSCALED screen space, so Reach is a
    // fixed on-screen radius: scaling the field must not shrink the ripple.
    float shortSide = min(iResolution.x, iResolution.y);
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / shortSide;
    vec2 mouseUV = (2.0 * iMouse - iResolution.xy) / shortSide;

    vec2 toMouse = uv - mouseUV;
    float mouseDist = length(toMouse);
    float reach = max(u_reach, 0.01);
    // Reversed-edge smoothstep(hi, lo, x) is undefined in GLSL — spell the
    // falloff out as 1 - smoothstep(lo, hi, x).
    float falloff = 1.0 - smoothstep(0.0, reach, mouseDist);
    // The normalized direction flips sign across the exact pointer pixel. At
    // full strength right there it welds a hard knot to the cursor that reads
    // as jitter while the pointer moves, so fade the displacement out through
    // the core and let the swirl start just outside it.
    float core = smoothstep(0.0, 0.35 * reach, mouseDist);
    vec2 radial = toMouse / max(mouseDist, 0.0001);
    // Smoke curls around a disturbance instead of fleeing it in a straight
    // line — blend the outward push with a tangential (perpendicular) swirl
    // so the field spins around the cursor like real smoke stirred by an object.
    vec2 tangent = vec2(-radial.y, radial.x);
    vec2 swirl = mix(radial, tangent, 0.7);
    vec2 push = swirl * falloff * core * u_hover * u_pointer * 0.6;

    vec2 p = (uv + push) * u_scale;
    float time = iTime * u_speed;

    // Domain-warp the noise through itself (fbm feeding fbm) so it billows
    // into wisps and drifting tendrils instead of a flat, evenly-lit field.
    vec2 q = vec2(
        fbm(p + time * 0.15, WARP_OCTAVES),
        fbm(p + vec2(5.2, 1.3) - time * 0.1, WARP_OCTAVES)
    );
    vec2 r = vec2(
        fbm(p + 4.0 * q + vec2(1.7, 9.2) + time * 0.12, WARP_OCTAVES),
        fbm(p + 4.0 * q + vec2(8.3, 2.8) - time * 0.09, WARP_OCTAVES)
    );
    float density = fbm(p + 4.0 * r, DETAIL_OCTAVES);
    float normalized = clamp((density - D_LO) / (D_HI - D_LO), 0.0, 1.0);

    float glow = smoothstep(u_glowEdge, 1.0, normalized);
    // Premultiplied alpha, so the Background control is a real backdrop the
    // smoke thins out over instead of a colour the opaque quad paints away.
    fragColor = vec4(gradientColor(normalized) * glow, glow);
}
void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }