import { useEffect, useRef } from "react";
import { farben } from "../konfiguration.js";
import { useT } from "../sprache.js";

/* Auswahl der aufnehmenden Person - ein Buchstabe, durchgeklickt.

   Freier Text war eine Falle: "c" und "C" galten der Datenbank als zwei
   verschiedene Personen, und ein vertippter Name legte eine eigene Spur an.
   Eine Reihe von 26 Knoepfen loeste das, brauchte aber die halbe
   Kopfzeile - im Gelaende zaehlt jede Zeile, die nicht gescrollt werden
   muss. Jetzt steht der Buchstabe zwischen zwei Pfeilen und braucht so viel
   Platz wie ein Eingabefeld.

   Die Pfeile zwangen zum Durchklicken, ohne die Nachbarn zu zeigen. Jetzt
   stehen alle Buchstaben nebeneinander in einer Zeile, die seitlich
   wischt; der gewaehlte rutscht in die Mitte. Ein Tipp waehlt direkt. */

const ALLE = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

// Aus einem gespeicherten Wert einen gueltigen Buchstaben machen - oder
// nichts. "c" wird zu "C", " b " zu "B", "ABCCCCC" zu nichts.
export function alsBuchstabe(wert) {
  const roh = String(wert ?? "").trim().toUpperCase();
  return /^[A-Z]$/.test(roh) ? roh : "";
}

export default function PersonWahl({ wert, setWert, warnen }) {
  const t = useT();
  const leiste = useRef(null);

  // Den gewaehlten Buchstaben in die Mitte der Leiste holen - beim Oeffnen
  // und nach jedem Wechsel, damit die Nachbarn links und rechts zu sehen sind.
  useEffect(() => {
    const box = leiste.current;
    const knopf = box?.querySelector('[data-gewaehlt="ja"]');
    if (!box || !knopf) return;
    box.scrollTo({
      left: knopf.offsetLeft - box.clientWidth / 2 + knopf.offsetWidth / 2,
      behavior: "smooth",
    });
  }, [wert]);

  const waehlen = (ziel) => {
    if (ziel === wert) return;
    const hinweis = wert ? warnen?.(wert, ziel) : "";
    if (hinweis && !window.confirm(hinweis)) return;
    setWert(ziel);
  };

  return (
    <div>
      <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>{t("PERSON")}</div>
      <div
        ref={leiste}
        role="radiogroup"
        aria-label={t("Gewählte Person")}
        style={{
          display: "flex",
          gap: 4,
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          borderBottom: `1px solid ${farben.line}`,
          padding: "4px 0",
        }}
      >
        {ALLE.map((b) => {
          const an = b === wert;
          return (
            <button
              key={b}
              role="radio"
              aria-checked={an}
              data-gewaehlt={an ? "ja" : undefined}
              onClick={() => waehlen(b)}
              style={{
                flex: "0 0 auto",
                // 40 px: mit dem Daumen im Gelaende sicher zu treffen.
                minWidth: 40,
                height: 40,
                borderRadius: 8,
                border: `1px solid ${an ? farben.text : farben.line}`,
                background: an ? farben.text : "none",
                color: an ? farben.bg : farben.text,
                fontSize: 17,
                fontWeight: an ? 700 : 500,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {b}
            </button>
          );
        })}
      </div>
    </div>
  );
}
