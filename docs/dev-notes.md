# Developer notes

How the firmware and card work, for anyone changing them. To install and flash, see [flashing.md](flashing.md).
Never commit `esphome/secrets.yaml`, built `.uf2` files or stock flash backups. All of them contain private details.

## Hardware
- Tuya CBU (BK7231N) driving the LEDs directly by PWM. There's **no separate MCU**: nothing answered on UART1 or UART2.
- Pins: **P8 White, P7 UV, P6 Blue, P26 CyanBlue**. Higher duty is brighter.
- **An undriven pin floats to full on.** LibreTiny's `analogWrite(0)` releases the pin, so the firmware drives 0% as a
  GPIO held LOW (see `apply_curve`). An exact 100% duty glitched, so `max_power` is 0.995.
- Never leave pins floating during experiments. A pin-finding test once lit a light at full brightness.

## Flashing (first time, over serial)
Full steps are in [flashing.md](flashing.md).
- OpenIOTFlasher on Windows with a 3.3 V USB-serial adapter (e.g. SparkFun Serial Basic).
- Module pins: 15 = TX1, 16 = RX1, 18 = CEN, 14 = 3V3, 13 = GND. The board's silkscreen labels "P15/P16" are GPIO names,
  **not** these pins.
- Resetting by tapping CEN to ground is finicky. Once the chip is in download mode, it stays there for the backups and
  the ESPHome flash, as long as nothing gets disconnected.
  - If CEN doesn't work, pull the 3V3 lead and plug it back in. OpenIOTFlasher errors out saying the COM port
    disconnected. Start the backup again and it begins instantly.
- Back up twice and compare the SHA256 hashes.

## Building and OTA
```bash
python -m venv venv && venv/bin/pip install esphome   # tested with 2026.11.x
cd esphome
../venv/bin/esphome -s name reeflight-1 -s friendly_name "Reef Light 1" compile reeflight.yaml
../venv/bin/esphome -s name reeflight-1 -s friendly_name "Reef Light 1" upload reeflight.yaml --device <light-ip>
```
- `secrets.yaml` needs `wifi_ssid`, `wifi_password`, `ap_password` and `api_key`. Copy `secrets.example.yaml` to start.
- Every light uses the same `reeflight.yaml`. Set the name (and `timezone`) per build with `-s`. Never flash one
  light's `.uf2` onto another.
- Restored settings (curve, lunar options, acclimation, timeout) survive OTA. `initial_value`s only apply to a fresh light.
- Node `reeflight-N` gives HA entity IDs `reef_light_N_*` and services `esphome.reeflight_n_*`.
- After renaming a light, HA can keep routing `esphome.<old-name>_*` services to the old device until the new owner's
  config entry is reloaded.
- In HA, leave the area blank when adding a light, and set it afterwards. Picking an area in the add dialog prefixes
  every entity ID (`aquarium_reef_light_N_*`).
- Bump `esphome.project.version` in `reeflight.yaml` when the firmware changes. It shows on each HA device page.

## Firmware model (`esphome/reeflight.yaml`)
- **Curve:** Tuya DP107 format, `[0x32, N, N × (slot15min, W, UV, B, CB)]`. It's stored on the light (restored
  global), set with the `esphome.<node>_set_curve(hex)` action, and published as `sensor.<light>_curve`.
- **`apply_curve`** runs every 1 s, in this order:
  1. Interpolate the curve.
  2. Acclimation: the program × today's level (`accl_scale`), while `switch.<light>_acclimation` is on.
  3. Lunar blend: `max(program, lunar_max × 0.1 × illumination × fade)` per channel. A lunar max of 100% is 10% output,
     and UV is skipped.
  4. Manual override.
  5. Power.
- **Manual:** moving a `number.<light>_*_level` slider turns on `switch.<light>_manual_override`. It ends by itself
  after `number.<light>_manual_timeout` minutes (default 5).
