import { useState } from "react";
import { farben } from "../konfiguration.js";
import { BAUMARTEN, HOEHENKLASSEN, MERKMALE, MAX_PFLANZEN, artNach } from "./stammdaten.js";
import { schadensklasse, istVerbissen, rolleVon, aktiveArten } from "./berechnung.js";
import { leerePflanze } from "./speicher.js";
import { Feld, AuswahlFeld, Schalter, beschriftung } from "./Felder.jsx";

const KLASSEN_FARBE = {
  "1 — gering": farben.unverb,
  "2 — mittel": "#D9A441",
  "3 — stark": farben.verb,
};

/* Pflanzenaufnahme eines Punktes.

   Der Ablauf ist auf Wiederholung ausgelegt: Baumart antippen, Hoehenklasse
   antippen, aufnehmen. Baumart und Hoehenklasse bleiben danach stehen, denn
   im Bestand folgen meist mehrere gleichartige Pflanzen hintereinander; die
   Schadensmerkmale werden dagegen zurueckgesetzt, weil ein stehen
   gebliebener Haken die naechste Pflanze still verfaelschen wuerde. */
export default function Pflanzen({ punkt, aendere, setHinweis }) {
  const [entwurf, setEntwurf] = useState(leerePflanze);
  const [aendertIndex, setAendertIndex] = useState(null);
  const [andereOffen, setAndereOffen] = useState(false);

  const aktive = aktiveArten(punkt.arten);
  const voll = punkt.pflanzen.length >= MAX_PFLANZEN;
  const fertig = entwurf.kuerzel && entwurf.hk;

  const setzeEntwurf = (feld) => (wert) => setEntwurf((e) => ({ ...e, [feld]: wert }));

  const uebernehmen = () => {
    if (!fertig) {
      setHinweis(entwurf.kuerzel ? "Höhenklasse fehlt" : "Baumart wählen");
      return;
    }
    if (aendertIndex !== null) {
      aendere((p) => ({
        ...p,
        pflanzen: p.pflanzen.map((pf, i) => (i === aendertIndex ? entwurf : pf)),
      }));
      setAendertIndex(null);
      setEntwurf(leerePflanze());
      setHinweis("Geändert");
      return;
    }
    if (voll) {
      setHinweis(`Mehr als ${MAX_PFLANZEN} Pflanzen sieht die Maske nicht vor`);
      return;
    }
    aendere((p) => ({ ...p, pflanzen: [...p.pflanzen, entwurf] }));
    // Baumart und Hoehenklasse bleiben, die Schadensmerkmale nicht.
    setEntwurf({ ...leerePflanze(), kuerzel: entwurf.kuerzel, hk: entwurf.hk });
  };

  const bearbeiten = (i) => {
    setEntwurf({ ...punkt.pflanzen[i] });
    setAendertIndex(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const loeschen = (i) => {
    aendere((p) => ({ ...p, pflanzen: p.pflanzen.filter((_, j) => j !== i) }));
    if (aendertIndex === i) {
      setAendertIndex(null);
      setEntwurf(leerePflanze());
    }
  };

  const klasse = schadensklasse(entwurf);

  return (
    <div>
      {/* Eingabe */}
      <div
        style={{
          background: farben.surface,
          borderRadius: 14,
          padding: "12px 12px 14px",
          marginBottom: 18,
          border: aendertIndex !== null ? `1px solid ${farben.unverb}` : "none",
        }}
      >
        <div style={{ ...beschriftung, marginBottom: 10 }}>
          {aendertIndex !== null
            ? `Pflanze ${aendertIndex + 1} ändern`
            : `Pflanze ${punkt.pflanzen.length + 1} von höchstens ${MAX_PFLANZEN}`}
        </div>

        <Feld titel="Baumart">
          {aktive.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
              {aktive.map((a) => {
                const gewaehlt = entwurf.kuerzel === a.kuerzel;
                return (
                  <button
                    key={a.kuerzel}
                    onClick={() => setzeEntwurf("kuerzel")(a.kuerzel)}
                    aria-label={a.name}
                    style={{
                      background: gewaehlt ? farben.unverb : "transparent",
                      border: `1px solid ${gewaehlt ? farben.unverb : farben.line}`,
                      color: gewaehlt ? farben.bg : farben.text,
                      borderRadius: 10,
                      padding: "11px 13px",
                      fontSize: 15,
                      fontWeight: gewaehlt ? 700 : 400,
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {a.kuerzel}
                  </button>
                );
              })}
            </div>
          )}

          {/* Eine Baumart, die nicht als Zielbaumart geführt wird, kommt
              trotzdem im Bestand vor - sie soll aufnehmbar bleiben. */}
          {andereOffen || (entwurf.kuerzel && !aktive.some((a) => a.kuerzel === entwurf.kuerzel)) ? (
            <AuswahlFeld
              wert={entwurf.kuerzel}
              setWert={(k) => {
                setzeEntwurf("kuerzel")(k);
                setAndereOffen(false);
              }}
              werte={BAUMARTEN.map((a) => ({ wert: a.kuerzel, text: a.name }))}
              leerText="— andere Baumart —"
            />
          ) : (
            <button
              onClick={() => setAndereOffen(true)}
              style={{
                background: "transparent", border: `1px dashed ${farben.line}`,
                color: farben.muted, borderRadius: 10, padding: "9px 12px",
                fontSize: 13, cursor: "pointer",
              }}
            >
              andere Baumart …
            </button>
          )}

          {entwurf.kuerzel && (
            <div style={{ fontSize: 11, color: farben.muted, marginTop: 6 }}>
              {artNach(entwurf.kuerzel)?.name} · Rolle {rolleVon(entwurf.kuerzel, punkt.arten)}
            </div>
          )}
        </Feld>

        <Feld titel="Höhenklasse">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 5 }}>
            {HOEHENKLASSEN.map((h) => {
              const gewaehlt = String(entwurf.hk) === String(h.stufe);
              return (
                <button
                  key={h.stufe}
                  onClick={() => setzeEntwurf("hk")(gewaehlt ? "" : h.stufe)}
                  aria-label={`HK ${h.stufe}`}
                  style={{
                    background: gewaehlt ? farben.unverb : "transparent",
                    border: `1px solid ${gewaehlt ? farben.unverb : farben.line}`,
                    color: gewaehlt ? farben.bg : farben.text,
                    borderRadius: 10,
                    padding: "9px 0 7px",
                    cursor: "pointer",
                    minWidth: 0,
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.1 }}>{h.stufe}</div>
                  <div style={{ fontSize: 9, opacity: 0.8, whiteSpace: "nowrap" }}>{h.bereich}</div>
                </button>
              );
            })}
          </div>
        </Feld>

        <Feld titel="Merkmale">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
            {MERKMALE.map((m) => (
              <Schalter
                key={m.feld}
                an={entwurf[m.feld] === 1}
                setAn={(w) => setzeEntwurf(m.feld)(w)}
                text={m.kurz}
                // Der Verbissschutz ist kein Schaden, sondern eine Maßnahme.
                farbe={m.feld === "schutz" ? farben.unverb : farben.verb}
              />
            ))}
          </div>
        </Feld>

        {klasse && klasse !== "—" && (
          <div style={{ fontSize: 12, color: KLASSEN_FARBE[klasse] ?? farben.muted, marginBottom: 10 }}>
            Schadensklasse {klasse}
            {istVerbissen(entwurf) ? " · verbissen" : ""}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={uebernehmen}
            style={{
              flex: 1,
              background: fertig ? farben.unverb : "transparent",
              border: `1px solid ${fertig ? farben.unverb : farben.line}`,
              color: fertig ? farben.bg : farben.muted,
              borderRadius: 12,
              padding: "15px 0",
              fontSize: 16,
              fontWeight: 700,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {aendertIndex !== null ? "Änderung speichern" : "+ Pflanze aufnehmen"}
          </button>
          {aendertIndex !== null && (
            <button
              onClick={() => {
                setAendertIndex(null);
                setEntwurf(leerePflanze());
              }}
              style={{
                background: "transparent", border: `1px solid ${farben.line}`,
                color: farben.muted, borderRadius: 12, padding: "0 16px",
                fontSize: 14, cursor: "pointer",
              }}
            >
              Abbrechen
            </button>
          )}
        </div>

        {voll && aendertIndex === null && (
          <div style={{ fontSize: 11, color: farben.verb, marginTop: 8 }}>
            {MAX_PFLANZEN} Pflanzen erreicht — mehr sieht die Aufnahmemaske nicht vor.
          </div>
        )}
      </div>

      {/* Aufgenommene Pflanzen */}
      <div style={{ ...beschriftung, marginBottom: 8 }}>
        Aufgenommen · {punkt.pflanzen.length}
        {punkt.pflanzen.length > 0 &&
          ` · davon ${punkt.pflanzen.filter(istVerbissen).length} verbissen`}
      </div>

      {punkt.pflanzen.length === 0 && (
        <div style={{ fontSize: 12, color: farben.muted, lineHeight: 1.5 }}>
          Noch keine Pflanze aufgenommen. Baumart und Höhenklasse antippen, dann
          „Pflanze aufnehmen“ — die Auswahl bleibt für die nächste Pflanze stehen.
        </div>
      )}

      {punkt.pflanzen.map((pf, i) => {
        const k = schadensklasse(pf);
        const merkmale = MERKMALE.filter((m) => pf[m.feld] === 1);
        return (
          <div
            key={i}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: farben.surface, borderRadius: 10,
              padding: "9px 10px", marginBottom: 6,
              borderLeft: `3px solid ${KLASSEN_FARBE[k] ?? farben.line}`,
            }}
          >
            <div style={{ fontSize: 11, color: farben.muted, width: 22, textAlign: "right" }}>
              {i + 1}
            </div>
            <div
              onClick={() => bearbeiten(i)}
              role="button"
              aria-label={`Pflanze ${i + 1} ändern`}
              style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            >
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                {pf.kuerzel} <span style={{ color: farben.muted, fontWeight: 400 }}>· HK {pf.hk}</span>
              </div>
              <div style={{ fontSize: 10, color: farben.muted, marginTop: 1 }}>
                {merkmale.length ? merkmale.map((m) => m.kurz).join(" · ") : "ohne Befund"}
              </div>
            </div>
            <button
              onClick={() => loeschen(i)}
              aria-label={`Pflanze ${i + 1} löschen`}
              style={{
                background: "none", border: "none", color: farben.muted,
                fontSize: 18, cursor: "pointer", padding: "0 2px",
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
