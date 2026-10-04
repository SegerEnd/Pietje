// Pietje: a Minecraft skin of a Piet (Sinterklaas), in the colors you pick, shown on a 3D model
// drawn with WebGL. The skin is made from two images:
// - skin.png: the hand-made Pietje (the skin of Seger_Craft in Minecraft), as the color layers made
//   from it changed it on purpose: no dog's nose, the white details white instead of gray
// - parts.png: per pixel its part (red: 1 maillot … 7 shoes, 8 a detail that keeps its color from
//   skin.png, as the buckle), its shade level (green: 0 darkest to 3 lightest) and that level's
//   lightness in the original (blue: OKLab L × 255). The levels group the original's pixels by
//   lightness (the few pixels whose four neighbors all share one other level take it), and the
//   back of the suit has the front's pattern (it had plain stripes), and the hair has kroeshaar:
//   small curls staggered like bricks, darkest at the hairline (it was flat bands). A pixel
//   without a part isn't used (the dog's tongue).
// Recoloring gives each level one color, from a ramp built on the picked color, as pixel artists
// make recolorable sprites: clean in every color, without the specks a pixel-by-pixel shift gave.

const $ = (id) => document.getElementById(id);
const form = $("wardrobe"), viewer = $("viewer"), model = $("model"), soot = $("roetveeg"), lipstick = $("lippenstift"), slim = $("slank");
const colors = [...form.querySelectorAll("input[type=color]")];

// ---- the skin ------------------------------------------------------------------

const PARTS_BY_ID = [, "color_maillot", "color_skin", "color_hair", "color_eyes", "color_primary", "color_secondary", "color_shoes"];
const version = new URL(import.meta.url).search;  // the site's ?v=…, so a changed image isn't taken from a cache
const load = (src) => new Promise((done, fail) => Object.assign(new Image(), { onload() { done(this); }, onerror: fail, src: src + version }));
const canvas = (size = 64) => Object.assign(document.createElement("canvas"), { width: size, height: size });
const pixels = (image) => { const c = canvas().getContext("2d"); c.drawImage(image, 0, 0); return c.getImageData(0, 0, 64, 64).data; };
const [original, parts] = (await Promise.all([load("skin.png"), load("parts.png")])).map(pixels);

// Colors in OKLCH: lightness (0 to 1), chroma (colorfulness, 0 to about 0.37) and hue (0 to 360),
// after Björn Ottosson's OKLab, as in CSS. Unlike HSL, the same step in lightness or chroma looks
// the same in every color, so the original's shading carries over evenly instead of in specks.
const linear = (c) => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
const gamma = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function oklch(r, g, b) {
  [r, g, b] = [r, g, b].map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [L, Math.hypot(A, B), (Math.atan2(B, A) * 180 / Math.PI + 360) % 360];
}
// back to sRGB; a color a screen can't show loses chroma until it can (rather than clipping, which
// would make glaring dots)
function rgb(L, C, H) {
  for (let tries = 0; ; tries++, C *= 0.94) {
    const A = C * Math.cos(H * Math.PI / 180), B = C * Math.sin(H * Math.PI / 180);
    const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3;
    const out = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
    if (out.every((c) => c >= -0.001 && c <= 1.001) || tries > 40) return out.map((c) => Math.round(Math.max(0, Math.min(255, gamma(Math.max(0, c))))));
  }
}
const hex = (r, g, b) => "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");

// Each part's base color: the middle of its pixels in the original (the hue as an angle, weighed by
// chroma, so grays don't pull it). It's the default, and a picked color takes its place.
const base = {};
for (const [id, name] of PARTS_BY_ID.entries()) {
  if (!name) continue;
  const own = [];
  for (let i = 0; i < 64 * 64; i++) if (parts[i * 4 + 3] && parts[i * 4] == id) own.push(oklch(original[i * 4], original[i * 4 + 1], original[i * 4 + 2]));
  const middle = (values) => values.sort((a, b) => a - b)[values.length >> 1];
  const x = own.reduce((t, [, c, h]) => t + Math.cos(h * Math.PI / 180) * c, 0), y = own.reduce((t, [, c, h]) => t + Math.sin(h * Math.PI / 180) * c, 0);
  base[name] = [middle(own.map(([l]) => l)), middle(own.map(([, c]) => c)), (Math.atan2(y, x) * 180 / Math.PI + 360) % 360];
}
// the defaults (Opnieuw and the Groen example go back to them): the original's colors, with a green suit, dark hair and roetvegen
const START = { color_primary: "#74b900", color_secondary: "#ec448c", color_hair: "#1e1d15", color_lips: "#a3294f", roetveeg: true };
for (const input of colors) input.value = input.defaultValue = START[input.id] ?? hex(...rgb(...base[input.id]));
soot.checked = soot.defaultChecked = START.roetveeg;

