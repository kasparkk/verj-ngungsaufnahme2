import { useState } from "react";
import { farben } from "../konfiguration.js";
import { baueErgebnisDatei, ergebnisDateiname, probekreise, eingegrenzt } from "../ergebnisExport.js";
import { auswertenAusZeilen } from "../auswerten.js";

const kopfZelle = {
  padding: "6px 8px",
  color: farben.muted,
  whiteSpace: "nowrap",
  fontWeight: 600,
};

/* Vollbild-Auswertung ueber die Daten aus der Datenbank - also ueber alles,
   was von allen Geraeten abgeglichen wurde.

   Die id "verjuengung-druckbereich" ist wichtig: nur dieser Bereich landet im
   Ausdruck bzw. PDF (Regeln dazu stehen in index.html). Elemente mit der
   Klasse "no-print" (Knoepfe, Umschalter) bleiben dabei aussen vor. */
export default function ErgebnisAnsicht({
  ergebnis,
  personen,
  zeilen,
  laedt,
  fehler,
  nurDiesePerson,
  kopf,
  onSchliessen,
  onAllePersonen,
  onNurDiesePerson,
  onAktualisieren,
}) {
  const [meldung, setMeldung] = useState("");
  /* Antippen einer Person zeigt nur ihre Zahlen. Gerechnet wird aus den
     bereits geladenen Zeilen - kein neuer Abruf, damit das Umschalten auch
     ohne Empfang geht. Steht die gemerkte Person nach einem Neuladen nicht
     mehr in den Daten, gilt wieder "alle zusammen". */
  const [gewaehlt, setGewaehlt] = useState(null);
  /* Die Datei bekommt nur den einen Tag in der einen Abteilung - die Ansicht
     darf mehr zeigen, die Datei soll es nicht. */
  const fuerDatei = eingegrenzt(ergebnis ?? [], zeilen, kopf);
  const kreise = probekreise(fuerDatei.zeilen);
  /* Ohne gesetztes Datum kommen mehrere Aufnahmetage zusammen. Dann sehen
     Zeilen gleich aus, die es nicht sind - derselbe Kreis, dieselbe Baumart,
     aber ein anderer Tag. In dem Fall bekommt die Tabelle eine Datumsspalte. */
  const mehrereTage = new Set(zeilen.map((z) => z.aufnahmedatum)).size > 1;

  const person = personen.some((p) => p.name === gewaehlt) ? gewaehlt : null;
  const sichtbareZeilen = person ? zeilen.filter((z) => z.trupp === person) : zeilen;
  const sichtbareAuswertung = person
    ? auswertenAusZeilen(sichtbareZeilen).auswertung
    : ergebnis;
  const mitOrt = kreise.filter((k) => k.lat != null).length;

  /* Erst der Weg ueber das Teilen-Menue - damit landet die Datei direkt in
     Excel, Mail oder der Wolke. Klappt das nicht, wird sie heruntergeladen. */
  const excel = async () => {
    if (!fuerDatei.datum) {
      setMeldung("Kein Aufnahmedatum gesetzt – ohne Datum keine Ausgabe");
      return;
    }
    if (!fuerDatei.zeilen.length) {
      setMeldung(`Für den ${fuerDatei.datum} gibt es hier keine Einträge`);
      return;
    }
    const name = ergebnisDateiname(kopf);
    const blob = baueErgebnisDatei(fuerDatei.auswertung, fuerDatei.zeilen, kopf);

    try {
      const datei = new File([blob], name, { type: blob.type });
      if (navigator.canShare?.({ files: [datei] })) {
        await navigator.share({ files: [datei], title: "Verjüngungsaufnahme" });
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
    setMeldung(`${name} gespeichert`);
  };

  return (
    <div
      id="verjuengung-druckbereich"
      style={{
        position: "fixed",
        inset: 0,
        background: farben.bg,
        overflowY: "auto",
        padding: "16px 14px 40px",
        zIndex: 20,
      }}
    >
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: 18, fontWeight: 700 }}>Ergebnis</div>
        <button
          onClick={onSchliessen}
          aria-label="Schließen"
          style={{
            background: "none",
            border: "none",
            color: farben.muted,
            fontSize: 22,
            cursor: "pointer",
            padding: "0 6px",
          }}
        >
          ×
        </button>
      </div>

      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={onAllePersonen}
          style={{
            flex: 1,
            background: nurDiesePerson ? "transparent" : farben.surfaceHi,
            border: `1px solid ${farben.line}`,
            color: farben.text,
            borderRadius: 10,
            padding: "8px 0",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Alle zusammen
        </button>
        <button
          onClick={onNurDiesePerson}
          disabled={!kopf.trupp.trim()}
          style={{
            flex: 1,
            background: nurDiesePerson ? farben.surfaceHi : "transparent",
            border: `1px solid ${farben.line}`,
            color: kopf.trupp.trim() ? farben.text : farben.muted,
            borderRadius: 10,
            padding: "8px 0",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Nur diese Person
        </button>
      </div>

      <div style={{ fontSize: 12, color: farben.muted, marginBottom: 16 }}>
        {kopf.abteilung || "ohne Abteilung"}
        {kopf.datum ? ` · ${kopf.datum}` : ""} ·{" "}
        {person
          ? `nur ${person}`
          : nurDiesePerson
            ? `nur ${kopf.trupp.trim() || "?"}`
            : "alle Personen zusammen"}
      </div>

      {laedt && <div style={{ color: farben.muted }}>Wird geladen ...</div>}
      {fehler && <div style={{ color: farben.verb }}>{fehler}</div>}

      {!laedt && !fehler && ergebnis.length === 0 && (
        <div style={{ color: farben.muted, lineHeight: 1.5 }}>
          Für diese Abteilung und dieses Datum liegt noch nichts vor. Zuerst abgleichen lassen – und
          prüfen, ob Abteilung und Datum bei allen Personen gleich eingetragen sind.
        </div>
      )}

      {!laedt && ergebnis.length > 0 && (
        <>
          <div
            style={{
              background: farben.surface,
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 11, color: farben.muted, letterSpacing: 0.6 }}>
              {person ? `PROBEKREISE VON ${person.toUpperCase()}` : "PROBEKREISE INSGESAMT"}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700 }}>
              {sichtbareAuswertung[0]?.kreise_gesamt ?? 0}
            </div>

            {/* Person antippen heisst: nur ihre Zahlen. Nochmal antippen
                blendet wieder alle zusammen ein. */}
            <div
              className="no-print"
              style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}
            >
              {personen.map((p) => {
                const aktiv = person === p.name;
                return (
                  <button
                    key={p.name}
                    onClick={() => setGewaehlt(aktiv ? null : p.name)}
                    style={{
                      background: aktiv ? farben.unverb : "transparent",
                      border: `1px solid ${aktiv ? farben.unverb : farben.line}`,
                      color: aktiv ? farben.bg : farben.text,
                      borderRadius: 999,
                      padding: "7px 12px",
                      fontSize: 13,
                      fontWeight: aktiv ? 700 : 400,
                      cursor: "pointer",
                      WebkitTapHighlightColor: "transparent",
                    }}
                  >
                    {p.name || "ohne Namen"}{" "}
                    <span style={{ opacity: 0.7, fontWeight: 400 }}>
                      {p.kreise}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Im Ausdruck gibt es nichts zum Antippen - dort nur der Text. */}
            <div
              style={{ fontSize: 12, color: farben.muted, marginTop: 4, display: "none" }}
              className="nur-print"
            >
              {personen.map((p) => `${p.name}: ${p.kreise}`).join("  ·  ")}
            </div>

            {person && (
              <div style={{ fontSize: 11, color: farben.muted, marginTop: 8, lineHeight: 1.5 }}>
                Es werden nur die Zählungen von {person} gezeigt. Nochmal
                antippen zeigt wieder alle zusammen.
              </div>
            )}
          </div>

          {sichtbareAuswertung.map((zeile) => {
            const prozent = Number(zeile.verbiss_prozent);
            return (
              <div
                key={zeile.baumart}
                style={{ borderBottom: `1px solid ${farben.line}`, padding: "10px 2px" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{zeile.baumart}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {Number(zeile.stueck_je_ha).toLocaleString("de-DE")}
                    <span style={{ fontSize: 11, color: farben.muted, fontWeight: 400 }}> Stk/ha</span>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: farben.muted, marginTop: 3 }}>
                  {zeile.gesamt} gezählt · {zeile.verbissen} verbissen
                  {Number.isFinite(prozent) ? ` (${prozent.toLocaleString("de-DE")} %)` : ""}
                </div>
                <div
                  style={{
                    height: 5,
                    background: farben.surfaceHi,
                    borderRadius: 3,
                    marginTop: 6,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Number.isFinite(prozent) ? prozent : 0)}%`,
                      height: "100%",
                      background: farben.verb,
                    }}
                  />
                </div>
              </div>
            );
          })}

          {sichtbareZeilen.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 11, color: farben.muted, letterSpacing: 0.6, marginBottom: 6 }}>
                {person ? `EINTRÄGE VON ${person.toUpperCase()}` : "ALLE EINTRÄGE"} (
                {sichtbareZeilen.length})
              </div>
              <div style={{ overflowX: "auto", border: `1px solid ${farben.line}`, borderRadius: 10 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {!person && <th style={{ ...kopfZelle, textAlign: "left" }}>Person</th>}
                      {mehrereTage && <th style={{ ...kopfZelle, textAlign: "left" }}>Datum</th>}
                      <th style={{ ...kopfZelle, textAlign: "left" }}>Kreis</th>
                      <th style={{ ...kopfZelle, textAlign: "left" }}>Baumart</th>
                      <th style={{ ...kopfZelle, textAlign: "center" }}>verb.</th>
                      <th style={{ ...kopfZelle, textAlign: "center" }}>unverb.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sichtbareZeilen.map((zeile, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${farben.line}` }}>
                        {!person && (
                          <td style={{ padding: "6px 8px", whiteSpace: "nowrap", fontWeight: 700 }}>
                            {zeile.trupp}
                          </td>
                        )}
                        {mehrereTage && (
                          <td style={{ padding: "6px 8px", whiteSpace: "nowrap", color: farben.muted }}>
                            {zeile.aufnahmedatum}
                          </td>
                        )}
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{zeile.kreis}</td>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{zeile.baumart}</td>
                        <td style={{ padding: "6px 8px", textAlign: "center", color: farben.verb }}>
                          {zeile.verbissen}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "center", color: farben.unverb }}>
                          {zeile.unverbissen}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <div className="no-print" style={{ display: "flex", gap: 10, marginTop: 20 }}>
        <button
          onClick={onAktualisieren}
          disabled={laedt}
          style={{
            flex: 1,
            background: "transparent",
            border: `1px solid ${farben.line}`,
            color: farben.text,
            borderRadius: 12,
            padding: "13px 0",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {laedt ? "Wird geladen ..." : "Aktualisieren"}
        </button>
        <button
          onClick={excel}
          style={{
            flex: 1,
            background: "transparent",
            border: `1px solid ${farben.line}`,
            color: farben.text,
            borderRadius: 12,
            padding: "13px 0",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Excel
        </button>
        <button
          onClick={() => window.print()}
          style={{
            flex: 1,
            background: "transparent",
            border: `1px solid ${farben.line}`,
            color: farben.text,
            borderRadius: 12,
            padding: "13px 0",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          PDF
        </button>
      </div>

      <div className="no-print" style={{ fontSize: 10, color: farben.muted, marginTop: 8, lineHeight: 1.5 }}>
        {fuerDatei.datum ? (
          <>
            Die Excel-Datei enthält nur {fuerDatei.abteilung || "die Aufnahme ohne Abteilung"} vom{" "}
            {fuerDatei.datum} – {fuerDatei.zeilen.length}{" "}
            {fuerDatei.zeilen.length === 1 ? "Eintrag" : "Einträge"}
            {fuerDatei.weggelassen > 0 &&
              `, ${fuerDatei.weggelassen} von anderen Tagen bleiben draußen`}
            . Drei Blätter: Zählungen (je Probekreis und Baumart eine Zeile),
            Probekreise (je Kreis eine Zeile mit Koordinate und Kartenlink) und
            Auswertung (je Baumart, über alle Kreise zusammengefasst).
            {kreise.length > 0 &&
              ` ${mitOrt} von ${kreise.length} Probekreisen haben eine Koordinate.`}
          </>
        ) : (
          <span style={{ color: farben.verb }}>
            Für die Excel-Datei fehlt das Aufnahmedatum. Sie soll immer genau
            einen Tag enthalten – oben ein Datum setzen.
          </span>
        )}
      </div>

      {meldung && (
        <div className="no-print" style={{ fontSize: 12, color: farben.muted, marginTop: 10, textAlign: "center" }}>
          {meldung}
        </div>
      )}
    </div>
  );
}
