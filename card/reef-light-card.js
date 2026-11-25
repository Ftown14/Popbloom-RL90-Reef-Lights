/*
 * Reef Light Card for Tuya CBU reef lights running the ESPHome config in esphome/reeflight.yaml.
 * Plain custom elements with no dependencies, so it loads as one module resource.
 *
 * The card shows the program (read-only). The gear opens Settings: Manual control, Program editor,
 * Programs (presets + your saved programs), light power, manual timeout and the lunar cycle.
 *
 * type: custom:reef-light-card
 * title: Reef Lights
 * programs: todo.reef_programs       # local To-do list that stores saved programs and light groups
 * group: Tank                        # optional: this card shows (and Settings defaults to) this group
 * devices:                           # optional: lights running the firmware are found automatically
 *   - name: Reef Light 1
 *     node: reeflight_1                # ESPHome node name with "_" -> esphome.reeflight_1_set_curve
 *     curve: sensor.reef_light_1_curve  # other entity ids are derived from this one
 *     power: switch.reef_light_1_power
 *     channels: [sensor.reef_light_1_white, sensor.reef_light_1_uv,
 *                sensor.reef_light_1_blue, sensor.reef_light_1_cyanblue]
 * max_points: 24
 *
 * Groups (Settings → Group) are To-do items with description reeflight-group:{"members":[<entity prefix>...]}.
 * A light is in at most one group. The Settings dropdown picks a group or a single light for every page.
 */
const RLC_VERSION = "0.5.3";

const CHANNELS = [
  { name: "White", key: "white", color: "#cfd8dc" },
  { name: "UV", key: "uv", color: "#a855f7" },
  { name: "Blue", key: "blue", color: "#3b82f6" },
  { name: "CyanBlue", key: "cyanblue", color: "#06b6d4" },
];

const b64hex = (b64) => Array.from(atob(b64), (ch) => ch.charCodeAt(0).toString(16).padStart(2, "0")).join("");

// The firmware's default curve (a program captured from a stock light). Shown only when no light is online.
const CAPTURED_CURVE = b64hex(
  "MhASAAAAABMABAAAFQAHBwMbCRMXDR8dIy0xIyc2ODwnOURHRytGSU9NMUlQVVg8SU5UV0M4SE1QRhs7Q01JBy8wKE0AFAwFTwAKBQBSAAAAAA==");

// Built-in programs (read-only): the Tuya app's 16 scenes, captured 2026-11-22 from DP107 ("编辑曲线") reports.
// The curve's first byte is the Tuya scene number (0-15); the firmware ignores it.
const PRESETS = [
  { name: "Tropical Spring", hex: b64hex("ABAVAB4AABYAMgAFGAU8ABQaCkYFMh4eSx5QJDxQUFooVVVkZCxkWmRkNGRaZGRAVVVkZEQ8UFBaRx5GHlBJBTIAHksAFAAFTQAKAABQAB4AAA==") },
  { name: "Tropical Summer", hex: b64hex("ARARADIAABIAPAAFFAVBABQWCkYFMhoeSx5QHzxQUFojWlVkZCdkWmRkN2RaZGRDWlVkZEY8UFBaSB5GMlBKBTIAHkwAFAAFTgAKAABRADIAAA==") },
  { name: "Tropical Autumn", hex: b64hex("AhATACgAABQAMgAFFgU8ABQYCkYFMhweSx5QIDxQUFokVVVkZCpkWmRkNmRaZGRAVVVkZEc8UFBaSx5GKFBMBTIAHk4AFAAFUAAKAABTACgAAA==") },
  { name: "Tropical Winter", hex: b64hex("AxAUABQAABYAHgAFGAUoABQZCjIFMh4ePB5QJDxGUFooUFBkZC5kWmRkMmRaZGQ8UFVkZEE8UFBaRh5GHlBHBTIAHkkAFAAFSgAKAABNABQAAA==") },
  { name: "Temperate Spring", hex: b64hex("BBAZABQAABsAGQAFHQUjABQfCjIFMiIePB5QKDxGUFosVVBkZDBkWmRkOGRaZGRAVVVkZEQ8UFBaSh5GHlBMBTIAHk0AFAAFTwAKAABRABQAAA==") },
  { name: "Temperate Summer", hex: b64hex("BRASAB4AABQAMgAFFgU8ABQYCkYFMhweSx5QIzxQUFonWlVkZCtkWmRkO2RaZGRHWlVkZEo8UFBaTh5GMlBQBTIAHlIAFAAFVAAKAABWAB4AAA==") },
  { name: "Temperate Autumn", hex: b64hex("BhATABQAABUAGQAFFwUjABQZCjIFMhwePB5QIDxGUFooVVBkZC5kWmRkOmRaZGREVVVkZEs8UFBaTh5GKFBQBTIAHlIAFAAFVQAKAABXABQAAA==") },
  { name: "Temperate Winter", hex: b64hex("BxAXAAoAABkAFAAFGwUeABQdCigFMiEeMh5QJzw8UFoqUEZkZDBkUGRkNGRQZGQ+UEtkZEM8RlBaSB48HlBKBSgAHksAFAAFTQAKAABPABQAAA==") },
  { name: "Kelvin @5m", hex: b64hex("CAYgAAAAACRkVVBfSGRVUF9MAAoAAFMACgAAVAAAAAA=") },
  { name: "Kelvin @10m", hex: b64hex("CQYgAAAAACRQVWRaSFBVZFpMAAoAAFMACgAAVAAAAAA=") },
  { name: "Kelvin @15m", hex: b64hex("CgYgAAAAACQyVWRQSDJVZFBMAAoAAFMACgAAVAAAAAA=") },
  { name: "Reduce Algae", hex: b64hex("CwYgAAAAACQFVWQKSAVVZApMAAoAAFMACgAAVAAAAAA=") },
  { name: "SPS Dominant", hex: b64hex("DBAgAAAAACIACgAFJAUZABQmDy0FLSgoUChQKlBaUFosZFpkZFBkWmRkUlBaUFpUMlAyUFYPKAUoWAUUAAVZAAoAAFoAMgAAXgAyAABfAAAAAA==") },
  { name: "LPS and Soft Coral", hex: b64hex("DRAgAAAAACIACgAFJAAZAAomBS0FDygPUBkUKh5aMiMsMmRkPFAyZGQ8Uh5aMiNUFFAZFFYFKAUKWAAUAAVZAAoAAFoAMgAAXgAyAABfAAAAAA==") },
  { name: "Fish and Plants", hex: b64hex("DhAgAAAAACIACgAFJAAZABQmDy0FLSgoMh4yKlA3MjcsZDxkPFBkPGQ8UlA3MjdUMjIeMlYPKAUoWAUUAAVZAAoAAFoAMgAAXgAyAABfAAAAAA==") },
  { name: "Cut and Frag", hex: b64hex("DxAmAAAAACcACgAFKAAZABQpBS0FLSoPUChQKx5aUFosMmRkZFAyZGRkUR5aUFpSFFAyUFMFKAUoVAUUAAVVAAoAAFYAFAAAVwAUAABYAAAAAA==") },
];

const W = 720, H = 300, PL = 38, PR = 12, PT = 12, PB = 28;
const CW = W - PL - PR, CH = H - PT - PB;
const SLOT_MIN = 15;
const PROGRAM_TAG = "reeflight-curve:";
const GROUP_TAG = "reeflight-group:";
const TARGET_KEY = "reef-light-card-target";

function parseCurve(hex) {
  if (!hex || typeof hex !== "string") return null;
  hex = hex.replace(/[^0-9a-f]/gi, "");
  const b = [];
  for (let i = 0; i + 1 < hex.length; i += 2) b.push(parseInt(hex.substr(i, 2), 16));
  if (b.length < 2 || b.length !== 2 + 5 * b[1]) return null;
  const pts = [];
  for (let i = 0; i < b[1]; i++) {
    const o = 2 + i * 5;
    pts.push({ slot: b[o], v: [b[o + 1], b[o + 2], b[o + 3], b[o + 4]] });
  }
  return { header: b[0], points: pts };
}

function buildCurve(header, points) {
  const b = [header, points.length];
  for (const p of points) b.push(p.slot, ...p.v);
  return b.map((x) => x.toString(16).padStart(2, "0")).join("");
}
const normHex = (hex) => { const c = parseCurve(hex); return c ? buildCurve(c.header, c.points) : null; };

function interp(points, minute) {
  if (!points.length) return [0, 0, 0, 0];
  const m = (p) => p.slot * SLOT_MIN;
  if (minute <= m(points[0]) || minute >= m(points[points.length - 1])) {
    const edge = minute <= m(points[0]) ? points[0] : points[points.length - 1];
    return edge.v.slice();
  }
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], z = points[i + 1];
    if (minute >= m(a) && minute <= m(z)) {
      const f = (minute - m(a)) / (m(z) - m(a) || 1);
      return a.v.map((x, c) => Math.round(x + (z.v[c] - x) * f));
    }
  }
  return [0, 0, 0, 0];
}

