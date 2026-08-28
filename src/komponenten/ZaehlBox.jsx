import { useState, useRef } from "react";
import { farben } from "../konfiguration.js";
import Strichliste from "./Strichliste.jsx";

/* Eine Zaehlbox (verbissen bzw. unverbissen) fuer eine Baumart.

   Die ganze Flaeche ist der Plus-Knopf - im Gelaende mit Handschuhen soll man
   nicht zielen muessen. Unten rechts sitzen drei kleine Knoepfe: "+5" legt
   fuenf auf einmal drauf, "−" zieht eins ab, "✎" oeffnet ein Zahlenfeld zum
   direkten Eintippen.

   Das "+5" ist gefuellt statt umrandet: Hinzufuegen und Berichtigen sollen
   sich auf den ersten Blick unterscheiden. Bei siebzig Kiefern im Probekreis
   ist einzeln tippen sonst die halbe Aufnahmezeit.

   gross=true macht die Box etwas groesser (fuer "unverbissen", die haeufigere
   Eingabe). */
export default function ZaehlBox({ label, wert, farbe, onPlus, onMinus, onSet, gross }) {
  const [eingabe, setEingabe] = useState(false);
  // Verhindert, dass das Wegtippen aus dem Zahlenfeld zusaetzlich als Plus zaehlt:
  // Blur- und Klick-Ereignis derselben Beruehrung folgen kurz hintereinander.
  const klickUnterdruecken = useRef(false);

  const uebernehmen = (rohwert) => {
    const zahl = parseInt(rohwert, 10);
    if (Number.isFinite(zahl) && zahl >= 0) onSet(zahl);
    setEingabe(false);
  };

  /* Die drei kleinen Knoepfe stehen in einer eigenen Zeile am Fuss der Box.

     Zwei haben frueher frei schwebend unten rechts gesessen; mit dem dritten
     blieb der Strichliste daneben nur noch die Breite eines einzigen
     Fuenferbuendels, und sie wuchs in die Hoehe. Eine eigene Zeile kostet
     etwas Hoehe, gibt der Strichliste aber die volle Breite zurueck. */
  const kleinerKnopf = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    borderRadius: 8,
    lineHeight: 1,
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  };

  const zahlStil = {
    fontSize: gross ? 46 : 40,
    fontWeight: 700,
    lineHeight: 1.05,
    fontVariantNumeric: "tabular-nums",
    marginTop: 2,
  };

  return (
    <div
      onClick={() => {
        if (klickUnterdruecken.current) return;
        onPlus();
      }}
      role="button"
      aria-label={label}
      style={{
        flex: gross ? 1.18 : 1,
        // Damit die Box in schmalen Reihen mitschrumpft statt die Seite zu weiten.
        minWidth: 0,
        minHeight: gross ? 118 : 104,
        /* Spalte, damit die Knopfreihe unten haengen kann: sonst steht sie in
           der einen Box direkt unter der Zahl und in der daneben erst unter
           einer dreizeiligen Strichliste - und man tippt daneben. */
        display: "flex",
        flexDirection: "column",
        background: farben.surfaceHi,
        border: `2px solid ${farbe}`,
        borderRadius: 14,
        color: farben.text,
        padding: "10px 12px",
        textAlign: "left",
        cursor: eingabe ? "default" : "pointer",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        position: "relative",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: farbe,
        }}
      >
        {label}
      </div>

      {eingabe ? (
        <input
          type="number"
          inputMode="numeric"
          min="0"
          autoFocus
          defaultValue={wert}
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            uebernehmen(e.target.value);
            klickUnterdruecken.current = true;
            setTimeout(() => {
              klickUnterdruecken.current = false;
            }, 0);
          }}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") uebernehmen(e.target.value);
          }}
          style={{
            ...zahlStil,
            width: "80%",
            background: "transparent",
            border: "none",
            borderBottom: `1px solid ${farbe}`,
            color: farben.text,
            outline: "none",
            padding: 0,
          }}
        />
      ) : (
        <div style={zahlStil}>{wert}</div>
      )}

      <Strichliste n={wert} color={farbe} />

      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: "auto", paddingTop: 8 }}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setEingabe(true);
          }}
          role="button"
          aria-label="Zahl eingeben"
          style={{ ...kleinerKnopf, border: `1px solid ${farbe}`, color: farbe, fontSize: 13 }}
        >
          ✎
        </div>

        <div
          onClick={(e) => {
            e.stopPropagation();
            if (wert !== 0) onMinus();
          }}
          role="button"
          aria-label="Eins abziehen"
          style={{
            ...kleinerKnopf,
            border: `1px solid ${farbe}`,
            color: wert === 0 ? farben.muted : farbe,
            fontSize: 16,
            pointerEvents: wert === 0 ? "none" : "auto",
          }}
        >
          −
        </div>

        <div
          onClick={(e) => {
            e.stopPropagation();
            onSet(wert + 5);
          }}
          role="button"
          aria-label="Fünf dazu"
          style={{
            ...kleinerKnopf,
            width: 34,
            background: farbe,
            color: farben.bg,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          +5
        </div>
      </div>
    </div>
  );
}
