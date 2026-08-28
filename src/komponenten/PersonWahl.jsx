import { useState } from "react";
import { farben } from "../konfiguration.js";

/* Auswahl der aufnehmenden Person - ein Buchstabe, nicht mehr freier Text.

   Das freie Feld hat sich als Falle erwiesen: "c" und "C" galten der
   Datenbank als zwei verschiedene Personen, und ein vertippter Name legte
   eine eigene Spur an, die in der Uebersicht doppelt erschien. Mit einer
   Auswahl ist beides ausgeschlossen - es gibt nur noch 26 moegliche Werte,
   alle in Grossbuchstaben.

   Sichtbar sind A bis G; mehr Personen als das hat ein Trupp selten. Der
   Rest laesst sich aufklappen, damit die Reihe im Gelaende nicht zur
   Buchstabentafel wird. Sieben und nicht acht, damit der Aufklapp-Knopf
   noch in dieselbe Zeile passt und nicht als breiter Balken darunter
   haengt. */

const ALLE = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const SICHTBAR = 7;

// Aus einem gespeicherten Wert einen gueltigen Buchstaben machen - oder
// nichts. "c" wird zu "C", " b " zu "B", "ABCCCCC" zu nichts.
export function alsBuchstabe(wert) {
  const roh = String(wert ?? "").trim().toUpperCase();
  return /^[A-Z]$/.test(roh) ? roh : "";
}

export default function PersonWahl({ wert, setWert, warnen }) {
  const [alleZeigen, setAlleZeigen] = useState(() => {
    const b = alsBuchstabe(wert);
    return b !== "" && ALLE.indexOf(b) >= SICHTBAR;
  });

  const buchstaben = alleZeigen ? ALLE : ALLE.slice(0, SICHTBAR);

  const waehlen = (b) => {
    if (b === wert) return;
    /* Beim Wechsel bleiben die bisherigen Zaehlungen unter dem alten
       Buchstaben stehen - wer das nicht weiss, zaehlt sie unbemerkt doppelt.
       Gewarnt wird nur, wenn heute schon etwas gezaehlt wurde; sonst waere
       die Rueckfrage nur im Weg. */
    const hinweis = wert ? warnen?.(wert, b) : "";
    if (hinweis && !window.confirm(hinweis)) return;
    setWert(b);
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6, marginBottom: 6 }}>
        PERSON
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {buchstaben.map((b) => {
          const gewaehlt = wert === b;
          return (
            <button
              key={b}
              onClick={() => waehlen(b)}
              aria-label={`Person ${b}`}
              style={{
                flex: "1 1 auto",
                minWidth: 38,
                background: gewaehlt ? farben.unverb : "transparent",
                border: `1px solid ${gewaehlt ? farben.unverb : farben.line}`,
                color: gewaehlt ? farben.bg : farben.text,
                borderRadius: 10,
                padding: "12px 0",
                fontSize: 17,
                fontWeight: gewaehlt ? 700 : 400,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {b}
            </button>
          );
        })}

        {!alleZeigen && (
          <button
            onClick={() => setAlleZeigen(true)}
            aria-label="Weitere Buchstaben"
            style={{
              flex: "1 1 auto",
              minWidth: 38,
              background: "transparent",
              border: `1px dashed ${farben.line}`,
              color: farben.muted,
              borderRadius: 10,
              padding: "12px 0",
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            …
          </button>
        )}
      </div>

      {!wert && (
        <div style={{ fontSize: 10, color: farben.muted, marginTop: 5 }}>
          Buchstaben wählen – ohne Person wird nichts abgeglichen.
        </div>
      )}
    </div>
  );
}
