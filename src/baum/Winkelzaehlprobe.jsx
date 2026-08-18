import { useState } from "react";
import { farben } from "../konfiguration.js";
import { BAUMARTEN, ZAEHLFAKTOREN, zahl, wzpAuswerten } from "./berechnung.js";
import { leereArt } from "./speicher.js";
import ZaehlBox from "../komponenten/ZaehlBox.jsx";

const nk = (wert, stellen = 1) =>
  Number(wert).toLocaleString("de-DE", { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/* Winkelzaehlprobe: am Standpunkt einmal im Kreis drehen und jeden Baum
   zaehlen, der breiter erscheint als der Spalt am Zaehlstab. */
export default function Winkelzaehlprobe({ wzp, setWzp, formzahlen, setHinweis }) {
  const [neueHoehe, setNeueHoehe] = useState({});

  const erg = wzpAuswerten(wzp.arten, wzp.zaehlfaktor, formzahlen);

  const aendere = (id, wie) =>
    setWzp((alt) => ({ ...alt, arten: alt.arten.map((a) => (a.id === id ? wie(a) : a)) }));

  const hoeheHinzu = (id) => {
    const wert = (neueHoehe[id] ?? "").trim();
    if (zahl(wert) <= 0) return;
    aendere(id, (a) => ({ ...a, hoehen: [...a.hoehen, wert] }));
    setNeueHoehe((alt) => ({ ...alt, [id]: "" }));
  };

  const hoeheWeg = (id, i) =>
    aendere(id, (a) => ({ ...a, hoehen: a.hoehen.filter((_, j) => j !== i) }));

  const artWeg = (id) => {
    const art = wzp.arten.find((a) => a.id === id);
    if (art && (art.anzahl > 0 || art.hoehen.length)) {
      setHinweis("Erst Zähler auf 0 setzen");
      return;
    }
    setWzp((alt) => ({ ...alt, arten: alt.arten.filter((a) => a.id !== id) }));
  };

  const feldStil = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${farben.line}`,
    color: farben.text,
    padding: "4px 0",
    fontSize: 14,
    outline: "none",
  };
  const beschriftung = { fontSize: 10, color: farben.muted, letterSpacing: 0.6 };

  const offeneArten = BAUMARTEN.filter((b) => !wzp.arten.some((a) => a.name === b.name));

  return (
    <div>
      {/* Zaehlfaktor */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ ...beschriftung, marginBottom: 6 }}>ZÄHLFAKTOR m²/ha</div>
        <div style={{ display: "flex", gap: 8 }}>
          {ZAEHLFAKTOREN.map((k) => (
            <button
              key={k}
              onClick={() => setWzp((alt) => ({ ...alt, zaehlfaktor: k }))}
              style={{
                flex: 1,
                background: wzp.zaehlfaktor === k ? farben.unverb : "transparent",
                border: `1px solid ${wzp.zaehlfaktor === k ? farben.unverb : farben.line}`,
                color: wzp.zaehlfaktor === k ? farben.bg : farben.muted,
                borderRadius: 10,
                padding: "10px 0",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Ergebnis */}
      {erg.gesamt.anzahl > 0 && (
        <div style={{ background: farben.surface, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ ...beschriftung, marginBottom: 8 }}>
            ERGEBNIS · {erg.gesamt.anzahl} gezählte Bäume
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {nk(erg.gesamt.gHa, 0)}
              </div>
              <div style={{ fontSize: 10, color: farben.muted }}>Grundfläche m²/ha</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {erg.gesamt.vHa > 0 ? nk(erg.gesamt.vHa, 0) : "–"}
              </div>
              <div style={{ fontSize: 10, color: farben.muted }}>Vorrat fm/ha</div>
            </div>
          </div>
          {erg.gesamt.vHa === 0 && (
            <div style={{ fontSize: 11, color: farben.verb, marginTop: 8 }}>
              Für den Vorrat fehlt noch mindestens eine gemessene Höhe.
            </div>
          )}
        </div>
      )}

      {/* Je Baumart */}
      {wzp.arten.map((a) => {
        const z = erg.jeArt.find((x) => x.id === a.id);
        return (
          <div key={a.id} style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600 }}>{a.name}</div>
              <button
                onClick={() => artWeg(a.id)}
                style={{
                  background: "none",
                  border: "none",
                  color: a.anzahl > 0 || a.hoehen.length ? farben.line : farben.muted,
                  fontSize: 12,
                  cursor: a.anzahl > 0 || a.hoehen.length ? "default" : "pointer",
                }}
              >
                entfernen
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
              <ZaehlBox
                label="gezählt"
                wert={a.anzahl}
                farbe={farben.unverb}
                onPlus={() => aendere(a.id, (x) => ({ ...x, anzahl: x.anzahl + 1 }))}
                onMinus={() => aendere(a.id, (x) => ({ ...x, anzahl: Math.max(0, x.anzahl - 1) }))}
                onSet={(n) => aendere(a.id, (x) => ({ ...x, anzahl: Math.max(0, n) }))}
                gross
              />

              <div
                style={{
                  flex: 1,
                  background: farben.surfaceHi,
                  border: `1px solid ${farben.line}`,
                  borderRadius: 14,
                  padding: "10px 12px",
                }}
              >
                <div style={{ ...beschriftung, textTransform: "uppercase" }}>Höhen m</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <input
                    style={{ ...feldStil, flex: 1, fontSize: 18, fontWeight: 700 }}
                    value={neueHoehe[a.id] ?? ""}
                    onChange={(e) => setNeueHoehe((alt) => ({ ...alt, [a.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && hoeheHinzu(a.id)}
                    placeholder="26"
                    inputMode="decimal"
                  />
                  <button
                    onClick={() => hoeheHinzu(a.id)}
                    style={{
                      background: farben.surface,
                      border: `1px solid ${farben.line}`,
                      color: farben.text,
                      borderRadius: 8,
                      padding: "0 12px",
                      fontSize: 16,
                      cursor: "pointer",
                    }}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  {a.hoehen.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => hoeheWeg(a.id, i)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${farben.line}`,
                        color: farben.muted,
                        borderRadius: 999,
                        padding: "3px 8px",
                        fontSize: 12,
                        cursor: "pointer",
                      }}
                    >
                      {h} ×
                    </button>
                  ))}
                </div>

                {z.mittelHoehe > 0 && (
                  <div style={{ fontSize: 11, color: farben.muted, marginTop: 8 }}>
                    Mittel {nk(z.mittelHoehe, 1)} m
                  </div>
                )}
              </div>
            </div>

            {z.anzahl > 0 && (
              <div style={{ fontSize: 12, color: farben.muted, marginTop: 6 }}>
                {z.gHa} m²/ha
                {z.vHa > 0 ? ` · ${nk(z.vHa, 0)} fm/ha (Formzahl ${nk(z.formzahl, 2)})` : ""}
              </div>
            )}
          </div>
        );
      })}

      {offeneArten.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ ...beschriftung, marginBottom: 6 }}>BAUMART ERGÄNZEN</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {offeneArten.map((b) => (
              <button
                key={b.name}
                onClick={() => setWzp((alt) => ({ ...alt, arten: [...alt.arten, leereArt(b.name)] }))}
                style={{
                  background: "transparent",
                  border: `1px solid ${farben.line}`,
                  color: farben.muted,
                  borderRadius: 999,
                  padding: "6px 11px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + {b.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: farben.muted, marginTop: 16, lineHeight: 1.5 }}>
        Am Standpunkt einmal im Kreis drehen und jeden Baum zählen, der in Brusthöhe breiter
        erscheint als der Spalt am Zählstab. Grundfläche je Hektar = gezählte Bäume × Zählfaktor;
        der Vorrat ergibt sich daraus mit der mittleren Höhe und der Formzahl.
      </div>
    </div>
  );
}