// A level's color: the picked color, lighter or darker by its level's step from the base in the
// original, a little narrowed (0.7: the original's steps made specks on bright colors), and the
// lighter levels a little less colorful, as a highlight is. One hue for the whole part.
function shade(levelL, [bl], [pl, pc, ph]) {
  const step = levelL - bl;
  return rgb(Math.max(0, Math.min(1, pl + step * 0.7)), pc * (1 - Math.max(0, step)), ph);
}
// The hair (kroeshaar: curls in its levels, see parts.png) has its own ramp in fixed steps around
// the picked color (that's level 1, most of the hair), wide enough that the curls show on black
// hair too. A light color gets smaller steps up and a larger one down, so its curls don't turn
// white; only one past the top moves the whole ramp down.
const HAIR_STEPS = [-0.08, 0, 0.09, 0.18], HAIR_TOP = 0.92;
function hairShade(level, [pl, pc, ph]) {
  const fit = Math.max(0.4, Math.min(1, (HAIR_TOP - pl) / HAIR_STEPS[3]));
  const step = HAIR_STEPS[level] * (level >= 2 ? fit : 1) - (level == 0 ? (1 - fit) * 0.08 : 0);
  const down = Math.max(0, pl + HAIR_STEPS[3] * fit - HAIR_TOP);
  return rgb(Math.max(0.02, pl + step - down), pc * (level == 3 ? 0.9 : 1), ph);
}

const skin = canvas(), ctx = skin.getContext("2d");

// Roetvegen: soot on the face (the front of the head is x 8 to 15, y 8 to 15; the eyes are on
// y 12 and 13, the cheeks below them). It darkens the skin itself, a dark core and lighter ends, so
// it suits every skin tone. Pattern 1 is a streak on each cheek and a touch on the nose; any other
// number is a pattern of its own: a streak on each cheek and sometimes a third, each in a random
// direction and length, only on the face's skin (the cheeks and the nose), never on the eyes or the
// hair. The number is in the link, so it's shared.
const FACE = new Set(["10,11", "11,12", "11,13", "12,13", ...[14, 15].flatMap((y) => [8, 9, 10, 11, 12, 13, 14, 15].map((x) => `${x},${y}`))]);
const DESIGNED = [[8, 14, 0.8], [9, 14, 0.62], [9, 15, 0.62], [10, 15, 0.8], [15, 14, 0.8], [14, 14, 0.62], [14, 15, 0.62], [13, 15, 0.8], [12, 14, 0.85]];
function sootPattern(seed) {
  if (seed == 1) return DESIGNED;
  let t = seed >>> 0;
  const random = () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const pick = (list) => list[Math.floor(random() * list.length)], keep = new Map();
  const spots = [...FACE].map((k) => k.split(",").map(Number));
  // one streak on each cheek, sometimes a third anywhere (the nose, a cheek); each at least 2 pixels
  const where = [spots.filter(([x]) => x <= 11), spots.filter(([x]) => x >= 12), ...(random() < 0.5 ? [spots] : [])];
  for (const area of where) {
    for (let tries = 0; tries < 20; tries++) {
      let [x, y] = pick(area);
      const [dx, dy] = pick([[1, 0], [-1, 0], [1, 1], [-1, 1], [1, -1], [-1, -1]]), length = 2 + Math.floor(random() * 3), streak = [];
      for (let i = 0; i < length && FACE.has(`${x},${y}`); i++, x += dx, y += dy) streak.push(`${x},${y}`);
      if (streak.length < 2) continue;
      streak.forEach((k, i) => keep.set(k, Math.min(keep.get(k) ?? 1, i == 0 || i == streak.length - 1 ? 0.8 : 0.62)));  // the ends lighter
      break;
    }
  }
  return [...keep].map(([k, v]) => [...k.split(",").map(Number), v]);
}
let sootSeed = 1;

// Lippenstift: a small mouth on the bottom row of the face, as big as a Minecraft mouth is: the
// picked color in the middle, the corners a little darker. Whether it's on is in the link.
const LIPS = [[11, 15, 0], [12, 15, 0], [10, 15, -0.1], [13, 15, -0.1]];  // x, y, lightness step

