import { useState, useEffect, useRef } from "react";
import { farben } from "./konfiguration.js";
import { zahl, grundflaeche, volumen, mittel, wzpAuswerten, alleArten, flaechenGesamt } from "./baum/berechnung.js";
import {
  laden,
  speichern,
  leererStand,
  hatDaten,
  neueAufnahme,
  vorigeZuruecklegen,
  vorigeDa,
  vorigeHolen,
  vorigeWeg,
} from "./baum/speicher.js";
import { baueXlsx } from "./xlsx.js";
import Winkelzaehlprobe from "./baum/Winkelzaehlprobe.jsx";
import Einzelbaeume from "./baum/Einzelbaeume.jsx";
import Formzahlen from "./baum/Formzahlen.jsx";
import KoordinatenKopieren from "./komponenten/KoordinatenKopieren.jsx";
import { baueGeoJsonMessung, geoDateiname } from "./baum/geo.js";
import { useT, artName } from "./sprache.js";

/* Rahmen der Baummessung mit zwei Verfahren:

   Winkelzaehlprobe - am Standpunkt zaehlen, keine Flaeche noetig (das
   uebliche Vorgehen im Bestand), und Einzelbaeume - jeder Baum mit BHD und
   Hoehe auf einer abgesteckten Flaeche.

   Ort und Formzahlen gelten fuer den Bestand und werden deshalb von beiden
   Verfahren geteilt. */
