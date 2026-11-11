import { useState, useEffect, useRef } from "react";
import { farben } from "../konfiguration.js";
import { neigungAusBeta } from "./hoehe.js";
import {
  SCHRITTE,
  AUFNAHME_MS,
  fasseZusammen,
  baueMitschnitt,
  mitschnittDateiname,
  geraetAngaben,
} from "./mitschnitt.js";
import { useT, zahlOrt } from "../sprache.js";

/* Mitschnitt des Neigungssensors - ein Werkzeug fuer die Pruefung, kein
   Teil der Aufnahme.

   Deshalb steht der Knopf dazu klein und unten: Wer im Bestand zaehlt,
   soll ihn nicht aus Versehen treffen. Gebraucht wird er einmal.

   Warum es ihn gibt, steht in mitschnitt.js. Kurz: Alle bisherigen
   Pruefungen des Hoehenmessers rechnen den Sensorwert nach derselben
   Regel, nach der die App ihn auswertet - sie pruefen die Annahme also
   gegen sich selbst. Hier wird sie zum ersten Mal an einem echten Geraet
   gemessen, und zwar ohne Messgeraet: Ein Tisch ist waagerecht und eine
   Wand ist senkrecht. */
export default function SensorMitschnitt({ offen, onSchliessen, onDatei, setHinweis }) {
  const t = useT();
  const [sensor, setSensor] = useState("unbekannt"); // unbekannt|laeuft|nein|gesperrt
  const [beta, setBeta] = useState(null);
  const [aufnahmen, setAufnahmen] = useState({});
  const [laeuft, setLaeuft] = useState(null); // id des Schritts
  const [rest, setRest] = useState(0);

  const sammelRef = useRef(null); // Array waehrend der Aufnahme, sonst null
  const startRef = useRef(0);
  const kamAn = useRef(false);

  const lesen = (e) => {
    if (e.beta == null) return;
    kamAn.current = true;
    setSensor("laeuft");
    setBeta(e.beta);
    if (sammelRef.current) {
      /* Auf zwei Stellen gerundet - mehr liefert kein Sensor ehrlich, und
         die Datei bleibt klein genug zum Verschicken. */
      sammelRef.current.push({
        t: Math.round(Date.now() - startRef.current),
        beta: Math.round(e.beta * 100) / 100,
        gamma: e.gamma == null ? null : Math.round(e.gamma * 100) / 100,
        alpha: e.alpha == null ? null : Math.round(e.alpha * 100) / 100,
      });
    }
  };

  useEffect(() => {
    if (!offen) return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setSensor("nein");
      return;
    }
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      setSensor("gesperrt");
      return;
    }
    window.addEventListener("deviceorientation", lesen, true);
    const frist = setTimeout(() => {
      if (!kamAn.current) setSensor("nein");
    }, 2000);
    return () => {
      window.removeEventListener("deviceorientation", lesen, true);
      clearTimeout(frist);
    };
  }, [offen]);

  // Beim Schliessen alles zuruecksetzen - ein halber Mitschnitt nuetzt nichts.
  useEffect(() => {
    if (offen) return;
    sammelRef.current = null;
    setLaeuft(null);
    setBeta(null);
    setAufnahmen({});
    kamAn.current = false;
  }, [offen]);

  const erlaubnisHolen = async () => {
    try {
      const antwort = await DeviceOrientationEvent.requestPermission();
      if (antwort === "granted") {
        window.addEventListener("deviceorientation", lesen, true);
        setSensor("laeuft");
      } else {
        setSensor("nein");
      }
    } catch {
      setSensor("nein");
    }
  };

  const aufnehmen = (id) => {
    if (laeuft) return;
    sammelRef.current = [];
    startRef.current = Date.now();
    setLaeuft(id);
    setRest(Math.round(AUFNAHME_MS / 1000));

    const uhr = setInterval(() => {
      const uebrig = AUFNAHME_MS - (Date.now() - startRef.current);
      setRest(Math.max(0, Math.ceil(uebrig / 1000)));
    }, 200);

    setTimeout(() => {
      clearInterval(uhr);
      const werte = sammelRef.current ?? [];
      sammelRef.current = null;
      setLaeuft(null);
      setAufnahmen((alt) => ({ ...alt, [id]: werte }));
      if (!werte.length) setHinweis(t("Der Sensor hat nichts geliefert"));
    }, AUFNAHME_MS);
  };

  const speichern = () => {
    const daten = baueMitschnitt(aufnahmen, geraetAngaben());
    if (!daten.schritte.length) {
      setHinweis(t("Noch nichts aufgenommen"));
      return;
    }
    const blob = new Blob([JSON.stringify(daten)], { type: "application/json" });
    onDatei(blob, mitschnittDateiname(), t("Sensor-Mitschnitt"), t("Mitschnitt gespeichert"));
  };

  if (!offen) return null;

  const nk = (x, stellen = 1) =>
    Number(x).toLocaleString(zahlOrt(), {
      minimumFractionDigits: stellen,
      maximumFractionDigits: stellen,
    });

  const fertige = SCHRITTE.filter((s) => aufnahmen[s.id]?.length).length;
  const jetzt = neigungAusBeta(beta);

  const knopf = {
    background: "transparent",
    border: `1px solid ${farben.line}`,
    color: farben.text,
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 13,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: farben.bg,
        overflowY: "auto",
        padding: "16px 14px 32px",
        zIndex: 30,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{t("Sensor-Mitschnitt")}</div>
        <button
          onClick={onSchliessen}
          aria-label={t("Schließen")}
          style={{
            background: "transparent",
            border: "none",
            color: farben.muted,
            fontSize: 22,
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.55, margin: "8px 0 14px" }}>
        {t(
          "Drei kurze Aufnahmen von je {s} Sekunden. Die ersten beiden haben einen bekannten Sollwert – ein Tisch ist waagerecht, eine Wand ist senkrecht –, und genau daran lässt sich prüfen, ob die App den Sensor deines Geräts richtig deutet. Die dritte zeigt, wie ruhig eine echte Hand hält.",
          { s: Math.round(AUFNAHME_MS / 1000) },
        )}
      </div>

      {sensor === "gesperrt" && (
        <button onClick={erlaubnisHolen} style={{ ...knopf, width: "100%", marginBottom: 14 }}>
          {t("Neigungssensor freigeben")}
        </button>
      )}

      {sensor === "nein" && (
        <div style={{ fontSize: 12, color: farben.verb, marginBottom: 14, lineHeight: 1.5 }}>
          {t("Dieses Gerät liefert keine Neigung – hier lässt sich nichts aufnehmen.")}
        </div>
      )}

      {sensor === "laeuft" && (
        <div
          style={{
            textAlign: "center",
            background: farben.surface,
            borderRadius: 12,
            padding: "10px 0",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
            {t("NEIGUNG JETZT")}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>
            {jetzt == null ? "–" : `${nk(jetzt)}°`}
          </div>
          <div style={{ fontSize: 10, color: farben.muted }}>
            {beta == null ? "" : t("roh: beta {b}°", { b: nk(beta) })}
          </div>
        </div>
      )}

      {SCHRITTE.map((s, i) => {
        const werte = aufnahmen[s.id];
        const erg = werte?.length ? fasseZusammen(werte, s.soll) : null;
        const amZug = laeuft === s.id;
        return (
          <div
            key={s.id}
            style={{
              border: `1px solid ${erg ? farben.unverb : farben.line}`,
              borderRadius: 12,
              padding: "12px 12px 14px",
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
              {i + 1}. {t(s.titel)}
            </div>
            <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, marginBottom: 10 }}>
              {t(s.anleitung)}
              {s.soll != null && ` ${t("Erwartet: {soll}°.", { soll: nk(s.soll) })}`}
            </div>

            <button
              onClick={() => aufnehmen(s.id)}
              disabled={sensor !== "laeuft" || Boolean(laeuft)}
              aria-label={t("{schritt} aufnehmen", { schritt: t(s.titel) })}
              style={{
                ...knopf,
                width: "100%",
                background: amZug ? farben.surfaceHi : "transparent",
                color: sensor === "laeuft" && !laeuft ? farben.text : farben.muted,
                cursor: sensor === "laeuft" && !laeuft ? "pointer" : "default",
              }}
            >
              {amZug
                ? t("Nimmt auf – noch {s} s", { s: rest })
                : erg
                  ? t("Nochmal aufnehmen")
                  : t("Aufnehmen")}
            </button>

            {erg && (
              <div style={{ fontSize: 12, color: farben.text, marginTop: 10, lineHeight: 1.6 }}>
                {t("Mitte {m}° · Spanne {sp}° · {n} Werte", {
                  m: nk(erg.median),
                  sp: nk(erg.spanne),
                  n: erg.anzahl,
                })}
                {erg.abweichung != null && (
                  <div
                    style={{
                      color: Math.abs(erg.abweichung) <= 2 ? farben.unverb : farben.verb,
                      fontWeight: 700,
                    }}
                  >
                    {Math.abs(erg.abweichung) <= 2
                      ? t("✓ {ab}° daneben – die App deutet den Sensor richtig", {
                          ab: nk(Math.abs(erg.abweichung)),
                        })
                      : t("✗ {ab}° daneben – das ist zu viel, bitte schick mir die Datei", {
                          ab: nk(Math.abs(erg.abweichung)),
                        })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={speichern}
        disabled={!fertige}
        style={{
          ...knopf,
          width: "100%",
          marginTop: 6,
          background: fertige ? farben.unverb : "transparent",
          color: fertige ? farben.bg : farben.muted,
          border: `1px solid ${fertige ? farben.unverb : farben.line}`,
          fontWeight: 700,
          padding: "14px 0",
          cursor: fertige ? "pointer" : "default",
        }}
      >
        {t("Mitschnitt speichern ({n} von 3)", { n: fertige })}
      </button>

      <div style={{ fontSize: 10, color: farben.muted, lineHeight: 1.55, marginTop: 10 }}>
        {t(
          "Die Datei enthält die einzelnen Sensorwerte, die Gerätekennung des Browsers und die Bildschirmgröße – keinen Standort, keinen Namen. Sie ist nur für die Prüfung der App gedacht.",
        )}
      </div>
    </div>
  );
}