// Slanke armen (Alex): 3 pixels wide. Each 4-wide face of an arm loses a middle column on its outer side.
const ARMS = [[40, 16, 1], [40, 32, 1], [32, 48, 2], [48, 48, 2]];  // inner and outer layer of the right and left arm, the column dropped
function slimArms(data) {
  const without = (cols, i) => cols.filter((_, k) => k != i);
  for (const [u, v, drop] of ARMS) for (let y = v; y < v + 16; y++) {
    const row = Array.from({ length: 16 }, (_, x) => data.slice((y * 64 + u + x) * 4, (y * 64 + u + x + 1) * 4));
    const cols = y < v + 4
      ? [...row.slice(0, 4), ...without(row.slice(4, 8), drop), ...without(row.slice(8, 12), drop)]  // top, bottom
      : [...row.slice(0, 4), ...without(row.slice(4, 8), drop), ...row.slice(8, 12), ...without(row.slice(12, 16), 3 - drop)];  // sides, front, back
    for (let x = 0; x < 16; x++) data.set(cols[x] ?? [0, 0, 0, 0], (y * 64 + u + x) * 4);
  }
}

// Your own head: the head (its inner layer, x 0 to 31, y 0 to 15) of a skin you pick or drop, in
// place of Pietje's; the Piet hat (the outer layer) stays on it, without the bit of Pietje's hair
// that's in that layer too (over the forehead and the side). It only lives in this page: it isn't
// uploaded, and isn't in the link. Old 64x32 skins have the head in the same place.
// Its row says which head it is: Eigen hoofd, or your face (the front of the head, as a small
// picture) and Jouw hoofd, with a button to pick another and one to take it off again.
let ownHead = null;
const own = $("own"), ownNote = $("ownnote"), ownPick = $("ownpick").querySelector("span");
function showOwn(state) {
  own.dataset.state = state;  // "", "mine" or "wrong"
  ownNote.textContent = { mine: "Jouw hoofd", wrong: "Een skin is een PNG van 64 bij 64" }[state] ?? "Eigen hoofd";
  ownPick.textContent = state == "mine" ? "Andere skin" : "Kies skin";
  $("ownclear").hidden = state != "mine";
}
async function useOwn(file) {
  try {
    const image = await createImageBitmap(file);
    if (image.width != 64 || (image.height != 64 && image.height != 32)) throw new Error();
    const c = canvas().getContext("2d");
    c.drawImage(image, 0, 0);
    ownHead = c.getImageData(0, 0, 32, 16).data;
    const face = $("ownface").getContext("2d");
    face.clearRect(0, 0, 8, 8);
    face.drawImage(image, 8, 8, 8, 8, 0, 0, 8, 8);  // the face, and its outer layer over it
    face.drawImage(image, 40, 8, 8, 8, 0, 0, 8, 8);
  } catch {
    if (ownHead) return false;  // keep the head you had
    showOwn("wrong");  // a hint for a moment, then back to Eigen hoofd
    clearTimeout(useOwn.hint);
    useOwn.hint = setTimeout(() => own.dataset.state == "wrong" && showOwn(""), 4000);
    return false;
  }
  showOwn("mine");
  changed();
  return true;
}
$("ownskin").onchange = (e) => e.target.files[0] && useOwn(e.target.files[0]);
$("ownclear").onclick = () => {
  ownHead = null;
  $("ownskin").value = "";
  showOwn("");
  changed();
};
// Dropping a skin: as soon as a file is dragged over the window, the preview says it can take it
// (or that it only takes a PNG), and more so while it's right over the preview: its frame marches
// and Pietje leans in. A drop anywhere on the page counts, so a near miss doesn't make the browser
// open the file instead. Afterwards the label says how it went for a moment: Pietje pops when he
// took the skin, and it gives a calm hint when he didn't. It moves as the site's header does (none with
// reduced motion): the label grows or shrinks to its new text instead of jumping, the text rolls
// in, and a glow glides after the file over the preview, as the header's shine follows the pointer.
const glow = $("drop").querySelector(".glow"), label = $("drop").querySelector("span"), dropText = label.querySelector("b");
let dragDepth = 0, afterDrop, resize;
const hasFile = (e) => e.dataTransfer?.types.includes("Files");
function say(text) {
  if (dropText.textContent == text) return;
  const from = label.offsetWidth;
  resize?.cancel();  // else the new width is measured mid-animation, too narrow for the text
  dropText.textContent = text;
  if (still.matches) return;
  resize = label.animate({ width: [`${from}px`, `${label.offsetWidth}px`] }, { duration: 450, easing: SPRING });
  rollIn(dropText);
}
function follow(e) {
  const box = viewer.getBoundingClientRect(), first = !viewer.classList.contains("over");
  if (first) glow.style.transition = "opacity .4s ease";  // it starts where the file is, rather than gliding there
  glow.style.setProperty("--mx", `${e.clientX - box.left}px`);
  glow.style.setProperty("--my", `${e.clientY - box.top}px`);
  if (first) { glow.offsetWidth; glow.style.transition = ""; }
}
function dragEnd() {
  dragDepth = 0;
  viewer.classList.remove("dragging", "over", "wrong");
}
addEventListener("dragenter", (e) => {
  if (!hasFile(e)) return;
  dragDepth++;
  clearTimeout(afterDrop);
  viewer.classList.remove("took", "refused");
  viewer.classList.add("dragging");
});
addEventListener("dragleave", (e) => { if (hasFile(e) && --dragDepth <= 0) dragEnd(); });
addEventListener("dragover", (e) => {
  if (!hasFile(e)) return;
  e.preventDefault();
  const type = e.dataTransfer.items[0]?.type, wrong = !!type && type != "image/png";  // some browsers don't tell yet
  const over = viewer.contains(e.target);
  e.dataTransfer.dropEffect = wrong ? "none" : "copy";
  if (over) follow(e);
  viewer.classList.toggle("over", over);
  viewer.classList.toggle("wrong", wrong);
  say(wrong ? "Een skin is een PNG-bestand" : over ? "Laat los: jouw hoofd op Pietje" : "Sleep je skin hierheen");
});
addEventListener("drop", async (e) => {
  if (!hasFile(e)) return;
  e.preventDefault();
  dragEnd();
  const file = e.dataTransfer.files[0];
  if (!file) return;
  const took = await useOwn(file);
  viewer.classList.add(took ? "took" : "refused");
  say(took ? "Jouw hoofd staat erop" : "Een skin is een PNG van 64 bij 64");
  if (took && !still.matches) model.animate({ scale: [1.04, 1.1, 1] }, { duration: 650, easing: SPRING });
  afterDrop = setTimeout(() => viewer.classList.remove("took", "refused"), took ? 1100 : 1800);
});

