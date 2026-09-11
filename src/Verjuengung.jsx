import { useState, useEffect, useRef } from "react";
import { farben, BAUMART_VORSCHLAEGE, leererKreis } from "./konfiguration.js";
import { ladeAlles, speichereAlles, heute, startBaumarten, leeresBlatt, blattSchluessel } from "./speicher.js";
import { normDatum, zeigeDatum, wochentag } from "./datum.js";
import { baueTabelle, baueZeilen } from "./tabelle.js";
import { baueXlsx } from "./xlsx.js";
import PersonWahl, { alsBuchstabe } from "./komponenten/PersonWahl.jsx";
import KoordinatenKopieren from "./komponenten/KoordinatenKopieren.jsx";
import { zeilenHochladen, ergebnisAllePersonen, ergebnisEinePerson, istSchlafend, RUHE_HINWEIS } from "./datenbank.js";
import ZaehlBox from "./komponenten/ZaehlBox.jsx";
import UebersichtTabelle from "./komponenten/UebersichtTabelle.jsx";
import StandortKarte from "./komponenten/StandortKarte.jsx";
import ErgebnisAnsicht from "./komponenten/ErgebnisAnsicht.jsx";

// Wartezeit nach der letzten Aenderung, bevor automatisch abgeglichen wird.
const SYNC_VERZOEGERUNG = 1500;

