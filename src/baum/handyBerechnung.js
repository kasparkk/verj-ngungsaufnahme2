export function messzahl(wert) {
  if (String(wert).trim() === "") return NaN;
  return Number(String(wert).replace(",", "."));
}

export function baumhoehe(distanz, fuss, spitze) {
  const d = messzahl(distanz), f = messzahl(fuss), s = messzahl(spitze);
  if (![d, f, s].every(Number.isFinite) || d <= 0 || f <= -85 || s >= 85 || s <= f) return null;
  const h = d * (Math.tan(s * Math.PI / 180) - Math.tan(f * Math.PI / 180));
  return Number.isFinite(h) && h > 0 ? h : null;
}

// Rear camera looks along the negative device Z axis. In portrait its
// vertical component is -cos(beta) * cos(gamma).
export function neigung(beta, gamma) {
  if (![beta, gamma].every(Number.isFinite) || beta < 0 || beta > 180 || Math.abs(gamma) > 15) return null;
  return Math.asin(-Math.cos(beta * Math.PI / 180) * Math.cos(gamma * Math.PI / 180)) * 180 / Math.PI;
}

export function durchmesser(umfang) {
  const u = messzahl(umfang);
  return Number.isFinite(u) && u > 0 ? u / Math.PI : null;
}