let armsShown;
function render() {
  const out = ctx.createImageData(64, 64), picked = {}, ramp = new Map();
  for (const input of colors) picked[input.id] = oklch(...[1, 3, 5].map((i) => parseInt(input.value.slice(i, i + 2), 16)));
  for (let i = 0; i < 64 * 64 * 4; i += 4) {
    if (!original[i + 3] || !parts[i + 3]) continue;
    if (ownHead && parts[i] == 3 && i % 256 >= 128 && i < 16 * 256) continue;  // own head: not Pietje's hair over it (x 32+, y 0-15)
    const name = PARTS_BY_ID[parts[i]], key = parts[i] * 256 + parts[i + 2];  // part and its level's lightness
    if (name && !ramp.has(key)) ramp.set(key, name == "color_hair" ? hairShade(parts[i + 1], picked[name]) : shade(parts[i + 2] / 255, base[name], picked[name]));
    out.data.set([...(name ? ramp.get(key) : [original[i], original[i + 1], original[i + 2]]), 255], i);
  }
  if (ownHead) for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
    const from = (y * 32 + x) * 4, to = (y * 64 + x) * 4;
    out.data.set([ownHead[from], ownHead[from + 1], ownHead[from + 2], 255], to);  // the inner layer is opaque
  }
  if (soot.checked) for (const [x, y, keep] of sootPattern(sootSeed)) for (let c = 0; c < 3; c++) out.data[(y * 64 + x) * 4 + c] *= keep;
  if (lipstick.checked) for (const [x, y, step] of LIPS) out.data.set(rgb(Math.max(0, picked.color_lips[0] + step), picked.color_lips[1], picked.color_lips[2]), (y * 64 + x) * 4);
  if (slim.checked) slimArms(out.data);
  if (armsShown !== slim.checked) view.arms(armsShown = slim.checked);
  ctx.putImageData(out, 0, 0);
  view.upload(skin);
  view.draw(turn, tilt, zoom);
}

// ---- the model ------------------------------------------------------------------

