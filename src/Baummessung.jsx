import { useState, useEffect } from "react";
import { farben } from "./konfiguration.js";
import { BAUMARTEN, zahl, grundflaeche, volumen, mittel, wzpAuswerten } from "./baum/berechnung.js";
import { laden, speichern, leererStand } from "./baum/speicher.js";
import { baueXlsx } from "./xlsx.js";
import Winkelzaehlprobe from "./baum/Winkelzaehlprobe.jsx";
import Einzelbaeume from "./baum/Einzelbaeume.jsx";

/* Rahmen der Baummessung mit zwei Verfahren:

   Winkelzaehlprobe - am Standpunkt zaehlen, keine Flaeche noetig (das
   uebliche Vorgehen im Bestand), und Einzelbaeume - jeder Baum mit BHD und
   Hoehe auf einer abgesteckten Flaeche.

   Ort und Formzahlen gelten fuer den Bestand und werden deshalb von beiden
   Verfahren geteilt. */
export default function Baummessung() {
  const [stand, setStand] = useState(leererStand);
  const [geladen, setGeladen] = useState(false);
  const [hinweis, setHinweis] = useState("");
  const [formzahlenOffen, setFormzahlenOffen] = useState(false);

  useEffect(() => {
    setStand(laden());
    setGeladen(true);
  }, []);

  useEffect(() => {
    if (!geladen) return;
    try {
      speichern(stand);
    } catch {
      setHinweis("Speichern fehlgeschlagen");
    }
  }, [stand, geladen]);

  useEffect(() => {
    if (!hinweis) return;
    const t = setTimeout(() => setHinweis(""), 2500);
    return () => clearTimeout(t);
  }, [hinweis]);

  const setzeFeld = (feld) => (wert) => setStand((alt) => ({ ...alt, [feld]: wert }));
  const setWzp = (wie) =>
    setStand((alt) => ({ ...alt, wzp: typeof wie === "function" ? wie(alt.wzp) : wie }));
  const setBaeume = (wie) =>
    setStand((alt) => ({ ...alt, baeume: typeof wie === "function" ? wie(alt.baeume) : wie }));

  const excelDatei = async () => {
    let zeilen;

    if (stand.modus === "wzp") {
      const erg = wzpAuswerten(stand.wzp.arten, stand.wzp.zaehlfaktor, stand.formzahlen);
      const mitZahlen = erg.jeArt.filter((a) => a.anzahl > 0);
      if (!mitZahlen.length) {
        setHinweis("Noch nichts gezählt");
        return;
      }
      zeilen = [
        ["Ort", "Verfahren", "Zaehlfaktor", "Baumart", "Anzahl", "Hoehen_m", "Mittelhoehe_m",
         "BHD_cm", "Mittelstamm_cm", "Formzahl", "Grundflaeche_m2_ha", "Vorrat_fm_ha",
         "Staemme_ha", "Volumen_Mittelstamm_m3"],
        ...mitZahlen.map((a) => [
          stand.ort,
          "Winkelzaehlprobe",
          zahl(stand.wzp.zaehlfaktor),
          a.name,
          a.anzahl,
          a.hoehen.join(" "),
          Math.round(mittel(a.hoehen) * 10) / 10,
          (a.durchmesser ?? []).join(" "),
          Math.round(a.dg * 10) / 10,
          a.formzahl,
          Math.round(a.gHa * 10) / 10,
          Math.round(a.vHa * 10) / 10,
          Math.round(a.nHa),
          Math.round(a.vMittelstamm * 1000) / 1000,
        ]),
      ];
    } else {
      if (!stand.baeume.length) {
        setHinweis("Noch keine Bäume eingetragen");
        return;
      }
      zeilen = [
        ["Ort", "Verfahren", "Flaeche_m2", "Baumart", "BHD_cm", "Hoehe_m", "Formzahl",
         "Grundflaeche_m2", "Volumen_m3"],
        ...stand.baeume.map((b) => [
          stand.ort,
          "Einzelbaeume",
          zahl(stand.flaeche),
          b.art,
          zahl(b.bhd),
          zahl(b.hoehe),
          zahl(b.formzahl),
          Math.round(grundflaeche(b.bhd) * 10000) / 10000,
          Math.round(volumen(b.bhd, b.hoehe, b.formzahl) * 1000) / 1000,
        ]),
      ];
    }

    const name = `Baummessung_${stand.ort || "Aufnahme"}.xlsx`;
    const blob = baueXlsx(zeilen, "Baummessung");

    try {
      const datei = new File([blob], name, { type: blob.type });
      if (navigator.canShare?.({ files: [datei] })) {
        await navigator.share({ files: [datei], title: "Baummessung" });
        return;
      }
    } catch (fehler) {
      if (fehler?.name === "AbortError") return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setHinweis("Excel-Datei gespeichert");
  };

  const feldStil = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${farben.line}`,
    color: farben.text,
    padding: "4px 0",
    fontSize: 14,
    width: "100%",
    outline: "none",
  };

  const verfahren = (ziel, text) => (
    <button
      onClick={() => setStand((alt) => ({ ...alt, modus: ziel }))}
      style={{
        flex: 1,
        background: stand.modus === ziel ? farben.surfaceHi : "transparent",
        border: `1px solid ${farben.line}`,
        color: stand.modus === ziel ? farben.text : farben.muted,
        borderRadius: 10,
        padding: "9px 0",
        fontSize: 13,
        fontWeight: stand.modus === ziel ? 700 : 400,
        cursor: "pointer",
      }}
    >
      {text}
    </button>
  );

  return (
    <div style={{ color: farben.text, padding: "14px 14px 96px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>ORT / BESTAND</div>
        <input
          style={feldStil}
          value={stand.ort}
          onChange={(e) => setzeFeld("ort")(e.target.value)}
          placeholder="4138 b1"
        />
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {verfahren("wzp", "Winkelzählprobe")}
        {verfahren("einzel", "Einzelbäume")}
      </div>

      {stand.modus === "wzp" ? (
        <Winkelzaehlprobe
          wzp={stand.wzp}
          setWzp={setWzp}
          formzahlen={stand.formzahlen}
          setHinweis={setHinweis}
        />
      ) : (
        <Einzelbaeume
          flaeche={stand.flaeche}
          setFlaeche={setzeFeld("flaeche")}
          formzahlen={stand.formzahlen}
          baeume={stand.baeume}
          setBaeume={setBaeume}
          setHinweis={setHinweis}
        />
      )}

      <button
        onClick={() => setFormzahlenOffen(!formzahlenOffen)}
        style={{
          width: "100%",
          background: "transparent",
          border: `1px solid ${farben.line}`,
          color: farben.muted,
          borderRadius: 10,
          padding: "8px 0",
          fontSize: 13,
          marginTop: 18,
          cursor: "pointer",
        }}
      >
        {formzahlenOffen ? "Formzahlen ausblenden" : "Formzahlen anpassen"}
      </button>

      {formzahlenOffen && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, marginBottom: 10 }}>
            Die Formzahl beschreibt, wie stark sich der Stamm nach oben verjüngt. Die Werte sind
            Richtwerte für Derbholz – je nach Alter, Bonität und Herkunft weichen sie ab. Das
            Volumen ist damit eine Schätzung, keine Massentafel. Eigene Werte gerne eintragen; sie
            gelten für beide Verfahren.
          </div>
          {BAUMARTEN.map((a) => (
            <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 13 }}>{a.name}</div>
              <input
                style={{ ...feldStil, width: 70, textAlign: "right" }}
                value={stand.formzahlen[a.name] ?? ""}
                onChange={(e) =>
                  setStand((alt) => ({
                    ...alt,
                    formzahlen: { ...alt.formzahlen, [a.name]: e.target.value },
                  }))
                }
                inputMode="decimal"
              />
            </div>
          ))}
        </div>
      )}

      {hinweis && (
        <div style={{ marginTop: 14, fontSize: 13, color: farben.muted, textAlign: "center" }}>{hinweis}</div>
      )}

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: farben.surface,
          borderTop: `1px solid ${farben.line}`,
          padding: "10px 14px",
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        <button
          onClick={excelDatei}
          style={{
            width: "100%",
            background: "none",
            border: `1px solid ${farben.line}`,
            color: farben.text,
            borderRadius: 12,
            padding: "14px 0",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Excel
        </button>
      </div>
    </div>
  );
}
