import { useState, useEffect } from "react";
import { farben } from "./konfiguration.js";
import { baueXlsx } from "./xlsx.js";
import Kopf from "./monitoring/Kopf.jsx";
import Pflanzen from "./monitoring/Pflanzen.jsx";
import Auswertung from "./monitoring/Auswertung.jsx";
import { laden, speichern, neuerPunkt, naechsteNummer, VORLAGE_FELDER } from "./monitoring/speicher.js";
import { masterZeilen, baueCsv, baueGeoJson } from "./monitoring/export.js";
import { sollpunkteLesen } from "./monitoring/einlesen.js";
import { istVerbissen } from "./monitoring/berechnung.js";

/* Verjuengungszustandsmonitoring - die Aufnahmemaske der Landesforst
   Brandenburg als App.

   In der Excel-Fassung ist eine Datei ein Aufnahmepunkt. Hier liegen alle
   Punkte einer Untersuchungsflaeche nebeneinander: oben die Punktleiste,
   darunter derselbe Bogen wie in der Datei - Kopf, Pflanzen, Auswertung.
   Ein abgeschlossener Punkt wird gruen. */

const REITER = [
  { id: "kopf", text: "Kopf" },
  { id: "pflanzen", text: "Pflanzen" },
  { id: "auswertung", text: "Auswertung" },
];

