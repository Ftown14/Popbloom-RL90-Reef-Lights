// Low-precision moon/sun ephemeris (Astronomical Almanac): about 0.3 degrees for the moon,
// plenty for phase, altitude and moonrise/moonset to within a couple of minutes.
#pragma once
#include <cmath>

struct MoonPos {
  double elong;  // moon minus sun ecliptic longitude, 0..360 (0 = new, 180 = full)
  double illum;  // lit fraction 0..1
  double alt;    // geocentric altitude in degrees at lat/lon
};

inline MoonPos moon_pos(double unix_t, double lat, double lon) {
  const double d = unix_t / 86400.0 + 2440587.5 - 2451545.0;
  const double T = d / 36525.0;
  auto rad = [](double x) { return x * M_PI / 180.0; };
  auto sn = [&](double a) { return sin(rad(fmod(a, 360.0))); };
  auto cs = [&](double a) { return cos(rad(fmod(a, 360.0))); };
  const double lam = 218.32 + 481267.881 * T + 6.29 * sn(135.0 + 477198.87 * T) - 1.27 * sn(259.3 - 413335.36 * T) +
                     0.66 * sn(235.7 + 890534.22 * T) + 0.21 * sn(269.9 + 954397.74 * T) -
                     0.19 * sn(357.5 + 35999.05 * T) - 0.11 * sn(186.5 + 966404.03 * T);
  const double bet = 5.13 * sn(93.3 + 483202.02 * T) + 0.28 * sn(228.2 + 960400.89 * T) -
                     0.28 * sn(318.3 + 6003.15 * T) - 0.17 * sn(217.6 - 407332.21 * T);
  const double g = 357.528 + 35999.050 * T;
  const double lsun = 280.460 + 36000.770 * T + 1.915 * sn(g) + 0.020 * sn(2 * g);
  MoonPos p;
  p.elong = fmod(lam - lsun, 360.0);
  if (p.elong < 0) p.elong += 360.0;
  p.illum = (1.0 - cs(lam - lsun) * cos(rad(bet))) / 2.0;
  const double cb = cos(rad(bet)), sb = sin(rad(bet));
  const double x = cb * cs(lam), y = 0.9175 * cb * sn(lam) - 0.3978 * sb, z = 0.3978 * cb * sn(lam) + 0.9175 * sb;
  const double ra = atan2(y, x) * 180.0 / M_PI, dec = asin(z);
  const double gmst = fmod(280.46061837 + 360.98564736629 * d, 360.0);
  const double H = rad(gmst + lon - ra), phi = rad(lat);
  p.alt = asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)) * 180.0 / M_PI;
  return p;
}

// Moonrise/moonset: the moon's upper limb at the horizon, including refraction and parallax.
static const double MOON_H0 = 0.125;

// Finds the next moonrise and moonset after `from` (within 36 h). NAN when there's none
// (possible near the poles, or when the moon doesn't rise/set that day).
inline void moon_next_events(double from, double lat, double lon, double &rise, double &set) {
  rise = NAN;
  set = NAN;
  const double step = 600.0;
  double t0 = from, f0 = moon_pos(t0, lat, lon).alt - MOON_H0;
  for (int i = 1; i <= 216 && (std::isnan(rise) || std::isnan(set)); i++) {
    const double t1 = from + i * step, f1 = moon_pos(t1, lat, lon).alt - MOON_H0;
    if ((f0 <= 0) != (f1 <= 0)) {
      double a = t0, b = t1, fa = f0;
      for (int k = 0; k < 10; k++) {
        const double m = (a + b) / 2, fm = moon_pos(m, lat, lon).alt - MOON_H0;
        if ((fa <= 0) == (fm <= 0)) { a = m; fa = fm; } else { b = m; }
      }
      const double t = (a + b) / 2;
      if (f1 > 0 && std::isnan(rise)) rise = t;
      if (f1 <= 0 && std::isnan(set)) set = t;
    }
    t0 = t1;
    f0 = f1;
  }
}

// Days since 1970-01-01 for a calendar date (Howard Hinnant's days_from_civil).
inline int32_t days_from_civil(int y, unsigned m, unsigned d) {
  y -= m <= 2;
  const int era = (y >= 0 ? y : y - 399) / 400;
  const unsigned yoe = (unsigned) (y - era * 400);
  const unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  const unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097 + (int32_t) doe - 719468;
}