export default function Baummessung() {
  const t = useT();
  const [stand, setStand] = useState(leererStand);
  const [geladen, setGeladen] = useState(false);
  const [hinweis, setHinweis] = useState("");
  const [formzahlenOffen, setFormzahlenOffen] = useState(false);
  /* Umbenennen des Bestandes.

     Gemeldet: "wenn man den Namen vom Feld ändert, stehen immer noch die
     gleichen Daten drin." Genau so war es - der Name war eine blosse
     Beschriftung, die Zahlen des vorigen Bestandes blieben stehen und
     waeren unter dem neuen Namen in der Datei gelandet.

     Jetzt fragt die App beim Umbenennen, ob ein neues Blatt gemeint ist.
     Sie fragt nur, wenn es etwas zu verlieren gibt, und sie leert nichts
     ohne Antwort. ortBeiFokus haelt den Namen fest, mit dem das Feld
     betreten wurde - erst beim Verlassen wird verglichen, nicht bei
     jedem Buchstaben. */
  const [ortBeiFokus, setOrtBeiFokus] = useState(null);
  const [ortFrage, setOrtFrage] = useState(null);
  const [zurueckholbar, setZurueckholbar] = useState(false);
  const [gpsLaeuft, setGpsLaeuft] = useState(false);

  /* Hoehe der festen Leiste unten, gemessen statt geraten. Geraten war sie
     zu niedrig (96 statt 132 px), und dann lag der letzte Knopf der Seite
     unter der Leiste - antippen ging nicht mehr. Mit der Zeile zum
     Dateiformat ist die Leiste zweizeilig geworden, und sie kann noch
     wachsen; gemessen haelt das auch dann. */
  const leisteRef = useRef(null);
  const [leisteHoehe, setLeisteHoehe] = useState(132);

  useEffect(() => {
    setStand(laden());
    setGeladen(true);
  }, []);

  useEffect(() => {
    if (!geladen) return;
    try {
      speichern(stand);
    } catch {
      setHinweis(t("Speichern fehlgeschlagen"));
    }
  }, [stand, geladen]);

  useEffect(() => {
    const leiste = leisteRef.current;
    if (!leiste || typeof ResizeObserver === "undefined") return;
    const messen = () => setLeisteHoehe(Math.ceil(leiste.getBoundingClientRect().height));
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(leiste);
    return () => beobachter.disconnect();
  }, []);

  useEffect(() => {
    if (!hinweis) return;
    const uhr = setTimeout(() => setHinweis(""), 2500);
    return () => clearTimeout(uhr);
  }, [hinweis]);

  /* Die Artenliste gilt fuer beide Verfahren - wie Ort und Formzahlen
     gehoert sie zum Bestand, nicht zum Verfahren. */
  const arten = alleArten(stand.eigeneArten);

  /* Gibt einen Grund zurueck, wenn es nicht geht, sonst nichts. So kann
     das Eingabefeld selbst entscheiden, ob es sich leert. */
  const artHinzu = (name) => {
    if (arten.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
      return t("{art} steht schon in der Liste", { art: name });
    }
    setStand((alt) => ({ ...alt, eigeneArten: [...(alt.eigeneArten ?? []), name] }));
    return "";
  };

  /* Eine eigene Art wieder loeschen - aber nur, solange niemand mit ihr
     gezaehlt hat. Sonst stuenden Zahlen zu einer Art da, die es in der
     Liste nicht mehr gibt. */
  const artBenutzt = (name) =>
    stand.wzp.arten.some((a) => a.name === name) ||
    stand.flaechen.some((f) => f.baeume.some((b) => b.art === name));

  const artWeg = (name) => {
    if (artBenutzt(name)) {
      setHinweis(t("{art} wird gerade benutzt – erst dort entfernen", { art: name }));
      return;
    }
    setStand((alt) => ({
      ...alt,
      eigeneArten: (alt.eigeneArten ?? []).filter((a) => a !== name),
    }));
  };

  const setzeFeld = (feld) => (wert) => setStand((alt) => ({ ...alt, [feld]: wert }));
  const setWzp = (wie) =>
    setStand((alt) => ({ ...alt, wzp: typeof wie === "function" ? wie(alt.wzp) : wie }));
  /* Ein neues Blatt fuer den naechsten Bestand - die alte Aufnahme
     wandert dabei auf den Platz zum Zurueckholen, nicht in den
     Papierkorb. */
  const neuBeginnen = (ort) => {
    vorigeZuruecklegen({ ...stand, ort: ortFrage?.alt ?? stand.ort });
    setStand(neueAufnahme(stand, ort));
    setOrtFrage(null);
    setZurueckholbar(true);
  };

  const vorigeZurueck = () => {
    const alt = vorigeHolen();
    if (!alt) {
      setZurueckholbar(false);
      return;
    }
    setStand(alt);
    vorigeWeg();
    setZurueckholbar(false);
    setHinweis(t("Die vorige Aufnahme steht wieder da"));
  };

  const setFlaechen = (wie) =>
    setStand((alt) => ({ ...alt, flaechen: typeof wie === "function" ? wie(alt.flaechen) : wie }));
  /* Die aktive Flaeche darf nie ins Leere zeigen - auch nicht, wenn die
     letzte entfernt wurde oder ein alter Stand weniger Flaechen hat. */
  const flaecheAktiv = Math.min(stand.flaecheAktiv ?? 0, stand.flaechen.length - 1);
  const setFlaecheAktiv = (i) => setStand((alt) => ({ ...alt, flaecheAktiv: i }));

  /* Standort der Messung - nur auf Antippen. Von selbst zu orten waere hier
     falsch: wer die Formzahlen anschaut oder eine alte Messung noch einmal
     oeffnet, will keine neue Koordinate darueberschreiben. */
  const holeStandort = () => {
    if (!navigator.geolocation) {
      setHinweis(t("Kein GPS auf diesem Gerät"));
      return;
    }
    setGpsLaeuft(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLaeuft(false);
        setStand((alt) => ({
          ...alt,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          genauigkeit: pos.coords.accuracy,
        }));
      },
      () => {
        setGpsLaeuft(false);
        setHinweis(t("Standort nicht verfügbar"));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  /* Erst der Weg ueber das Teilen-Menue, sonst herunterladen - fuer beide
     Ausgaben derselbe. */
  const weitergeben = async (blob, name, titel, erfolg) => {
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
    setHinweis(erfolg ?? t("{name} gespeichert", { name }));
  };

  /* Die Messung als Punkt fuer ein Kartenprogramm. Ohne Ortung gibt es
     nichts zu zeigen - dann ein Hinweis statt einer leeren Datei. */
  const geodaten = async () => {
    if (stand.lat == null || stand.lon == null) {
      setHinweis(t("Erst den Standort erfassen – ohne Punkt keine Karte"));
      return;
    }

    let auswertung;
    if (stand.modus === "wzp") {
      const erg = wzpAuswerten(stand.wzp.arten, stand.wzp.zaehlfaktor, stand.formzahlen, stand.alter, stand.formzahlStufen);
      if (!erg.jeArt.some((a) => a.anzahl > 0)) {
        setHinweis(t("Noch nichts gezählt"));
        return;
      }
      auswertung = { ...erg, zaehlfaktor: zahl(stand.wzp.zaehlfaktor) || 4 };
    } else {
      const alleBaeume = stand.flaechen.flatMap((f) => f.baeume);
      if (!alleBaeume.length) {
        setHinweis(t("Noch keine Bäume eingetragen"));
        return;
      }
      /* Alle Probeflaechen zusammen: Baeume durch die Summe der
         Flaechen, nicht der Mittelwert der Einzelhochrechnungen. */
      const ges = flaechenGesamt(stand.flaechen);
      const flaeche = ges.flaecheGesamt || 0;
      const gGesamt = alleBaeume.reduce((s, b) => s + grundflaeche(b.bhd), 0);
      const vGesamt = alleBaeume.reduce((s, b) => s + volumen(b.bhd, b.hoehe, b.formzahl), 0);
      auswertung = {
        baeume: alleBaeume,
        flaeche: flaeche || null,
        anzahlFlaechen: stand.flaechen.length,
        gGesamt,
        vGesamt,
        gHa: ges.jeHektar ? ges.jeHektar.grundflaeche : null,
        vHa: ges.jeHektar ? ges.jeHektar.vorrat : null,
        nHa: ges.jeHektar ? ges.jeHektar.staemme : null,
      };
    }

    const geo = baueGeoJsonMessung(stand, auswertung);
    const blob = new Blob([JSON.stringify(geo, null, 2)], { type: "application/geo+json" });
    await weitergeben(blob, geoDateiname(stand), "Baummessung", t("Standort gespeichert"));
  };

  const excelDatei = async () => {
    let zeilen;

    if (stand.modus === "wzp") {
      const erg = wzpAuswerten(stand.wzp.arten, stand.wzp.zaehlfaktor, stand.formzahlen, stand.alter, stand.formzahlStufen);
      const mitZahlen = erg.jeArt.filter((a) => a.anzahl > 0);
      if (!mitZahlen.length) {
        setHinweis(t("Noch nichts gezählt"));
        return;
      }
      /* Die Spalten stehen in der Sprache, die eingestellt ist: Eine
         Datei, die man weiterreicht, nuetzt wenig, wenn die Ueberschriften
         der Empfaenger nicht lesen kann. Die Mastertabelle des Monitorings
         bleibt davon ausgenommen - sie bildet eine vorgegebene Excel-Maske
         nach und muss Spalte fuer Spalte so heissen, wie sie heisst. */
      zeilen = [
        [t("Ort"), t("Alter_Jahre"), t("Verfahren"), t("Zaehlfaktor"), t("Baumart"), t("Anzahl"),
         t("Hoehen_m"), t("Mittelhoehe_m"), t("BHD_cm"), t("Mittelstamm_cm"), t("Formzahl"),
         t("Grundflaeche_m2_ha"), t("Vorrat_fm_ha"), t("Staemme_ha"), t("Volumen_Mittelstamm_m3")],
        ...mitZahlen.map((a) => [
          stand.ort,
          a.alterJahre,
          t("Winkelzaehlprobe"),
          zahl(stand.wzp.zaehlfaktor),
          artName(a.name),
          a.anzahl,
          a.hoehen.join(" "),
          Math.round(mittel(a.hoehen) * 10) / 10,
          (a.durchmesser ?? []).join(" "),
          Math.round(a.dg * 10) / 10,
          a.formzahl,
          Math.round(a.gHa * 10) / 10,
          Math.round(a.vHa * 10) / 10,
          Math.round(a.nHa),
          Math.round(a.vMittelstamm * 1000) / 1000,
        ]),
      ];
    } else {
      if (!stand.flaechen.some((f) => f.baeume.length)) {
        setHinweis(t("Noch keine Bäume eingetragen"));
        return;
      }
      /* Die Flaeche steht als eigene Spalte dabei: Ohne sie liessen sich
         die Zeilen zweier Probeflaechen in der Tabelle nicht mehr
         auseinanderhalten. Sie heisst nach ihrer Nummer, nicht nach dem
         uebersetzten Wort - die Datei soll in beiden Sprachen gleich
         aussehen. */
      zeilen = [
        [t("Ort"), t("Verfahren"), t("Flaeche_Nr"), t("Flaeche_m2"), t("Baumart"), t("BHD_cm"),
         t("Hoehe_m"), t("Formzahl"), t("Grundflaeche_m2"), t("Volumen_m3")],
        ...stand.flaechen.flatMap((f, i) =>
          f.baeume.map((b) => [
            stand.ort,
            t("Einzelbaeume"),
            i + 1,
            zahl(f.groesse),
            artName(b.art),
            zahl(b.bhd),
            zahl(b.hoehe),
            zahl(b.formzahl),
            Math.round(grundflaeche(b.bhd) * 10000) / 10000,
            Math.round(volumen(b.bhd, b.hoehe, b.formzahl) * 1000) / 1000,
          ]),
        ),
      ];
    }

    const name = `${t("Baummessung")}_${stand.ort || t("Aufnahme")}.xlsx`;
    await weitergeben(baueXlsx(zeilen, t("Baummessung")), name, "Baummessung", t("Excel-Datei gespeichert"));
  };

  // 16 px: darunter zoomt iOS beim Antippen in das Feld hinein.
  const feldStil = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${farben.line}`,
    color: farben.text,
    padding: "9px 0",
    fontSize: 16,
    width: "100%",
    outline: "none",
  };

  const verfahren = (ziel, text) => (
    <button
      onClick={() => setStand((alt) => ({ ...alt, modus: ziel }))}
      style={{
        flex: 1,
        background: stand.modus === ziel ? farben.surfaceHi : "transparent",
        border: `1px solid ${farben.line}`,
        color: stand.modus === ziel ? farben.text : farben.muted,
        borderRadius: 10,
        padding: "12px 0",
        fontSize: 13,
        fontWeight: stand.modus === ziel ? 700 : 400,
        cursor: "pointer",
      }}
    >
      {text}
    </button>
  );

  return (
    <div
      style={{
        color: farben.text,
        padding: `14px 14px ${leisteHoehe + 16}px`,
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>{t("ORT / BESTAND")}</div>
          <input
            style={feldStil}
            value={stand.ort}
            onChange={(e) => setzeFeld("ort")(e.target.value)}
            onFocus={() => setOrtBeiFokus(stand.ort)}
            onBlur={() => {
              const vorher = (ortBeiFokus ?? "").trim();
              const jetzt = stand.ort.trim();
              setOrtBeiFokus(null);
              /* Gefragt wird nur bei einer echten Umbenennung mit Daten.
                 Wer den Ort zum ERSTEN Mal eintraegt, benennt die
                 laufende Aufnahme - da gibt es nichts zu fragen. */
              if (!vorher || !jetzt || vorher === jetzt) return;
              if (!hatDaten(stand)) return;
              setOrtFrage({ alt: vorher, neu: jetzt });
            }}
            placeholder={t("z. B. {was}", { was: "4138 b1" })}
            aria-label={t("ORT / BESTAND")}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>{t("ALTER Jahre")}</div>
          <input
            style={feldStil}
            value={stand.alter}
            onChange={(e) => setzeFeld("alter")(e.target.value)}
            inputMode="numeric"
            placeholder={t("Alter in Jahren")}
            aria-label={t("ALTER Jahre")}
          />
        </div>
      </div>

      {/* Die Frage beim Umbenennen. Sie steht da, wo sie entsteht - unter
          dem Feld -, nennt beide Namen und leert nichts von selbst. */}
      {ortFrage && (
        <div
          style={{
            border: `1px solid ${farben.unverb}`,
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 10 }}>
            {t("Neue Aufnahme für „{neu}“ beginnen? Die Zahlen von „{alt}“ gehören zum alten Bestand.", {
              neu: ortFrage.neu,
              alt: ortFrage.alt,
            })}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => neuBeginnen(ortFrage.neu)}
              style={{
                flex: 1,
                background: farben.unverb,
                border: "none",
                color: farben.bg,
                borderRadius: 10,
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("Neu beginnen")}
            </button>
            <button
              onClick={() => setOrtFrage(null)}
              style={{
                flex: 1,
                background: "transparent",
                border: `1px solid ${farben.line}`,
                color: farben.text,
                borderRadius: 10,
                padding: "12px 0",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {t("Nur umbenennen")}
            </button>
          </div>
        </div>
      )}

      {/* Nach dem Leeren: ein Weg zurueck. Ohne ihn waere "Neu beginnen"
          ein Tipp, der eine ganze Aufnahme kostet. */}
      {zurueckholbar && !ortFrage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: farben.surface,
            borderRadius: 12,
            padding: "10px 12px",
            marginBottom: 14,
          }}
        >
          <div style={{ flex: 1, fontSize: 12, color: farben.muted, lineHeight: 1.4 }}>
            {t("Neue Aufnahme. Die vorige liegt bereit.")}
          </div>
          <button
            onClick={vorigeZurueck}
            style={{
              background: "transparent",
              border: `1px solid ${farben.line}`,
              color: farben.text,
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {t("Zurückholen")}
          </button>
        </div>
      )}

      {/* Standort des Standpunktes bzw. der Flaeche. Oben beim Ort, weil er
          wie der Ort zum Bestand gehoert und nicht zum Verfahren. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <button
          onClick={holeStandort}
          disabled={gpsLaeuft}
          style={{
            background: "transparent",
            border: `1px solid ${farben.line}`,
            color: stand.lat == null ? farben.muted : farben.text,
            borderRadius: 10,
            padding: "11px 12px",
            fontSize: 12,
            cursor: gpsLaeuft ? "default" : "pointer",
          }}
        >
          {gpsLaeuft
            ? "📍 …"
            : stand.lat == null
              ? t("📍 Standort erfassen")
              : `📍 ${stand.lat.toFixed(5)}, ${stand.lon.toFixed(5)}`}
        </button>
        {stand.genauigkeit != null && (
          <span style={{ fontSize: 11, color: farben.muted }}>
            ±{Math.round(stand.genauigkeit)} m
          </span>
        )}
      </div>
      {stand.lat != null && (
        <div style={{ marginBottom: 10 }}>
          <KoordinatenKopieren breite={stand.lat} laenge={stand.lon} />
        </div>
      )}

      {stand.modus === "wzp" && (
        <div style={{ fontSize: 10, color: farben.muted, marginTop: -8, marginBottom: 14 }}>
          {t(
            "Das Alter gilt für alle Baumarten – bei jeder Baumart lässt es sich einzeln überschreiben.",
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {verfahren("wzp", t("Winkelzählprobe"))}
        {verfahren("einzel", t("Einzelbäume"))}
      </div>

      {stand.modus === "wzp" ? (
        <Winkelzaehlprobe
          arten={arten}
          onArtHinzu={artHinzu}
          alter={stand.alter}
          wzp={stand.wzp}
          setWzp={setWzp}
          formzahlen={stand.formzahlen}
          formzahlStufen={stand.formzahlStufen}
          setHinweis={setHinweis}
        />
      ) : (
        <Einzelbaeume
          arten={arten}
          onArtHinzu={artHinzu}
          flaechen={stand.flaechen}
          setFlaechen={setFlaechen}
          aktiv={flaecheAktiv}
          setAktiv={setFlaecheAktiv}
          formzahlen={stand.formzahlen}
          formzahlStufen={stand.formzahlStufen}
          setHinweis={setHinweis}
        />
      )}

      <button
        onClick={() => setFormzahlenOffen(!formzahlenOffen)}
        style={{
          width: "100%",
          background: "transparent",
          border: `1px solid ${farben.line}`,
          color: farben.muted,
          borderRadius: 10,
          padding: "11px 0",
          fontSize: 13,
          marginTop: 18,
          cursor: "pointer",
        }}
      >
        {formzahlenOffen ? t("Formzahlen ausblenden") : t("Formzahlen anpassen")}
      </button>

      {formzahlenOffen && (
        <Formzahlen
          arten={arten}
          onArtWeg={artWeg}
          formzahlen={stand.formzahlen}
          setFormzahlen={(wie) =>
            setStand((alt) => ({
              ...alt,
              formzahlen: typeof wie === "function" ? wie(alt.formzahlen) : wie,
            }))
          }
          stufen={stand.formzahlStufen}
          setStufen={(wie) =>
            setStand((alt) => ({
              ...alt,
              formzahlStufen: typeof wie === "function" ? wie(alt.formzahlStufen) : wie,
            }))
          }
        />
      )}

      {hinweis && (
        <div style={{ marginTop: 14, fontSize: 13, color: farben.muted, textAlign: "center" }}>{hinweis}</div>
      )}

      <div
        ref={leisteRef}
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: farben.surface,
          borderTop: `1px solid ${farben.line}`,
          // Platz fuer die Gestenleiste des Geraets, siehe Verjuengung.jsx.
          padding: "10px 14px calc(10px + env(safe-area-inset-bottom, 0px))",
          maxWidth: 560,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={excelDatei}
            style={{
              flex: 1,
              background: "none",
              border: `1px solid ${farben.line}`,
              color: farben.text,
              borderRadius: 12,
              padding: "14px 0",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {t("Excel")}
          </button>
          <button
            onClick={geodaten}
            style={{
              flex: 1,
              background: "none",
              border: `1px solid ${farben.line}`,
              color: farben.text,
              borderRadius: 12,
              padding: "14px 0",
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            {t("Geodaten")}
            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>GeoJSON</div>
          </button>
        </div>
        <div style={{ fontSize: 10, color: farben.muted, marginTop: 8, lineHeight: 1.5 }}>
          {t(
            "Geodaten: eine GeoJSON-Datei (.geojson) mit dem Standpunkt und den Ergebnissen – zum Öffnen in QGIS, OsmAnd, Organic Maps oder einem anderen Kartenprogramm.",
          )}
        </div>
      </div>
    </div>
  );
}
