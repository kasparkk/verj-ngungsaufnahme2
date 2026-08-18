import { farben } from "../konfiguration.js";

/* Zeigt die erfassten Probekreis-Standorte.

   Bewusst OHNE Kartenhintergrund: Kartenkacheln kaemen aus dem Netz, und die
   App soll im Wald auch ohne Empfang etwas anzeigen. Gezeichnet wird deshalb
   die Lage der Kreise zueinander - Norden oben, mit Massstab. Wer die echte
   Karte braucht, tippt einen Punkt an und landet in der Karten-App des
   Geraets (die offline gespeicherte Karten nutzen kann). */

const HOEHE = 220;
const RAND = 26;

// Meter je Grad - fuer die kleinen Abstaende einer Aufnahme genau genug.
const METER_JE_BREITENGRAD = 110540;
const METER_JE_LAENGENGRAD = 111320;

const istApple = () =>
  typeof navigator !== "undefined" && /iPad|iPhone|iPod|Macintosh/.test(navigator.userAgent);

// Apple-Geraete kennen kein geo:, Android oeffnet damit die Karten-App (auch offline).
export const kartenLink = (lat, lon, nr) =>
  istApple()
    ? `https://maps.apple.com/?q=${lat},${lon}`
    : `geo:${lat},${lon}?q=${lat},${lon}(Probekreis ${nr})`;

// Runder Wert fuer den Massstabsbalken.
function netteLaenge(meter) {
  const stufen = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  return stufen.filter((s) => s <= meter).pop() ?? 1;
}

export default function StandortKarte({ kreise }) {
  const punkte = kreise.filter((k) => k.lat != null && k.lon != null);

  if (!punkte.length) {
    return (
      <div
        style={{
          border: `1px solid ${farben.line}`,
          borderRadius: 10,
          padding: "14px",
          marginBottom: 14,
          fontSize: 13,
          color: farben.muted,
          lineHeight: 1.5,
        }}
      >
        Für diesen Tag ist noch kein Standort erfasst. Beim Probekreis oben auf
        „📍 Standort erfassen“ tippen.
      </div>
    );
  }

  const breite = 520; // Zeichenbreite; die Anzeige skaliert per viewBox mit
  const latMittel = punkte.reduce((s, p) => s + p.lat, 0) / punkte.length;
  const lonMittel = punkte.reduce((s, p) => s + p.lon, 0) / punkte.length;
  const kosB = Math.cos((latMittel * Math.PI) / 180);

  // In Meter umrechnen, Norden oben (groessere Breite = weiter oben).
  const meter = punkte.map((p) => ({
    nr: p.nr,
    acc: p.acc,
    lat: p.lat,
    lon: p.lon,
    x: (p.lon - lonMittel) * kosB * METER_JE_LAENGENGRAD,
    y: -(p.lat - latMittel) * METER_JE_BREITENGRAD,
  }));

  const spanneX = Math.max(...meter.map((m) => m.x)) - Math.min(...meter.map((m) => m.x));
  const spanneY = Math.max(...meter.map((m) => m.y)) - Math.min(...meter.map((m) => m.y));
  // Mindestausdehnung, damit ein einzelner Punkt (oder eine Reihe) nicht entartet.
  const spanne = Math.max(spanneX, spanneY, 20);

  const nutzbar = Math.min(breite, HOEHE) - 2 * RAND;
  const proMeter = nutzbar / spanne;
  const mitteX = (Math.min(...meter.map((m) => m.x)) + Math.max(...meter.map((m) => m.x))) / 2;
  const mitteY = (Math.min(...meter.map((m) => m.y)) + Math.max(...meter.map((m) => m.y))) / 2;

  const px = (m) => breite / 2 + (m.x - mitteX) * proMeter;
  const py = (m) => HOEHE / 2 + (m.y - mitteY) * proMeter;

  const balkenMeter = netteLaenge(spanne / 3);
  const balkenPx = balkenMeter * proMeter;

  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          border: `1px solid ${farben.line}`,
          borderRadius: 10,
          background: farben.surface,
          overflow: "hidden",
        }}
      >
        <svg viewBox={`0 0 ${breite} ${HOEHE}`} style={{ width: "100%", display: "block" }}>
          {/* Norden */}
          <g transform={`translate(${breite - 26}, 22)`}>
            <line x1="0" y1="12" x2="0" y2="-8" stroke={farben.muted} strokeWidth="1.5" />
            <polygon points="0,-13 -4,-5 4,-5" fill={farben.muted} />
            <text x="0" y="26" fill={farben.muted} fontSize="11" textAnchor="middle">N</text>
          </g>

          {/* Massstab */}
          <g transform={`translate(20, ${HOEHE - 18})`}>
            <line x1="0" y1="0" x2={balkenPx} y2="0" stroke={farben.muted} strokeWidth="2" />
            <line x1="0" y1="-4" x2="0" y2="4" stroke={farben.muted} strokeWidth="2" />
            <line x1={balkenPx} y1="-4" x2={balkenPx} y2="4" stroke={farben.muted} strokeWidth="2" />
            <text x={balkenPx / 2} y="-8" fill={farben.muted} fontSize="11" textAnchor="middle">
              {balkenMeter} m
            </text>
          </g>

          {meter.map((m) => (
            <g key={m.nr}>
              {/* Genauigkeit der Ortung, sofern sie sichtbar ins Bild passt */}
              {m.acc != null && m.acc * proMeter > 3 && (
                <circle
                  cx={px(m)}
                  cy={py(m)}
                  r={Math.min(m.acc * proMeter, nutzbar)}
                  fill={farben.unverb}
                  opacity="0.1"
                />
              )}
              <circle cx={px(m)} cy={py(m)} r="6" fill={farben.unverb} />
              <text
                x={px(m)}
                y={py(m) - 11}
                fill={farben.text}
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
              >
                {m.nr}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div style={{ fontSize: 10, color: farben.muted, margin: "6px 2px 8px", lineHeight: 1.5 }}>
        Lage der Probekreise zueinander, Norden oben – ohne Kartenhintergrund, damit es auch ohne
        Empfang funktioniert. Punkt antippen öffnet die Karten-App.
      </div>

      {meter.map((m) => (
        <a
          key={m.nr}
          href={kartenLink(m.lat, m.lon, m.nr)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 10px",
            borderTop: `1px solid ${farben.line}`,
            fontSize: 13,
            color: farben.text,
            textDecoration: "none",
          }}
        >
          <div style={{ fontWeight: 700, width: 22 }}>{m.nr}</div>
          <div style={{ flex: 1, color: farben.muted, fontVariantNumeric: "tabular-nums" }}>
            {m.lat.toFixed(5)}, {m.lon.toFixed(5)}
            {m.acc != null ? ` · ±${Math.round(m.acc)} m` : ""}
          </div>
          <div style={{ color: farben.unverb }}>Karte ›</div>
        </a>
      ))}
    </div>
  );
}