// Drawn with WebGL: its depth buffer decides per pixel what's in front, which CSS 3D can't (at
// steep angles it sorted the faces wrong). Every part is a box: its size in skin pixels, its center,
// and where its inner and outer layer start on the skin (Minecraft's 64x64 layout; arms 4 pixels
// wide as Steve's, or 3 as Alex's). The outer layer (the hat, the sleeves) is a little bigger, as in Minecraft, by a
// different amount per part: where parts meet, the same amount would put their outer faces in one
// plane, and they'd flicker into each other (z-fighting).
function shape(slim) {
  const a = slim ? 3 : 4, ax = 4 + a / 2;
  const parts = [
    //  w  h  d    x    y   inner     outer     outer layer, out by
    [8, 8, 8, 0, -10, [0, 0], [32, 0], 0.5],      // head
    [8, 12, 4, 0, 0, [16, 16], [16, 32], 0.25],   // body
    [a, 12, 4, -ax, 0, [40, 16], [40, 32], 0.3],  // right arm
    [a, 12, 4, ax, 0, [32, 48], [48, 48], 0.3],   // left arm
    [4, 12, 4, -2, 12, [0, 16], [0, 32], 0.2],    // right leg
    [4, 12, 4, 2, 12, [16, 48], [0, 48], 0.22],   // left leg
  ];
  // Each face as 2 triangles: position (y up), place on the skin (0 to 1), a light level (top
  // brightest and bottom darkest, as in Minecraft, so the shape reads) and whether it's the inner
  // layer, which is opaque, as in Minecraft: only the outer layer has see-through pixels.
  const vertices = [];
  for (const [w, h, d, x, y, inner, outer, out] of parts) {
    for (const [[u, v], o] of [[inner, 0], [outer, out]]) {
      const solid = o ? 0 : 1;
      const face = (corners, u, v, w, h, light) => {
        const uv = [[u, v], [u + w, v], [u + w, v + h], [u, v + h]].map(([a, b]) => [a / 64, b / 64]);
        for (const i of [0, 3, 2, 0, 2, 1]) vertices.push(...corners[i], ...uv[i], light, solid);  // counterclockwise from outside
      };
      const X = w / 2 + o, Y = h / 2 + o, Z = d / 2 + o, cy = 2 - y;  // y up, the figure centered
      const p = (sx, sy, sz) => [x + sx * X, cy + sy * Y, sz * Z];
      face([p(-1, 1, 1), p(1, 1, 1), p(1, -1, 1), p(-1, -1, 1)], u + d, v + d, w, h, 0.9);                 // front
      face([p(1, 1, -1), p(-1, 1, -1), p(-1, -1, -1), p(1, -1, -1)], u + 2 * d + w, v + d, w, h, 0.9);     // back
      face([p(-1, 1, -1), p(-1, 1, 1), p(-1, -1, 1), p(-1, -1, -1)], u, v + d, d, h, 0.75);                // its right
      face([p(1, 1, 1), p(1, 1, -1), p(1, -1, -1), p(1, -1, 1)], u + d + w, v + d, d, h, 0.75);           // its left
      face([p(-1, 1, -1), p(1, 1, -1), p(1, 1, 1), p(-1, 1, 1)], u + d, v, w, d, 1);                      // top
      face([p(-1, -1, 1), p(1, -1, 1), p(1, -1, -1), p(-1, -1, -1)], u + d + w, v, w, d, 0.6);            // bottom
    }
  }
  return vertices;
}

// The view: WebGL when the browser has it; else a flat front view, so the rest still works.
// Both: upload(skin) after a change, arms(slim) when the arms change, draw(turn, tilt) on every frame.
const view = webgl() ?? flat();
$("poster").hidden = true;  // the model draws itself now, in front of the picture of it

function webgl() {
  const gl = model.getContext("webgl", { antialias: true, premultipliedAlpha: false });
  if (!gl) return null;
  const shader = (type, source) => { const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s); return s; };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, `
    attribute vec3 position; attribute vec2 uv; attribute float light; attribute float solid;
    uniform mat4 view; varying vec2 vUv; varying float vLight; varying float vSolid;
    void main() { vUv = uv; vLight = light; vSolid = solid; gl_Position = view * vec4(position, 1.0); }`));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, `
    precision mediump float; uniform sampler2D skin; varying vec2 vUv; varying float vLight; varying float vSolid;
    void main() { vec4 c = texture2D(skin, vUv); if (c.a < 0.5 && vSolid < 0.5) discard; gl_FragColor = vec4(c.rgb * vLight, 1.0); }`));
  gl.linkProgram(program);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  let count = 0;
  [["position", 3, 0], ["uv", 2, 3], ["light", 1, 5], ["solid", 1, 6]].forEach(([name, size, at]) => {
    const loc = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 28, at * 4);
  });
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  const viewAt = gl.getUniformLocation(program, "view");

  // the camera: perspective, from a distance where the whole figure fits, turned and tilted
  function matrix(turn, tilt, aspect, zoom) {
    const f = 1 / Math.tan((30 / 2) * Math.PI / 180), near = 1, far = 200, dist = 70 / zoom;
    const [ct, st] = [Math.cos(turn), Math.sin(turn)], [cx, sx] = [Math.cos(tilt), Math.sin(tilt)];
    // rotate Y (turn), then X (tilt), then push back, then project; column-major for WebGL
    const r = [ct, sx * st, -cx * st, 0, 0, cx, sx, 0, st, -sx * ct, cx * ct, 0, 0, 0, -dist, 1];
    const p = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0];
    const out = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let row = 0; row < 4; row++) for (let k = 0; k < 4; k++) out[c * 4 + row] += p[k * 4 + row] * r[c * 4 + k];
    return out;
  }
  return {
    upload(image) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); },
    arms(slim) {
      const vertices = shape(slim);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
      count = vertices.length / 7;
    },
    draw(turn, tilt, zoom) {
      const [w, h] = fit();
      gl.viewport(0, 0, w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(viewAt, false, matrix(turn * Math.PI / 180, tilt * Math.PI / 180, w / h, zoom));
      gl.drawArrays(gl.TRIANGLES, 0, count);
    },
  };
}