const fmtTime = (slot) => {
  const mins = slot * SLOT_MIN;
  return `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
};
const xOf = (slot) => PL + (slot * SLOT_MIN / 1440) * CW;
const yOf = (pct) => PT + CH - (pct / 100) * CH;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// "Now" in HA's timezone, which is what the lights run on, not the browser's (they differ when viewing from elsewhere).
const tzParts = (tz, d = new Date()) => {
  try {
    const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz || undefined, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
    const g = (t) => p.find((x) => x.type === t).value;
    return { date: `${g("year")}-${g("month")}-${g("day")}`, min: (+g("hour") % 24) * 60 + +g("minute") };
  } catch (e) {
    return { date: d.toDateString(), min: d.getHours() * 60 + d.getMinutes() };
  }
};
const nowMinutes = (tz) => tzParts(tz).min;

// SVG markup for a program. mini = small tile without labels.
function chartSvg(points, o = {}) {
  const hidden = o.hidden || [false, false, false, false];
  let g = "";
  if (!o.mini) {
    for (let pct = 0; pct <= 100; pct += 25) {
      g += `<line class="grid" x1="${PL}" x2="${PL + CW}" y1="${yOf(pct)}" y2="${yOf(pct)}"/>`;
      g += `<text class="lbl" x="${PL - 6}" y="${yOf(pct) + 4}" text-anchor="end">${pct}</text>`;
    }
    for (let h = 0; h <= 24; h += 3) {
      const x = PL + (h / 24) * CW;
      g += `<line class="grid" x1="${x}" x2="${x}" y1="${PT}" y2="${PT + CH}" opacity=".5"/>`;
      g += `<text class="lbl" x="${x}" y="${H - 8}" text-anchor="middle">${String(h).padStart(2, "0")}:00</text>`;
    }
  } else {
    g += `<line class="grid" x1="${PL}" x2="${PL + CW}" y1="${PT + CH}" y2="${PT + CH}"/>`;
  }
  if (o.nowMin != null) {
    const nx = PL + (o.nowMin / 1440) * CW;
    g += `<line class="now" x1="${nx}" x2="${nx}" y1="${PT}" y2="${PT + CH}"/>`;
  }
  CHANNELS.forEach((c, ci) => {
    if (hidden[ci] || !points.length) return;
    const path = [`${PL},${yOf(points[0].v[ci])}`]
      .concat(points.map((p) => `${xOf(p.slot)},${yOf(p.v[ci])}`))
      .concat([`${PL + CW},${yOf(points[points.length - 1].v[ci])}`]).join(" ");
    g += `<polygon points="${PL},${PT + CH} ${path} ${PL + CW},${PT + CH}" fill="${c.color}" opacity="${o.mini ? ".12" : ".07"}"/>`;
    g += `<polyline points="${path}" fill="none" stroke="${c.color}" stroke-width="${o.mini ? 6 : 2.2}" stroke-linejoin="round"/>`;
  });
  if (o.interactive) {
    CHANNELS.forEach((c, ci) => {
      if (hidden[ci]) return;
      points.forEach((p, i) => {
        g += `<circle class="pt${i === o.sel ? " sel" : ""}" data-idx="${i}" data-ch="${ci}" cx="${xOf(p.slot)}" cy="${yOf(p.v[ci])}" r="${i === o.sel ? 7 : 5.5}" fill="${c.color}"><title>${fmtTime(p.slot)} · ${c.name} ${p.v[ci]}%</title></circle>`;
      });
    });
  }
  return g;
}

// Entities created by esphome/reeflight.yaml, derived from the curve entity unless given.
function deviceEntities(d) {
  const base = d.base || String(d.curve || "").replace(/^sensor\./, "").replace(/_curve$/, "");
  return {
    base,
    curve: d.curve || `sensor.${base}_curve`,
    power: d.power || `switch.${base}_power`,
    levels: d.levels || CHANNELS.map((c) => `number.${base}_${c.key}_level`),
    manual: d.manual || `switch.${base}_manual_override`,
    timeout: `number.${base}_manual_timeout`,
    lunar: `switch.${base}_lunar_cycle`,
    sync: `select.${base}_lunar_sync`,
    hours: `select.${base}_lunar_hours`,
    start: `time.${base}_lunar_start`,
    end: `time.${base}_lunar_end`,
    duration: `number.${base}_lunar_duration`,
    max: CHANNELS.map((c) => (c.key === "uv" ? null : `number.${base}_lunar_${c.key}_max`)),   // no UV moonlight
    accl: `switch.${base}_acclimation`,
    acclInit: `number.${base}_acclimation_initial_intensity`,
    acclDays: `number.${base}_acclimation_duration`,
    acclDay: `sensor.${base}_acclimation_day`,
    acclLevel: `sensor.${base}_acclimation_level`,
    illum: `sensor.${base}_moon_illumination`,
    day: `sensor.${base}_lunar_day`,
    phase: `sensor.${base}_moon_phase`,
    place: `sensor.${base}_lunar_location`,
    alt: `sensor.${base}_moon_altitude`,
    rise: `sensor.${base}_next_moonrise`,
    set: `sensor.${base}_next_moonset`,
  };
}

// Every light running esphome/reeflight.yaml: a <base>_curve sensor next to a <base>_manual_override switch.
// The ESPHome node (for esphome.<node>_set_curve) is matched by name ignoring "_": reef_light_1 -> reeflight_1.
function discoverDevices(hass) {
  const out = [];
  if (!hass || !hass.states) return out;
  const svc = Object.keys((hass.services && hass.services.esphome) || {}).filter((k) => k.endsWith("_set_curve")).map((k) => k.slice(0, -10));
  for (const id of Object.keys(hass.states)) {
    const m = /^sensor\.(.+)_curve$/.exec(id);
    if (!m || !hass.states[`switch.${m[1]}_manual_override`]) continue;
    const base = m[1], flat = base.replace(/_/g, "");
    const node = svc.find((n) => n.replace(/_/g, "") === flat) || base;
    const fn = (hass.states[id].attributes || {}).friendly_name;
    const name = fn ? fn.replace(/\s*curve$/i, "") : base;
    out.push({ name, node, curve: id, power: `switch.${base}_power`, channels: CHANNELS.map((c) => `sensor.${base}_${c.key}`) });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

const COG = "M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z";

const MANUAL_CSS = `
  .mpanel { display: grid; gap: 14px; margin: 6px 0 4px; }
  .mrow { display: grid; grid-template-columns: 84px 1fr 56px; gap: 10px; align-items: center; }
  .mrow .mname { font-size: .85rem; font-weight: 500; }
  .mrow .mval { text-align: right; font-variant-numeric: tabular-nums; font-size: 1rem; font-weight: 500; color: var(--primary-text-color); }
  .mrow input[type=range] { width: 100%; height: 6px; -webkit-appearance: none; appearance: none; border-radius: 3px; background: var(--rlc-fill-hover); outline: none; margin: 0; }
  .mrow input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: var(--ch); border: 2px solid var(--card-background-color, #000); cursor: pointer; }
  .mrow input[type=range]::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--ch); border: 2px solid var(--card-background-color, #000); cursor: pointer; }
  .mstate { font-size: .78rem; color: var(--secondary-text-color); }
  dialog.dlg { border: 1px solid var(--rlc-line); border-radius: var(--ha-card-border-radius, 12px); padding: 16px 18px; width: min(520px, calc(100vw - 24px)); max-height: calc(100vh - 24px); box-sizing: border-box; background: var(--card-background-color, var(--primary-background-color)); color: var(--primary-text-color); box-shadow: var(--ha-card-box-shadow, none); }
  dialog.dlg.wide { width: min(880px, calc(100vw - 24px)); }
  dialog.dlg::backdrop { background: rgba(0,0,0,.55); }
  .mhead { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
  .mhead .dt { font-size: 1.1rem; font-weight: 500; flex: 1; }
  .mnote { font-size: .75rem; color: var(--secondary-text-color); }
  :host { --rlc-line: var(--ha-color-border-neutral-quiet, rgba(127,127,127,.35)); --rlc-fill: var(--ha-color-fill-neutral-normal-resting, rgba(127,127,127,.16)); --rlc-fill-hover: var(--ha-color-fill-neutral-normal-hover, rgba(127,127,127,.26)); --rlc-accent: var(--ha-color-fill-primary-loud-resting, var(--primary-color)); --rlc-on-accent: var(--ha-color-on-primary-loud, var(--text-primary-color, #fff)); --rlc-form: var(--ha-color-form-background, rgba(127,127,127,.12)); }
  button { font: inherit; font-size: .85rem; font-weight: 500; padding: 7px 14px; border-radius: var(--ha-button-border-radius, var(--ha-border-radius-pill, 18px)); border: 1px solid var(--rlc-line); background: var(--rlc-fill); color: var(--primary-text-color); cursor: pointer; transition: background .15s, filter .15s; }
  button:hover:not(:disabled) { background: var(--rlc-fill-hover); }
  button:active:not(:disabled) { filter: brightness(.9); }
  button:focus-visible { outline: 2px solid var(--rlc-accent); outline-offset: 2px; }
  button.primary { background: var(--rlc-accent); border-color: transparent; color: var(--rlc-on-accent); }
  button.primary:hover:not(:disabled) { background: var(--ha-color-fill-primary-loud-hover, var(--rlc-accent)); filter: brightness(1.1); }
  button.danger { background: var(--ha-color-fill-danger-normal-resting, rgba(239,68,68,.16)); border-color: transparent; color: var(--ha-color-on-danger-normal, #ef4444); }
  button.danger:hover:not(:disabled) { background: var(--ha-color-fill-danger-normal-hover, rgba(239,68,68,.26)); }
  button:disabled { opacity: .45; cursor: default; }
  button.x { border: none; background: transparent; padding: 4px 8px; font-size: 1.1rem; line-height: 1; color: var(--secondary-text-color); border-radius: 50%; }
  button.x:hover:not(:disabled) { background: var(--rlc-fill); color: var(--primary-text-color); }
  input, select { font: inherit; padding: 6px 8px; border-radius: var(--ha-border-radius-md, 8px); border: 1px solid var(--rlc-line); background: var(--rlc-form); color: var(--primary-text-color); box-sizing: border-box; }
  select { -webkit-appearance: none; appearance: none; padding-right: 30px; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 6px center; background-size: 20px; }
  select option, select optgroup { background: var(--card-background-color, #1c1c1c); color: var(--primary-text-color); }
  input[type=checkbox], input[type=radio] { padding: 0; background: none; border: none; }
  input:focus, select:focus { outline: none; border-color: var(--rlc-accent); box-shadow: 0 0 0 1px var(--rlc-accent); }
  .bar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; align-items: center; }
  .status { font-size: .8rem; color: var(--secondary-text-color); flex: 1; min-width: 120px; }
`;

// Four sliders driving every configured light's level numbers (which switch the light to manual).
class ManualPanel {
  constructor(el, getDevices) {
    this.el = el;
    this.getDevices = getDevices;
    this.dragging = [false, false, false, false];
    this.timers = [null, null, null, null];
    this.el.innerHTML = CHANNELS.map((c, i) => `
      <div class="mrow" style="--ch:${c.color}">
        <span class="mname" style="color:${c.color}">${c.name}</span>
        <input type="range" min="0" max="100" step="0.5" data-ch="${i}" aria-label="${c.name} level">
        <span class="mval" data-v="${i}">–</span>
      </div>`).join("") + `<div class="mstate"></div>`;
    this.el.querySelectorAll("input[type=range]").forEach((inp) => {
      const ch = +inp.dataset.ch;
      inp.addEventListener("pointerdown", () => { this.dragging[ch] = true; });
      inp.addEventListener("input", () => {
        this.el.querySelector(`[data-v="${ch}"]`).textContent = `${(+inp.value).toFixed(1)}%`;
        clearTimeout(this.timers[ch]);
        this.timers[ch] = setTimeout(() => this.send(ch, +inp.value), 150);
      });
      inp.addEventListener("change", () => { this.dragging[ch] = false; this.send(ch, +inp.value); });
    });
  }
  online(hass) {
    return this.getDevices().filter((d) => {
      const s = hass && hass.states[deviceEntities(d).levels[0]];
      return s && s.state !== "unavailable";
    });
  }
  available(hass) { return this.online(hass).length > 0; }
  levels(hass) {
    const d = this.online(hass)[0];
    if (!d) return null;
    return deviceEntities(d).levels.map((id) => +hass.states[id].state || 0);
  }
  send(ch, value) {
    if (!this.hass) return;
    for (const d of this.online(this.hass)) {
      this.hass.callService("number", "set_value", { entity_id: deviceEntities(d).levels[ch], value });
    }
  }
  resume(hass) {
    hass = hass || this.hass;
    if (!hass) return;
    for (const d of this.online(hass)) {
      const m = deviceEntities(d).manual;
      if (hass.states[m] && hass.states[m].state === "on") hass.callService("switch", "turn_off", { entity_id: m });
    }
  }
  manualOn(hass) {
    return this.online(hass).some((d) => { const s = hass.states[deviceEntities(d).manual]; return s && s.state === "on"; });
  }
  update(hass) {
    this.hass = hass;
    const lv = this.levels(hass);
    this.el.querySelectorAll("input[type=range]").forEach((inp) => {
      const ch = +inp.dataset.ch;
      if (!lv || this.dragging[ch] || this.timers[ch] && inp.matches(":active")) return;
      inp.value = lv[ch];
      this.el.querySelector(`[data-v="${ch}"]`).textContent = `${lv[ch].toFixed(1)}%`;
    });
    const n = this.online(hass).length;
    this.el.querySelector(".mstate").textContent = !n ? "Light offline" :
      `${this.manualOn(hass) ? "Manual · holding these levels" : "Following the program"}${n > 1 ? ` · ${n} lights` : ""}`;
  }
}

// Standalone sliders card, e.g. inside a pop-up. When it's closed (removed from the page) the program resumes.
class ReefLightSlidersCard extends HTMLElement {
  setConfig(config) {
    if (!config.devices || !config.devices.length) throw new Error("devices is required");
    this._config = { title: "Manual levels", resume_on_close: true, ...config };
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>
        :host { display: block; }
        ha-card { padding: 12px 14px 14px; }
        .head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 8px; }
        .title { font-size: 1.1rem; font-weight: 500; }
        ${MANUAL_CSS}
      </style><ha-card><div class="head"><span class="title"></span><button class="resume primary">Resume program</button></div><div class="mpanel"></div></ha-card>`;
      this._panel = new ManualPanel(this.shadowRoot.querySelector(".mpanel"), () => this._config.devices);
      this.shadowRoot.querySelector(".resume").addEventListener("click", () => this._panel.resume(this._hass));
    }
    this.shadowRoot.querySelector(".title").textContent = this._config.title;
  }
  set hass(hass) {
    this._hass = hass;
    this.style.colorScheme = hass.themes?.darkMode ? "dark" : "light";   // native dropdown lists follow HA's mode
    this._panel.update(hass);
    this.shadowRoot.querySelector(".resume").disabled = !this._panel.manualOn(hass);
  }
  disconnectedCallback() {
    if (this._config && this._config.resume_on_close && this._hass) this._panel.resume(this._hass);
  }
  getCardSize() { return 4; }
  static getStubConfig() { return { devices: [{ name: "Reef Light 1", curve: "sensor.reef_light_1_curve" }] }; }
}

class ReefLightCard extends HTMLElement {
  setConfig(config) {
    this._config = { title: "Reef Lights", max_points: 24, programs: "todo.reef_programs", devices: [], ...config };
    this._draft = null;        // { header, points } being edited
    this._dirty = false;
    this._sel = null;
    this._hidden = [false, false, false, false];
    this._status = "";
    this._custom = [];         // saved programs from the To-do list: { uid, name, hex }
    this._groups = [];         // light groups from the same list: { uid, name, members: [base], loc }
    try { this._targetSel = localStorage.getItem(TARGET_KEY); } catch (e) { this._targetSel = null; }
    this._pick = null;         // selected tile on the Programs page
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._built = false;
    this._render();
  }

  static getStubConfig() {
    return {
      title: "Reef Lights",
      devices: [{
        name: "Reef Light 1", node: "reeflight_1", curve: "sensor.reef_light_1_curve", power: "switch.reef_light_1_power",
        channels: ["sensor.reef_light_1_white", "sensor.reef_light_1_uv", "sensor.reef_light_1_blue", "sensor.reef_light_1_cyanblue"],
      }],
    };
  }

  getCardSize() { return 6; }
  getGridOptions() { return { columns: 12, min_columns: 6, rows: "auto" }; }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    this.style.colorScheme = hass.themes?.darkMode ? "dark" : "light";   // native dropdown lists follow HA's mode
    if (first) this._loadPrograms();
    this._render();
  }

  _tz() { return this._hass && this._hass.config && this._hass.config.time_zone; }

  connectedCallback() {
    // Keep the "now" line moving even when no entity changes.
    clearInterval(this._clock);
    this._clock = setInterval(() => { if (this._hass && this.shadowRoot && this.shadowRoot.querySelector("svg.chart.view")) this._render(); }, 60000);
  }

  disconnectedCallback() {
    clearInterval(this._clock);
    // Leaving the page with the manual dialog open still resumes the program.
    const dlg = this.shadowRoot && this.shadowRoot.querySelector(".d-manual");
    if (dlg && dlg.open) dlg.close();
  }

  // ---- data ---------------------------------------------------------------------------
  // Configured lights first (their names/nodes win), then any other light found in HA.
  _allDevices() {
    const cfg = this._config.devices || [];
    const states = this._hass && this._hass.states;
    const key = states ? Object.keys(states).length + ":" + Object.keys((this._hass.services || {}).esphome || {}).length : "";
    if (this._devCache && this._devCache.key === key && this._devCache.cfg === cfg) return this._devCache.list;
    const list = cfg.map((d) => ({ ...d, base: deviceEntities(d).base }));
    if (this._config.discover !== false) {
      for (const d of discoverDevices(this._hass)) {
        const base = deviceEntities(d).base;
        if (!list.some((x) => x.base === base)) list.push({ ...d, base });
      }
    }
    this._devCache = { key, cfg, list };
    return list;
  }
  _byBase(bases) { const all = this._allDevices(); return bases.map((b) => all.find((d) => d.base === b)).filter(Boolean); }
  _groupOf(base) { return this._groups.find((g) => g.members.includes(base)) || null; }
  _findGroup(name) { return name ? this._groups.find((g) => g.name.toLowerCase() === String(name).toLowerCase()) || null : null; }
  // What the card itself shows: its configured group, otherwise every light.
  _scope() { const g = this._findGroup(this._config.group); return g ? this._byBase(g.members) : this._allDevices(); }
  // What Settings, Manual, Editor, Programs and Lunar act on: "g:<group>", "d:<light>" or "all".
  _defaultTarget() {
    const g = this._findGroup(this._config.group) || this._groups[0];
    if (g) return `g:${g.name}`;
    const all = this._allDevices();
    return all.length === 1 ? `d:${all[0].base}` : "all";
  }
  _target() {
    const t = this._targetSel || "";
    if (t.startsWith("g:") && this._findGroup(t.slice(2))) return t;
    if (t.startsWith("d:") && this._byBase([t.slice(2)]).length) return t;
    if (t === "all" && !this._groups.length) return t;
    return this._defaultTarget();
  }
  _setTarget(t) {
    this._targetSel = t;
    try { localStorage.setItem(TARGET_KEY, t); } catch (e) { /* private mode */ }
    this._phaseUi = null;
    this._lunarPending = 0;
  }
  _targetGroup() { const t = this._target(); return t.startsWith("g:") ? this._findGroup(t.slice(2)) : null; }
  _targets() {
    const t = this._target();
    if (t.startsWith("g:")) return this._byBase(this._findGroup(t.slice(2)).members);
    if (t.startsWith("d:")) return this._byBase([t.slice(2)]);
    return this._allDevices();
  }
  _targetLabel() {
    const t = this._target(), n = this._targets().length;
    if (t.startsWith("g:")) return `${t.slice(2)} (${n} light${n === 1 ? "" : "s"})`;
    if (t.startsWith("d:")) return this._targets()[0].name || this._targets()[0].node;
    return `All lights (${n})`;
  }
  _state(id) {
    const s = id && this._hass && this._hass.states[id];
    return s && !["unavailable", "unknown", ""].includes(s.state) ? s : null;
  }
  _deviceCurve(d) { const s = this._state(deviceEntities(d).curve); return s ? parseCurve(s.state) : null; }
  _connected(devs = this._targets()) { return devs.filter((d) => this._deviceCurve(d)); }
  _liveCurve(devs = this._targets()) {
    for (const d of devs) { const c = this._deviceCurve(d); if (c) return { curve: c, from: d.name || d.node }; }
    return { curve: parseCurve(this._config.fallback_curve || CAPTURED_CURVE), from: "" };
  }
  _programName(hex, devs = this._targets()) {
    const h = normHex(hex);
    const p = PRESETS.find((x) => normHex(x.hex) === h) || this._custom.find((x) => normHex(x.hex) === h);
    if (p) return p.name;
    const d = devs && devs[0], g = d ? this._groupOf(d.base) : null;
    return g && g.prog && g.prog.name && g.prog.hex === h ? g.prog.name : null;
  }
  _outOfSync(hex, devs = this._targets()) {
    return this._connected(devs).filter((d) => { const c = this._deviceCurve(d); return buildCurve(c.header, c.points) !== hex; });
  }
  // Settings are read from the first online light of the target and written to all of them.
  _ent(key, devs = this._targets()) { const d = this._connected(devs)[0] || devs[0]; return d ? deviceEntities(d)[key] : null; }
  _st(key, i, devs) { const id = this._ent(key, devs); const s = this._state(Array.isArray(id) ? id[i] : id); return s ? s.state : null; }
  _forAll(fn) { for (const d of this._connected()) fn(deviceEntities(d), d); }

  async _loadPrograms() {
    const ent = this._config.programs;
    if (!this._hass || !ent || !this._hass.states[ent]) { this._custom = []; this._groups = []; return; }
    try {
      const res = await this._hass.callWS({ type: "todo/item/list", entity_id: ent });
      const custom = [], groups = [];
      for (const it of res.items || []) {
        const desc = String(it.description || "");
        if (desc.startsWith(GROUP_TAG)) {
          try {
            const g = JSON.parse(desc.slice(GROUP_TAG.length));
            groups.push({ uid: it.uid, name: it.summary, members: Array.isArray(g.members) ? g.members.map(String) : [], loc: g.loc || null,
              prog: g.prog && g.prog.hex ? { name: String(g.prog.name || ""), hex: normHex(g.prog.hex) } : null });
          } catch (e) { console.warn("reef-light-card: bad group item", it.summary); }
          continue;
        }
        const hex = normHex(desc.startsWith(PROGRAM_TAG) ? desc.slice(PROGRAM_TAG.length) : desc);
        if (hex) custom.push({ uid: it.uid, name: it.summary, hex });
      }
      // A light belongs to one group: the first group (by name) that lists it keeps it.
      groups.sort((a, b) => a.name.localeCompare(b.name));
      const seen = new Set();
      for (const g of groups) g.members = g.members.filter((m) => !seen.has(m) && seen.add(m));
      this._custom = custom.sort((a, b) => a.name.localeCompare(b.name));
      this._groups = groups;
    } catch (e) {
      this._custom = [];
      console.warn("reef-light-card: could not read programs", e);
    }
    this._render();
  }
  _groupDesc(g) { return GROUP_TAG + JSON.stringify({ members: g.members, ...(g.loc ? { loc: g.loc } : {}), ...(g.prog ? { prog: g.prog } : {}) }); }
  // Remember the name of the program last sent to a group, so a program that isn't saved still shows its name.
  _rememberProg(name, hex, g = this._targetGroup()) {
    if (!g || !this._config.programs) return;
    g.prog = name ? { name: name.slice(0, 60), hex: normHex(hex) } : null;
    this._hass.callService("todo", "update_item", { item: g.uid, description: this._groupDesc(g) }, { entity_id: this._config.programs })
      .catch((e) => console.warn("reef-light-card: could not save the program name", e));
  }

  async _sendCurve(hex, devs = this._targets()) {
    const targets = this._connected(devs);
    if (!targets.length) throw new Error("No light is online");
    const errs = [];
    for (const d of targets) {
      try { await this._hass.callService("esphome", `${d.node}_set_curve`, { hex }); }
      catch (e) { errs.push(`${d.name || d.node}: ${e.message || e}`); }
    }
    if (errs.length) throw new Error(errs.join("; "));
    return targets.length;
  }

  // ---- groups -------------------------------------------------------------------------
  // Settings compared between group members (besides the program).
  _syncKeys() { return ["timeout", "lunar", "sync", "hours", "start", "end", "duration", "place", "accl", "acclInit", "acclDays", "acclDay"]; }
  _settingsOf(d) {
    const e = deviceEntities(d), v = (id) => { const s = this._state(id); return s ? s.state : null; };
    const o = {};
    for (const k of this._syncKeys()) o[k] = v(e[k]);
    o.max = e.max.map((id) => (id ? v(id) : null));
    const c = this._deviceCurve(d);
    o.curve = c ? buildCurve(c.header, c.points) : null;
    return o;
  }
  // Members that differ from the group's first online light: [{ d, what: ["program", ...] }].
  _groupDiff(devs = this._targets()) {
    const on = this._connected(devs);
    if (on.length < 2) return [];
    const ref = this._settingsOf(on[0]);
    const out = [];
    for (const d of on.slice(1)) {
      const s = this._settingsOf(d), what = [];
      if (s.curve !== ref.curve) what.push("program");
      if (s.timeout !== ref.timeout) what.push("timeout");
      const lunarKeys = ["lunar", "sync", "hours", "start", "end", "duration"].concat(ref.sync === "Location" ? ["place"] : []);
      if (lunarKeys.some((k) => s[k] !== ref[k]) || s.max.some((x, i) => x !== ref.max[i])) what.push("lunar");
      if (["accl", "acclInit", "acclDays"].concat(ref.accl === "on" ? ["acclDay"] : []).some((k) => s[k] !== ref[k])) what.push("acclimation");
      if (what.length) out.push({ d, what });
    }
    return out;
  }
  // Copy the first online member's program and settings to the rest of the group.
  async _syncGroup(devs = this._targets(), g = this._targetGroup()) {
    const on = this._connected(devs);
    if (on.length < 2) return "Nothing to sync";
    const src = on[0], ref = this._settingsOf(src);
    const notes = [];
    let loc = null;
    if (ref.sync === "Location" && ref.place) {
      const c = this._hass.config || {};
      if (ref.place.startsWith("Home (HA)") && c.latitude != null) loc = { lat: +(+c.latitude).toFixed(4), lon: +(+c.longitude).toFixed(4), place: ref.place };
      else if (g && g.loc && g.loc.place === ref.place) loc = g.loc;
      else notes.push(`pick the lunar location again to copy "${ref.place}"`);
    }
    const call = (d, s, data) => this._hass.callService(d, s, data);
    for (const d of on.slice(1)) {
      const s = this._settingsOf(d), e = deviceEntities(d);
      if (ref.curve && s.curve !== ref.curve) await call("esphome", `${d.node}_set_curve`, { hex: ref.curve });
      if (ref.timeout != null && s.timeout !== ref.timeout) await call("number", "set_value", { entity_id: e.timeout, value: +ref.timeout });
      for (const k of ["duration"]) if (ref[k] != null && s[k] !== ref[k]) await call("number", "set_value", { entity_id: e[k], value: +ref[k] });
      for (let i = 0; i < 4; i++) if (e.max[i] && ref.max[i] != null && s.max[i] !== ref.max[i]) await call("number", "set_value", { entity_id: e.max[i], value: +ref.max[i] });
      for (const k of ["start", "end"]) if (ref[k] != null && s[k] !== ref[k]) await call("time", "set_value", { entity_id: e[k], time: ref[k] });
      if (ref.hours != null && s.hours !== ref.hours) await call("select", "select_option", { entity_id: e.hours, option: ref.hours });
      if (loc && s.place !== ref.place) await call("esphome", `${d.node}_set_lunar_location`, { lat: loc.lat, lon: loc.lon, place: loc.place.slice(0, 63) });
      if (ref.sync != null && s.sync !== ref.sync) await call("select", "select_option", { entity_id: e.sync, option: ref.sync });
      if (ref.lunar != null && s.lunar !== ref.lunar) await call("switch", ref.lunar === "on" ? "turn_on" : "turn_off", { entity_id: e.lunar });
      for (const k of ["acclInit", "acclDays"]) if (ref[k] != null && s[k] !== ref[k]) await call("number", "set_value", { entity_id: e[k], value: +ref[k] });
      // Running acclimation is copied with its day, so every light is on the same step.
      if (ref.accl === "on" && ref.acclDay != null && (s.accl !== "on" || s.acclDay !== ref.acclDay)) await call("esphome", `${d.node}_set_acclimation_day`, { day: +ref.acclDay });
      else if (ref.accl === "off" && s.accl === "on") await call("switch", "turn_off", { entity_id: e.accl });
    }
    return `Copied ${src.name || src.node}'s settings to ${on.length - 1} light${on.length > 2 ? "s" : ""}${notes.length ? ` · ${notes.join("; ")}` : ""}`;
  }
  async _saveGroup(uid, name, members) {
    const ent = this._config.programs;
    if (!ent || !this._hass.states[ent]) throw new Error(`Program list ${ent} not found`);
    const clash = this._groups.find((g) => g.name.toLowerCase() === name.toLowerCase() && g.uid !== uid);
    if (clash) throw new Error(`There's already a group called "${clash.name}"`);
    const old = uid ? this._groups.find((g) => g.uid === uid) : null;
    // keep the existing order (the first member is the one others are synced from), new lights at the end
    const ordered = (old ? old.members.filter((m) => members.includes(m)) : []).concat(members.filter((m) => !(old && old.members.includes(m))));
    const g = { uid, name, members: ordered, loc: old ? old.loc : null, prog: old ? old.prog : null };
    // one group per light: take these lights out of any other group
    for (const o of this._groups) {
      if (o.uid === uid || !o.members.some((m) => ordered.includes(m))) continue;
      const rest = { ...o, members: o.members.filter((m) => !ordered.includes(m)) };
      await this._hass.callService("todo", "update_item", { item: o.uid, description: this._groupDesc(rest) }, { entity_id: ent });
    }
    if (old) await this._hass.callService("todo", "update_item", { item: uid, rename: name, description: this._groupDesc(g) }, { entity_id: ent });
    else await this._hass.callService("todo", "add_item", { item: name, description: this._groupDesc(g) }, { entity_id: ent });
    await this._loadPrograms();
    return this._findGroup(name);
  }
  async _deleteGroup(g) {
    await this._hass.callService("todo", "remove_item", { item: g.uid }, { entity_id: this._config.programs });
    await this._loadPrograms();
  }
  // Remember a custom lunar location on the group so a later sync can copy it.
  _rememberLoc(lat, lon, place) {
    const g = this._targetGroup();
    if (!g || !this._config.programs) return;
    g.loc = { lat, lon, place: place.slice(0, 63) };
    this._hass.callService("todo", "update_item", { item: g.uid, description: this._groupDesc(g) }, { entity_id: this._config.programs })
      .catch((e) => console.warn("reef-light-card: could not save group location", e));
  }

  // ---- editor -------------------------------------------------------------------------
  _openEditor(hex, name) {
    const src = hex ? { curve: parseCurve(hex), from: name } : this._liveCurve();
    const c = src.curve || { header: 0x32, points: [] };
    this._draft = { header: c.header, points: c.points.map((p) => ({ slot: p.slot, v: p.v.slice() })) };
    this._dirty = !!hex;
    this._sel = null;
    this._source = src.from;
    this._status = hex ? `Loaded "${name}" · Save to lights to apply it` : "";
    const nm = this.shadowRoot.querySelector(".d-editor .pname");
    nm.value = name || this._programName(buildCurve(c.header, c.points)) || "";
    this._renderEditor();
    this.shadowRoot.querySelector(".d-editor").showModal();
  }
  _closeEditor() {
    if (this._dirty && !confirm("Discard unsaved changes to the program?")) return;
    this._dirty = false;
    this._drag = null;
    this.shadowRoot.querySelector(".d-editor").close();
  }
  _sortKeepSel() {
    const sel = this._sel != null ? this._draft.points[this._sel] : null;
    this._draft.points.sort((a, b) => a.slot - b.slot);
    this._sel = sel ? this._draft.points.indexOf(sel) : null;
  }
  _slotFree(slot, except) { return !this._draft.points.some((p, i) => i !== except && p.slot === slot); }
  _markDirty() { this._dirty = true; this._status = ""; }
  _flash(msg) { this._status = msg; this._renderEditor(); }
  _addPointAt(slot) {
    const pts = this._draft.points;
    if (pts.length >= this._config.max_points) return this._flash(`Max ${this._config.max_points} points`);
    slot = clamp(Math.round(slot), 0, 95);
    if (!this._slotFree(slot)) {
      let found = null;
      for (let d = 1; d < 96 && found == null; d++) {
        if (slot + d <= 95 && this._slotFree(slot + d)) found = slot + d;
        else if (slot - d >= 0 && this._slotFree(slot - d)) found = slot - d;
      }
      if (found == null) return;
      slot = found;
    }
    pts.push({ slot, v: interp(pts, slot * SLOT_MIN) });
    this._sel = pts.length - 1;
    this._sortKeepSel();
    this._markDirty();
    this._renderEditor();
  }
  _addPointInLargestGap() {
    const pts = this._draft.points;
    if (pts.length < 2) return this._addPointAt(pts.length ? clamp(pts[0].slot + 4, 0, 95) : 48);
    let best = 0, gap = -1;
    for (let i = 0; i < pts.length - 1; i++) { const g = pts[i + 1].slot - pts[i].slot; if (g > gap) { gap = g; best = i; } }
    if (gap < 2) return this._flash("No free slot between points");
    this._addPointAt((pts[best].slot + pts[best + 1].slot) / 2);
  }
  _deleteSel() {
    if (this._sel == null) return;
    if (this._draft.points.length <= 2) return this._flash("Keep at least 2 points");
    this._draft.points.splice(this._sel, 1);
    this._sel = null;
    this._markDirty();
    this._renderEditor();
  }
  _revert() {
    const c = this._liveCurve().curve;
    this._draft = { header: c.header, points: c.points.map((p) => ({ slot: p.slot, v: p.v.slice() })) };
    this._dirty = false; this._sel = null; this._status = "Reverted to what the light is running";
    this._renderEditor();
  }
  async _saveToLights() {
    const hex = buildCurve(this._draft.header, this._draft.points);
    this._flash("Saving…");
    try {
      const n = await this._sendCurve(hex);
      this._rememberProg(this.shadowRoot.querySelector(".d-editor .pname").value.trim(), hex);
      this._dirty = false;
      this._flash(`Sent to ${n} light${n > 1 ? "s" : ""}`);
    } catch (e) { this._flash(`Failed: ${e.message || e}`); }
  }
  async _saveAsProgram() {
    const name = this.shadowRoot.querySelector(".d-editor .pname").value.trim();
    const ent = this._config.programs;
    if (!name) return this._flash("Type a name for the program first");
    if (!ent || !this._hass.states[ent]) return this._flash(`Program list ${ent} not found`);
    if (PRESETS.some((p) => p.name.toLowerCase() === name.toLowerCase())) return this._flash("That name belongs to a built-in program");
    const hex = buildCurve(this._draft.header, this._draft.points);
    const existing = this._custom.find((p) => p.name.toLowerCase() === name.toLowerCase());
    try {
      if (existing) {
        if (!confirm(`Replace the saved program "${existing.name}"?`)) return;
        await this._hass.callService("todo", "update_item", { item: existing.uid, description: PROGRAM_TAG + hex }, { entity_id: ent });
      } else {
        await this._hass.callService("todo", "add_item", { item: name, description: PROGRAM_TAG + hex }, { entity_id: ent });
      }
      await this._loadPrograms();
      this._flash(`Saved as "${name}"${this._dirty ? " · not sent to the lights yet" : ""}`);
    } catch (e) { this._flash(`Couldn't save: ${e.message || e}`); }
  }

  _svgPoint(ev) {
    const svg = this.shadowRoot.querySelector(".d-editor svg.chart");
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  _onDown(ev) {
    const t = ev.target;
    if (t.dataset && t.dataset.idx != null) {
      ev.preventDefault();
      this._sel = +t.dataset.idx;
      const start = this._svgPoint(ev);
      // axis stays null until the pointer moves, then locks to time ("x") or level ("y")
      this._drag = { idx: +t.dataset.idx, ch: +t.dataset.ch, sx: start.x, sy: start.y, axis: null };
      const svg = this.shadowRoot.querySelector(".d-editor svg.chart");
      svg.setPointerCapture && svg.setPointerCapture(ev.pointerId);
      this._renderEditor();
    }
  }
  _onMove(ev) {
    if (!this._drag) return;
    const p = this._svgPoint(ev), d = this._drag, pt = this._draft.points[d.idx];
    if (!pt) return;
    if (!d.axis) {
      const dx = Math.abs(p.x - d.sx), dy = Math.abs(p.y - d.sy);
      if (Math.max(dx, dy) < 6) return;
      d.axis = dx > dy ? "x" : "y";
    }
    let changed = false;
    if (d.axis === "x") {
      const slot = clamp(Math.round(((p.x - PL) / CW) * 96), 0, 95);
      const prev = this._draft.points[d.idx - 1], next = this._draft.points[d.idx + 1];
      const ns = clamp(slot, prev ? prev.slot + 1 : 0, next ? next.slot - 1 : 95);
      if (ns !== pt.slot) { pt.slot = ns; changed = true; }
    } else {
      const val = clamp(Math.round(((PT + CH - p.y) / CH) * 100), 0, 100);
      if (ev.shiftKey) {
        const delta = val - pt.v[d.ch];
        if (delta) { pt.v = pt.v.map((x) => clamp(x + delta, 0, 100)); changed = true; }
      } else if (val !== pt.v[d.ch]) { pt.v[d.ch] = val; changed = true; }
    }
    if (changed) { this._markDirty(); this._renderEditor(); }
  }
  _onUp() { if (this._drag) { this._drag = null; this._renderEditor(); } }

  // ---- programs page ------------------------------------------------------------------
  _openPrograms() {
    this._pick = null;
    this.shadowRoot.querySelector(".d-programs .status").textContent = "";
    this._loadPrograms();
    this._renderPrograms();
    this.shadowRoot.querySelector(".d-programs").showModal();
  }
  async _applyPick() {
    const p = this._pick;
    if (!p) return;
    const st = this.shadowRoot.querySelector(".d-programs .status");
    st.textContent = "Sending…";
    try {
      const n = await this._sendCurve(normHex(p.hex));
      this._rememberProg(p.name, p.hex);
      st.textContent = `"${p.name}" is now running on ${n} light${n > 1 ? "s" : ""}`;
    } catch (e) { st.textContent = `Failed: ${e.message || e}`; }
  }
  async _deletePick() {
    const p = this._pick;
    if (!p || !p.uid || !confirm(`Delete the saved program "${p.name}"?`)) return;
    try {
      await this._hass.callService("todo", "remove_item", { item: p.uid }, { entity_id: this._config.programs });
      this._pick = null;
      await this._loadPrograms();
    } catch (e) { this.shadowRoot.querySelector(".d-programs .status").textContent = `Couldn't delete: ${e.message || e}`; }
  }

  // ---- group page ---------------------------------------------------------------------
  _openGroup() {
    if (!this._hass.states[this._config.programs]) return this._lunarMsg(`Groups need the To-do list ${this._config.programs}`);
    const g = this._targetGroup() || this._groups[0];
    this._editGroup(g ? g.uid : "");
    this.shadowRoot.querySelector(".d-group .g-status").textContent = "";
    this.shadowRoot.querySelector(".d-group").showModal();
  }
  _editGroup(uid) {
    const g = this._groups.find((x) => x.uid === uid);
    this._gEdit = g ? { uid: g.uid, name: g.name, members: new Set(g.members) } : { uid: null, name: "", members: new Set() };
    this.shadowRoot.querySelector(".d-group .g-name").value = this._gEdit.name;
    this._renderGroup();
  }
  _renderGroup() {
    const r = this.shadowRoot, dlg = r.querySelector(".d-group"), ge = this._gEdit;
    if (!ge) return;
    const chips = dlg.querySelector(".g-chips");
    chips.innerHTML = "";
    for (const g of this._groups) {
      const b = document.createElement("button");
      b.className = g.uid === ge.uid ? "on" : "";
      b.textContent = `${g.name} · ${g.members.length} light${g.members.length === 1 ? "" : "s"}`;
      b.addEventListener("click", () => { this._editGroup(g.uid); dlg.querySelector(".g-status").textContent = ""; });
      chips.appendChild(b);
    }
    const nb = document.createElement("button");
    nb.className = ge.uid ? "" : "on";
    nb.textContent = "+ New group";
    nb.addEventListener("click", () => { this._editGroup(""); dlg.querySelector(".g-status").textContent = ""; setTimeout(() => dlg.querySelector(".g-name").focus(), 0); });
    chips.appendChild(nb);
    const list = dlg.querySelector(".g-list");
    const all = this._allDevices();
    list.innerHTML = all.length ? "" : `<div class="empty">No reef lights found in Home Assistant.</div>`;
    for (const d of all) {
      const other = this._groupOf(d.base);
      const lab = document.createElement("label");
      lab.innerHTML = `<input type="checkbox"><span class="dot${this._deviceCurve(d) ? " up" : ""}"></span><span></span>`;
      const cb = lab.querySelector("input");
      cb.checked = ge.members.has(d.base);
      cb.addEventListener("change", () => { if (cb.checked) ge.members.add(d.base); else ge.members.delete(d.base); });
      lab.lastChild.textContent = `${d.name || d.node}${!this._deviceCurve(d) ? " · offline" : ""}${other && other.uid !== ge.uid ? ` · in ${other.name}${cb.checked ? ", moves here when saved" : ""}` : ""}`;
      list.appendChild(lab);
    }
    const g = this._groups.find((x) => x.uid === ge.uid);
    dlg.querySelector(".g-del").hidden = !g;
    dlg.querySelector(".g-sync").hidden = !(g && this._groupDiff(this._byBase(g.members)).length);
    const sv = dlg.querySelector(".g-save");
    sv.disabled = !this._hass || !this._hass.states[this._config.programs];
    sv.textContent = g ? "Save group" : "Create group";
  }

  // ---- lunar --------------------------------------------------------------------------
  _call(domain, service, data) { return this._hass.callService(domain, service, data).catch((e) => this._lunarMsg(`Failed: ${e.message || e}`)); }
  _lunarMsg(t) { const el = this.shadowRoot.querySelector(".lmsg"); if (el) el.textContent = t; }
  _setLocation(lat, lon, place) {
    this._forAll((e, d) => this._call("esphome", `${d.node}_set_lunar_location`, { lat, lon, place: place.slice(0, 63) }));
    this._forAll((e) => this._call("select", "select_option", { entity_id: e.sync, option: "Location" }));
    this._phaseUi = null;
    this._rememberLoc(lat, lon, place);
    this._lunarMsg(`Location set to ${place}`);
  }
  _haPlace() { return `Home (HA): ${(this._hass.config && this._hass.config.location_name) || "Home"}`; }
  _searchPlaces(q) {
    clearTimeout(this._searchT);
    const box = this.shadowRoot.querySelector(".lresults");
    if (q.trim().length < 3) { box.innerHTML = ""; return; }
    this._searchT = setTimeout(async () => {
      if (this._searchAbort) this._searchAbort.abort();
      this._searchAbort = new AbortController();
      box.innerHTML = `<div class="mnote">Searching…</div>`;
      try {
        const r = await fetch(`https://photon.komoot.io/api/?limit=6&lang=en&q=${encodeURIComponent(q.trim())}`, { signal: this._searchAbort.signal });
        const js = await r.json();
        const seen = new Set();
        const items = (js.features || []).map((f) => {
          const p = f.properties || {};
          const label = [p.name, p.city !== p.name ? p.city : null, p.state, p.postcode, p.country].filter(Boolean).join(", ");
          return { label, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0] };
        }).filter((x) => !seen.has(x.label) && seen.add(x.label));
        box.innerHTML = items.length ? "" : `<div class="mnote">No matches</div>`;
        for (const it of items) {
          const b = document.createElement("button");
          b.className = "result";
          b.textContent = it.label;
          b.addEventListener("click", () => {
            this._setLocation(+it.lat.toFixed(4), +it.lon.toFixed(4), it.label);
            box.innerHTML = "";
            this.shadowRoot.querySelector(".lsearch").value = "";
          });
          box.appendChild(b);
        }
      } catch (e) { if (e.name !== "AbortError") box.innerHTML = `<div class="mnote">Search failed: ${esc(e.message || e)}</div>`; }
    }, 350);
  }

  // ---- building -----------------------------------------------------------------------
  _build() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        [hidden] { display: none !important; }
        ha-card { padding: 12px 14px 12px; overflow: hidden; }
        .head { display: flex; align-items: center; gap: 8px; }
        .title { font-size: 1.15rem; font-weight: 500; }
        .pnow { font-size: .8rem; color: var(--secondary-text-color); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .chip { font-size: .75rem; padding: 2px 8px; border-radius: 10px; border: 1px solid var(--rlc-line); color: var(--secondary-text-color); white-space: nowrap; }
        .chip.warn { border-color: #f59e0b; color: #f59e0b; }
        .gear { border: none; background: transparent; padding: 6px; border-radius: 50%; display: inline-flex; color: var(--secondary-text-color); }
        .gear:hover { color: var(--primary-text-color); background: rgba(127,127,127,.12); }
        .gear svg { width: 22px; height: 22px; fill: currentColor; }
        .legend { display: flex; flex-wrap: wrap; gap: 10px; font-size: .8rem; margin: 8px 0 4px; }
        .legend span { display: inline-flex; align-items: center; gap: 5px; cursor: pointer; user-select: none; }
        .legend i { width: 14px; height: 3px; border-radius: 2px; display: inline-block; }
        .legend span.hidden { opacity: .35; text-decoration: line-through; }
        .legend b { font-weight: 500; color: var(--primary-text-color); }
        svg.chart { width: 100%; height: auto; display: block; touch-action: none; }
        svg .grid { stroke: var(--divider-color); stroke-width: 1; }
        svg .lbl { fill: var(--secondary-text-color); font-size: 11px; }
        svg .now { stroke: #f59e0b; stroke-width: 1.5; stroke-dasharray: 4 3; }
        svg circle.pt { cursor: grab; stroke: var(--card-background-color, #1c1c1c); stroke-width: 2; }
        svg circle.pt.sel { stroke: var(--primary-text-color); stroke-width: 2.5; }
        ${MANUAL_CSS}
        .menu { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
        .target { display: flex; flex-direction: column; align-items: center; gap: 4px; margin: -2px 0 12px; text-align: center; }
        .target select { min-width: min(320px, 100%); font-size: .95rem; text-align: center; }
        .tline { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; min-height: 1.2em; }
        .g-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .g-chips button { border-radius: 16px; }
        .g-chips button.on { background: var(--rlc-accent); border-color: transparent; color: var(--rlc-on-accent); }
        .g-list { display: grid; gap: 6px; }
        .g-list label { display: flex; align-items: center; gap: 8px; font-size: .88rem; cursor: pointer; }
        .g-list input { accent-color: var(--accent-color, var(--primary-color)); }
        .g-list .dot { width: 8px; height: 8px; border-radius: 50%; background: #ef4444; }
        .g-list .dot.up { background: #22c55e; }
        .menu button { padding: 12px 6px; border-radius: var(--ha-border-radius-lg, 12px); display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .menu button span { font-size: .72rem; color: var(--secondary-text-color); font-weight: 400; }
        .sec { margin-top: 16px; border-top: 1px solid var(--rlc-line); padding-top: 12px; }
        .sec h4 { margin: 0 0 8px; font-size: .95rem; font-weight: 500; display: flex; align-items: center; gap: 8px; }
        .row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 6px 0; font-size: .88rem; }
        .row > label:first-child { min-width: 120px; color: var(--secondary-text-color); }
        .devs { display: flex; flex-wrap: wrap; gap: 6px; }
        .dev { display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 16px; border: 1px solid var(--rlc-line); background: var(--rlc-fill); cursor: pointer; font-size: .85rem; user-select: none; }
        .dev .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--disabled-text-color, #888); }
        .dev.on .dot { background: #22c55e; } .dev.off .dot { background: #ef4444; } .dev.na { opacity: .55; cursor: default; }
        .tgl { position: relative; width: 40px; height: 22px; flex: none; }
        .tgl input { opacity: 0; width: 0; height: 0; position: absolute; }
        .tgl span { position: absolute; inset: 0; border-radius: 11px; background: var(--rlc-fill-hover); cursor: pointer; transition: background .15s; }
        .tgl span::after { content: ""; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; border-radius: 50%; background: var(--primary-text-color); transition: transform .15s; }
        .tgl input:checked + span { background: var(--rlc-accent); }
        .tgl input:checked + span::after { transform: translateX(18px); }
        .radios { display: grid; gap: 6px; }
        .radios label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
        .radios input { accent-color: var(--accent-color, var(--primary-color)); }
        .lsearch { width: 100%; }
        .lresults { display: grid; gap: 4px; margin-top: 4px; }
        .lresults .result { text-align: left; border-color: transparent; background: transparent; padding: 6px 8px; border-radius: var(--ha-border-radius-md, 8px); font-weight: 400; }
        .lresults .result:hover { background: var(--rlc-fill); }
        .maxes { display: grid; grid-template-columns: repeat(3, minmax(60px, 1fr)); gap: 8px; }
        .maxes label { display: flex; flex-direction: column; gap: 2px; font-size: .75rem; }
        .maxes input, .num { width: 100%; }
        .num { max-width: 90px; }
        .lstat, .astat { font-size: .85rem; color: var(--secondary-text-color); font-weight: 400; }
        .accl-body input[type=range] { flex: 1; min-width: 120px; accent-color: var(--rlc-accent); }
        .aval { min-width: 64px; text-align: right; font-variant-numeric: tabular-nums; font-weight: 500; }
        .editor { display: grid; grid-template-columns: auto repeat(4, minmax(52px, 1fr)); gap: 6px; align-items: center; margin-top: 8px; font-size: .85rem; }
        .editor input { width: 100%; }
        .editor label { display: flex; flex-direction: column; gap: 2px; color: var(--secondary-text-color); font-size: .72rem; }
        .hint { font-size: .75rem; color: var(--secondary-text-color); margin-top: 6px; }
        .pname { flex: 1; min-width: 140px; }
        details { margin-top: 8px; font-size: .8rem; }
        table { border-collapse: collapse; width: 100%; font-size: .78rem; }
        td, th { padding: 3px 4px; text-align: right; border-bottom: 1px solid var(--rlc-line); }
        th:first-child, td:first-child { text-align: left; }
        tr.sel td { color: var(--accent-color, var(--primary-color)); font-weight: 500; }
        tr { cursor: pointer; }
        .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .tile { font-weight: 400; padding: 6px 6px 8px; display: flex; flex-direction: column; gap: 4px; text-align: left; border-radius: 10px; }
        .tile svg { width: 100%; height: auto; display: block; }
        .tile .tn { font-size: .82rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tile .tm { font-size: .7rem; color: var(--secondary-text-color); }
        .tile.pick { border-color: var(--rlc-accent); box-shadow: 0 0 0 1px var(--rlc-accent); }
        .tile.run .tm { color: #22c55e; }
        .tgt { font-size: .8rem; font-weight: 400; color: var(--secondary-text-color); }
        .gh { font-size: .8rem; color: var(--secondary-text-color); margin: 12px 0 6px; text-transform: uppercase; letter-spacing: .04em; }
        .empty { font-size: .8rem; color: var(--secondary-text-color); }
      </style>
      <ha-card>
        <div class="head">
          <span class="title"></span><span class="pnow"></span><span class="chip accl" hidden></span><span class="chip moon" hidden></span>
          <button class="gear" title="Settings" aria-label="Settings"><svg viewBox="0 0 24 24"><path d="${COG}"/></svg></button>
        </div>
        <div class="legend"></div>
        <svg class="chart view" viewBox="0 0 ${W} ${H}"></svg>
      </ha-card>

      <dialog class="dlg d-settings">
        <div class="mhead"><span class="dt">Settings</span><button class="x" data-close>✕</button></div>
        <div class="target">
          <select class="s-target" aria-label="Lights to control"></select>
          <div class="tline"><span class="mnote s-tnote"></span><button class="s-sync primary" hidden>Sync now</button></div>
        </div>
        <div class="menu">
          <button class="o-manual">Manual control<span>Sliders for PAR / scenes</span></button>
          <button class="o-editor">Program editor<span>Points &amp; values</span></button>
          <button class="o-programs">Programs<span>Presets &amp; saved</span></button>
          <button class="o-group">Groups<span>One per tank</span></button>
        </div>
        <div class="sec"><h4>Lights</h4><div class="devs"></div>
          <div class="row"><label>Manual timeout</label><input class="num s-timeout" type="number" min="0" max="720" step="5"> <span class="mnote">min (0 = never)</span></div>
        </div>
        <div class="sec">
          <h4><label class="tgl"><input type="checkbox" class="l-on"><span></span></label> Lunar cycle <span class="lstat"></span></h4>
          <div class="lunar">
            <div class="row"><label>Moon phase</label>
              <div class="radios">
                <label><input type="radio" name="ph" value="day1"> Start at New Moon (Day 1)</label>
                <label><input type="radio" name="ph" value="home"> <span class="homelbl">Sync to HA location</span></label>
                <label><input type="radio" name="ph" value="other"> Sync to another location</label>
              </div>
            </div>
            <div class="other">
              <input class="lsearch" type="search" placeholder="City, state, country or zip code" autocomplete="off">
              <div class="lresults"></div>
            </div>
            <div class="row"><label>Location</label><span class="lplace mnote"></span></div>
            <div class="row lmoonrow"><label>Moon there</label><span class="lmoon"></span></div>
            <div class="row"><label>Hours</label>
              <select class="l-hours"><option>Moon up</option><option>Time window</option><option>Duration</option></select>
              <span class="mnote hnote"></span>
            </div>
            <div class="row w-start"><label>Start</label><input type="time" class="l-start"></div>
            <div class="row w-end"><label>End</label><input type="time" class="l-end"></div>
            <div class="row w-dur"><label>Duration</label><input type="number" class="num l-dur" min="0.5" max="24" step="0.5"> <span class="mnote">hours</span></div>
            <div class="row"><label>Moonlight at full moon</label></div>
            <div class="maxes">${CHANNELS.map((c, i) => (c.key === "uv" ? "" : `<label style="color:${c.color}">${c.name} %<input type="number" min="0" max="100" step="1" class="l-max" data-ch="${i}"></label>`)).join("")}</div>
            <div class="hint">100% here is 10% light output. UV is never used for moonlight. Channels above 0 follow the program down and then hold at their moonlight level (scaled by the moon's phase) during the lunar hours. The other channels go to 0 as scheduled.</div>
            <div class="status lmsg"></div>
          </div>
        </div>
        <div class="sec">
          <h4><label class="tgl"><input type="checkbox" class="a-on"><span></span></label> Acclimation <span class="astat"></span></h4>
          <div class="accl-body" hidden>
            <div class="row"><label>Initial intensity</label><input type="range" class="a-init" min="1" max="100" step="1"><span class="aval a-initv"></span></div>
            <div class="row"><label>Duration</label><input type="range" class="a-days" min="2" max="99" step="1"><span class="aval a-daysv"></span></div>
            <div class="hint a-hint"></div>
          </div>
        </div>
      </dialog>

      <dialog class="dlg d-manual">
        <div class="mhead"><span class="dt">Manual control <span class="tgt"></span></span><span class="mnote">The program resumes when this closes</span></div>
        <div class="mpanel"></div>
        <div class="bar"><span class="status"></span><button class="primary" data-close>Close &amp; resume program</button></div>
      </dialog>

      <dialog class="dlg wide d-editor">
        <div class="mhead"><span class="dt">Program editor <span class="tgt"></span></span><span class="chip src"></span><button class="x e-close">✕</button></div>
        <svg class="chart edit" viewBox="0 0 ${W} ${H}"></svg>
        <div class="editor"></div>
        <div class="hint">Drag a point up/down for its level or sideways for its time (Shift moves all four channels). Double-click the chart to add a point.</div>
        <div class="bar">
          <button class="e-add">+ Point</button>
          <button class="e-del">Delete point</button>
          <button class="e-revert">Revert</button>
          <button class="e-here">Use manual levels now</button>
          <span class="status e-status"></span>
          <button class="primary e-save">Save to lights</button>
        </div>
        <div class="bar">
          <input class="pname" type="text" maxlength="40" placeholder="Program name">
          <button class="e-saveas">Save as program</button>
        </div>
        <details><summary>Point table</summary><table></table></details>
      </dialog>

      <dialog class="dlg d-group">
        <div class="mhead"><span class="dt">Groups</span><button class="x" data-close>✕</button></div>
        <div class="g-chips"></div>
        <div class="g-edit">
          <div class="row"><label>Group name</label><input class="g-name pname" type="text" maxlength="40" placeholder="e.g. Display tank, Frag tank"></div>
          <div class="gh">Lights in this group</div>
          <div class="g-list"></div>
        </div>
        <div class="hint">Make one group per tank. A light can be in one group, so ticking a light that's in another group moves it here. In Settings, pick the group at the top and everything applies to all its lights. Sync now copies the first light's program and settings to the rest.</div>
        <div class="bar">
          <span class="status g-status"></span>
          <button class="g-del danger" hidden>Delete group</button>
          <button class="g-sync" hidden>Sync now</button>
          <button class="primary g-save">Save group</button>
        </div>
      </dialog>

      <dialog class="dlg wide d-programs">
        <div class="mhead"><span class="dt">Programs <span class="tgt"></span></span><button class="x" data-close>✕</button></div>
        <div class="gh">Built-in</div><div class="tiles t-pre"></div>
        <div class="gh">Saved</div><div class="tiles t-cus"></div>
        <div class="bar">
          <span class="status"></span>
          <button class="p-del danger" hidden>Delete</button>
          <button class="p-edit" disabled>Open in editor</button>
          <button class="primary p-apply" disabled>Apply</button>
        </div>
      </dialog>`;
    const r = this.shadowRoot;
    r.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => b.closest("dialog").close()));
    const settings = r.querySelector(".d-settings");
    r.querySelector(".gear").addEventListener("click", () => { this._renderSettings(true); settings.showModal(); });

    // manual
    const man = r.querySelector(".d-manual");
    this._manual = new ManualPanel(man.querySelector(".mpanel"), () => this._targets());
    r.querySelector(".o-manual").addEventListener("click", () => {
      if (!this._manual.available(this._hass)) return this._lunarMsg("Manual control needs a light online");
      this._manual.update(this._hass);
      man.showModal();
    });
    man.addEventListener("close", () => this._manual.resume(this._hass));

    // editor
    const ed = r.querySelector(".d-editor");
    r.querySelector(".o-editor").addEventListener("click", () => this._openEditor());
    ed.addEventListener("cancel", (e) => { e.preventDefault(); this._closeEditor(); });
    r.querySelector(".e-close").addEventListener("click", () => this._closeEditor());
    const svg = ed.querySelector("svg.chart");
    svg.addEventListener("pointerdown", (e) => this._onDown(e));
    svg.addEventListener("pointermove", (e) => this._onMove(e));
    svg.addEventListener("pointerup", () => this._onUp());
    svg.addEventListener("pointercancel", () => this._onUp());
    svg.addEventListener("dblclick", (e) => {
      if (e.target.dataset && e.target.dataset.idx != null) return;
      const p = this._svgPoint(e);
      if (p.x >= PL && p.x <= PL + CW) this._addPointAt(((p.x - PL) / CW) * 96);
    });
    r.querySelector(".e-add").addEventListener("click", () => this._addPointInLargestGap());
    r.querySelector(".e-del").addEventListener("click", () => this._deleteSel());
    r.querySelector(".e-revert").addEventListener("click", () => this._revert());
    r.querySelector(".e-save").addEventListener("click", () => this._saveToLights());
    r.querySelector(".e-saveas").addEventListener("click", () => this._saveAsProgram());
    r.querySelector(".e-here").addEventListener("click", () => {
      const lv = this._manual.levels(this._hass);
      if (!lv) return this._flash("Needs a light online");
      const slot = clamp(Math.round(nowMinutes(this._tz()) / SLOT_MIN), 0, 95);
      const i = this._draft.points.findIndex((p) => p.slot === slot);
      if (i >= 0) { this._draft.points[i].v = lv.map(Math.round); this._sel = i; }
      else {
        if (this._draft.points.length >= this._config.max_points) return this._flash(`Max ${this._config.max_points} points`);
        this._draft.points.push({ slot, v: lv.map(Math.round) });
        this._sel = this._draft.points.length - 1;
        this._sortKeepSel();
      }
      this._markDirty();
      this._flash(`Point at ${fmtTime(slot)} set to the current levels`);
    });

    // programs
    const pr = r.querySelector(".d-programs");
    r.querySelector(".o-programs").addEventListener("click", () => this._openPrograms());
    r.querySelector(".p-apply").addEventListener("click", () => this._applyPick());
    r.querySelector(".p-del").addEventListener("click", () => this._deletePick());
    r.querySelector(".p-edit").addEventListener("click", () => { const p = this._pick; if (p) { pr.close(); this._openEditor(normHex(p.hex), p.name); } });

    // target + group
    r.querySelector(".s-target").addEventListener("change", (e) => { this._setTarget(e.target.value); this._renderSettings(true); this._render(); });
    const syncBtn = (btn, statusEl) => async () => {
      btn.disabled = true;
      statusEl().textContent = "Syncing…";
      try { statusEl().textContent = await this._syncGroup(); }
      catch (e) { statusEl().textContent = `Sync failed: ${e.message || e}`; }
      btn.disabled = false;
    };
    const ssync = r.querySelector(".s-sync");
    ssync.addEventListener("click", syncBtn(ssync, () => r.querySelector(".lmsg")));
    const gd = r.querySelector(".d-group");
    r.querySelector(".o-group").addEventListener("click", () => this._openGroup());
    r.querySelector(".g-name").addEventListener("input", (e) => { this._gEdit.name = e.target.value; });
    r.querySelector(".g-save").addEventListener("click", async () => {
      const st = gd.querySelector(".g-status"), name = this._gEdit.name.trim();
      if (!name) { st.textContent = "Type a name for the group"; return; }
      if (!this._gEdit.members.size) { st.textContent = "Tick at least one light"; return; }
      st.textContent = "Saving…";
      try {
        const g = await this._saveGroup(this._gEdit.uid, name, [...this._gEdit.members]);
        this._setTarget(`g:${g.name}`);
        this._editGroup(g.uid);
        const diff = this._groupDiff(this._byBase(g.members));
        gd.querySelector(".g-status").textContent = `Saved "${g.name}"${diff.length ? ` · ${diff.length} light${diff.length > 1 ? "s differ" : " differs"}, use Sync now` : ""}`;
      } catch (e) { st.textContent = `Couldn't save: ${e.message || e}`; }
    });
    r.querySelector(".g-del").addEventListener("click", async () => {
      const g = this._groups.find((x) => x.uid === this._gEdit.uid);
      if (!g || !confirm(`Delete the group "${g.name}"? The lights keep their current program and settings.`)) return;
      try { await this._deleteGroup(g); this._editGroup(""); gd.querySelector(".g-status").textContent = `Deleted "${g.name}"`; }
      catch (e) { gd.querySelector(".g-status").textContent = `Couldn't delete: ${e.message || e}`; }
    });
    const gsync = r.querySelector(".g-sync");
    gsync.addEventListener("click", async () => {
      const g = this._groups.find((x) => x.uid === this._gEdit.uid);
      if (!g) return;
      this._setTarget(`g:${g.name}`);
      await syncBtn(gsync, () => gd.querySelector(".g-status"))();
    });

    // settings: timeout + lunar
    r.querySelector(".s-timeout").addEventListener("change", (e) => this._forAll((x) => this._call("number", "set_value", { entity_id: x.timeout, value: clamp(+e.target.value || 0, 0, 720) })));
    r.querySelector(".l-on").addEventListener("change", (e) => {
      this._forAll((x) => this._call("switch", e.target.checked ? "turn_on" : "turn_off", { entity_id: x.lunar }));
      this._lunarOn = e.target.checked;
      this._lunarPending = Date.now();
      this._renderSettings();
    });
    r.querySelectorAll("input[name=ph]").forEach((rb) => rb.addEventListener("change", () => {
      const v = rb.value;
      this._phaseUi = v;
      if (v === "day1") { this._forAll((x) => this._call("select", "select_option", { entity_id: x.sync, option: "Day 1 start" })); this._lunarMsg("Cycle restarts at day 1"); this._phaseUi = null; }
      else if (v === "home") {
        const c = this._hass.config || {};
        if (c.latitude == null) return this._lunarMsg("HA has no home location set");
        this._setLocation(+(+c.latitude).toFixed(4), +(+c.longitude).toFixed(4), this._haPlace());
      } else setTimeout(() => r.querySelector(".lsearch").focus(), 0);
      this._renderSettings();
    }));
    r.querySelector(".lsearch").addEventListener("input", (e) => this._searchPlaces(e.target.value));
    r.querySelector(".l-hours").addEventListener("change", (e) => this._forAll((x) => this._call("select", "select_option", { entity_id: x.hours, option: e.target.value })));
    const setTime = (key) => (e) => { if (e.target.value) this._forAll((x) => this._call("time", "set_value", { entity_id: x[key], time: `${e.target.value}:00` })); };
    r.querySelector(".l-start").addEventListener("change", setTime("start"));
    r.querySelector(".l-end").addEventListener("change", setTime("end"));
    r.querySelector(".l-dur").addEventListener("change", (e) => this._forAll((x) => this._call("number", "set_value", { entity_id: x.duration, value: clamp(+e.target.value || 0.5, 0.5, 24) })));
    r.querySelectorAll(".l-max").forEach((inp) => inp.addEventListener("change", (e) => {
      const ch = +inp.dataset.ch;
      this._forAll((x) => x.max[ch] && this._call("number", "set_value", { entity_id: x.max[ch], value: clamp(Math.round(+e.target.value || 0), 0, 100) }));
    }));
    // acclimation
    r.querySelector(".a-on").addEventListener("change", (e) => {
      this._forAll((x) => this._call("switch", e.target.checked ? "turn_on" : "turn_off", { entity_id: x.accl }));
      this._acclOn = e.target.checked;
      this._acclPending = Date.now();
      this._renderSettings();
    });
    const acclSlider = (cls, key, lo, hi) => {
      const inp = r.querySelector(cls);
      inp.addEventListener("input", () => { this._acclEdit = { ...(this._acclEdit || {}), [key]: +inp.value }; this._renderAccl(); });
      inp.addEventListener("change", () => {
        const v = clamp(Math.round(+inp.value), lo, hi);
        this._forAll((x) => this._call("number", "set_value", { entity_id: x[key], value: v }));
        setTimeout(() => { if (this._acclEdit) delete this._acclEdit[key]; }, 4000);
      });
    };
    acclSlider(".a-init", "acclInit", 1, 100);
    acclSlider(".a-days", "acclDays", 2, 99);
    this._built = true;
  }

  // Acclimation section of Settings. Sliders show the value being dragged until the light reports it.
  _renderAccl() {
    const r = this.shadowRoot;
    const st = this._st("accl");
    if (st != null && (!this._acclPending || Date.now() - this._acclPending > 5000 || this._acclOn === (st === "on"))) {
      this._acclOn = st === "on"; this._acclPending = 0;
    }
    const has = st != null, on = !!this._acclOn;
    const tg = r.querySelector(".a-on");
    tg.checked = on;
    tg.disabled = !has;
    r.querySelector(".accl-body").hidden = !on;   // sliders only while it's on, like Lunar cycle
    const ed = this._acclEdit || {};
    const init = ed.acclInit != null ? ed.acclInit : +(this._st("acclInit") || 50);
    const days = ed.acclDays != null ? ed.acclDays : +(this._st("acclDays") || 30);
    const ai = r.querySelector(".a-init"), ad = r.querySelector(".a-days");
    if (this.shadowRoot.activeElement !== ai) ai.value = init;
    if (this.shadowRoot.activeElement !== ad) ad.value = days;
    r.querySelector(".a-initv").textContent = `${Math.round(init)}%`;
    r.querySelector(".a-daysv").textContent = `${Math.round(days)} days`;
    const step = (100 - init) / (days - 1);
    const day = +this._st("acclDay"), lvl = this._st("acclLevel");
    r.querySelector(".astat").textContent = !has ? "· needs the updated light firmware" :
      on && day ? `· day ${day} of ${Math.round(days)} · ${lvl != null ? Math.round(+lvl) : "?"}%` : "";
    r.querySelector(".a-hint").textContent = `The whole program runs at ${Math.round(init)}% on day 1 and rises ${step.toFixed(step < 10 ? 1 : 0)}% every midnight, ` +
      `reaching 100% on day ${Math.round(days)}. Then acclimation turns itself off. Changing these while it runs keeps today's day number.`;
  }

  // ---- rendering ----------------------------------------------------------------------
  _render() {
    if (!this._config || !this.shadowRoot) return;
    if (!this._built) this._build();
    const r = this.shadowRoot;
    const scope = this._scope();
    const { curve } = this._liveCurve(scope);
    const pts = curve ? curve.points : [];
    const hex = curve ? buildCurve(curve.header, curve.points) : "";
    const connected = this._connected(scope);

    r.querySelector(".title").textContent = this._config.title;
    const name = this._programName(hex, scope);
    const out = this._outOfSync(hex, scope);
    const manualOn = connected.some((d) => { const s = this._state(deviceEntities(d).manual); return s && s.state === "on"; });
    r.querySelector(".pnow").textContent = !connected.length ? "· lights offline" :
      `· ${name || "Custom program"}${manualOn ? " · manual" : ""}${out.length ? ` · ${out.length} out of sync` : ""}`;
    const ac = r.querySelector(".chip.accl");
    if (this._st("accl", 0, scope) === "on") {
      ac.hidden = false;
      const lv = this._st("acclLevel", 0, scope), dy = this._st("acclDay", 0, scope), dd = this._st("acclDays", 0, scope);
      ac.textContent = `Acclimating ${lv != null ? Math.round(+lv) + "%" : ""}`;
      ac.title = `Acclimation · day ${dy || "?"} of ${dd ? Math.round(+dd) : "?"}`;
    } else ac.hidden = true;
    const moon = r.querySelector(".moon");
    if (this._st("lunar", 0, scope) === "on") {
      moon.hidden = false;
      const il = this._st("illum", 0, scope);
      moon.textContent = `☾ ${il != null ? Math.round(+il) + "%" : "on"}`;
      moon.title = `Lunar cycle · ${this._st("phase", 0, scope) || ""} · day ${this._st("day", 0, scope) || "?"}`;
    } else moon.hidden = true;

    let live = null;
    for (const d of scope) {
      if (d.channels && d.channels.length === 4) {
        const vals = d.channels.map((id) => this._state(id));
        if (vals.every(Boolean)) { live = vals.map((s) => Math.round(+s.state)); break; }
      }
    }
    const nowMin = nowMinutes(this._tz());
    const curveNow = interp(pts, nowMin);
    const legend = r.querySelector(".legend");
    legend.innerHTML = "";
    CHANNELS.forEach((c, i) => {
      const s = document.createElement("span");
      if (this._hidden[i]) s.className = "hidden";
      s.innerHTML = `<i style="background:${c.color}"></i>${c.name} <b>${live ? live[i] : curveNow[i]}%</b>`;
      s.title = live ? "Live value from the light" : "Program value for now";
      s.addEventListener("click", () => { this._hidden[i] = !this._hidden[i]; this._render(); });
      legend.appendChild(s);
    });
    r.querySelector("svg.chart.view").innerHTML = chartSvg(pts, { hidden: this._hidden, nowMin });

    const tl = `· ${this._targetLabel()}`;
    r.querySelectorAll(".tgt").forEach((el) => { if (el.textContent !== tl) el.textContent = tl; });
    if (r.querySelector(".d-manual").open) this._manual.update(this._hass);
    if (r.querySelector(".d-settings").open) this._renderSettings();
    if (r.querySelector(".d-editor").open && !this._drag) this._renderEditorChip();
    if (r.querySelector(".d-programs").open) this._renderPrograms();
    if (r.querySelector(".d-group").open) this._renderGroup();
  }

  _renderSettings(force) {
    const r = this.shadowRoot;
    const act = r.activeElement;
    const setVal = (el, v) => { if (el && (force || el !== act) && v != null) el.value = v; };
    // target: a group or one light
    const tsel = r.querySelector(".s-target"), t = this._target();
    const opts = this._groups.map((g) => [`g:${g.name}`, `Group · ${g.name} (${this._byBase(g.members).length})`])
      .concat(this._groups.length ? [] : [["all", `All lights (${this._allDevices().length})`]])
      .concat(this._allDevices().map((d) => { const g = this._groupOf(d.base); return [`d:${d.base}`, `${d.name || d.node}${g ? ` · in ${g.name}` : ""}`]; }));
    const sig = JSON.stringify(opts);
    if (tsel.dataset.sig !== sig) { tsel.innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(""); tsel.dataset.sig = sig; }
    if (tsel !== act || force) tsel.value = t;
    const tnote = r.querySelector(".s-tnote"), tsync = r.querySelector(".s-sync");
    const g = this._targetGroup(), diff = g ? this._groupDiff() : [];
    tsync.hidden = !diff.length;
    if (g) {
      const on = this._connected().length, n = this._targets().length;
      tnote.textContent = !n ? "No lights in this group yet · use Group to add them" :
        diff.length ? `${diff.length} light${diff.length > 1 ? "s" : ""} out of sync (${[...new Set(diff.flatMap((x) => x.what))].join(", ")})` :
        `${on}/${n} online${on > 1 ? " · in sync" : ""}`;
    } else if (t.startsWith("d:")) {
      const ig = this._groupOf(t.slice(2));
      tnote.textContent = ig ? `In group ${ig.name} · changes here apply to this light only and put it out of sync` : "";
    } else tnote.textContent = this._allDevices().length > 1 ? "Changes apply to every light" : "";
    // lights
    const devs = r.querySelector(".d-settings .devs");
    devs.innerHTML = "";
    for (const d of this._targets()) {
      const p = this._state(deviceEntities(d).power);
      const el = document.createElement("div");
      el.className = "dev " + (!p ? "na" : p.state === "on" ? "on" : "off");
      el.innerHTML = `<span class="dot"></span><span></span>`;
      el.lastChild.textContent = `${d.name || d.node} · ${p ? p.state : "offline"}`;
      el.title = p ? "Tap to toggle power" : "";
      el.addEventListener("click", () => p && this._hass.callService("switch", p.state === "on" ? "turn_off" : "turn_on", { entity_id: deviceEntities(d).power }));
      devs.appendChild(el);
    }
    setVal(r.querySelector(".s-timeout"), this._st("timeout") != null ? +this._st("timeout") : null);
    r.querySelector(".o-manual").disabled = !this._manual.available(this._hass);

    this._renderAccl();
    // lunar
    const lunarSt = this._st("lunar");
    const hasLunar = lunarSt != null;
    // Follow the light, except for a few seconds after a toggle here (until the light reports back).
    if (lunarSt != null && (!this._lunarPending || Date.now() - this._lunarPending > 5000 || this._lunarOn === (lunarSt === "on"))) {
      this._lunarOn = lunarSt === "on"; this._lunarPending = 0;
    }
    const on = !!this._lunarOn;
    const tg = r.querySelector(".l-on");
    tg.checked = on;
    tg.disabled = !hasLunar;
    r.querySelector(".lunar").hidden = !on;
    r.querySelector(".lstat").textContent = !hasLunar ? "· needs the updated light firmware" :
      on ? `· day ${this._st("day") || "?"} · ${this._st("phase") || ""} · ${Math.round(+this._st("illum") || 0)}%` : "";
    if (!on) return;
    const place = this._st("place") || "Not set";
    const sync = this._st("sync");
    const cur = sync !== "Location" ? "day1" : place.startsWith("Home (HA)") ? "home" : "other";
    const ph = this._phaseUi || cur;
    r.querySelectorAll("input[name=ph]").forEach((rb) => { rb.checked = rb.value === ph; });
    const c = this._hass.config || {};
    r.querySelector(".homelbl").textContent = `Sync to HA location${c.location_name ? ` (${c.location_name})` : ""}`;
    r.querySelector(".other").hidden = ph !== "other";
    r.querySelector(".lplace").textContent = sync === "Location" ? place : "Not used (cycle counted from day 1)";
    r.querySelector(".lmoonrow").hidden = sync !== "Location";
    r.querySelector(".lmoon").textContent = this._moonTimes();
    const hours = this._st("hours") || "Time window";
    const sel = r.querySelector(".l-hours");
    setVal(sel, hours);
    sel.querySelector("option").disabled = sync !== "Location";
    r.querySelector(".hnote").textContent = hours === "Moon up" && sync !== "Location"
      ? "needs a location; until then it's on whenever the program is below the moonlight" : hours === "Moon up" ? "real moonrise to moonset" : "";
    r.querySelector(".w-start").hidden = hours === "Moon up";
    r.querySelector(".w-end").hidden = hours !== "Time window";
    r.querySelector(".w-dur").hidden = hours !== "Duration";
    const hm = (s) => s ? s.slice(0, 5) : null;
    setVal(r.querySelector(".l-start"), hm(this._st("start")));
    setVal(r.querySelector(".l-end"), hm(this._st("end")));
    setVal(r.querySelector(".l-dur"), this._st("duration") != null ? +this._st("duration") : null);
    r.querySelectorAll(".l-max").forEach((inp) => { const v = this._st("max", +inp.dataset.ch); setVal(inp, v != null ? +v : null); });
  }

  // "Moon up · sets 03:12" / "Moon down · rises tomorrow 14:40" for the lunar location.
  _moonTimes() {
    const alt = this._st("alt"), rise = this._st("rise"), set = this._st("set");
    if (alt == null && rise == null && set == null) return "Waiting for the light…";
    const when = (iso) => {
      const t = iso && new Date(iso);
      if (!t || isNaN(t)) return null;
      const tz = this._tz() || undefined, tm = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: tz });
      const days = Math.round((Date.parse(tzParts(tz, t).date) - Date.parse(tzParts(tz).date)) / 86400000);
      return days === 0 ? tm : days === 1 ? `tomorrow ${tm}` : `${t.toLocaleDateString([], { weekday: "short", timeZone: tz })} ${tm}`;
    };
    const up = alt != null ? +alt > 0.125 : null;
    const r = when(rise), s = when(set);
    if (up === true) return `Moon up · ${Math.round(+alt)}° high${s ? ` · sets ${s}` : ""}`;
    if (up === false) return `Moon down${r ? ` · rises ${r}` : ""}${s ? ` · sets ${s}` : ""}`;
    return [r && `rises ${r}`, s && `sets ${s}`].filter(Boolean).join(" · ") || "No moonrise/moonset in the next 36 h";
  }

  _renderEditorChip() {
    const r = this.shadowRoot;
    const src = r.querySelector(".d-editor .src");
    const out = this._outOfSync(buildCurve(this._draft.header, this._draft.points));
    if (!this._connected().length) { src.className = "chip src warn"; src.textContent = "Lights offline"; }
    else if (this._dirty) { src.className = "chip src warn"; src.textContent = "Unsaved"; }
    else if (out.length) { src.className = "chip src warn"; src.textContent = `${out.length} differ`; }
    else { src.className = "chip src"; src.textContent = "Running on the lights"; }
    const save = r.querySelector(".e-save");
    const n = this._connected().length;
    save.disabled = !n || (!this._dirty && !out.length);
    const tg = this._targetGroup();
    save.textContent = tg ? `Save to ${tg.name}` : n > 1 ? `Save to ${n} lights` : "Save to light";
    r.querySelector(".e-here").disabled = !this._manual.available(this._hass);
  }

  _renderEditor() {
    const r = this.shadowRoot, dlg = r.querySelector(".d-editor");
    const pts = this._draft.points;
    dlg.querySelector("svg.chart").innerHTML = chartSvg(pts, { interactive: true, sel: this._sel, nowMin: nowMinutes(this._tz()) });
    const ed = dlg.querySelector(".editor");
    if (this._sel != null && pts[this._sel] && !this._drag) {
      const p = pts[this._sel];
      ed.innerHTML = `<label>Time<input type="time" step="900" class="t" value="${fmtTime(p.slot)}"></label>` +
        CHANNELS.map((c, i) => `<label style="color:${c.color}">${c.name}<input type="number" min="0" max="100" class="c" data-ch="${i}" value="${p.v[i]}"></label>`).join("");
      ed.querySelector(".t").addEventListener("change", (e) => {
        const [hh, mm] = e.target.value.split(":").map(Number);
        const slot = clamp(Math.round((hh * 60 + mm) / SLOT_MIN), 0, 95);
        if (!this._slotFree(slot, this._sel)) return this._flash("Another point already uses that time");
        p.slot = slot; this._sortKeepSel(); this._markDirty(); this._renderEditor();
      });
      ed.querySelectorAll(".c").forEach((inp) => inp.addEventListener("change", (e) => {
        p.v[+e.target.dataset.ch] = clamp(Math.round(+e.target.value || 0), 0, 100);
        this._markDirty(); this._renderEditor();
      }));
    } else if (this._sel == null) {
      ed.innerHTML = `<span style="grid-column:1/-1;color:var(--secondary-text-color);font-size:.8rem">Select a point (on the chart or in the table) to type exact values.</span>`;
    }
    const tbl = dlg.querySelector("table");
    tbl.innerHTML = `<tr><th>Time</th>${CHANNELS.map((c) => `<th style="color:${c.color}">${c.name}</th>`).join("")}</tr>` +
      pts.map((p, i) => `<tr data-i="${i}" class="${i === this._sel ? "sel" : ""}"><td>${fmtTime(p.slot)}</td>${p.v.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("");
    tbl.querySelectorAll("tr[data-i]").forEach((tr) => tr.addEventListener("click", () => { this._sel = +tr.dataset.i; this._renderEditor(); }));
    r.querySelector(".e-del").disabled = this._sel == null;
    r.querySelector(".e-add").disabled = pts.length >= this._config.max_points;
    r.querySelector(".e-revert").disabled = !this._dirty;
    r.querySelector(".e-saveas").disabled = !this._hass || !this._hass.states[this._config.programs];
    r.querySelector(".e-status").textContent = this._status ||
      `${pts.length}/${this._config.max_points} points${this._source ? ` · from ${this._source}` : ""}`;
    this._renderEditorChip();
  }

  _renderPrograms() {
    const r = this.shadowRoot, dlg = r.querySelector(".d-programs");
    const { curve } = this._liveCurve();
    const running = curve ? buildCurve(curve.header, curve.points) : "";
    const tile = (p) => {
      const c = parseCurve(p.hex);
      const b = document.createElement("button");
      const isRun = normHex(p.hex) === running && this._connected().length;
      b.className = `tile${this._pick && this._pick.name === p.name && this._pick.uid === p.uid ? " pick" : ""}${isRun ? " run" : ""}`;
      b.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${chartSvg(c ? c.points : [], { mini: true })}</svg><span class="tn"></span><span class="tm"></span>`;
      b.querySelector(".tn").textContent = p.name;
      b.querySelector(".tm").textContent = isRun ? "Running now" : c ? `${c.points.length} points · ${fmtTime(c.points[0].slot)}–${fmtTime(c.points[c.points.length - 1].slot)}` : "invalid";
      b.title = p.name;
      b.addEventListener("click", () => { this._pick = p; dlg.querySelector(".status").textContent = `Selected: ${p.name}`; this._renderPrograms(); });
      return b;
    };
    const pre = dlg.querySelector(".t-pre"), cus = dlg.querySelector(".t-cus");
    pre.innerHTML = ""; cus.innerHTML = "";
    PRESETS.forEach((p) => pre.appendChild(tile(p)));
    if (!this._hass || !this._hass.states[this._config.programs]) cus.innerHTML = `<div class="empty">Program list ${esc(this._config.programs)} not found.</div>`;
    else if (!this._custom.length) cus.innerHTML = `<div class="empty">Nothing saved yet. In the Program editor, type a name and use "Save as program".</div>`;
    else this._custom.forEach((p) => cus.appendChild(tile(p)));
    const p = this._pick;
    const ap = dlg.querySelector(".p-apply");
    ap.disabled = !p || !this._connected().length;
    ap.textContent = `Apply to ${this._targetLabel()}`;
    dlg.querySelector(".p-edit").disabled = !p;
    dlg.querySelector(".p-del").hidden = !(p && p.uid);
    const st = dlg.querySelector(".status");
    if (!st.textContent || !p) st.textContent = p ? `Selected: ${p.name}` : "Tap a program to apply it, or open it in the editor";
  }
}

if (!customElements.get("reef-light-sliders-card")) {
  customElements.define("reef-light-sliders-card", ReefLightSlidersCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "reef-light-sliders-card", name: "Reef Light Sliders", description: "Manual channel levels; the program resumes when the card closes" });
}
if (!customElements.get("reef-light-card")) {
  customElements.define("reef-light-card", ReefLightCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: "reef-light-card", name: "Reef Light Card", description: "Program view with settings, editor, programs and lunar cycle for Tuya reef lights on ESPHome", preview: true });
  console.info(`%c REEF-LIGHT-CARD %c v${RLC_VERSION} `, "background:#06b6d4;color:#000", "");
}
