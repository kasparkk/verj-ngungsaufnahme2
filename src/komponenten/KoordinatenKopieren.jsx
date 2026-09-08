import { useState } from "react";
import { farben } from "../konfiguration.js";
import { nachUtm33 } from "../utm33.js";

/* Koordinate zum Antippen und Weitergeben.

   Zum Ablesen taugen zwei getrennte Felder, zum Weitergeben nicht: In die
   Aufnahmemaske der Landesforst gehoert ein Rechts- und Hochwert am Stueck
   ("388495.63, 5754384.34"), und in eine Karten-App gehoert das Paar aus
   Breite und Laenge. Beides steht hier fertig zusammengesetzt und wandert
   auf einen Fingertipp in die Zwischenablage.

   Punkt als Dezimaltrenner, nicht Komma: das Komma trennt hier bereits die
   beiden Werte, und die Ziele erwarten es so. */
export default function KoordinatenKopieren({ breite, laenge, klein }) {
  const [kopiert, setKopiert] = useState("");

  if (breite == null || laenge == null) return null;
  const utm = nachUtm33(breite, laenge);

  const kopieren = async (text, was) => {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(was);
      setTimeout(() => setKopiert(""), 1600);
    } catch {
      // Ohne Zwischenablage bleibt der Wert wenigstens zum Abtippen stehen.
      setKopiert("geht hier nicht");
      setTimeout(() => setKopiert(""), 2600);
    }
  };

  const zeile = {
    display: "flex",
    alignItems: "baseline",
    gap: 6,
    background: "none",
    border: "none",
    color: farben.muted,
    fontSize: klein ? 10 : 11,
    fontVariantNumeric: "tabular-nums",
    cursor: "pointer",
    padding: "3px 0",
    textAlign: "left",
    WebkitTapHighlightColor: "transparent",
  };
  const wert = { color: farben.text };

  const gradPaar = `${breite.toFixed(6)}, ${laenge.toFixed(6)}`;
  const utmPaar = utm ? `${utm.x.toFixed(2)}, ${utm.y.toFixed(2)}` : null;

  return (
    <div>
      {utmPaar && (
        <button onClick={() => kopieren(utmPaar, "UTM 33N")} style={zeile} aria-label="UTM-Koordinate kopieren">
          <span>UTM 33N</span>
          <span style={wert}>{utmPaar}</span>
          <span>⧉</span>
        </button>
      )}
      <button onClick={() => kopieren(gradPaar, "Breite/Länge")} style={zeile} aria-label="Breite und Länge kopieren">
        <span>Grad</span>
        <span style={wert}>{gradPaar}</span>
        <span>⧉</span>
      </button>
      {kopiert && (
        <div style={{ fontSize: 10, color: farben.unverb, paddingTop: 2 }}>
          {kopiert === "geht hier nicht" ? "Kopieren hier nicht möglich" : `${kopiert} kopiert`}
        </div>
      )}
    </div>
  );
}
