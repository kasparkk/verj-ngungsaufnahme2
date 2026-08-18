import { useState } from "react";
import { farben } from "../konfiguration.js";

/* Standorte der Probekreise.

   Im Vordergrund steht der Weg zur echten Karte: je Kreis ein Knopf, der
   Google Maps oeffnet - dort gibt es Wege, Hoehenlinien und Navigation.

   Die Lageskizze darunter ist ausklappbar. Sie zeichnet nur die Lage der
   Kreise zueinander, dafuer ohne Netz: Kartenkacheln kaemen aus dem Internet,
   und im Bestand ist oft keins da. Praktisch, um die Abdeckung der Flaeche zu
   sehen oder eine verunglueckte Ortung zu erkennen. */

const HOEHE = 150;
const RAND = 18;

// Meter je Grad - fuer die kleinen Abstaende einer Aufnahme genau genug.
const METER_JE_BREITENGRAD = 110540;
const METER_JE_LAENGENGRAD = 111320;

/* Google Maps statt einer geraetespezifischen Adresse: das oeffnet auf
   Android die Maps-App, auf dem iPhone Maps oder den Browser, und am Rechner
   einfach die Seite - ein Link, der ueberall ankommt. */
export const kartenLink = (lat, lon) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

// Runder Wert fuer den Massstabsbalken.
function netteLaenge(meter) {
  const stufen = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000];
  return stufen.filter((s) => s <= meter).pop() ?? 1;
}

function Lageskizze({ punkte }) {
  const breite = 520; // Zeichenbreite; die Anzeige skaliert per viewBox mit
  const latMittel = punkte.reduce((s, p) => s + p.lat, 0) / punkte.length;
  const lonMittel = punkte.reduce((s, p) => s + p.lon, 0) / punkte.length;
  const kosB = Math.cos((latMittel * Math.PI) / 180);

  // In Meter umrechnen, Norden oben (groessere Breite = weiter oben).
  const meter = punkte.map((p) => ({
    nr: p.nr,
    acc: p.acc,
    x: (p.lon - lonMittel) * kosB * METER_JE_LAENGENGRAD,
    y: -(p.lat - latMittel) * METER_JE_BREITENGRAD,
  }));

  const minX = Math.min(...meter.map((m) => m.x));
  const maxX = Math.max(...meter.map((m) => m.x));
  const minY = Math.min(...meter.map((m) => m.y));
  const maxY = Math.max(...meter.map((m) => m.y));
  // Mindestausdehnung, damit ein einzelner Punkt (oder eine Reihe) nicht entartet.
  const spanne = Math.max(maxX - minX, maxY - minY, 20);

  const nutzbar = Math.min(breite, HOEHE) - 2 * RAND;
  const proMeter = nutzbar / spanne;
  const mitteX = (minX + maxX) / 2;
  const mitteY = (minY + maxY) / 2;

  const px = (m) => breite / 2 + (m.x - mitteX) * proMeter;
  const py = (m) => HOEHE / 2 + (m.y - mitteY) * proMeter;

  const balkenMeter = netteLaenge(spanne / 3);
  const balkenPx = balkenMeter * proMeter;

  return (
    <>
      <div
        style={{
          border: `1px solid ${farben.line}`,
          borderRadius: 10,
          background: farben.surface,
          overflow: "hidden",
          marginTop: 10,
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
          <g transform={`translate(20, ${HOEHE - 14})`}>
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

      <div style={{ fontSize: 10, color: farben.muted, margin: "6px 2px 0", lineHeight: 1.5 }}>
        Lage der Probekreise zueinander, Norden oben – ohne Kartenhintergrund, damit es auch ohne
        Empfang funktioniert.
      </div>
    </>
  );
}

export default function StandortKarte({ kreise }) {
  const [skizzeOffen, setSkizzeOffen] = useState(false);
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

  return (
    <div style={{ marginBottom: 14 }}>
      {punkte.map((p, i) => (
        <a
          key={p.nr}
          href={kartenLink(p.lat, p.lon)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 4px",
            borderTop: i === 0 ? "none" : `1px solid ${farben.line}`,
            color: farben.text,
            textDecoration: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <div style={{ fontWeight: 700, width: 20, fontSize: 15 }}>{p.nr}</div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              color: farben.muted,
              fontSize: 12,
              fontVariantNumeric: "tabular-nums",
              // Lieber abschneiden als umbrechen - sonst rutschen die Zeilen
              // unterschiedlich hoch und die Knoepfe stehen versetzt.
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {p.lat.toFixed(5)}, {p.lon.toFixed(5)}
            {p.acc != null ? ` · ±${Math.round(p.acc)} m` : ""}
          </div>
          <div
            style={{
              background: farben.unverb,
              color: farben.bg,
              borderRadius: 10,
              padding: "13px 18px",
              fontSize: 15,
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}
          >
            Google Maps
          </div>
        </a>
      ))}

      <button
        onClick={() => setSkizzeOffen(!skizzeOffen)}
        style={{
          width: "100%",
          background: "transparent",
          border: `1px solid ${farben.line}`,
          color: farben.muted,
          borderRadius: 10,
          padding: "8px 0",
          fontSize: 12,
          marginTop: 12,
          cursor: "pointer",
        }}
      >
        {skizzeOffen ? "Lageskizze ausblenden" : "Lageskizze anzeigen (ohne Netz)"}
      </button>

      {skizzeOffen && <Lageskizze punkte={punkte} />}
    </div>
  );
}