// no WebGL: the front of each part, inner layer then outer, as a paper doll
function flat() {
  viewer.classList.add("flat");
  const c = model.getContext("2d");
  let image, front;
  return {
    upload(skin) { image = skin; },
    arms(slim) {
      const a = slim ? 3 : 4;
      //       inner front    outer front   size   place (left, top) in skin pixels
      front = [[[8, 8], [40, 8], 8, 8, -4, -14], [[20, 20], [20, 36], 8, 12, -4, -6], [[44, 20], [44, 36], a, 12, -4 - a, -6],
        [[36, 52], [52, 52], a, 12, 4, -6], [[4, 20], [4, 36], 4, 12, -4, 6], [[20, 52], [4, 52], 4, 12, 0, 6]];
    },
    draw(turn, tilt, zoom) {
      const [w, h] = fit(), p = Math.max(1, Math.floor(h * 0.75 / 32 * zoom));
      c.clearRect(0, 0, w, h);
      c.imageSmoothingEnabled = false;
      for (const layer of [0, 1]) for (const [inner, outer, fw, fh, x, y] of front) {
        const [u, v] = layer ? outer : inner;
        c.drawImage(image, u, v, fw, fh, w / 2 + x * p, h / 2 + (y - 2) * p, fw * p, fh * p);
      }
    },
  };
}

// the canvas in device pixels, so the skin's pixels stay sharp on any screen
function fit() {
  const scale = devicePixelRatio || 1, w = Math.round(model.clientWidth * scale), h = Math.round(model.clientHeight * scale);
  if (model.width != w || model.height != h) { model.width = w; model.height = h; }
  return [w, h];
}

// ---- turning and zooming it ----------------------------------------------------

// It turns slowly by itself (unless you'd rather have less motion), and follows a drag or the arrow
// keys: sideways turns it, up and down tilts it (not past looking straight down or up). Two fingers
// pinch to zoom, as does a trackpad (which the browser sends as a wheel with ctrl) and + and -.
// Scrolling zooms too once you've clicked or dragged Pietje, until the pointer leaves him: before
// that it scrolls the page, so scrolling past him doesn't get stuck on him. After a drag it waits a moment, then turns on and
// tilts slowly back. It holds still while you pick a color, so you can see the part you're changing
// (from the color picker opening until it closes), and turns on a moment after.
const TILT = 12;
let turn = -25, tilt = TILT, zoom = 1, idleFrom = 0, last = 0, picking = false;
const still = matchMedia("(prefers-reduced-motion: reduce)");
const SPRING = "cubic-bezier(0.34, 1.4, 0.64, 1)";  // the site header's lens: things that move or grow
const show = () => {
  tilt = Math.max(-80, Math.min(80, tilt));
  zoom = Math.max(0.6, Math.min(2.5, zoom));
  view.draw(turn, tilt, zoom);
};
const rest = () => { idleFrom = performance.now() + 2500; };
function spin(now) {
  if (!still.matches && !picking && now > idleFrom) {
    turn += (now - last) * 0.02;
    tilt += (TILT - tilt) * Math.min(1, (now - last) * 0.003);
  }
  last = now;
  show();
  requestAnimationFrame(spin);
}
requestAnimationFrame((now) => { last = now; spin(now); });
const isColor = (e) => e.target.matches?.("input[type=color]");
form.addEventListener("click", (e) => { if (isColor(e)) picking = true; });  // the picker opens
form.addEventListener("input", (e) => { if (isColor(e)) picking = true; });
for (const type of ["change", "focusout"]) form.addEventListener(type, (e) => { if (isColor(e) && picking) { picking = false; rest(); } });  // it closed

