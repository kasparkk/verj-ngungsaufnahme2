import { useState, useEffect } from "react";
import { farben } from "./konfiguration.js";
import { BAUMARTEN, STANDARD_FORMZAHL, zahl, grundflaeche, volumen, auswerten } from "./baum/berechnung.js";
import { laden, speichern, leererStand } from "./baum/speicher.js";
import { baueXlsx } from "./xlsx.js";

const nk = (wert, stellen = 2) =>
  Number(wert).toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

export default function Baummessung() {
  const [ort, setOrt] = useState("");
  const [flaeche, setFlaeche] = useState("500");
  const [formzahlen, setFormzahlen] = useState(leererStand().formzahlen);
  const [baeume, setBaeume] = useState([]);
  const [geladen, setGeladen] = useState(false);

  const [art, setArt] = useState(BAUMARTEN[0].name);
  const [bhd, setBhd] = useState("");
  const [hoehe, setHoehe] = useState("");
  const [hinweis, setHinweis] = useState("");
  const [formzahlenOffen, setFormzahlenOffen] = useState(false);

  useEffect(() => {
    const stand = laden();
    setOrt(stand.ort);
    setFlaeche(stand.flaeche);
    setFormzahlen(stand.formzahlen);
    setBaeume(stand.baeume);
    setGeladen(true);
  }, []);

  useEffect(() => {
    if (!geladen) return;
    try {
      speichern({ ort, flaeche, formzahlen, baeume });
    } catch {
      setHinweis("Speichern fehlgeschlagen");
    }
  }, [ort, flaeche, formzahlen, baeume, geladen]);

  useEffect(() => {
    if (!hinweis) return;
    const t = setTimeout(() => setHinweis(""), 2500);
    return () => clearTimeout(t);
  }, [hinweis]);

  const formzahlVon = (name) => zahl(formzahlen[name]) || STANDARD_FORMZAHL;

  const hinzufuegen = () => {
    if (zahl(bhd) <= 0) {
      setHinweis("BHD eintragen");
      return;
    }
    setBaeume((alle) => [
      ...alle,
      { id: `b${Date.now()}`, art, bhd, hoehe, formzahl: String(formzahlVon(art)) },
    ]);
    // Baumart stehen lassen - meist misst man mehrere derselben Art nacheinander.
    setBhd("");
    setHoehe("");
  };

  const entfernen = (id) => setBaeume((alle) => alle.filter((b) => b.id !== id));

  const erg = auswerten(baeume, flaeche);

  const excelDatei = async () => {
    if (!baeume.length) {
      setHinweis("Noch keine Bäume eingetragen");
      return;
    }
    const zeilen = [
      ["Ort", "Flaeche_m2", "Baumart", "BHD_cm", "Hoehe_m", "Formzahl", "Grundflaeche_m2", "Volumen_m3"],
      ...baeume.map((b) => [
        ort,
        zahl(flaeche),
        b.art,
        zahl(b.bhd),
        zahl(b.hoehe),
        zahl(b.formzahl),
        Math.round(grundflaeche(b.bhd) * 10000) / 10000,
        Math.round(volumen(b.bhd, b.hoehe, b.formzahl) * 1000) / 1000,
      ]),
    ];
    const name = `Baummessung_${ort || "Aufnahme"}.xlsx`;
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
  const beschriftung = { fontSize: 10, color: farben.muted, letterSpacing: 0.6 };
  const kennzahl = { fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ color: farben.text, padding: "14px 14px 96px", maxWidth: 560, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 2 }}>
          <div style={beschriftung}>ORT / BESTAND</div>
          <input style={feldStil} value={ort} onChange={(e) => setOrt(e.target.value)} placeholder="4138 b1" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={beschriftung}>FLÄCHE m²</div>
          <input
            style={feldStil}
            value={flaeche}
            onChange={(e) => setFlaeche(e.target.value)}
            placeholder="500"
            inputMode="decimal"
          />
        </div>
      </div>

      {/* Eingabe eines Baumes */}
      <div style={{ background: farben.surface, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ ...beschriftung, marginBottom: 6 }}>BAUMART</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {BAUMARTEN.map((a) => (
            <button
              key={a.name}
              onClick={() => setArt(a.name)}
              style={{
                background: art === a.name ? farben.unverb : "transparent",
                border: `1px solid ${art === a.name ? farben.unverb : farben.line}`,
                color: art === a.name ? farben.bg : farben.muted,
                borderRadius: 999,
                padding: "6px 11px",
                fontSize: 13,
                fontWeight: art === a.name ? 700 : 400,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {a.name}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <div style={beschriftung}>BHD cm</div>
            <input
              style={{ ...feldStil, fontSize: 22, fontWeight: 700 }}
              value={bhd}
              onChange={(e) => setBhd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hinzufuegen()}
              placeholder="30"
              inputMode="decimal"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={beschriftung}>HÖHE m</div>
            <input
              style={{ ...feldStil, fontSize: 22, fontWeight: 700 }}
              value={hoehe}
              onChange={(e) => setHoehe(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hinzufuegen()}
              placeholder="25"
              inputMode="decimal"
            />
          </div>
          <button
            onClick={hinzufuegen}
            style={{
              background: farben.unverb,
              border: "none",
              color: farben.bg,
              borderRadius: 12,
              padding: "12px 18px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            +
          </button>
        </div>
        <div style={{ fontSize: 10, color: farben.muted, marginTop: 8 }}>
          Formzahl {nk(formzahlVon(art), 2)} für {art}
        </div>
      </div>

      {/* Ergebnis */}
      {erg.anzahl > 0 && (
        <div style={{ background: farben.surface, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ ...beschriftung, marginBottom: 8 }}>
            ERGEBNIS · {erg.anzahl} {erg.anzahl === 1 ? "Baum" : "Bäume"}
          </div>

          {erg.jeHektar ? (
            <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={kennzahl}>{nk(erg.jeHektar.vorrat, 1)}</div>
                <div style={{ fontSize: 10, color: farben.muted }}>Vorrat fm/ha</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={kennzahl}>{nk(erg.jeHektar.grundflaeche, 1)}</div>
                <div style={{ fontSize: 10, color: farben.muted }}>Grundfläche m²/ha</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={kennzahl}>{nk(erg.jeHektar.staemme, 0)}</div>
                <div style={{ fontSize: 10, color: farben.muted }}>Stämme/ha</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: farben.verb, marginBottom: 10 }}>
              Fläche eintragen, dann wird auf Hektar hochgerechnet.
            </div>
          )}

          <div style={{ fontSize: 12, color: farben.muted, lineHeight: 1.6 }}>
            Summe Grundfläche {nk(erg.summeG, 3)} m² · Summe Volumen {nk(erg.summeV, 3)} fm
            <br />
            Mittelhöhe {nk(erg.mittelHoehe, 1)} m · Grundflächenmittelstamm {nk(erg.dg, 1)} cm
          </div>
        </div>
      )}

      {/* Liste der Baeume */}
      {baeume.length > 0 && (
        <div style={{ border: `1px solid ${farben.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 14 }}>
          {baeume.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderTop: i === 0 ? "none" : `1px solid ${farben.line}`,
                fontSize: 13,
              }}
            >
              <div style={{ width: 22, color: farben.muted, fontVariantNumeric: "tabular-nums" }}>{i + 1}</div>
              <div style={{ flex: 1, fontWeight: 600 }}>{b.art}</div>
              <div style={{ fontVariantNumeric: "tabular-nums", color: farben.muted }}>
                {nk(zahl(b.bhd), 0)} cm · {nk(zahl(b.hoehe), 0)} m
              </div>
              <div style={{ fontVariantNumeric: "tabular-nums", width: 62, textAlign: "right" }}>
                {nk(volumen(b.bhd, b.hoehe, b.formzahl), 3)}
              </div>
              <button
                onClick={() => entfernen(b.id)}
                aria-label="Baum entfernen"
                style={{
                  background: "none",
                  border: "none",
                  color: farben.muted,
                  fontSize: 18,
                  cursor: "pointer",
                  padding: "0 2px",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Formzahlen anpassen */}
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
            Volumen ist damit eine Schätzung, keine Massentafel. Eigene Werte gerne eintragen.
          </div>
          {BAUMARTEN.map((a) => (
            <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ flex: 1, fontSize: 13 }}>{a.name}</div>
              <input
                style={{ ...feldStil, width: 70, textAlign: "right" }}
                value={formzahlen[a.name] ?? ""}
                onChange={(e) => setFormzahlen((alle) => ({ ...alle, [a.name]: e.target.value }))}
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
