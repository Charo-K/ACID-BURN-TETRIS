import * as THREE from 'https://esm.sh/three@0.170.0';

const area = document.querySelector('.crt-bg-area');
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(area.clientWidth, area.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
area.appendChild(renderer.domElement);

const sigCanvas = document.createElement('canvas');
sigCanvas.width = 1024; sigCanvas.height = 768;
const sCtx = sigCanvas.getContext('2d');
const sigTex = new THREE.CanvasTexture(sigCanvas);
sigTex.minFilter = THREE.LinearFilter;
sigTex.magFilter = THREE.LinearFilter;

function drawColorBars(t) {
  const w = sigCanvas.width, h = sigCanvas.height;
  const colors = ['#c0c0c0','#c0c000','#00c0c0','#00c000','#c000c0','#c00000','#0000c0'];
  const barW = w / 7;
  for (let i = 0; i < 7; i++) {
    sCtx.fillStyle = colors[i];
    sCtx.fillRect(i * barW, 0, barW, h * 0.67);
  }
  const revColors = ['#0000c0','#131313','#c000c0','#131313','#00c0c0','#131313','#c0c0c0'];
  for (let i = 0; i < 7; i++) {
    sCtx.fillStyle = revColors[i];
    sCtx.fillRect(i * barW, h * 0.67, barW, h * 0.08);
  }
  const botW = w / 4;
  sCtx.fillStyle = '#002147'; sCtx.fillRect(0, h * 0.75, botW, h * 0.25);
  sCtx.fillStyle = '#ffffff'; sCtx.fillRect(botW, h * 0.75, botW, h * 0.25);
  sCtx.fillStyle = '#320064'; sCtx.fillRect(botW * 2, h * 0.75, botW, h * 0.25);
  const subW = botW / 5;
  ['#000000','#131313','#262626','#393939','#4d4d4d'].forEach((c, i) => {
    sCtx.fillStyle = c; sCtx.fillRect(botW * 3 + i * subW, h * 0.75, subW, h * 0.25);
  });
  const ow = 220, oh = 120, ox = w - ow - 40, oy = 40;
  sCtx.fillStyle = '#050a05'; sCtx.strokeStyle = '#00ff00'; sCtx.lineWidth = 2;
  sCtx.fillRect(ox, oy, ow, oh); sCtx.strokeRect(ox, oy, ow, oh);
  sCtx.strokeStyle = 'rgba(0,255,0,0.15)'; sCtx.lineWidth = 1;
  for (let gx = ox + 20; gx < ox + ow; gx += 20) { sCtx.beginPath(); sCtx.moveTo(gx, oy); sCtx.lineTo(gx, oy + oh); sCtx.stroke(); }
  for (let gy = oy + 20; gy < oy + oh; gy += 20) { sCtx.beginPath(); sCtx.moveTo(ox, gy); sCtx.lineTo(ox + ow, gy); sCtx.stroke(); }
  sCtx.strokeStyle = '#33ff33'; sCtx.lineWidth = 2; sCtx.beginPath();
  for (let px = 0; px < ow; px++) {
    const wx = ox + px;
    const wy = oy + oh / 2 + Math.sin(px * 0.05 - t * 10) * 30 + Math.cos(px * 0.12 + t * 5) * 10;
    px === 0 ? sCtx.moveTo(wx, wy) : sCtx.lineTo(wx, wy);
  }
  sCtx.stroke();
  sCtx.fillStyle = '#ffffff'; sCtx.font = 'bold 16px monospace'; sCtx.textAlign = 'left';
  const ticker = 'CRASH OVERRIDE / HACK THE PLANET / TAG.TRACK.TRUST / MESS WITH THE BEST OR DIE WITH THE REST';
  const tw = sCtx.measureText(ticker).width;
  sCtx.fillText(ticker, w - (t * 100) % (tw + w), h * 0.71 + 10);
}

const mat = new THREE.ShaderMaterial({
  uniforms: {
    u_tex:    { value: sigTex },
    u_time:   { value: 0 },
    u_uvScale:{ value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D u_tex;
    uniform float u_time;
    uniform vec2 u_uvScale;
    varying vec2 vUv;
    float noise(vec2 uv) { return fract(sin(dot(uv, vec2(12.9898, 78.233))) * 43758.5453); }
    vec2 warp(vec2 uv, float c) {
      vec2 n = uv * 2.0 - 1.0; float d = dot(n, n);
      n *= 1.0 + c * d; return n * 0.5 + 0.5;
    }
    void main() {
      vec2 uv = warp(vUv, 0.04);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.02, 0.04, 0.01, 1.0); return;
      }
      float gv = sin(uv.y * 40.0 + u_time * 8.0) * cos(uv.y * 15.0 - u_time * 8.0);
      if (abs(gv) > 0.96) uv.x += sin(uv.y * 120.0 + u_time * 30.0) * 0.003;
      vec2 d  = uv - 0.5;
      float r = 0.015 * dot(d, d);
      vec2 tc  = (uv           - 0.5) * u_uvScale + 0.5;
      vec2 tcR = (uv - vec2(r,0.0) - 0.5) * u_uvScale + 0.5;
      vec2 tcB = (uv + vec2(r,0.0) - 0.5) * u_uvScale + 0.5;
      vec4 col;
      col.r = texture2D(u_tex, tcR).r;
      col.g = texture2D(u_tex, tc ).g;
      col.b = texture2D(u_tex, tcB).b;
      col.a = 1.0;
      col.rgb += (noise(uv + u_time) * 2.0 - 1.0) * 0.012;
      float sl = sin(uv.y * 400.0 * 6.28318) * 0.5 + 0.5;
      col.rgb *= mix(1.0, 0.65, sl);
      float m = mod(gl_FragCoord.x, 3.0);
      vec3 mask;
      if      (m < 1.0) mask = vec3(1.0, 0.5, 0.5);
      else if (m < 2.0) mask = vec3(0.5, 1.0, 0.5);
      else              mask = vec3(0.5, 0.5, 1.0);
      col.rgb *= mask;
      float flk = 1.0 - (sin(u_time * 100.0) * cos(u_time * 37.0) * 0.5 + 0.5) * 0.08;
      col.rgb *= flk;
      float luma = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = vec3(0.506, 0.957, 0.086) * luma * 1.3;
      float vig = 1.0 - dot(d, d) * 1.2;
      col.rgb *= clamp(vig, 0.0, 1.0);
      col.rgb *= 1.15;
      gl_FragColor = col;
    }
  `,
});

scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));

function updateUVScale() {
  const w = area.clientWidth, h = area.clientHeight;
  const sa = w / h, ta = 1024 / 768;
  mat.uniforms.u_uvScale.value.set(sa > ta ? ta / sa : 1, sa > ta ? 1 : sa / ta);
}
updateUVScale();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  drawColorBars(t);
  sigTex.needsUpdate = true;
  mat.uniforms.u_time.value = t;
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  renderer.setSize(area.clientWidth, area.clientHeight);
  updateUVScale();
});

animate();