// the fingers (or the mouse) on it: one turns and tilts, two pinch
const pointers = new Map();
let held = false;  // clicked or dragged, and the pointer still on it: scrolling zooms
viewer.addEventListener("pointerleave", () => { held = false; });
const spread = () => { const [a, b] = pointers.values(); return Math.hypot(a.x - b.x, a.y - b.y); };
viewer.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });  // first: a failed capture mustn't lose a finger
  try { viewer.setPointerCapture(e.pointerId); } catch {}
  idleFrom = Infinity;
  if (e.pointerType == "mouse") held = true;
});
viewer.addEventListener("pointermove", (e) => {
  const was = pointers.get(e.pointerId);
  if (!was) return;
  if (pointers.size == 1) {
    turn += (e.clientX - was.x) * 0.6;
    tilt += (e.clientY - was.y) * 0.6;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  } else if (pointers.size == 2) {
    const before = spread();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (before > 0) zoom *= spread() / before;
  }
  show();
});
for (const type of ["pointerup", "pointercancel"]) viewer.addEventListener(type, (e) => {
  pointers.delete(e.pointerId);
  if (!pointers.size) rest();
});
viewer.addEventListener("wheel", (e) => {
  if (!e.ctrlKey && !held) return;  // a trackpad pinch, or scrolling once he's clicked; else the page scrolls
  e.preventDefault();
  const pixels = e.deltaY * (e.deltaMode == 1 ? 16 : e.deltaMode == 2 ? 400 : 1);  // lines or pages, as pixels
  zoom *= Math.exp(-pixels * (e.ctrlKey ? 0.01 : 0.0015));  // a pinch's steps are small, a wheel's notch is ~100
  rest();
  show();
}, { passive: false });
viewer.addEventListener("keydown", (e) => {
  const [byTurn, byTilt, byZoom] = { ArrowLeft: [-15, 0, 1], ArrowRight: [15, 0, 1], ArrowUp: [0, -15, 1], ArrowDown: [0, 15, 1], "+": [0, 0, 1.2], "=": [0, 0, 1.2], "-": [0, 0, 1 / 1.2] }[e.key] ?? [];
  if (byTurn == null) return;
  e.preventDefault();
  turn += byTurn;
  tilt += byTilt;
  zoom *= byZoom;
  rest();
  show();
});

// ---- the colors, kept in the link ------------------------------------------------

// The link holds the colors (?color_primary=…), so a Piet can be shared; the names are the ones
// the first version of Pietje used, so its old links still work.
const PRESETS = {
  rood: { color_primary: "#1a0033", color_secondary: "#e60000", color_maillot: "#000000", color_skin: "#4a2c1d" },
  roze: { color_primary: "#df65a2", color_secondary: "#ffa9fa", color_maillot: "#eeb1ba" },
  groen: START,
};

