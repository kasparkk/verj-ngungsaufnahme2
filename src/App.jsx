import { useState, useEffect, useRef } from "react";
import { farben, BAUMART_VORSCHLAEGE, leererKreis } from "./konfiguration.js";
import { ladeAlles, speichereAlles, heute, startBaumarten, leererTag } from "./speicher.js";
import { normDatum } from "./datum.js";
import { baueTabelle, baueZeilen } from "./tabelle.js";
import { baueXlsx } from "./xlsx.js";
import { zeilenHochladen, ergebnisAllePersonen, ergebnisEinePerson } from "./datenbank.js";
import ZaehlBox from "./komponenten/ZaehlBox.jsx";
import UebersichtTabelle from "./komponenten/UebersichtTabelle.jsx";
import ErgebnisAnsicht from "./komponenten/ErgebnisAnsicht.jsx";

// Wartezeit nach der letzten Aenderung, bevor automatisch abgeglichen wird.
const SYNC_VERZOEGERUNG = 1500;

export default function App() {
  // Geraeteweit - aendert sich nicht von Tag zu Tag.
  const [trupp, setTrupp] = useState("");
  const [radius, setRadius] = useState("100");

  // Der gerade offene Aufnahmetag und seine Zaehlung.
  const [datum, setDatum] = useState(heute());
  const [abteilung, setAbteilung] = useState("");
  const [arten, setArten] = useState(startBaumarten);
  const [kreise, setKreise] = useState([leererKreis(1)]);
  const [aktiv, setAktiv] = useState(0);

  // Die uebrigen Aufnahmetage, nach Datum abgelegt.
  const [andereTage, setAndereTage] = useState({});
  const [geladen, setGeladen] = useState(false);

  // Fuer den restlichen Ablauf weiterhin als ein Block.
  const kopf = { trupp, abteilung, datum, radius };

  /* Der offene Tag, auch fuer spaet eintreffende Antworten erreichbar
     (siehe holeStandort). */
  const datumRef = useRef(datum);
  datumRef.current = datum;

  const [hinweis, setHinweis] = useState("");
  const [neueArt, setNeueArt] = useState("");
  const [csvText, setCsvText] = useState(null);
  const [uebersichtOffen, setUebersichtOffen] = useState(false);
  const [gpsLaeuft, setGpsLaeuft] = useState(false);

  // "" = noch nichts zu senden, sonst sync | ok | err | offline
  const [syncStatus, setSyncStatus] = useState("");
  const [syncGrund, setSyncGrund] = useState("");
  const [sendet, setSendet] = useState(false);

  const [ergebnis, setErgebnis] = useState(null);
  const [rohzeilen, setRohzeilen] = useState([]);
  const [personen, setPersonen] = useState([]);
  const [ergebnisLaedt, setErgebnisLaedt] = useState(false);
  const [ergebnisFehler, setErgebnisFehler] = useState(null);
  const [nurDiesePerson, setNurDiesePerson] = useState(false);

  // Aufnahmen beim Start vom Geraet laden (aelterer Stand wird mit uebernommen).
  useEffect(() => {
    const stand = ladeAlles();
    setTrupp(stand.trupp);
    setRadius(stand.radius);
    setDatum(stand.datum);

    const { [stand.datum]: heutiger, ...uebrige } = stand.tage;
    const tag = heutiger || leererTag();
    setAbteilung(tag.abteilung ?? "");
    setArten(tag.arten?.length ? tag.arten : startBaumarten());
    setKreise(tag.kreise?.length ? tag.kreise : [leererKreis(1)]);
    setAktiv(tag.aktiv ?? 0);
    setAndereTage(uebrige);

    setGeladen(true);
  }, []);

  // Nach jeder Aenderung sofort lokal sichern (auch ohne Netz).
  useEffect(() => {
    if (!geladen) return;
    try {
      speichereAlles({
        trupp,
        radius,
        datum,
        tage: { ...andereTage, [datum]: { abteilung, arten, kreise, aktiv } },
      });
    } catch {
      setHinweis("Speichern fehlgeschlagen");
    }
  }, [trupp, radius, datum, abteilung, arten, kreise, aktiv, andereTage, geladen]);

  /* Datum umstellen heisst: Blatt wechseln. Die bisherige Zaehlung wird unter
     ihrem Tag abgelegt, und der neue Tag wird hervorgeholt - oder faengt leer
     an. Die Baumartenliste und die Abteilung werden dabei uebernommen, weil
     man sie sonst jeden Morgen neu eintippen muesste. */
  const datumWechseln = (neuesDatum) => {
    /* Ein leeres Feld ist kein Aufnahmetag. Beim Bearbeiten des Datums meldet
       der Browser zwischendurch "" - wuerde das als eigener Tag durchgehen,
       landete die laufende Zaehlung unter einem leeren Schluessel und der
       eigentliche Tag faenge beim naechsten Umstellen leer an. Die Zahlen
       waeren dann scheinbar weg. */
    if (!neuesDatum || neuesDatum === datum) return;

    setAndereTage((alle) => {
      const { [neuesDatum]: _weg, ...rest } = alle;
      return { ...rest, [datum]: { abteilung, arten, kreise, aktiv } };
    });

    const zielTag = andereTage[neuesDatum];
    if (zielTag) {
      setAbteilung(zielTag.abteilung ?? "");
      setArten(zielTag.arten?.length ? zielTag.arten : startBaumarten());
      setKreise(zielTag.kreise?.length ? zielTag.kreise : [leererKreis(1)]);
      setAktiv(zielTag.aktiv ?? 0);
    } else {
      setKreise([leererKreis(1)]);
      setAktiv(0);
    }

    datumRef.current = neuesDatum; // sofort, damit laufende Ortungen es sehen
    setDatum(neuesDatum);
    setGpsLaeuft(false);
    setSyncStatus("");
    setSyncGrund("");
  };

  /* Automatischer Abgleich: kurz nach der letzten Aenderung, damit nicht bei
     jedem einzelnen Tippen gesendet wird. Der Upload ueberschreibt gleiche
     Zeilen, darf also beliebig oft laufen.
     Die Funktion wird bewusst ueber eine Ref gehalten - so laeuft im Timer
     immer der aktuelle Stand, ohne den Timer bei jeder Aenderung neu zu setzen. */
  const synchronisierenRef = useRef(() => {});

  const synchronisieren = async () => {
    if (!kopf.trupp.trim()) return;

    const datum = normDatum(kopf.datum.trim());
    const flaeche = parseFloat(String(kopf.radius).replace(",", ".")) || 100;

    /* Nach Kreis + Baumart zusammenfassen. Taucht dieselbe Kombination zweimal
       auf - etwa weil eine Baumart doppelt in der Liste steht - lehnt die
       Datenbank sonst das GESAMTE Paket ab ("ON CONFLICT DO UPDATE command
       cannot affect row a second time"), also auch alle einwandfreien Zeilen.
       Die Zahlen werden dabei addiert: zweimal "Kiefer" ist dieselbe Baumart. */
    const jeZeile = new Map();

    kreise.forEach((kreis) =>
      arten.forEach((art) => {
        const zahl = kreis.counts[art.id] || { v: 0, u: 0 };
        if (!zahl.v && !zahl.u) return;

        const schluessel = `${kreis.nr}|${art.name.trim().toLowerCase()}`;
        const vorhanden = jeZeile.get(schluessel);
        if (vorhanden) {
          vorhanden.verbissen += zahl.v;
          vorhanden.unverbissen += zahl.u;
          return;
        }

        const zeile = {
          trupp: kopf.trupp.trim(),
          abteilung: kopf.abteilung.trim() || null,
          kreisflaeche: flaeche,
          kreis: kreis.nr,
          baumart: art.name.trim(),
          verbissen: zahl.v,
          unverbissen: zahl.u,
          /* Standort IMMER mitgeben, notfalls als null. Beim Sammel-Einfuegen
             verlangt PostgREST, dass alle Objekte dieselben Felder haben -
             sonst lehnt es das ganze Paket ab ("All object keys must match").
             Genau das passierte, sobald ein Kreis eine Ortung hatte und ein
             anderer nicht. */
          lat: kreis.lat ?? null,
          lon: kreis.lon ?? null,
          genauigkeit_m: kreis.acc ?? null,
        };
        // Fuer alle Zeilen gleich, bleibt also einheitlich. Nicht als null
        // senden: die Spalte ist NOT NULL und faellt sonst auf heute zurueck.
        if (datum) zeile.aufnahmedatum = datum;
        jeZeile.set(schluessel, zeile);
      })
    );

    const zeilen = [...jeZeile.values()];

    if (!zeilen.length) {
      setSyncStatus("");
      return;
    }

    setSendet(true);
    setSyncStatus("sync");
    try {
      const ergebnis = await zeilenHochladen(zeilen);
      if (ergebnis.ok) {
        setSyncStatus("ok");
        setSyncGrund("");
      } else {
        setSyncStatus("err");
        setSyncGrund(`${ergebnis.status}${ergebnis.grund ? ": " + ergebnis.grund : ""}`);
      }
    } catch (fehler) {
      setSyncStatus("offline");
      setSyncGrund(fehler?.message || "");
    } finally {
      setSendet(false);
    }
  };
  synchronisierenRef.current = synchronisieren;

  useEffect(() => {
    if (!geladen) return;
    const timer = setTimeout(() => synchronisierenRef.current(), SYNC_VERZOEGERUNG);
    return () => clearTimeout(timer);
    // Einzelwerte als Abhaengigkeiten, nicht das zusammengesetzte kopf-Objekt:
    // das waere bei jedem Neuzeichnen neu und wuerde den Timer endlos neu
    // setzen - der Abgleich liefe dann im Kreis.
  }, [trupp, abteilung, datum, radius, arten, kreise, geladen]);

  // Sobald wieder Netz da ist, liegengebliebene Zeilen nachschicken.
  useEffect(() => {
    const nachholen = () => synchronisierenRef.current();
    window.addEventListener("online", nachholen);
    return () => window.removeEventListener("online", nachholen);
  }, []);

  /* Nach einem misslungenen Abgleich in Ruhe weiterprobieren. Ohne Knopf zum
     Nachhelfen darf ein Fehlversuch sonst liegen bleiben, bis zufaellig die
     naechste Zaehlung kommt. Das "online"-Ereignis allein reicht nicht: im
     Wald wechselt der Empfang oft, ohne dass der Browser es meldet. */
  useEffect(() => {
    if (syncStatus !== "err" && syncStatus !== "offline") return;
    const timer = setInterval(() => synchronisierenRef.current(), 30000);
    return () => clearInterval(timer);
  }, [syncStatus]);

  // Hinweise blenden sich von selbst wieder aus.
  useEffect(() => {
    if (!hinweis) return;
    const timer = setTimeout(() => setHinweis(""), 2500);
    return () => clearTimeout(timer);
  }, [hinweis]);

  const aktuellerKreis = kreise[aktiv];
  const wert = (artId, feld) => aktuellerKreis?.counts?.[artId]?.[feld] ?? 0;

  // Alle drei Zaehl-Aenderungen wirken nur auf den gerade offenen Kreis.
  const aendere = (artId, feld, neuerWert) =>
    setKreise((alle) =>
      alle.map((kreis, i) => {
        if (i !== aktiv) return kreis;
        const zahl = { ...(kreis.counts[artId] || { v: 0, u: 0 }) };
        zahl[feld] = Math.max(0, neuerWert(zahl[feld]));
        return { ...kreis, counts: { ...kreis.counts, [artId]: zahl } };
      })
    );

  const plus = (artId, feld) => aendere(artId, feld, (alt) => alt + 1);
  const minus = (artId, feld) => aendere(artId, feld, (alt) => alt - 1);
  const setzen = (artId, feld, zahl) => aendere(artId, feld, () => zahl);

  /* GPS-Position fuer einen Kreis holen. still=true bei automatischem Versuch
     (neuer Kreis) - dann keine Fehlermeldung, falls die Ortung abgelehnt wird.

     Die Ortung kann bis zu 12 Sekunden brauchen. Wird in dieser Zeit der
     Aufnahmetag gewechselt, gehoert die Antwort nicht mehr zum offenen Blatt:
     sie wuerde sonst im falschen Tag landen (der Probekreis wird nur ueber
     seine Nummer gesucht, und die 1 gibt es an jedem Tag). Deshalb wird der
     Tag beim Start gemerkt und beim Eintreffen geprueft. */
  const holeStandort = (nr, still) => {
    if (!navigator.geolocation) {
      if (!still) setHinweis("Kein GPS auf diesem Gerät");
      return;
    }
    const fuerTag = datumRef.current;
    setGpsLaeuft(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLaeuft(false);
        if (datumRef.current !== fuerTag) return; // Tag inzwischen gewechselt
        setKreise((alle) =>
          alle.map((kreis) =>
            kreis.nr === nr
              ? {
                  ...kreis,
                  lat: pos.coords.latitude,
                  lon: pos.coords.longitude,
                  acc: pos.coords.accuracy,
                }
              : kreis
          )
        );
      },
      () => {
        setGpsLaeuft(false);
        if (datumRef.current !== fuerTag) return;
        if (!still) setHinweis("Standort nicht verfügbar");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const neuerKreis = () => {
    const nr = Math.max(...kreise.map((k) => k.nr)) + 1;
    setKreise((alle) => [...alle, leererKreis(nr)]);
    setAktiv(kreise.length);
    holeStandort(nr, true);
  };

  // Fehlende niedrigere Nummer vorne einfuegen (z.B. wenn die Zaehlung bei 2 beginnt).
  const kreisDavor = () => {
    const nr = Math.min(...kreise.map((k) => k.nr)) - 1;
    setKreise((alle) => [leererKreis(nr), ...alle]);
    setAktiv(0);
    holeStandort(nr, true);
  };

  const artHinzufuegen = (name) => {
    const sauber = (name ?? neueArt).trim();
    if (!sauber) return;
    if (arten.some((art) => art.name.toLowerCase() === sauber.toLowerCase())) {
      setHinweis(`${sauber} ist schon in der Liste`);
      setNeueArt("");
      return;
    }
    setArten((alle) => [...alle, { id: `a${Date.now()}`, name: sauber }]);
    setNeueArt("");
  };

  const csvKopieren = async () => {
    const alsTabulator = baueTabelle(kopf, arten, kreise, "\t");
    if (!alsTabulator) {
      setHinweis("Noch nichts gezählt");
      return;
    }
    setCsvText(baueTabelle(kopf, arten, kreise, ";"));
    try {
      await navigator.clipboard.writeText(alsTabulator);
      setHinweis("Kopiert – in Excel-Zelle A2 einfügen, fällt direkt in die Spalten");
    } catch {
      setHinweis("Text unten markieren und kopieren");
    }
  };

  /* Gibt die Aufnahme als echte Excel-Datei (.xlsx) heraus.

     Eine Web-App kann Excel nicht selbst starten - das laesst kein Browser zu.
     Am naechsten dran ist der Teilen-Dialog des Handys: dort steht Excel als
     Ziel, ein Tipp und die Tabelle ist offen. Gibt es den Dialog nicht (z.B.
     am Rechner), wird die Datei heruntergeladen; ein Doppelklick oeffnet sie
     dann in Excel. Klappt beides nicht, bleibt der Text zum Kopieren. */
  const excelDatei = async () => {
    const zeilen = baueZeilen(kopf, arten, kreise);
    if (!zeilen) {
      setHinweis("Noch nichts gezählt");
      return;
    }

    const name = `Verjuengung_${kopf.trupp || "Aufnahme"}.xlsx`;
    const blob = baueXlsx(zeilen, "Verjüngung");

    // Teilen-Dialog, falls das Geraet Dateien teilen kann.
    try {
      const datei = new File([blob], name, { type: blob.type });
      if (navigator.canShare?.({ files: [datei] })) {
        await navigator.share({ files: [datei], title: "Verjüngungsaufnahme" });
        return;
      }
    } catch (fehler) {
      // Abbruch durch den Nutzer ist kein Fehler - dann nichts weiter tun.
      if (fehler?.name === "AbortError") return;
    }

    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setHinweis("Excel-Datei gespeichert – in den Downloads antippen");
    } catch {
      setCsvText(baueTabelle(kopf, arten, kreise, ";"));
      setHinweis("Datei hier nicht möglich – Text unten markieren und kopieren");
    }
  };

  const ergebnisLaden = async (nurEigene) => {
    setErgebnisLaedt(true);
    setErgebnisFehler(null);
    const abteilung = kopf.abteilung.trim();
    const datum = normDatum(kopf.datum.trim());

    try {
      if (nurEigene) {
        const person = kopf.trupp.trim();
        const { auswertung, zeilen, kreiseGesamt } = await ergebnisEinePerson(
          person,
          abteilung,
          datum
        );
        auswertung.sort((a, b) => b.gesamt - a.gesamt);
        setErgebnis(auswertung);
        setPersonen(person ? [{ name: person, kreise: kreiseGesamt }] : []);
        setRohzeilen(
          zeilen
            .map((z) => ({ ...z, trupp: person }))
            .sort((a, b) => a.kreis - b.kreis || String(a.baumart).localeCompare(String(b.baumart)))
        );
        return;
      }

      const { auswertung, zeilen } = await ergebnisAllePersonen(abteilung, datum);
      auswertung.sort((a, b) => Number(b.gesamt) - Number(a.gesamt));
      setErgebnis(auswertung);

      // Je Person zaehlen, wie viele verschiedene Kreise sie beigesteuert hat.
      const jePerson = new Map();
      zeilen.forEach((z) => {
        if (!jePerson.has(z.trupp)) jePerson.set(z.trupp, new Set());
        jePerson.get(z.trupp).add(z.kreis);
      });
      setPersonen(
        [...jePerson.entries()]
          .map(([name, kreisNummern]) => ({ name, kreise: kreisNummern.size }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );

      setRohzeilen(
        [...zeilen].sort(
          (a, b) =>
            String(a.trupp).localeCompare(String(b.trupp)) ||
            a.kreis - b.kreis ||
            String(a.baumart).localeCompare(String(b.baumart))
        )
      );
    } catch (fehler) {
      setErgebnisFehler(
        fehler?.message?.startsWith("Abruf")
          ? fehler.message
          : "Kein Netz – Ergebnis kann gerade nicht geladen werden"
      );
    } finally {
      setErgebnisLaedt(false);
    }
  };

  const ergebnisOeffnen = () => {
    setErgebnis([]);
    setRohzeilen([]);
    setNurDiesePerson(false);
    ergebnisLaden(false);
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

  const leisteKnopf = {
    flex: 1,
    background: "none",
    border: `1px solid ${farben.line}`,
    color: farben.text,
    borderRadius: 12,
    padding: "14px 0",
    fontSize: 14,
    cursor: "pointer",
  };

  const pflanzenImKreis = arten.reduce(
    (summe, art) => summe + wert(art.id, "v") + wert(art.id, "u"),
    0
  );
  const hatZahlen = (artId) =>
    kreise.some((kreis) => {
      const zahl = kreis.counts[artId];
      return zahl && (zahl.v > 0 || zahl.u > 0);
    });
  const kleinsteNr = Math.min(...kreise.map((k) => k.nr));

  const syncText = () => {
    if (!kopf.trupp.trim()) return "Person eintragen – dann wird automatisch abgeglichen";
    if (sendet) return "Gleicht ab ...";
    if (syncStatus === "ok") return "✓ Abgeglichen";
    if (syncStatus === "err") return "Abgleich fehlgeschlagen – wird erneut versucht";
    if (syncStatus === "offline") return "Kein Netz – wird nachgeholt, sobald wieder Empfang da ist";
    return "Noch nichts gezählt";
  };
  const syncFarbe =
    syncStatus === "err" || syncStatus === "offline"
      ? farben.verb
      : syncStatus === "ok"
        ? farben.unverb
        : farben.muted;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: farben.bg,
        color: farben.text,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: "14px 14px 112px",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>PERSON</div>
          <input
            style={feldStil}
            value={kopf.trupp}
            onChange={(e) => setTrupp(e.target.value)}
            placeholder="A, B, C, ..."
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>DATUM</div>
          <input
            type="date"
            style={feldStil}
            value={kopf.datum}
            onChange={(e) => datumWechseln(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={ergebnisOeffnen}
        style={{
          width: "100%",
          background: "transparent",
          border: `1px solid ${farben.line}`,
          color: farben.text,
          borderRadius: 10,
          padding: "10px 0",
          fontSize: 14,
          marginBottom: 14,
          cursor: "pointer",
        }}
      >
        Ergebnis aller Personen ansehen
      </button>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>ABTEILUNG</div>
          <input
            style={feldStil}
            value={kopf.abteilung}
            onChange={(e) => setAbteilung(e.target.value)}
            placeholder="4138 b1"
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>FLÄCHE m²</div>
          <input
            style={feldStil}
            value={kopf.radius}
            onChange={(e) => setRadius(e.target.value)}
            placeholder="100"
            inputMode="decimal"
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: farben.surface,
          borderRadius: 14,
          padding: "10px 14px",
          marginBottom: 14,
        }}
      >
        {aktiv === 0 ? (
          kleinsteNr > 1 ? (
            <button
              onClick={kreisDavor}
              style={{
                background: farben.surfaceHi,
                border: `1px solid ${farben.line}`,
                color: farben.text,
                borderRadius: 10,
                padding: "8px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Kreis davor
            </button>
          ) : (
            <button
              disabled
              aria-label="Voriger Kreis"
              style={{
                background: "none",
                border: "none",
                color: farben.line,
                fontSize: 26,
                cursor: "default",
                padding: "0 10px",
              }}
            >
              ‹
            </button>
          )
        ) : (
          <button
            onClick={() => setAktiv(aktiv - 1)}
            aria-label="Voriger Kreis"
            style={{
              background: "none",
              border: "none",
              color: farben.text,
              fontSize: 26,
              cursor: "pointer",
              padding: "0 10px",
            }}
          >
            ‹
          </button>
        )}

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 1 }}>PROBEKREIS</div>
          <div style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {aktuellerKreis?.nr}
          </div>
          <div style={{ fontSize: 11, color: farben.muted }}>{pflanzenImKreis} Pflanzen</div>
          <button
            onClick={() => holeStandort(aktuellerKreis?.nr, false)}
            disabled={gpsLaeuft}
            style={{
              background: "none",
              border: "none",
              color: aktuellerKreis?.lat != null ? farben.unverb : farben.muted,
              fontSize: 10,
              cursor: "pointer",
              padding: "3px 0 0",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {gpsLaeuft
              ? "📍 …"
              : aktuellerKreis?.lat != null
                ? `📍 ${aktuellerKreis.lat.toFixed(5)}, ${aktuellerKreis.lon.toFixed(5)}`
                : "📍 Standort erfassen"}
          </button>
        </div>

        {aktiv === kreise.length - 1 ? (
          <button
            onClick={neuerKreis}
            style={{
              background: farben.surfaceHi,
              border: `1px solid ${farben.line}`,
              color: farben.text,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Neuer Kreis
          </button>
        ) : (
          <button
            onClick={() => setAktiv(Math.min(kreise.length - 1, aktiv + 1))}
            aria-label="Nächster Kreis"
            style={{
              background: "none",
              border: "none",
              color: farben.text,
              fontSize: 26,
              cursor: "pointer",
              padding: "0 10px",
            }}
          >
            ›
          </button>
        )}
      </div>

      <button
        onClick={() => setUebersichtOffen(!uebersichtOffen)}
        style={{
          width: "100%",
          background: "transparent",
          border: `1px solid ${farben.line}`,
          color: farben.text,
          borderRadius: 10,
          padding: "8px 0",
          fontSize: 13,
          marginBottom: uebersichtOffen ? 10 : 14,
          cursor: "pointer",
        }}
      >
        {uebersichtOffen ? "Übersicht ausblenden" : "Übersicht anzeigen"}
      </button>

      {uebersichtOffen && <UebersichtTabelle arten={arten} kreise={kreise} />}

      {arten.map((art) => (
        <div key={art.id} style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600 }}>{art.name}</div>
            <button
              onClick={() => {
                if (!hatZahlen(art.id)) setArten((alle) => alle.filter((a) => a.id !== art.id));
              }}
              disabled={hatZahlen(art.id)}
              title={
                hatZahlen(art.id)
                  ? "Schon irgendwo gezählt – erst überall auf 0 setzen, dann entfernbar"
                  : undefined
              }
              style={{
                background: "none",
                border: "none",
                color: hatZahlen(art.id) ? farben.line : farben.muted,
                fontSize: 12,
                cursor: hatZahlen(art.id) ? "default" : "pointer",
              }}
            >
              entfernen
            </button>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <ZaehlBox
              label="verbissen"
              wert={wert(art.id, "v")}
              farbe={farben.verb}
              onPlus={() => plus(art.id, "v")}
              onMinus={() => minus(art.id, "v")}
              onSet={(zahl) => setzen(art.id, "v", zahl)}
            />
            <ZaehlBox
              label="unverbissen"
              wert={wert(art.id, "u")}
              farbe={farben.unverb}
              onPlus={() => plus(art.id, "u")}
              onMinus={() => minus(art.id, "u")}
              onSet={(zahl) => setzen(art.id, "u", zahl)}
              gross
            />
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        <input
          style={{ ...feldStil, flex: 1 }}
          value={neueArt}
          onChange={(e) => setNeueArt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && artHinzufuegen()}
          placeholder="Baumart ergänzen"
        />
        <button
          onClick={() => artHinzufuegen()}
          style={{
            background: farben.surfaceHi,
            border: `1px solid ${farben.line}`,
            color: farben.text,
            borderRadius: 10,
            padding: "6px 14px",
            cursor: "pointer",
          }}
        >
          Hinzufügen
        </button>
      </div>

      {(() => {
        const offen = BAUMART_VORSCHLAEGE.filter(
          (name) => !arten.some((art) => art.name.toLowerCase() === name.toLowerCase())
        );
        if (!offen.length) return null;
        return (
          <div style={{ marginTop: 10 }}>
            <div
              style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6, marginBottom: 6 }}
            >
              VORSCHLÄGE
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {offen.map((name) => (
                <button
                  key={name}
                  onClick={() => artHinzufuegen(name)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${farben.line}`,
                    color: farben.muted,
                    borderRadius: 999,
                    padding: "6px 11px",
                    fontSize: 13,
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {csvText && (
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6, marginBottom: 6 }}>
            Bereits kopiert – nur falls nötig hier markieren. Beim automatischen Kopieren fallen die
            Werte in Excel direkt in die Spalten; wird dieser Text von Hand kopiert, in Excel: Daten
            › Text in Spalten › Semikolon.
          </div>
          <textarea
            readOnly
            value={csvText}
            onFocus={(e) => e.target.select()}
            style={{
              width: "100%",
              minHeight: 140,
              background: farben.surfaceHi,
              color: farben.text,
              border: `1px solid ${farben.line}`,
              borderRadius: 10,
              padding: 10,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={excelDatei}
              style={{ ...leisteKnopf, color: farben.muted, borderRadius: 10, padding: "10px 0", fontSize: 13 }}
            >
              Als Datei versuchen
            </button>
            <button
              onClick={() => setCsvText(null)}
              style={{ ...leisteKnopf, color: farben.muted, borderRadius: 10, padding: "10px 0", fontSize: 13 }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      {hinweis && (
        <div style={{ marginTop: 14, fontSize: 13, color: farben.muted, textAlign: "center" }}>
          {hinweis}
        </div>
      )}

      {ergebnis !== null && (
        <ErgebnisAnsicht
          ergebnis={ergebnis}
          personen={personen}
          zeilen={rohzeilen}
          laedt={ergebnisLaedt}
          fehler={ergebnisFehler}
          nurDiesePerson={nurDiesePerson}
          kopf={kopf}
          onSchliessen={() => setErgebnis(null)}
          onAllePersonen={() => {
            setNurDiesePerson(false);
            ergebnisLaden(false);
          }}
          onNurDiesePerson={() => {
            setNurDiesePerson(true);
            ergebnisLaden(true);
          }}
          onAktualisieren={() => ergebnisLaden(nurDiesePerson)}
        />
      )}

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: farben.surface,
          borderTop: `1px solid ${farben.line}`,
          padding: "8px 14px 10px",
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        {/* Nur Anzeige, kein Knopf: der Abgleich laeuft von selbst und wird
            nach einem Fehlversuch von allein wiederholt. */}
        <div
          style={{
            fontSize: 11,
            color: syncFarbe,
            textAlign: "center",
            padding: "2px 0 7px",
            lineHeight: 1.35,
          }}
        >
          {syncText()}
          {/* Klartext-Grund, damit man bei Problemen nicht raten muss. */}
          {syncGrund && (syncStatus === "err" || syncStatus === "offline") && (
            <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2, wordBreak: "break-word" }}>
              {syncGrund}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={csvKopieren} style={leisteKnopf}>
            CSV
          </button>
          <button onClick={ergebnisOeffnen} style={leisteKnopf}>
            PDF
          </button>
          <button onClick={excelDatei} style={leisteKnopf}>
            Excel
          </button>
        </div>
      </div>
    </div>
  );
}
