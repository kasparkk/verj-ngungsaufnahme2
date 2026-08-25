import { farben } from "../konfiguration.js";
import { HOEHENKLASSEN } from "./stammdaten.js";
import {
  verbissAuswertung, jeBaumart, stammzahlJeHektar, probekreisflaeche,
  zielProfil, aktiverBzt, verjuengungsfreundlich, aktiveArten,
} from "./berechnung.js";
import { beschriftung } from "./Felder.jsx";

const nk = (wert, stellen = 0) =>
  Number(wert).toLocaleString("de-DE", {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  });

const STUFEN_FARBE = { VZ1: farben.unverb, VZ2: "#D9A441", VZ3: farben.verb };

/* Was fehlt, damit der Punkt vollstaendig ist.

   Bewusst nur ein Hinweis und keine Sperre: im Gelaende gibt es Punkte, an
   denen sich eine Angabe nicht treffen laesst, und ein Programm, das den
   Abschluss dann verweigert, wird umgangen statt befolgt. */
function fehlendeAngaben(punkt) {
  const fehlt = [];
  if (!punkt.gebiet) fehlt.push("Untersuchungsgebiet");
  if (!punkt.monitorer) fehlt.push("Name Monitorer/in");
  if (!punkt.datum) fehlt.push("Datum");
  if (punkt.lat == null) fehlt.push("Ist-Position");
  if (!aktiverBzt(punkt.bzt, punkt.manZb1, punkt.manZb2)) fehlt.push("BZT");
  if (!zielProfil(punkt.mix, punkt.schicht, punkt.struktur)) fehlt.push("Ziel-Profil");
  if (!verjuengungsfreundlich(punkt.beschreibung)) fehlt.push("Bestandesbeschreibung");
  if (!punkt.pflanzen.length) fehlt.push("Pflanzenaufnahme");
  return fehlt;
}

