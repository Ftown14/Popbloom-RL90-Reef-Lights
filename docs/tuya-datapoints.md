# Stock Tuya datapoints (captured before reflash)

Hardware: Tuya **CBU** (BK7231N) driving the LEDs directly (no separate MCU; the app's "MCU 1.0.14" is the same firmware version).
These are the stock firmware's cloud datapoints, kept for reference. The ESPHome firmware doesn't use them, but it keeps the DP 107 curve format.
Channels: 1 White, 2 UV, 3 Blue, 4 CyanBlue. Raw DPs are Base64 over the Tuya Cloud API.

| DP | Code | Type | Captured value | Decoded |
|---|---|---|---|---|
| 101 | `switch_all` | bool | `true` | power |
| 102 | `lunar_cycle` | raw | `AQQ=` | `[1, 4]` = [enabled, moon value] |
| 103 | `mode` | enum | `curve` | 0 curve, 1 lighting, 2 fast, 3 show |
| 106 | `accalimation` | raw | `AAECZA==` | `[0, 1, 2, 100]` = [enabled, current_day, total_days, start_intensity%] |
| 107 | `edit_curve` | raw | see below | daily program |
| 108 | `Ch_data` | raw | `QEtQUw==` | `[64, 75, 80, 83]` = live W/UV/B/CB % |
| 109 | `ch_control` | raw, write-only | (empty) | manual channel control (format unconfirmed) |
| 110 | `current_time` | value, read-only, 0–96 | `63` | MCU's clock in 15-min slots (63 = 15:45) |

Enum list, access modes and DP110 range come from the schema in the flash backup (stock firmware 1.0.14, product key `keysv8we73t3unfg`).
The backup holds no TuyaMCU baud rate. ESPHome starts at 9600; confirm it from the logs.

## DP 107 `edit_curve`

```
MhASAAAAABMABAAAFQAHBwMbCRMXDR8dIy0xIyc2ODwnOURHRytGSU9NMUlQVVg8SU5UV0M4SE1QRhs7Q01JBy8wKE0AFAwFTwAKBQBSAAAAAA==
```

Layout: `[0x32 header, N points, N × (slot, W, UV, B, CB)]`, where slot = minutes / 15.
The device interpolates in straight lines between points (confirmed against the app).

| Slot | Time | White | UV | Blue | CyanBlue |
|---|---|---|---|---|---|
| 18 | 04:30 | 0 | 0 | 0 | 0 |
| 19 | 04:45 | 0 | 4 | 0 | 0 |
| 21 | 05:15 | 0 | 7 | 7 | 3 |
| 27 | 06:45 | 9 | 19 | 23 | 13 |
| 31 | 07:45 | 29 | 35 | 45 | 49 |
| 35 | 08:45 | 39 | 54 | 56 | 60 |
| 39 | 09:45 | 57 | 68 | 71 | 71 |
| 43 | 10:45 | 70 | 73 | 79 | 77 |
| 49 | 12:15 | 73 | 80 | 85 | 88 |
| 60 | 15:00 | 73 | 78 | 84 | 87 |
| 67 | 16:45 | 56 | 72 | 77 | 80 |
| 70 | 17:30 | 27 | 59 | 67 | 77 |
| 73 | 18:15 | 7 | 47 | 48 | 40 |
| 77 | 19:15 | 0 | 20 | 12 | 5 |
| 79 | 19:45 | 0 | 10 | 5 | 0 |
| 82 | 20:30 | 0 | 0 | 0 | 0 |

## Acclimation test notes
- Set on: `[1, 1, 2, 50]`. Turned off: `[0, 1, 2, 50]`. The day count and intensity are kept when it's turned off.
- Toggling had no immediate effect on `Ch_data`. It probably applies at the start of the next cycle.