export default function Verjuengung() {
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
  const [andereBlaetter, setAndereBlaetter] = useState({});
  /* Welche Kombinationen aus Probekreis und Baumart dieses Blatt schon
     hochgeladen hat. Nur damit laesst sich eine Korrektur nach unten
     uebermitteln - siehe beim Abgleich. */
  const [gesendet, setGesendet] = useState([]);
  /* Das Gebietsfeld ist freier Text. Wuerde jedes getippte Zeichen ein Blatt
     wechseln, entstuenden beim Eintippen von "4138 b1" acht Blaetter. Das
     Feld haelt deshalb einen Entwurf; uebernommen wird beim Verlassen. */
  const [abteilungEntwurf, setAbteilungEntwurf] = useState("");
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
  const [standorteOffen, setStandorteOffen] = useState(false);
  const [gpsLaeuft, setGpsLaeuft] = useState(false);
  const [holtBlatt, setHoltBlatt] = useState(false);
  // Tage, an denen fuer diese Person in diesem Gebiet etwas in der
  // Datenbank steht - zum Antippen, siehe blattZurueckholen.
  const [angeboteneTage, setAngeboteneTage] = useState([]);

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
    /* Alte Speicherstaende koennen freien Text enthalten. "c" wird zu "C",
       alles andere faellt weg - lieber einmal neu waehlen als unbemerkt
       unter einem falschen Namen weiterzaehlen. */
    setTrupp(alsBuchstabe(stand.trupp));
    setRadius(stand.radius);

    /* Der Tag faengt beim Oeffnen immer bei heute an.

       Frueher stand hier der zuletzt benutzte Tag, damit eine angefangene
       Aufnahme weiterlaeuft. Wer die App Tage spaeter wieder aufmachte und
       lostzaehlte, zaehlte damit unbemerkt in ein altes Blatt - so sind
       einmal sieben Probekreise vom 07.09. im Blatt vom 28.08. gelandet.

       Heute ist der einzige Tag, an dem man im Bestand stehen kann. Wer
       einen alten Zettel nachtraegt, stellt das Datum von Hand zurueck und
       bekommt sein Blatt samt allem, was darauf steht, wieder hervor -
       verloren geht nichts, es faengt nur nicht mehr von selbst dort an. */
    const tag = heute();
    setDatum(tag);

    const schluessel = blattSchluessel(stand.trupp, tag, stand.abteilung);
    const { [schluessel]: offenes, ...uebrige } = stand.blaetter;
    const blatt = offenes || leeresBlatt();
    setAbteilung(stand.abteilung ?? "");
    setAbteilungEntwurf(stand.abteilung ?? "");
    setArten(blatt.arten?.length ? blatt.arten : startBaumarten());
    setKreise(blatt.kreise?.length ? blatt.kreise : [leererKreis(1)]);
    setAktiv(blatt.aktiv ?? 0);
    setGesendet(blatt.gesendet ?? []);
    setAndereBlaetter(uebrige);

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
        abteilung,
        blaetter: {
          ...andereBlaetter,
          [blattSchluessel(trupp, datum, abteilung)]: { arten, kreise, aktiv, gesendet },
        },
      });
    } catch {
      setHinweis("Speichern fehlgeschlagen");
    }
  }, [trupp, radius, datum, abteilung, arten, kreise, aktiv, gesendet, andereBlaetter, geladen]);

  /* Blatt wechseln - ausgeloest vom Datum oder vom Gebiet.

     Ein Blatt gehoert zu einem Tag IN einem Gebiet. Die bisherige Zaehlung
     wird unter ihrem Schluessel abgelegt und das Zielblatt hervorgeholt -
     oder faengt leer an. Die Baumartenliste bleibt stehen, weil man sie
     sonst jedes Mal neu zusammenstellen muesste. */
  const blattWechseln = (neuesDatum, neueAbteilung, neuerTrupp) => {
    const zielDatum = neuesDatum ?? datum;
    const zielAbteilung = (neueAbteilung ?? abteilung).trim();
    const zielTrupp = neuerTrupp ?? trupp;
    const von = blattSchluessel(trupp, datum, abteilung);
    const nach = blattSchluessel(zielTrupp, zielDatum, zielAbteilung);
    if (von === nach) return;

    setAndereBlaetter((alle) => {
      const { [nach]: _weg, ...rest } = alle;
      return { ...rest, [von]: { arten, kreise, aktiv, gesendet } };
    });

    const ziel = andereBlaetter[nach];
    if (ziel) {
      setArten(ziel.arten?.length ? ziel.arten : startBaumarten());
      setKreise(ziel.kreise?.length ? ziel.kreise : [leererKreis(1)]);
      setAktiv(ziel.aktiv ?? 0);
      setGesendet(ziel.gesendet ?? []);
    } else {
      setKreise([leererKreis(1)]);
      setAktiv(0);
      setGesendet([]);
    }

    datumRef.current = zielDatum; // sofort, damit laufende Ortungen es sehen
    setDatum(zielDatum);
    setAbteilung(zielAbteilung);
    setAbteilungEntwurf(zielAbteilung);
    setTrupp(zielTrupp);
    setGpsLaeuft(false);
    setSyncStatus("");
    setSyncGrund("");
  };

  /* Ein leeres Feld ist kein Aufnahmetag. Beim Bearbeiten des Datums meldet
     der Browser zwischendurch "" - wuerde das als eigenes Blatt durchgehen,
     landete die laufende Zaehlung unter einem leeren Schluessel und der
     eigentliche Tag faenge beim naechsten Umstellen leer an. Die Zahlen
     waeren dann scheinbar weg. */
  const datumWechseln = (neuesDatum) => {
    if (!neuesDatum || neuesDatum === datum) return;
    blattWechseln(neuesDatum, null, null);
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

    /* Korrekturen nach unten.

       Eine Zaehlbox auf 0 wird oben uebersprungen - sonst ginge fuer jede
       nicht angetippte Baumart in jedem Kreis eine Nullzeile hoch. Damit kam
       aber auch eine Berichtigung nie an: Wer sich verzaehlt und auf 0
       zurueckstellt, aendert nur sein Geraet, in der Datenbank blieb die alte
       Zahl stehen. Dasselbe galt fuer eine geloeschte Baumart oder einen
       geloeschten Probekreis.

       Das Blatt merkt sich deshalb, welche Kombinationen es schon einmal
       hochgeladen hat. Steht dort jetzt nichts mehr, geht ausdruecklich eine
       0 hoch - fachlich auch das richtige: "nachgesehen, nichts da" ist etwas
       anderes als "nicht nachgesehen". Danach wird der Eintrag vergessen,
       damit nicht dauerhaft Nullen mitlaufen. */
    const nullZeilen = gesendet
      .filter((e) => !jeZeile.has(`${e.kreis}|${e.baumart.trim().toLowerCase()}`))
      .map((e) => {
        const kreis = kreise.find((k) => k.nr === e.kreis);
        const zeile = {
          trupp: kopf.trupp.trim(),
          abteilung: kopf.abteilung.trim() || null,
          kreisflaeche: flaeche,
          kreis: e.kreis,
          baumart: e.baumart,
          verbissen: 0,
          unverbissen: 0,
          lat: kreis?.lat ?? null,
          lon: kreis?.lon ?? null,
          genauigkeit_m: kreis?.acc ?? null,
        };
        if (datum) zeile.aufnahmedatum = datum;
        return zeile;
      });

    const zeilen = [...jeZeile.values(), ...nullZeilen];

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
        /* Gemerkt wird nur, was jetzt Zahlen hat. Die eben verschickten
           Nullen fallen damit heraus - sie sind angekommen und muessen nicht
           weiter mitgeschleppt werden. */
        setGesendet(
          [...jeZeile.values()].map((z) => ({ kreis: z.kreis, baumart: z.baumart })),
        );
      } else if (istSchlafend(ergebnis.status)) {
        // Schlafende Datenbank ist kein Fehler, nur Warten - und der
        // Wiederholungsversuch laeuft ohnehin schon von selbst.
        setSyncStatus("schlaeft");
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
    if (!["err", "offline", "schlaeft"].includes(syncStatus)) return;
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

  /* Standort fuer einen Kreis holen - nur auf Antippen des 📍-Knopfes.

     Die Ortung kann bis zu 12 Sekunden brauchen. Wird in dieser Zeit der
     Aufnahmetag gewechselt, gehoert die Antwort nicht mehr zum offenen Blatt:
     sie wuerde sonst im falschen Tag landen (der Probekreis wird nur ueber
     seine Nummer gesucht, und die 1 gibt es an jedem Tag). Deshalb wird der
     Tag beim Start gemerkt und beim Eintreffen geprueft. */
  const holeStandort = (nr) => {
    if (!navigator.geolocation) {
      setHinweis("Kein GPS auf diesem Gerät");
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
        setHinweis("Standort nicht verfügbar");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  /* Neue Kreise werden bewusst OHNE Ortung angelegt. Frueher holte die App
     den Standort bei jedem neuen Kreis von selbst - dadurch stand an jedem
     Kreis und jedem Tag eine Koordinate, ob gewollt oder nicht. Der Standort
     kommt jetzt nur noch auf Antippen des 📍-Knopfes. */
  const neuerKreis = () => {
    const nr = Math.max(...kreise.map((k) => k.nr)) + 1;
    setKreise((alle) => [...alle, leererKreis(nr)]);
    setAktiv(kreise.length);
  };

  // Fehlende niedrigere Nummer vorne einfuegen (z.B. wenn die Zaehlung bei 2 beginnt).
  const kreisDavor = () => {
    const nr = Math.min(...kreise.map((k) => k.nr)) - 1;
    setKreise((alle) => [leererKreis(nr), ...alle]);
    setAktiv(0);
  };

  /* Eine Zaehlung aus der Datenbank zurueck in die Zaehlboxen holen.

     Bisher floss alles nur nach oben: was hochgeladen war, liess sich auf
     einem anderen Geraet zwar ansehen, aber nicht mehr anfassen. Wer ein
     neues Handy hat, den Speicher geleert hat oder eine alte Zahl
     richtigstellen will, stand vor leeren Boxen.

     Gefragt wird nach Person und Gebiet, nicht nach dem Tag. Der Tag faengt
     seit neuestem immer bei heute an, und fuer heute steht meist noch
     nichts drin - ein Knopf, der dann "nichts gefunden" sagt und einen mit
     der Frage sitzen laesst, welcher Tag es denn war, ist keine Hilfe.
     Steht fuer den offenen Tag etwas da, kommt es sofort; sonst werden die
     Tage angeboten, an denen es etwas gibt.

     Angeboten wird das alles nur bei leerem Blatt. Ein Blatt mit Zahlen zu
     ueberschreiben waere der eine Handgriff, der wirklich etwas kaputt
     macht. */
  const zeilenUebernehmen = (zeilen) => {
    /* Die Baumartenliste bleibt stehen und waechst nur nach unten. Sonst
       verschwaenden die gewohnten Arten, sobald ein Blatt sie nicht
       enthaelt. */
    const listeArten = [...arten];
    const artId = (name) => {
      const sauber = String(name ?? "").trim();
      const treffer = listeArten.find((a) => a.name.trim().toLowerCase() === sauber.toLowerCase());
      if (treffer) return treffer.id;
      const neu = { id: `db${listeArten.length}-${Date.now()}`, name: sauber };
      listeArten.push(neu);
      return neu.id;
    };

    const jeKreis = new Map();
    zeilen.forEach((z) => {
      const kreis =
        jeKreis.get(z.kreis) || { nr: z.kreis, counts: {}, lat: null, lon: null, acc: null };
      kreis.counts[artId(z.baumart)] = {
        v: Number(z.verbissen) || 0,
        u: Number(z.unverbissen) || 0,
      };
      if (z.lat != null && z.lon != null) {
        kreis.lat = Number(z.lat);
        kreis.lon = Number(z.lon);
        kreis.acc = z.genauigkeit_m == null ? null : Number(z.genauigkeit_m);
      }
      jeKreis.set(z.kreis, kreis);
    });

    const geholteKreise = [...jeKreis.values()].sort((a, b) => a.nr - b.nr);
    const flaeche = Number(zeilen[0].kreisflaeche);

    setArten(listeArten);
    setKreise(geholteKreise);
    setAktiv(geholteKreise.length - 1);
    /* Die geholten Kombinationen gelten als schon hochgeladen. Ohne das
       kaeme eine Korrektur auf 0 hinterher nicht in der Datenbank an - sie
       wird nur fuer Zeilen verschickt, von denen die App weiss, dass sie
       dort stehen. */
    setGesendet(zeilen.map((z) => ({ kreis: z.kreis, baumart: z.baumart })));
    if (flaeche) setRadius(String(flaeche));

    const pflanzen = zeilen.reduce(
      (summe, z) => summe + (Number(z.verbissen) || 0) + (Number(z.unverbissen) || 0),
      0,
    );
    setHinweis(`${geholteKreise.length} Probekreise mit ${pflanzen} Pflanzen geholt`);
  };

  const blattZurueckholen = async () => {
    const person = kopf.trupp.trim();
    const gebiet = kopf.abteilung.trim();
    const tag = normDatum(kopf.datum.trim());
    if (!person) {
      setHinweis("Dafür braucht es eine Person");
      return;
    }

    setHoltBlatt(true);
    setAngeboteneTage([]);
    try {
      // Ohne Tag gefragt - welcher es war, soll die App ja gerade sagen.
      const { zeilen } = await ergebnisEinePerson(person, gebiet, null);

      const fuerDenTag = zeilen.filter((z) => z.aufnahmedatum === tag);
      if (fuerDenTag.length) {
        zeilenUebernehmen(fuerDenTag);
        return;
      }

      if (!zeilen.length) {
        setHinweis(
          `${person}${gebiet ? ` · ${gebiet}` : " · ohne Gebiet"}: nichts in der Datenbank`,
        );
        return;
      }

      const jeTag = new Map();
      zeilen.forEach((z) => {
        const eintrag =
          jeTag.get(z.aufnahmedatum) || { datum: z.aufnahmedatum, kreise: new Set(), pflanzen: 0 };
        eintrag.kreise.add(z.kreis);
        eintrag.pflanzen += (Number(z.verbissen) || 0) + (Number(z.unverbissen) || 0);
        jeTag.set(z.aufnahmedatum, eintrag);
      });
      setAngeboteneTage(
        [...jeTag.values()]
          .map((e) => ({ datum: e.datum, kreise: e.kreise.size, pflanzen: e.pflanzen }))
          .sort((a, b) => b.datum.localeCompare(a.datum)),
      );
      setHinweis("");
    } catch (fehler) {
      setHinweis(fehler?.message || "Abruf fehlgeschlagen");
    } finally {
      setHoltBlatt(false);
    }
  };

  /* Einen angebotenen Tag antippen: Datum umstellen und gleich holen. */
  const tagHolen = async (zielDatum) => {
    setAngeboteneTage([]);
    blattWechseln(zielDatum, null, null);
    setHoltBlatt(true);
    try {
      const { zeilen } = await ergebnisEinePerson(
        kopf.trupp.trim(),
        kopf.abteilung.trim(),
        zielDatum,
      );
      if (zeilen.length) zeilenUebernehmen(zeilen);
      else setHinweis("Für diesen Tag steht doch nichts da");
    } catch (fehler) {
      setHinweis(fehler?.message || "Abruf fehlgeschlagen");
    } finally {
      setHoltBlatt(false);
    }
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
      /* Drei verschiedene Ursachen, drei verschiedene Antworten: schlafende
         Datenbank (warten), abgelehnter Abruf (Fehler melden), gar kein Netz
         (spaeter nochmal). Vorher las sich alles gleich. */
      const meldung = fehler?.message ?? "";
      setErgebnisFehler(
        meldung === RUHE_HINWEIS || meldung.startsWith("Abruf")
          ? meldung
          : "Kein Netz – Ergebnis kann gerade nicht geladen werden",
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

  // Alles, was an diesem Tag bisher gezaehlt wurde - fuer die Rueckfrage
  // beim Wechsel der Person.
  const gezaehltHeute = kreise.reduce(
    (summe, kreis) =>
      summe +
      Object.values(kreis.counts ?? {}).reduce((s, z) => s + (z?.v ?? 0) + (z?.u ?? 0), 0),
    0,
  );

  /* Liegt das Blatt auf einem anderen Tag als heute? Ein Datum in der
     Zukunft zaehlt genauso - auch das ist ein Vertipper und faellt sonst
     nicht auf. */
  /* Ueber Mitternacht hinweg.

     Der Tag wird beim Oeffnen gesetzt, nicht waehrend die App laeuft. Eine
     App vom Startbildschirm wird aber selten beendet - sie liegt ueber
     Nacht im Hintergrund. Am naechsten Morgen stimmt der Tag im Feld nicht
     mehr, und ohne Anlass zeichnet React nichts neu: der Streifen bliebe
     unsichtbar, bis die erste Pflanze gezaehlt ist - und die waere dann
     schon im Blatt von gestern.

     Umgestellt wird bewusst NICHT von selbst. Wer um 23:55 mitten in einem
     Probekreis steht, soll um 00:05 nicht unversehens in einem anderen
     Blatt weiterzaehlen. Nachsehen und hinweisen, entscheiden laesst der
     Mensch. */
  const [, neuZeichnen] = useState(0);
  useEffect(() => {
    const nachsehen = () => neuZeichnen((n) => n + 1);
    document.addEventListener("visibilitychange", nachsehen);
    return () => document.removeEventListener("visibilitychange", nachsehen);
  }, []);

  const heuteIst = heute();
  const fremderTag = Boolean(datum) && datum !== heuteIst;

  /* Rueckfrage beim Wechsel der Person.

     Ein Blatt gehoert zu einer Person an einem Tag in einem Gebiet. Der
     Buchstabe wechselt also das Blatt, genau wie Datum und Gebiet: Der neue
     faengt leer an, die bisherigen Zahlen bleiben beim alten und werden
     nicht noch einmal unter dem neuen eingetragen.

     Gefragt wird einmal je Blatt. Beim Durchklicken bei jedem Buchstaben
     erneut zu fragen, waere nur noch im Weg. */
  const gewarnt = useRef("");

  const personWarnung = (alt, neu) => {
    if (gezaehltHeute === 0) return "";
    if (gewarnt.current === blattSchluessel(alt, datum, abteilung)) return "";
    return (
      `Auf diesem Blatt sind ${gezaehltHeute} Pflanzen gezählt – ${alt}, ${datum}` +
      `${abteilung.trim() ? `, ${abteilung.trim()}` : ""}.\n\n` +
      `${neu} fängt mit einem leeren Blatt an. Die Zahlen bleiben bei ${alt} ` +
      `und gehen nicht verloren; zurückstellen holt sie wieder.\n\n` +
      `Zu ${neu} wechseln?`
    );
  };

  const personWechseln = (buchstabe) => {
    if (gezaehltHeute > 0 && trupp) {
      gewarnt.current = blattSchluessel(trupp, datum, abteilung);
    }
    if (!trupp) {
      // Noch keine Person gewaehlt: das offene Blatt bekommt einfach ihren
      // Buchstaben, statt ein zweites danebenzustellen.
      setTrupp(buchstabe);
      return;
    }
    blattWechseln(null, null, buchstabe);
  };

  /* Gebiet uebernehmen - erst beim Verlassen des Feldes.

     Steht auf dem Blatt schon eine Zaehlung, wird gefragt: Ein anderes
     Gebiet bekommt ein eigenes, leeres Blatt, und die bisherigen Zahlen
     bleiben bei ihrem. Verloren geht dabei nichts - zurueckstellen holt sie
     wieder hervor. Wer sich nur vertippt hat, soll das nicht ungewollt
     ausloesen und kann abbrechen. */
  const abteilungUebernehmen = () => {
    const ziel = abteilungEntwurf.trim();
    if (ziel === abteilung.trim()) {
      setAbteilungEntwurf(abteilung);
      return;
    }
    if (gezaehltHeute > 0) {
      const bisher = abteilung.trim() || "ohne Gebiet";
      const weiter = window.confirm(
        `Auf diesem Blatt sind ${gezaehltHeute} Pflanzen gezählt – ${bisher}, ${datum}.\n\n` +
          `„${ziel}" bekommt ein eigenes, leeres Blatt. Die Zahlen bleiben bei ` +
          `${bisher} und gehen nicht verloren; zurückstellen holt sie wieder.\n\n` +
          `Zu „${ziel}" wechseln?`,
      );
      if (!weiter) {
        setAbteilungEntwurf(abteilung);
        return;
      }
    }
    blattWechseln(null, ziel, null);
  };

  const syncText = () => {
    if (!kopf.trupp.trim()) return "Person eintragen – dann wird automatisch abgeglichen";
    if (sendet) return "Gleicht ab ...";
    if (syncStatus === "ok") return "✓ Abgeglichen";
    if (syncStatus === "schlaeft")
      return "Datenbank schläft – Zahlen sind gesichert und werden nachgetragen";
    if (syncStatus === "err") return "Abgleich fehlgeschlagen – wird erneut versucht";
    if (syncStatus === "offline") return "Kein Netz – wird nachgeholt, sobald wieder Empfang da ist";
    return "Noch nichts gezählt";
  };
  const syncFarbe =
    syncStatus === "err" || syncStatus === "offline" || syncStatus === "schlaeft"
      ? farben.verb
      : syncStatus === "ok"
        ? farben.unverb
        : farben.muted;

  return (
    <div
      style={{
        color: farben.text,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        padding: "14px 14px 112px",
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <PersonWahl wert={kopf.trupp} setWert={personWechseln} warnen={personWarnung} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>DATUM</div>
          <input
            type="date"
            style={
              fremderTag
                ? { ...feldStil, color: farben.warn, borderBottom: `1px solid ${farben.warn}` }
                : feldStil
            }
            value={kopf.datum}
            onChange={(e) => datumWechseln(e.target.value)}
          />
        </div>
      </div>

      {/* Steht das Blatt auf einem anderen Tag, muss das die ganze Zeit zu
          sehen sein - nicht nur beim Oeffnen. */}
      {fremderTag && (
        <div
          style={{
            /* Untereinander statt nebeneinander: neben dem Text blieb dem
               Knopf so wenig Platz, dass die Zeilen mitten im Wort
               umbrachen. Ueber die volle Breite ist er ausserdem mit dem
               Daumen leichter zu treffen. */
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            gap: 8,
            border: `1px solid ${farben.warn}`,
            borderRadius: 10,
            padding: "8px 10px",
            marginBottom: 12,
          }}
        >
          {/* Eine Frage statt zweier Tatsachen: Ob der Tag stimmt, weiss nur
              der Mensch davor - und darunter steht, was er dann tut. */}
          <div style={{ fontSize: 12, color: farben.warn, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>
              Zählst du für den {zeigeDatum(kopf.datum)}?
            </div>
            <div style={{ opacity: 0.85 }}>
              Heute ist {wochentag(heuteIst)}, der {zeigeDatum(heuteIst)}.
            </div>
            {gezaehltHeute > 0 && (
              <div style={{ opacity: 0.85 }}>
                {gezaehltHeute} Pflanzen stehen schon auf diesem Blatt.
              </div>
            )}
            <div style={{ opacity: 0.85, marginTop: 4 }}>
              Wenn du für heute zählst, tippe auf „Auf heute umstellen".
            </div>
          </div>
          <button
            onClick={() => datumWechseln(heuteIst)}
            style={{
              background: "transparent",
              border: `1px solid ${farben.warn}`,
              color: farben.warn,
              borderRadius: 8,
              padding: "10px 12px",
              fontSize: 13,
              width: "100%",
              cursor: "pointer",
            }}
          >
            Auf heute umstellen
          </button>
        </div>
      )}

      {!kopf.trupp && (
        <div style={{ fontSize: 10, color: farben.muted, marginTop: -4, marginBottom: 10 }}>
          Person wählen – ohne Person wird nichts abgeglichen.
        </div>
      )}

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
            value={abteilungEntwurf}
            onChange={(e) => setAbteilungEntwurf(e.target.value)}
            onBlur={abteilungUebernehmen}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
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
            onClick={() => holeStandort(aktuellerKreis?.nr)}
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
          <KoordinatenKopieren
            breite={aktuellerKreis?.lat ?? null}
            laenge={aktuellerKreis?.lon ?? null}
            klein
          />
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

      {/* Nur bei leerem Blatt: ein Blatt mit Zahlen zu ueberschreiben waere
          der eine Handgriff, der wirklich etwas kaputt macht. */}
      {gezaehltHeute === 0 && kopf.trupp.trim() && (
        <button
          onClick={blattZurueckholen}
          disabled={holtBlatt}
          style={{
            width: "100%",
            background: "transparent",
            border: `1px solid ${farben.line}`,
            color: farben.muted,
            borderRadius: 10,
            padding: "8px 0",
            fontSize: 13,
            marginBottom: 14,
            cursor: holtBlatt ? "default" : "pointer",
          }}
        >
          {holtBlatt ? "Holt ..." : "Zählung aus der Datenbank holen"}
        </button>
      )}

      {/* Die Tage, an denen fuer diese Person in diesem Gebiet etwas
          dasteht. Antippen stellt das Datum um und holt gleich. */}
      {angeboteneTage.length > 0 && (
        <div style={{ marginTop: -6, marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: farben.muted, marginBottom: 6 }}>
            Für {kopf.trupp.trim()}
            {kopf.abteilung.trim() ? ` · ${kopf.abteilung.trim()}` : ""} steht etwas an diesen
            Tagen – antippen zum Holen:
          </div>
          {angeboteneTage.map((tag) => (
            <button
              key={tag.datum}
              onClick={() => tagHolen(tag.datum)}
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 10,
                background: farben.surface,
                border: `1px solid ${farben.line}`,
                color: farben.text,
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 13,
                marginBottom: 6,
                cursor: "pointer",
              }}
            >
              <span>{zeigeDatum(tag.datum)}</span>
              <span style={{ fontSize: 11, color: farben.muted }}>
                {tag.kreise} Probekreise · {tag.pflanzen} Pflanzen
              </span>
            </button>
          ))}
        </div>
      )}

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

      <button
        onClick={() => setStandorteOffen(!standorteOffen)}
        style={{
          width: "100%",
          background: "transparent",
          border: `1px solid ${farben.line}`,
          color: farben.text,
          borderRadius: 10,
          padding: "8px 0",
          fontSize: 13,
          marginBottom: standorteOffen ? 10 : 14,
          cursor: "pointer",
        }}
      >
        {standorteOffen ? "Standorte ausblenden" : "Standorte anzeigen"}
      </button>

      {standorteOffen && <StandortKarte kreise={kreise} />}

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
          <button onClick={excelDatei} style={leisteKnopf}>
            Excel
          </button>
        </div>
      </div>
    </div>
  );
}
