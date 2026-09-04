/**
 * Belgium420 — Smokey Shader (vanilla WebGL)
 * Full-bleed domain-warped fbm smoke, Belgian palette, sits as a fixed
 * background layer behind all site content (z-index 0, above body bg).
 * Compiled GLSL is the Originkit "Smokey Shader" fragment; host is hand-written.
 * Honors prefers-reduced-motion (renders a single static frame, no rAF loop).
 */
(() => {
  'use strict';

  const host = document.getElementById('smokeBg');
  if (!host) return;

  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  host.appendChild(canvas);

  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
  if (!gl) { host.style.display = 'none'; return; }

  // --- Belgian palette (dark->light): black, deep red, red, gold, yellow, chalk-white
  const COLORS = [
    [0.020, 0.020, 0.020],  // #050505 belgian black
    [0.141, 0.039, 0.043],  // #241012 deep oxblood
    [0.890, 0.110, 0.137],  // #E31C23 belgian red
    [0.961, 0.769, 0.000],  // #F5C400 belgian yellow
    [1.000, 0.918, 0.320],  // #FFEA52 hot lemon
    [0.961, 0.945, 0.910],  // #F5F1E8 chalk white
  ];

  const VERT = `
    attribute vec4 a_position;
    void main() { gl_Position = a_position; }
  `;

  const FRAG = document.getElementById('smokeFrag').textContent;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('smoke shader:', gl.getShaderInfoLog(s));
      host.style.display = 'none';
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;

  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('smoke link:', gl.getProgramInfoLog(prog));
    host.style.display = 'none';
    return;
  }
  gl.useProgram(prog);

  // Fullscreen triangle
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a_position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {
    iResolution: gl.getUniformLocation(prog, 'iResolution'),
    iTime: gl.getUniformLocation(prog, 'iTime'),
    iMouse: gl.getUniformLocation(prog, 'iMouse'),
    u_colors: gl.getUniformLocation(prog, 'u_colors[0]'),
    u_colorCount: gl.getUniformLocation(prog, 'u_colorCount'),
    u_speed: gl.getUniformLocation(prog, 'u_speed'),
    u_scale: gl.getUniformLocation(prog, 'u_scale'),
    u_hover: gl.getUniformLocation(prog, 'u_hover'),
    u_pointer: gl.getUniformLocation(prog, 'u_pointer'),
    u_reach: gl.getUniformLocation(prog, 'u_reach'),
    u_glowEdge: gl.getUniformLocation(prog, 'u_glowEdge'),
  };

  gl.uniform3fv(U.u_colors, COLORS.flat());
  gl.uniform1i(U.u_colorCount, COLORS.length);
  gl.uniform1f(U.u_speed, 0.10);
  gl.uniform1f(U.u_scale, 2.2);
  gl.uniform1f(U.u_hover, 0.9);
  gl.uniform1f(U.u_pointer, 1.0);
  gl.uniform1f(U.u_reach, 0.6);
  gl.uniform1f(U.u_glowEdge, 0.15);

  const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX;
    mouse.ty = e.clientY;
  }, { passive: true });

  let W = 0, H = 0, DPR = 1;
  function resize() {
    // Allow higher DPR on mobile/tablet for crisp smoke on retina screens
    const maxDpr = window.matchMedia('(hover: none)').matches ? 2.5 : 1.5;
    DPR = Math.min(window.devicePixelRatio || 1, maxDpr);
    W = Math.max(2, Math.floor(window.innerWidth * DPR));
    H = Math.max(2, Math.floor(window.innerHeight * DPR));
    canvas.width = W;
    canvas.height = H;
    gl.viewport(0, 0, W, H);
    gl.uniform2f(U.iResolution, W, H);
  }
  resize();
  window.addEventListener('resize', resize);

  // Throttle on mobile/tablet to save battery: reduce shader octaves' visible
  // speed by slowing u_speed, and halve the rAF cadence when battery API says low.
  const isTouch = window.matchMedia('(hover: none)').matches;
  let speedScale = isTouch ? 0.5 : 1.0;          // gentler drifting on touch devices
  gl.uniform1f(U.u_speed, isTouch ? 0.06 : 0.10);

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now();
  let raf = 0;

  function frame(now) {
    const t = (now - start) / 1000;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    gl.uniform1f(U.iTime, t);
    gl.uniform2f(U.iMouse, mouse.x * DPR, H - mouse.y * DPR);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  }

  if (reduce) {
    gl.uniform1f(U.iTime, 12.0); // a pleasant static moment
    gl.uniform2f(U.iMouse, W * 0.5, H * 0.5);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  } else {
    raf = requestAnimationFrame(frame);
  }

  // Pause when tab hidden (saves GPU)
  document.addEventListener('visibilitychange', () => {
    if (reduce) return;
    if (document.hidden) { cancelAnimationFrame(raf); }
    else { raf = requestAnimationFrame(frame); }
  });
})();