export default function Monitoring() {
  const [stand, setStand] = useState(null);
  const [reiter, setReiter] = useState("kopf");
  const [hinweis, setHinweis] = useState("");

  useEffect(() => {
    setStand(laden());
  }, []);

  useEffect(() => {
    if (stand) speichern(stand);
  }, [stand]);

  useEffect(() => {
    if (!hinweis) return;
    const t = setTimeout(() => setHinweis(""), 2600);
    return () => clearTimeout(t);
  }, [hinweis]);

  if (!stand) return null;

  const punkt = stand.punkte[stand.aktiv];

  /* Aenderungen am aktiven Punkt. Die Angaben, die fuer den ganzen Bestand
     gelten, wandern zugleich in die Vorlage: der naechste Punkt startet
     damit, die bereits aufgenommenen bleiben unberuehrt. */
  const aendere = (wie) =>
    setStand((alt) => {
      const punkte = alt.punkte.map((p, i) => (i === alt.aktiv ? wie(p) : p));
      const aktiv = punkte[alt.aktiv];
      const vorlage = { ...alt.vorlage };
      for (const feld of VORLAGE_FELDER) vorlage[feld] = structuredClone(aktiv[feld]);
      return { ...alt, punkte, vorlage };
    });

  /* Sollpunkte aus dem Geoprogramm uebernehmen.

     Ein Punkt, dessen Nummer es schon gibt, bekommt nur die Soll-Lage
     dazu - bereits aufgenommene Daten bleiben unberuehrt. Alles andere
     waere im Gelaende ein Datenverlust mit einem einzigen Fehlgriff. */
  const sollpunkteLaden = async (datei) => {
    if (!datei) return;
    let text;
    try {
      text = await datei.text();
    } catch {
      setHinweis("Datei nicht lesbar");
      return;
    }

    const { punkte, format, grund } = sollpunkteLesen(text);
    if (!punkte.length) {
      setHinweis(grund);
      return;
    }

    setStand((alt) => {
      const vorhanden = new Map(alt.punkte.map((p, i) => [Number(p.nr), i]));
      const neue = [...alt.punkte];
      let ergaenzt = 0;

      for (const s of punkte) {
        const i = vorhanden.get(Number(s.nr));
        if (i != null) {
          neue[i] = { ...neue[i], sollLat: s.breite, sollLon: s.laenge };
          ergaenzt += 1;
        } else {
          neue.push({
            ...neuerPunkt(s.nr, alt.vorlage),
            sollLat: s.breite,
            sollLon: s.laenge,
          });
        }
      }

      /* Ein unberuehrter Startpunkt ohne Soll-Lage waere nach dem Einlesen
         nur noch im Weg. */
      const bereinigt = neue.filter(
        (p) =>
          p.sollLat != null ||
          p.lat != null ||
          p.pflanzen.length > 0 ||
          p.abgeschlossen,
      );
      const liste = (bereinigt.length ? bereinigt : neue).sort(
        (a, b) => Number(a.nr) - Number(b.nr),
      );

      setHinweis(
        `${punkte.length} Sollpunkte aus ${format} übernommen` +
          (ergaenzt ? ` (${ergaenzt} vorhandenen ergänzt)` : ""),
      );
      return { ...alt, punkte: liste, aktiv: 0 };
    });
  };

  const punktHinzu = () =>
    setStand((alt) => ({
      ...alt,
      punkte: [...alt.punkte, neuerPunkt(naechsteNummer(alt.punkte), alt.vorlage)],
      aktiv: alt.punkte.length,
    }));

  const punktWeg = () => {
    if (punkt.pflanzen.length || punkt.lat != null) {
      setHinweis("Punkt enthält Daten – erst Pflanzen löschen");
      return;
    }
    if (stand.punkte.length === 1) {
      setHinweis("Der letzte Punkt bleibt stehen");
      return;
    }
    setStand((alt) => {
      const punkte = alt.punkte.filter((_, i) => i !== alt.aktiv);
      return { ...alt, punkte, aktiv: Math.min(alt.aktiv, punkte.length - 1) };
    });
  };

  /* Ausgabe: erst der Weg ueber das Teilen-Menue des Geraets - damit landet
     die Datei direkt in Excel, Mail oder der Wolke. Klappt das nicht, wird
     sie schlicht heruntergeladen. */
  const ausgeben = async (blob, name, titel) => {
    try {
      const datei = new File([blob], name, { type: blob.type });
      if (navigator.canShare?.({ files: [datei] })) {
        await navigator.share({ files: [datei], title: titel });
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
    setHinweis(`${name} gespeichert`);
  };

  const dateiname = (endung) =>
    `Monitoring_${(punkt.gebiet || "Aufnahme").replace(/[^\wäöüÄÖÜß -]/g, "")}.${endung}`;

  const excel = () =>
    ausgeben(baueXlsx(masterZeilen(stand.punkte), "Mastertabelle"), dateiname("xlsx"), "Monitoring");

  const csv = () =>
    ausgeben(
      new Blob([baueCsv(masterZeilen(stand.punkte))], { type: "text/csv;charset=utf-8" }),
      dateiname("csv"),
      "Monitoring",
    );

  const geo = () => {
    const mitOrt = stand.punkte.filter((p) => p.lat != null || p.sollLat != null);
    if (!mitOrt.length) {
      setHinweis("Noch kein Punkt hat eine Koordinate");
      return;
    }
    ausgeben(
      new Blob([baueGeoJson(stand.punkte)], { type: "application/geo+json" }),
      dateiname("geojson"),
      "Monitoringpunkte",
    );
  };

  const knopf = {
    flex: 1,
    minWidth: 0,
    background: "transparent",
    border: `1px solid ${farben.line}`,
    color: farben.text,
    borderRadius: 10,
    padding: "12px 0",
    fontSize: 13,
    cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "14px 14px 40px" }}>
      {/* Punktleiste */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 4 }}>
        {stand.punkte.map((p, i) => {
          const aktiv = i === stand.aktiv;
          const fertig = p.abgeschlossen;
          return (
            <button
              key={p.nr}
              onClick={() => setStand((alt) => ({ ...alt, aktiv: i }))}
              aria-label={`Punkt ${p.nr}`}
              style={{
                flex: "0 0 auto",
                background: fertig ? farben.unverb : aktiv ? farben.surfaceHi : "transparent",
                border: `1px solid ${fertig ? farben.unverb : aktiv ? farben.text : farben.line}`,
                color: fertig ? farben.bg : aktiv ? farben.text : farben.muted,
                borderRadius: 10,
                padding: "9px 13px",
                fontSize: 14,
                fontWeight: aktiv || fertig ? 700 : 400,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {p.nr}
              {p.verlegt && !fertig ? " ↷" : ""}
              {!fertig && p.lat == null && p.sollLat != null ? " ·" : ""}
            </button>
          );
        })}
        <button
          onClick={punktHinzu}
          aria-label="Neuer Punkt"
          style={{
            flex: "0 0 auto",
            background: "transparent",
            border: `1px dashed ${farben.line}`,
            color: farben.muted,
            borderRadius: 10,
            padding: "9px 13px",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          + Punkt
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <label
          style={{
            flex: 1, textAlign: "center", background: "transparent",
            border: `1px dashed ${farben.line}`, color: farben.muted,
            borderRadius: 10, padding: "9px 0", fontSize: 12, cursor: "pointer",
          }}
        >
          Sollpunkte aus dem Geoprogramm laden
          <input
            type="file"
            accept=".geojson,.json,.csv,.txt,.gpx,.kml,application/geo+json,text/csv,application/gpx+xml"
            onChange={(e) => {
              sollpunkteLaden(e.target.files?.[0]);
              // Damit dieselbe Datei erneut gewaehlt werden kann.
              e.target.value = "";
            }}
            style={{ display: "none" }}
          />
        </label>
      </div>
      <div style={{ fontSize: 9, color: farben.muted, marginBottom: 12, lineHeight: 1.5 }}>
        GeoJSON, CSV (Rechts-/Hochwert oder Länge/Breite), GPX oder KML. Das
        Format und das Bezugssystem erkennt die App selbst.
      </div>

      <div style={{ fontSize: 10, color: farben.muted, marginBottom: 14 }}>
        {stand.punkte.filter((p) => p.abgeschlossen).length} von {stand.punkte.length} Punkten
        abgeschlossen · Punkt {punkt.nr}
        {punkt.verlegt ? " (verlegt)" : ""} ·{" "}
        {punkt.pflanzen.length} Pflanzen
        {punkt.pflanzen.length > 0 &&
          `, davon ${punkt.pflanzen.filter(istVerbissen).length} verbissen`}
      </div>

      {/* Reiter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {REITER.map((r) => (
          <button
            key={r.id}
            onClick={() => setReiter(r.id)}
            style={{
              flex: 1,
              minWidth: 0,
              background: reiter === r.id ? farben.surfaceHi : "transparent",
              border: `1px solid ${reiter === r.id ? farben.surfaceHi : farben.line}`,
              color: reiter === r.id ? farben.text : farben.muted,
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 14,
              fontWeight: reiter === r.id ? 700 : 400,
              cursor: "pointer",
            }}
          >
            {r.text}
          </button>
        ))}
      </div>

      {reiter === "kopf" && <Kopf punkt={punkt} aendere={aendere} setHinweis={setHinweis} />}
      {reiter === "pflanzen" && <Pflanzen punkt={punkt} aendere={aendere} setHinweis={setHinweis} />}
      {reiter === "auswertung" && <Auswertung punkt={punkt} aendere={aendere} />}

      {/* Ausgabe */}
      <div style={{ display: "flex", gap: 8, marginTop: 26 }}>
        <button onClick={excel} style={knopf}>Excel</button>
        <button onClick={csv} style={knopf}>CSV</button>
        <button onClick={geo} style={knopf}>Geodaten</button>
      </div>
      <div style={{ fontSize: 10, color: farben.muted, marginTop: 8, lineHeight: 1.5 }}>
        Excel und CSV enthalten alle Punkte in den Spalten der Mastertabelle,
        eine Zeile je Pflanze. Die Geodaten-Datei (GeoJSON) enthält die
        Aufnahmepunkte mit Ist- und Soll-Lage für die Wiederholungsaufnahme.
      </div>

      <button
        onClick={punktWeg}
        style={{
          width: "100%", marginTop: 18, background: "transparent", border: "none",
          color: farben.muted, fontSize: 12, cursor: "pointer", padding: "8px 0",
        }}
      >
        Diesen Punkt löschen
      </button>

      {hinweis && (
        <div
          style={{
            position: "fixed", left: 16, right: 16, bottom: 20,
            maxWidth: 528, margin: "0 auto",
            background: farben.surfaceHi, border: `1px solid ${farben.line}`,
            borderRadius: 10, padding: "12px 14px", fontSize: 13,
            textAlign: "center", color: farben.text,
          }}
        >
          {hinweis}
        </div>
      )}
    </div>
  );
}
