import { useState } from "react";
import { farben } from "../konfiguration.js";
import { BAUMARTEN, STANDARD_FORMZAHL, zahl, volumen, auswerten } from "./berechnung.js";

const nk = (wert, stellen = 2) =>
  Number(wert).toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/* Einzelbaeume: jeder Baum wird mit BHD und Hoehe auf einer abgesteckten
   Flaeche erfasst. Aufwendiger als die Winkelzaehlprobe, dafuer hat man die
   Einzelwerte. */
export default function Einzelbaeume({ flaeche, setFlaeche, formzahlen, baeume, setBaeume, setHinweis }) {
  const [art, setArt] = useState(BAUMARTEN[0].name);
  const [bhd, setBhd] = useState("");
  const [hoehe, setHoehe] = useState("");

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

  const erg = auswerten(baeume, flaeche);

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
    <div>
      <div style={{ marginBottom: 14, maxWidth: 140 }}>
        <div style={beschriftung}>FLÄCHE m²</div>
        <input
          style={feldStil}
          value={flaeche}
          onChange={(e) => setFlaeche(e.target.value)}
          placeholder="500"
          inputMode="decimal"
        />
      </div>

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

      {baeume.length > 0 && (
        <div style={{ border: `1px solid ${farben.line}`, borderRadius: 10, overflow: "hidden" }}>
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
                onClick={() => setBaeume((alle) => alle.filter((x) => x.id !== b.id))}
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
    </div>
  );
}