function fromLink() {
  const params = new URLSearchParams(location.search);
  for (const input of colors) if (/^#[0-9a-f]{6}$/i.test(params.get(input.id) ?? "")) input.value = params.get(input.id);
  // its pattern number (1: the designed one); missing: on for the plain link, off for older links
  const seed = params.has("roetveeg") ? parseInt(params.get("roetveeg") ?? "", 36) : params.size ? 0 : 1;
  soot.checked = seed > 0;
  if (seed > 0) sootSeed = seed;
  lipstick.checked = params.has("lippenstift");
  slim.checked = params.has("slank");
}
let linkTimer;
function toLink() {
  const params = new URLSearchParams();
  for (const input of colors) if (input.value != input.defaultValue) params.set(input.id, input.value);
  if (lipstick.checked) params.set("lippenstift", "1");
  if (slim.checked) params.set("slank", "1");
  if (soot.checked ? sootSeed != 1 || params.size : !params.size) params.set("roetveeg", soot.checked ? sootSeed.toString(36) : "0");
  clearTimeout(linkTimer);  // not on every step of a color picker drag
  linkTimer = setTimeout(() => history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}`), 300);
}
function changed() { render(); toLink(); }

// A new outfit at once (an example, Willekeurig, Opnieuw) glides there instead of jumping: every
// color moves through OKLab (a straight line between two colors, so no gray dip on the way), Pietje
// bounces a little, and the link follows at the end. Picking a color yourself stops a glide.
let glide;
function glideTo(targets) {
  cancelAnimationFrame(glide);
  const lab = (value) => { const [l, c, h] = oklch(...[1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16))); return [l, c * Math.cos(h * Math.PI / 180), c * Math.sin(h * Math.PI / 180)]; };
  const ways = colors.map((input) => [input, lab(input.value), lab(targets[input.id] ?? input.value), targets[input.id] ?? input.value]);
  const end = () => { for (const [input, , , to] of ways) input.value = to; changed(); };
  if (still.matches || document.hidden) return end();  // hidden: no frames to glide in
  model.animate({ scale: [1, 1.03, 1] }, { duration: 500, easing: SPRING });
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 450), e = 1 - (1 - t) ** 3;  // ease-out: quick, then settling
    if (t == 1) return end();
    for (const [input, [l0, a0, b0], [l1, a1, b1]] of ways) {
      const l = l0 + (l1 - l0) * e, a = a0 + (a1 - a0) * e, b = b0 + (b1 - b0) * e;
      input.value = hex(...rgb(l, Math.hypot(a, b), (Math.atan2(b, a) * 180 / Math.PI + 360) % 360));
    }
    render();
    glide = requestAnimationFrame(step);
  };
  glide = requestAnimationFrame(step);
}

form.addEventListener("input", () => { cancelAnimationFrame(glide); changed(); });
form.addEventListener("reset", () => {  // the form puts the defaults back right after this; glide there from here
  const from = Object.fromEntries(colors.map((input) => [input.id, input.value]));
  sootSeed = 1;
  setTimeout(() => {
    const to = Object.fromEntries(colors.map((input) => [input.id, input.value]));
    for (const input of colors) input.value = from[input.id];
    glideTo(to);
  });
});
for (const button of form.querySelectorAll("[data-preset]")) {
  const preset = PRESETS[button.dataset.preset];  // its dot in the suit's two colors
  button.querySelector(".swatch")?.style.setProperty("--a", preset.color_primary);
  button.querySelector(".swatch")?.style.setProperty("--b", preset.color_secondary);
  button.onclick = () => {
    const preset = PRESETS[button.dataset.preset];
    if (preset.roetveeg) { soot.checked = true; sootSeed = 1; }  // the designed pattern
    glideTo(Object.fromEntries(colors.map((input) => [input.id, preset[input.id] ?? input.defaultValue])));
  };
}
// Willekeurig: the suit and maillot in any colors; skin, hair and eyes in natural ones (a random
// color there gives green skin or blue hair); roetvegen or not, lippenstift now and then
const SKIN = ["#fde8db", "#f4cfc0", "#f6d7c3", "#eac1a0", "#d9a982", "#c68a64", "#a86b45", "#8a5232", "#6b3e26", "#4a2c1d", "#3a2218", "#2b1810"];
const HAIR = ["#1c1410", "#3b2314", "#663114", "#8a5a2b", "#c99a52", "#e2c27a", "#a8431e", "#9a9a9a"];
const EYE_COLORS = ["#5fc8fc", "#3a7bd5", "#4caf50", "#7a5230", "#8d6e3f", "#7d8a99"];
const LIP_COLORS = ["#a3294f", "#c2185b", "#8e2a3a", "#d0506b", "#7a2e4a", "#e07a8a", "#b5651d"];
const any = (list) => list[Math.floor(Math.random() * list.length)];
$("random").onclick = () => {
  // a suit in a random hue, its second color darker, and the rest in their own random colors
  const hue = Math.random() * 360, hsl = (h, s, l) => {
    const f = (n, k = (n + h / 30) % 12) => l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return "#" + [f(0), f(8), f(4)].map((c) => Math.round(c * 255).toString(16).padStart(2, "0")).join("");
  };
  soot.checked = Math.random() < 0.5;  // roetvegen half the time, in a pattern of their own
  sootSeed = 2 + Math.floor(Math.random() * 1e6);
  lipstick.checked = Math.random() < 0.25;  // lippenstift now and then
  glideTo({
    color_primary: hsl(hue, 0.8, 0.6), color_secondary: hsl(hue, 0.85, 0.4),
    color_maillot: hsl(Math.random() * 360, 0.75, 0.6), color_shoes: hsl(Math.random() * 360, 0.3, 0.85),
    color_skin: any(SKIN), color_hair: any(HAIR), color_eyes: any(EYE_COLORS), color_lips: any(LIP_COLORS),
  });
};

// The icons of Opnieuw, Willekeurig and Andere vegen turn once when clicked (Opnieuw's the way its
// arrow points), with the header's spring; not with reduced motion. A text that changes on a button
// or label (Link gekopieerd) rolls in rather than jumping.
function rollIn(el) { if (!still.matches) el.animate({ opacity: [0, 1], translate: ["0 4px", "0 0"] }, { duration: 250, easing: "ease-out" }); }
for (const [button, way] of [[form.querySelector("[type=reset]"), -1], [$("random"), 1], [$("reshuffle"), 1]]) {
  button.addEventListener("click", () => {
    if (still.matches) return;
    button.querySelector("svg").animate({ transform: ["rotate(0)", `rotate(${way * 360}deg)`] }, { duration: 600, easing: SPRING });
  });
}

// Andere vegen: a new pattern of roetvegen, the rest as it is
$("reshuffle").onclick = () => { sootSeed = 2 + Math.floor(Math.random() * 1e6); changed(); };

$("download").onclick = () => Object.assign(document.createElement("a"), { href: skin.toDataURL(), download: "pietje.png" }).click();
$("share").onclick = function () {
  const label = this.querySelector("span"), text = label.textContent;
  navigator.clipboard?.writeText(location.href).then(() => {
    label.textContent = this.dataset.done;
    rollIn(label);
    this.dataset.copied = "";
    setTimeout(() => { label.textContent = text; rollIn(label); delete this.dataset.copied; }, 1500);
  }, () => {});
};

fromLink();
render();
