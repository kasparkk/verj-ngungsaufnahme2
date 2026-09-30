import { farben } from "../konfiguration.js";
import { kartenLink } from "../komponenten/StandortKarte.jsx";

const ausschnitt = (lat, lon) => {
  const deltaLat = 0.0042;
  const deltaLon = 0.0065;
  return [lon - deltaLon, lat - deltaLat, lon + deltaLon, lat + deltaLat]
    .map((wert) => wert.toFixed(6))
    .join(",");
};

const osmEinbettung = (lat, lon) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(ausschnitt(lat, lon))}` +
  `&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;

function KoordinatenZeile({ titel, lat, lon, aktiv }) {
  if (lat == null || lon == null) return null;

  return (
    <a
      href={kartenLink(lat, lon)}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "grid",
        gridTemplateColumns: "58px 1fr auto",
        gap: 9,
        alignItems: "center",
        padding: "10px 0",
        borderTop: `1px solid ${farben.line}`,
        color: farben.text,
        textDecoration: "none",
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, color: aktiv ? farben.unverb : farben.muted }}>
        {titel}
      </span>
      <span style={{ minWidth: 0, fontSize: 11, color: farben.muted, fontVariantNumeric: "tabular-nums" }}>
        {Number(lat).toFixed(6)}, {Number(lon).toFixed(6)}
      </span>
      <span style={{ fontSize: 11, fontWeight: 700 }}>Öffnen ↗</span>
    </a>
  );
}

export default function Karte({ punkt }) {
  const hatIst = punkt.lat != null && punkt.lon != null;
  const hatSoll = punkt.sollLat != null && punkt.sollLon != null;
  const lat = hatIst ? Number(punkt.lat) : hatSoll ? Number(punkt.sollLat) : null;
  const lon = hatIst ? Number(punkt.lon) : hatSoll ? Number(punkt.sollLon) : null;

  if (lat == null || lon == null) {
    return (
      <div
        style={{
          minHeight: 260,
          display: "grid",
          placeItems: "center",
          padding: 24,
          border: `1px dashed ${farben.line}`,
          borderRadius: 12,
          background: farben.surface,
          textAlign: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 14 }} aria-hidden="true">⌖</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: farben.text, marginBottom: 7 }}>
            Punkt {punkt.nr} hat noch keine Koordinate
          </div>
          <div style={{ maxWidth: 330, fontSize: 12, lineHeight: 1.55, color: farben.muted }}>
            Im Reiter „Kopf“ den Standort erfassen oder Sollpunkte aus einer Geodatei laden.
          </div>
        </div>
      </div>
    );
  }

  return (
    <section aria-label={`Karte für Punkt ${punkt.nr}`}>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          height: 330,
          border: `1px solid ${farben.line}`,
          borderRadius: 12,
          background: farben.surface,
        }}
      >
        <iframe
          title={`OpenStreetMap – Punkt ${punkt.nr}`}
          src={osmEinbettung(lat, lon)}
          loading="lazy"
          referrerPolicy="no-referrer"
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            padding: "7px 10px",
            borderRadius: 8,
            background: "rgba(24, 29, 25, 0.90)",
            color: farben.text,
            fontSize: 11,
            fontWeight: 700,
            pointerEvents: "none",
          }}
        >
          Punkt {punkt.nr} · {hatIst ? "Ist-Standort" : "Soll-Standort"}
        </div>
      </div>

      <div style={{ marginTop: 10 }}>
        <KoordinatenZeile titel="Ist" lat={punkt.lat} lon={punkt.lon} aktiv={hatIst} />
        <KoordinatenZeile titel="Soll" lat={punkt.sollLat} lon={punkt.sollLon} aktiv={!hatIst && hatSoll} />
      </div>
      <div style={{ fontSize: 10, color: farben.muted, lineHeight: 1.5, marginTop: 6 }}>
        Die Karte benötigt eine Internetverbindung. Ist vorhanden, wird der gemessene Standort gezeigt,
        andernfalls die geplante Soll-Lage.
      </div>
    </section>
  );
}
