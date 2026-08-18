import { useState } from "react";
import { farben } from "../konfiguration.js";
import { BAUMARTEN, ZAEHLFAKTOREN, zahl, wzpAuswerten } from "./berechnung.js";
import { leereArt } from "./speicher.js";
import ZaehlBox from "../komponenten/ZaehlBox.jsx";

const nk = (wert, stellen = 1) =>
  Number(wert).toLocaleString("de-DE", {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  });

/* Liste gemessener Werte (Hoehen bzw. Durchmesser) mit Mittelwert.
   Eintippen, mit + oder Eingabetaste uebernehmen, Wert antippen loescht ihn. */
function WerteFeld({
  titel,
  einheit,
  werte,
  platzhalter,
  entwurf,
  setEntwurf,
  onHinzu,
  onWeg,
  mittelwert,
  mittelText,
}) {
  const feldStil = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${farben.line}`,
    color: farben.text,
    padding: "4px 0",
    fontSize: 18,
    fontWeight: 700,
    outline: "none",
    flex: 1,
    minWidth: 0,
  };

  return (
    <div
      style={{
        background: farben.surfaceHi,
        border: `1px solid ${farben.line}`,
        borderRadius: 12,
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
        {titel} {einheit}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <input
          style={feldStil}
          value={entwurf}
          onChange={(e) => setEntwurf(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onHinzu()}
          placeholder={platzhalter}
          inputMode="decimal"
        />
        <button
          onClick={onHinzu}
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

      {werte.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}
        >
          {werte.map((w, i) => (
            <button
              key={i}
              onClick={() => onWeg(i)}
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
              {w} ×
            </button>
          ))}
        </div>
      )}

      {mittelwert > 0 && (
        <div style={{ fontSize: 11, color: farben.muted, marginTop: 6 }}>
          {mittelText}
        </div>
      )}
    </div>
  );
}

/* Winkelzaehlprobe: am Standpunkt einmal im Kreis drehen und jeden Baum
   zaehlen, der breiter erscheint als der Spalt am Zaehlstab. */
export default function Winkelzaehlprobe({
  alter,
  wzp,
  setWzp,
  formzahlen,
  setHinweis,
}) {
  const [neueHoehe, setNeueHoehe] = useState({});
  const [neuerDm, setNeuerDm] = useState({});

  const erg = wzpAuswerten(wzp.arten, wzp.zaehlfaktor, formzahlen);

  /* Die drei Werte, die der Ertragstafel-Rechner der Landesforst braucht.
     Vorausfuellen per Link geht dort nicht - der Rechner nimmt keine Werte
     ueber die Adresse entgegen -, deshalb stehen sie hier zum Ablesen und
     Kopieren beieinander. */
  const kopieren = async (a) => {
    const zeile =
      `${a.name} · Alter ${zahl(alter) || "?"} Jahre · Mittelhöhe ${nk(a.mittelHoehe, 1)} m` +
      ` · Grundfläche ${nk(a.gHa, 0)} m²/ha`;
    try {
      await navigator.clipboard.writeText(zeile);
      setHinweis("Kopiert");
    } catch {
      setHinweis("Kopieren hier nicht möglich – Werte abtippen");
    }
  };

  const aendere = (id, wie) =>
    setWzp((alt) => ({
      ...alt,
      arten: alt.arten.map((a) => (a.id === id ? wie(a) : a)),
    }));

  const hoeheHinzu = (id) => {
    const wert = (neueHoehe[id] ?? "").trim();
    if (zahl(wert) <= 0) return;
    aendere(id, (a) => ({ ...a, hoehen: [...a.hoehen, wert] }));
    setNeueHoehe((alt) => ({ ...alt, [id]: "" }));
  };

  const hoeheWeg = (id, i) =>
    aendere(id, (a) => ({ ...a, hoehen: a.hoehen.filter((_, j) => j !== i) }));

  const dmHinzu = (id) => {
    const wert = (neuerDm[id] ?? "").trim();
    if (zahl(wert) <= 0) return;
    aendere(id, (a) => ({
      ...a,
      durchmesser: [...(a.durchmesser ?? []), wert],
    }));
    setNeuerDm((alt) => ({ ...alt, [id]: "" }));
  };

  const dmWeg = (id, i) =>
    aendere(id, (a) => ({
      ...a,
      durchmesser: (a.durchmesser ?? []).filter((_, j) => j !== i),
    }));

  const artWeg = (id) => {
    const art = wzp.arten.find((a) => a.id === id);
    if (
      art &&
      (art.anzahl > 0 || art.hoehen.length || (art.durchmesser ?? []).length)
    ) {
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
  const beschriftung = {
    fontSize: 10,
    color: farben.muted,
    letterSpacing: 0.6,
  };

  const offeneArten = BAUMARTEN.filter(
    (b) => !wzp.arten.some((a) => a.name === b.name),
  );

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
                background:
                  wzp.zaehlfaktor === k ? farben.unverb : "transparent",
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
        <div
          style={{
            background: farben.surface,
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          <div style={{ ...beschriftung, marginBottom: 8 }}>
            ERGEBNIS · {erg.gesamt.anzahl} gezählte Bäume
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {nk(erg.gesamt.gHa, 0)}
              </div>
              <div style={{ fontSize: 10, color: farben.muted }}>
                Grundfläche m²/ha
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {erg.gesamt.vHa > 0 ? nk(erg.gesamt.vHa, 0) : "–"}
              </div>
              <div style={{ fontSize: 10, color: farben.muted }}>
                Vorrat fm/ha
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {erg.gesamt.nHa > 0 ? nk(erg.gesamt.nHa, 0) : "–"}
              </div>
              <div style={{ fontSize: 10, color: farben.muted }}>Stämme/ha</div>
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
                  color:
                    a.anzahl > 0 ||
                    a.hoehen.length ||
                    (a.durchmesser ?? []).length
                      ? farben.line
                      : farben.muted,
                  fontSize: 12,
                  cursor:
                    a.anzahl > 0 ||
                    a.hoehen.length ||
                    (a.durchmesser ?? []).length
                      ? "default"
                      : "pointer",
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
                onPlus={() =>
                  aendere(a.id, (x) => ({ ...x, anzahl: x.anzahl + 1 }))
                }
                onMinus={() =>
                  aendere(a.id, (x) => ({
                    ...x,
                    anzahl: Math.max(0, x.anzahl - 1),
                  }))
                }
                onSet={(n) =>
                  aendere(a.id, (x) => ({ ...x, anzahl: Math.max(0, n) }))
                }
                gross
              />

              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <WerteFeld
                  titel="HÖHEN"
                  einheit="m"
                  platzhalter="26"
                  werte={a.hoehen}
                  entwurf={neueHoehe[a.id] ?? ""}
                  setEntwurf={(w) =>
                    setNeueHoehe((alt) => ({ ...alt, [a.id]: w }))
                  }
                  onHinzu={() => hoeheHinzu(a.id)}
                  onWeg={(i) => hoeheWeg(a.id, i)}
                  mittelwert={z.mittelHoehe}
                  mittelText={`Mittel ${nk(z.mittelHoehe, 1)} m`}
                />
                <WerteFeld
                  titel="BHD"
                  einheit="cm"
                  platzhalter="34"
                  werte={a.durchmesser ?? []}
                  entwurf={neuerDm[a.id] ?? ""}
                  setEntwurf={(w) =>
                    setNeuerDm((alt) => ({ ...alt, [a.id]: w }))
                  }
                  onHinzu={() => dmHinzu(a.id)}
                  onWeg={(i) => dmWeg(a.id, i)}
                  mittelwert={z.dg}
                  mittelText={`Mittelstamm ${nk(z.dg, 1)} cm`}
                />
              </div>
            </div>

            {z.anzahl > 0 && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    color: farben.muted,
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  {z.gHa} m²/ha
                  {z.vHa > 0
                    ? ` · ${nk(z.vHa, 0)} fm/ha (Formzahl ${nk(z.formzahl, 2)})`
                    : ""}
                  {z.nHa > 0 && (
                    <>
                      <br />
                      {nk(z.nHa, 0)} Stämme/ha · Mittelstamm {nk(z.dg, 1)} cm
                      {z.vMittelstamm > 0
                        ? ` mit ${nk(z.vMittelstamm, 2)} fm`
                        : ""}
                    </>
                  )}
                </div>

                {z.mittelHoehe > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      border: `1px solid ${farben.line}`,
                      borderRadius: 10,
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 9,
                          color: farben.muted,
                          letterSpacing: 0.6,
                        }}
                      >
                        FÜR DIE ERTRAGSTAFEL
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          marginTop: 3,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        Alter{" "}
                        <b
                          style={{
                            color: zahl(alter) ? farben.text : farben.verb,
                          }}
                        >
                          {zahl(alter) || "?"}
                        </b>{" "}
                        · Höhe <b>{nk(z.mittelHoehe, 1)} m</b> · G{" "}
                        <b>{nk(z.gHa, 0)} m²/ha</b>
                      </div>
                    </div>
                    <button
                      onClick={() => kopieren(z)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${farben.line}`,
                        color: farben.text,
                        borderRadius: 10,
                        padding: "9px 14px",
                        fontSize: 13,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Kopieren
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {offeneArten.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <div style={{ ...beschriftung, marginBottom: 6 }}>
            BAUMART ERGÄNZEN
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {offeneArten.map((b) => (
              <button
                key={b.name}
                onClick={() =>
                  setWzp((alt) => ({
                    ...alt,
                    arten: [...alt.arten, leereArt(b.name)],
                  }))
                }
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

      <a
        href="https://brandenburg-forst.de/ertragstafel/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textAlign: "center",
          marginTop: 18,
          border: `1px solid ${farben.line}`,
          borderRadius: 10,
          padding: "11px 0",
          fontSize: 13,
          color: farben.text,
          textDecoration: "none",
        }}
      >
        Ertragstafel-Rechner öffnen ›
      </a>
      <div
        style={{
          fontSize: 10,
          color: farben.muted,
          marginTop: 6,
          textAlign: "center",
        }}
      >
        Landesforst Brandenburg – Alter, Mittelhöhe und Grundfläche dort
        eintragen
      </div>

      <div
        style={{
          fontSize: 11,
          color: farben.muted,
          marginTop: 16,
          lineHeight: 1.5,
        }}
      >
        Am Standpunkt einmal im Kreis drehen und jeden Baum zählen, der in
        Brusthöhe breiter erscheint als der Spalt am Zählstab. Grundfläche je
        Hektar = gezählte Bäume × Zählfaktor; der Vorrat ergibt sich daraus mit
        der mittleren Höhe und der Formzahl. Trägt man auch Durchmesser ein,
        kommt der Mittelstamm dazu und daraus die Stammzahl je Hektar.
      </div>
    </div>
  );
}
