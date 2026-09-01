import { farben } from "../konfiguration.js";

/* Auswahl der aufnehmenden Person - ein Buchstabe, durchgeklickt.

   Freier Text war eine Falle: "c" und "C" galten der Datenbank als zwei
   verschiedene Personen, und ein vertippter Name legte eine eigene Spur an.
   Eine Reihe von 26 Knoepfen loeste das, brauchte aber die halbe
   Kopfzeile - im Gelaende zaehlt jede Zeile, die nicht gescrollt werden
   muss. Jetzt steht der Buchstabe zwischen zwei Pfeilen und braucht so viel
   Platz wie ein Eingabefeld.

   Die Reihe laeuft im Kreis: von Z geht es auf A und von A zurueck auf Z.
   Wer B braucht, tippt einmal; wer Y braucht, tippt zweimal rueckwaerts
   statt vierundzwanzigmal vorwaerts. */

const ALLE = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

// Aus einem gespeicherten Wert einen gueltigen Buchstaben machen - oder
// nichts. "c" wird zu "C", " b " zu "B", "ABCCCCC" zu nichts.
export function alsBuchstabe(wert) {
  const roh = String(wert ?? "").trim().toUpperCase();
  return /^[A-Z]$/.test(roh) ? roh : "";
}

export default function PersonWahl({ wert, setWert, warnen }) {
  const weiter = (richtung) => {
    // Ohne Auswahl faengt jede Richtung bei A an.
    const ziel = wert
      ? ALLE[(ALLE.indexOf(wert) + richtung + ALLE.length) % ALLE.length]
      : "A";
    if (ziel === wert) return;
    const hinweis = wert ? warnen?.(wert, ziel) : "";
    if (hinweis && !window.confirm(hinweis)) return;
    setWert(ziel);
  };

  const pfeil = {
    background: "none",
    border: "none",
    color: farben.text,
    fontSize: 24,
    lineHeight: 1,
    cursor: "pointer",
    padding: "0 14px",
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <div>
      <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>PERSON</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${farben.line}`,
          padding: "2px 0",
        }}
      >
        <button onClick={() => weiter(-1)} aria-label="Person zurück" style={pfeil}>
          ‹
        </button>
        <div
          aria-label="Gewählte Person"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: wert ? farben.text : farben.muted,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {wert || "–"}
        </div>
        <button onClick={() => weiter(1)} aria-label="Person weiter" style={pfeil}>
          ›
        </button>
      </div>
    </div>
  );
}