export default function Auswertung({ punkt, aendere }) {
  const verbiss = verbissAuswertung(punkt.pflanzen, punkt.arten);
  const arten = jeBaumart(punkt.pflanzen, punkt.arten);
  const nHa = stammzahlJeHektar(punkt.pflanzen.filter((p) => p.kuerzel).length, punkt.radius);
  const fehlt = fehlendeAngaben(punkt);
  const gewaehltesZiel = { ZB1: punkt.vzZb1, ZB2: punkt.vzZb2 };

  return (
    <div>
      {/* Kennzahlen */}
      <div
        style={{
          background: farben.surface, borderRadius: 14,
          padding: "12px 14px", marginBottom: 18,
        }}
      >
        <div style={{ ...beschriftung, marginBottom: 8 }}>Punkt {punkt.nr}</div>
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { wert: verbiss.gesamt.anzahl, text: "Pflanzen" },
            {
              wert: verbiss.gesamt.anteil == null ? "–" : `${nk(verbiss.gesamt.anteil)} %`,
              text: "verbissen",
            },
            { wert: nHa == null ? "–" : nk(nHa), text: "Pflanzen/ha" },
          ].map((k) => (
            <div key={k.text} style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 23, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {k.wert}
              </div>
              <div style={{ fontSize: 10, color: farben.muted }}>{k.text}</div>
            </div>
          ))}
        </div>
        {probekreisflaeche(punkt.radius) > 0 && (
          <div style={{ fontSize: 10, color: farben.muted, marginTop: 8 }}>
            Hochgerechnet aus {nk(probekreisflaeche(punkt.radius), 1)} m² Probekreisfläche.
          </div>
        )}
      </div>

      {/* Verbissziel-Ampel */}
      <div style={{ ...beschriftung, marginBottom: 8 }}>Verbiss je Zielbaumartengruppe</div>
      <div style={{ fontSize: 11, color: farben.muted, marginBottom: 10, lineHeight: 1.5 }}>
        Anteil verbissener Pflanzen, gemessen an den Grenzwerten der
        Verbissziel-Tabelle. Verbissen heißt: frischer Winterverbiss oder
        Fegeschaden.
      </div>

      {verbiss.gruppen.map((g) => {
        const ziel = gewaehltesZiel[g.gruppe];
        const verfehlt =
          ziel && g.stufe && ["VZ1", "VZ2", "VZ3"].indexOf(g.stufe) > ["VZ1", "VZ2", "VZ3"].indexOf(ziel);
        return (
          <div
            key={g.gruppe}
            style={{
              background: farben.surface, borderRadius: 10,
              padding: "10px 12px", marginBottom: 6,
              borderLeft: `3px solid ${g.stufe ? STUFEN_FARBE[g.stufe] : farben.line}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{g.gruppe}</div>
              <div style={{ flex: 1, fontSize: 11, color: farben.muted }}>
                ≤ {g.vz1} % VZ1 · ≤ {g.vz2} % VZ2
              </div>
              <div
                style={{
                  fontSize: 15, fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                  color: g.stufe ? STUFEN_FARBE[g.stufe] : farben.muted,
                }}
              >
                {g.anteil == null ? "–" : `${nk(g.anteil)} %`}
              </div>
            </div>
            <div style={{ fontSize: 11, color: farben.muted, marginTop: 3 }}>
              {g.anzahl === 0
                ? "keine Pflanzen dieser Gruppe"
                : `${g.verbissen} von ${g.anzahl} verbissen · ${g.stufe}`}
              {verfehlt && (
                <span style={{ color: farben.verb }}> · Ziel {ziel} verfehlt</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Je Baumart */}
      {arten.length > 0 && (
        <>
          <div style={{ ...beschriftung, margin: "18px 0 8px" }}>Je Baumart</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: farben.muted, textAlign: "right" }}>
                  <th style={{ textAlign: "left", padding: "4px 6px", fontWeight: 400 }}>Art</th>
                  <th style={{ padding: "4px 6px", fontWeight: 400 }}>n</th>
                  <th style={{ padding: "4px 6px", fontWeight: 400 }}>verb.</th>
                  {HOEHENKLASSEN.map((h) => (
                    <th key={h.stufe} style={{ padding: "4px 6px", fontWeight: 400 }}>
                      HK{h.stufe}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {arten.map((a) => (
                  <tr key={a.kuerzel} style={{ borderTop: `1px solid ${farben.line}`, textAlign: "right" }}>
                    <td style={{ textAlign: "left", padding: "6px" }}>
                      <b>{a.kuerzel}</b>{" "}
                      <span style={{ color: farben.muted, fontSize: 10 }}>{a.rolle}</span>
                    </td>
                    <td style={{ padding: "6px", fontWeight: 700 }}>{a.anzahl}</td>
                    <td style={{ padding: "6px", color: a.verbissen ? farben.verb : farben.muted }}>
                      {a.verbissen}
                    </td>
                    {a.hk.map((n, i) => (
                      <td key={i} style={{ padding: "6px", color: n ? farben.text : farben.line }}>
                        {n}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Abschluss */}
      <div style={{ ...beschriftung, margin: "22px 0 8px" }}>Punkt abschließen</div>
      {fehlt.length > 0 ? (
        <div style={{ fontSize: 12, color: farben.verb, marginBottom: 10, lineHeight: 1.6 }}>
          Noch offen: {fehlt.join(", ")}.
          <div style={{ color: farben.muted, marginTop: 4 }}>
            Der Punkt lässt sich trotzdem abschließen — im Gelände ist nicht
            jede Angabe zu treffen.
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: farben.muted, marginBottom: 10 }}>
          Alle Angaben vollständig.
        </div>
      )}

      <button
        onClick={() => aendere((p) => ({ ...p, abgeschlossen: !p.abgeschlossen }))}
        style={{
          width: "100%",
          background: punkt.abgeschlossen ? farben.unverb : "transparent",
          border: `1px solid ${punkt.abgeschlossen ? farben.unverb : farben.line}`,
          color: punkt.abgeschlossen ? farben.bg : farben.text,
          borderRadius: 12, padding: "15px 0", fontSize: 15, fontWeight: 700,
          cursor: "pointer", WebkitTapHighlightColor: "transparent",
        }}
      >
        {punkt.abgeschlossen ? "✓ Punkt abgeschlossen" : "Punkt abschließen"}
      </button>
    </div>
  );
}
