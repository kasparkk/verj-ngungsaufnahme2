import { useState } from "react";
import { farben } from "../konfiguration.js";
import { STANDARD_FORMZAHL, zahl } from "./berechnung.js";
import { useT, artName, zahlOrt } from "../sprache.js";

const nk = (wert, stellen = 2) =>
  Number(wert).toLocaleString(zahlOrt(), { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/* Formzahlen einstellen - Grundwert je Baumart und, wer mag, eine
   Staffelung nach Hoehe.

   Die Staffelung ist leer, solange niemand etwas eintraegt. Zahlen dafuer
   gehoeren aus der Ertragstafel oder der Anweisung des Betriebs hierher,
   nicht aus der App: Erfundene Werte sahen aus wie richtige und wuerden
   jeden Vorrat still verschieben. */
export default function Formzahlen({
  arten,
  onArtWeg,
  formzahlen,
  setFormzahlen,
  stufen,
  setStufen,
}) {
  const t = useT();
  const [staffelOffen, setStaffelOffen] = useState(false);
  const [art, setArt] = useState(arten[0].name);

  const feldStil = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${farben.line}`,
    color: farben.text,
    padding: "8px 0",
    fontSize: 16,
    outline: "none",
  };
  const beschriftung = { fontSize: 10, color: farben.muted, letterSpacing: 0.6 };

  const zeilen = stufen?.[art] ?? [];

  const setzeZeilen = (wie) =>
    setStufen((alt) => {
      const neu = typeof wie === "function" ? wie(alt?.[art] ?? []) : wie;
      const alles = { ...(alt ?? {}) };
      // Leere Listen gar nicht erst behalten - sonst waechst der Speicher mit Nichts.
      if (neu.length) alles[art] = neu;
      else delete alles[art];
      return alles;
    });

  const grundwert = zahl(formzahlen?.[art]) || STANDARD_FORMZAHL;

  /* Gegenlesen, was eingetragen ist: aufsteigend sortiert, so wie es auch
      nachgeschlagen wird. Ein verdrehtes "bis" faellt hier sofort auf. */
  const gelesen = zeilen
    .map((s) => ({ bis: zahl(s.bis), wert: zahl(s.wert) }))
    .filter((s) => s.bis > 0 && s.wert > 0)
    .sort((a, b) => a.bis - b.bis);

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, marginBottom: 10 }}>
        {t(
          "Die Formzahl beschreibt, wie stark sich der Stamm nach oben verjüngt. Die Werte sind Richtwerte für Derbholz – je nach Alter, Bonität und Herkunft weichen sie ab. Das Volumen ist damit eine Schätzung, keine Massentafel. Eigene Werte gerne eintragen; sie gelten für beide Verfahren.",
        )}
      </div>

      {arten.map((a) => {
        const anzahl = (stufen?.[a.name] ?? []).length;
        return (
          <div key={a.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ flex: 1, fontSize: 13 }}>
              {artName(a.name)}
              {anzahl > 0 && (
                <span style={{ color: farben.muted, fontSize: 11 }}>
                  {" "}
                  ·{" "}
                  {anzahl === 1
                    ? t("{n} Höhenstufe", { n: anzahl })
                    : t("{n} Höhenstufen", { n: anzahl })}
                </span>
              )}
            </div>
            <input
              style={{ ...feldStil, width: 70, textAlign: "right" }}
              value={formzahlen?.[a.name] ?? ""}
              onChange={(e) => setFormzahlen((alt) => ({ ...alt, [a.name]: e.target.value }))}
              inputMode="decimal"
              placeholder={nk(STANDARD_FORMZAHL, 2)}
              aria-label={t("Formzahl {art}", { art: artName(a.name) })}
            />
            {/* Nur die selbst eingetragenen lassen sich wieder loeschen -
                die feste Liste gehoert nicht dem einzelnen Blatt. */}
            {a.eigen && (
              <button
                onClick={() => onArtWeg(a.name)}
                aria-label={t("{art} aus der Liste nehmen", { art: a.name })}
                style={{
                  background: "none",
                  border: "none",
                  color: farben.muted,
                  fontSize: 16,
                  cursor: "pointer",
                  padding: "0 2px",
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={() => setStaffelOffen(!staffelOffen)}
        style={{
          width: "100%",
          background: "transparent",
          border: `1px solid ${farben.line}`,
          color: farben.muted,
          borderRadius: 10,
          padding: "8px 0",
          fontSize: 12,
          marginTop: 12,
          cursor: "pointer",
        }}
      >
        {staffelOffen ? t("Höhenstaffelung ausblenden") : t("Nach Höhe staffeln (freiwillig)")}
      </button>

      {staffelOffen && (
        <div
          style={{
            marginTop: 10,
            background: farben.surface,
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, marginBottom: 10 }}>
            {t(
              "Eine Formzahl je Baumart ist eine Vereinfachung: Ein schlanker Stangenbestand hat eine andere als derselbe Bestand 60 Jahre später. Wer Werte aus seiner Ertragstafel oder der Betriebsanweisung hat, kann sie hier nach Höhe staffeln.",
            )}
            <br />
            <br />
            {t(
              "Die App bringt dafür keine Zahlen mit – erfundene Werte wären von richtigen nicht zu unterscheiden und würden jeden Vorrat verschieben. Solange hier nichts steht, gilt der Grundwert von oben, und gerechnet wird genau wie bisher.",
            )}
          </div>

          <div style={{ ...beschriftung, marginBottom: 6 }}>{t("BAUMART")}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {arten.map((a) => {
              const gewaehlt = art === a.name;
              const hat = (stufen?.[a.name] ?? []).length > 0;
              return (
                <button
                  key={a.name}
                  onClick={() => setArt(a.name)}
                  style={{
                    background: gewaehlt ? farben.unverb : "transparent",
                    border: `1px solid ${gewaehlt ? farben.unverb : hat ? farben.muted : farben.line}`,
                    color: gewaehlt ? farben.bg : hat ? farben.text : farben.muted,
                    borderRadius: 999,
                    padding: "9px 12px",
                    fontSize: 13,
                    fontWeight: gewaehlt ? 700 : 400,
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {artName(a.name)}
                  {hat ? " •" : ""}
                </button>
              );
            })}
          </div>

          {zeilen.length === 0 && (
            <div style={{ fontSize: 12, color: farben.muted, marginBottom: 10 }}>
              {t("Keine Stufen für {art} – es gilt der Grundwert {wert}.", {
                art: artName(art),
                wert: nk(grundwert, 2),
              })}
            </div>
          )}

          {zeilen.map((s, i) => (
            <div
              key={i}
              style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 8 }}
            >
              <div style={{ width: 74 }}>
                <div style={beschriftung}>{t("BIS m")}</div>
                <input
                  style={{ ...feldStil, width: "100%" }}
                  value={s.bis}
                  onChange={(e) =>
                    setzeZeilen((alte) =>
                      alte.map((z, j) => (j === i ? { ...z, bis: e.target.value } : z)),
                    )
                  }
                  inputMode="decimal"
                  placeholder={t("Höhe")}
                  aria-label={t("Stufe {n} bis Meter", { n: i + 1 })}
                />
              </div>
              <div style={{ color: farben.muted, fontSize: 13, paddingBottom: 4 }}>→</div>
              <div style={{ width: 84 }}>
                <div style={beschriftung}>{t("FORMZAHL")}</div>
                <input
                  style={{ ...feldStil, width: "100%" }}
                  value={s.wert}
                  onChange={(e) =>
                    setzeZeilen((alte) =>
                      alte.map((z, j) => (j === i ? { ...z, wert: e.target.value } : z)),
                    )
                  }
                  inputMode="decimal"
                  placeholder={t("Formzahl")}
                  aria-label={t("Stufe {n} Formzahl", { n: i + 1 })}
                />
              </div>
              <button
                onClick={() => setzeZeilen((alte) => alte.filter((_, j) => j !== i))}
                aria-label={t("Stufe {n} entfernen", { n: i + 1 })}
                style={{
                  background: "none",
                  border: "none",
                  color: farben.muted,
                  fontSize: 18,
                  cursor: "pointer",
                  padding: "0 2px",
                  marginBottom: 2,
                }}
              >
                ×
              </button>
            </div>
          ))}

          <button
            onClick={() => setzeZeilen((alte) => [...alte, { bis: "", wert: "" }])}
            style={{
              background: "transparent",
              border: `1px solid ${farben.line}`,
              color: farben.text,
              borderRadius: 10,
              padding: "7px 14px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {t("+ Stufe")}
          </button>

          {gelesen.length > 0 && (
            <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.6, marginTop: 10 }}>
              {t("So wird gelesen:")}{" "}
              {gelesen.map((s, i) => (
                <span key={i}>
                  {t("bis {m} m → {wert}", { m: nk(s.bis, 0), wert: nk(s.wert, 2) })} ·{" "}
                </span>
              ))}
              {t("über {m} m → {wert} (Grundwert)", {
                m: nk(gelesen[gelesen.length - 1].bis, 0),
                wert: nk(grundwert, 2),
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