- **Lunar** (`moon.h`): low-precision ephemeris, checked against known new and full moons and an independent altitude
  calculation.
  - Sync is **Day 1 start** (its own 29.53-day cycle from when it's turned on) or **Location** (the real moon).
  - The location defaults to HA's `zone.home` and follows it while the place name starts with "Home (HA)".
  - Set another place with `esphome.<node>_set_lunar_location(lat, lon, place)`.
  - Hours: Moon up (altitude > 0.125°), Time window, or Duration.
  - Next moonrise and moonset are timestamp text sensors. Float sensors can't hold Unix times precisely.
- **Acclimation:** day 1 is stored as a local day number (`accl_start_day`, days since 1970 via `days_from_civil` in
  `moon.h`), so it survives reboots and steps at local midnight.
  Level = init + (100 − init) × (day − 1) / (days − 1). `accl_calc` runs every minute and turns the switch off after the
  last day. `esphome.<node>_set_acclimation_day(day)` puts a light on a given day (used by group sync).
- **Sensor publishing:** lunar and acclimation sensors are published as soon as anything changes. Avoid polled
  template sensors for anything the UI shows right after a change.
- **Time:** from HA, with SNTP as a fallback. The `timezone` substitution is used by both.

## Card (`card/reef-light-card.js`)
- Dependency-free custom elements: `reef-light-card` (read-only view, plus the gear → Settings, Manual, Editor and
  Programs pop-ups) and `reef-light-sliders-card`. Bump `RLC_VERSION`; the browser console shows which version loaded.
- Entity IDs are derived from each device's `curve` entity (`deviceEntities()`). Lights are discovered by
  `discoverDevices()`: a `sensor.<base>_curve` next to a `switch.<base>_manual_override`, with the node matched from
  the `esphome.*_set_curve` services ignoring underscores (`reef_light_1` ↔ `reeflight_1`).
- **Saved programs:** the Local To-do list (`programs:`, e.g. `todo.reef_programs`) holds one item per program, with
  summary = name and description = `reeflight-curve:<hex>`.
- **Groups** are items in the same list with description
  `reeflight-group:{"members":[<base>...],"loc":{lat,lon,place},"prog":{name,hex}}`. A light is in one group. Members
  are identified by entity prefix (`base`). `prog` remembers the name of the last program sent to the group, so the main
  view can show it.
- **Targets:** the Settings dropdown (`_target()`: `g:<group>`, `d:<base>` or `all`, remembered in localStorage)
  decides what Manual, Editor, Programs, Lunar, Acclimation, power and timeout act on. Settings read from the target's
  first online light and write to all of its lights. The main view uses `_scope()` (the `group:` option, else all
  lights).
- **Sync now** (`_syncGroup`) copies the first online member's curve, timeout, lunar and acclimation settings to the
  others. Lights don't report lunar lat/lon, so a custom location is saved on the group when it's picked; the HA-home
  location comes from `hass.config`.
- **Theme:** colours come from HA theme variables (`--ha-color-*` with `--primary-text-color`, `--divider-color` and
  `--accent-color` fallbacks), so buttons and dropdowns follow light and dark themes.
- **Time:** the chart's "now" line uses HA's timezone (`hass.config.time_zone`), not the browser's.
- **Built-in presets:** the `PRESETS` array, captured from the Tuya app's 16 scenes. To capture another, take the
  编辑曲线 ("edit curve", DP107) base64 line from the device log. 调光 (live levels), Adapt (acclimation) and
  Month time (stock lunar) can be ignored. The first byte varies (`0x32`, `0x00`) and the firmware ignores it.
- **Testing:** `card/preview.html` mocks `hass` with three lights (one configured, two discovered). Serve it with
  `cd card && python3 -m http.server 8765` and open http://127.0.0.1:8765/preview.html.

## Facts that confuse people
- The moon's phase and % are the same everywhere on Earth. Location only changes moonrise, moonset and altitude.
- A fresh light's default program is one captured from a stock light (16 points, 04:30–20:30). It's listed in
  [tuya-datapoints.md](tuya-datapoints.md).
