import { useState, useEffect } from "react";
import { farben } from "./konfiguration.js";
import { SPRACHEN, setzeSprache, spracheLaden, useT } from "./sprache.js";
import {
  einstellungenLaden,
  setzeEinstellung,
  useEinstellungen,
  useWachhalten,
} from "./einstellungen.js";
import Verjuengung from "./Verjuengung.jsx";
import Baummessung from "./Baummessung.jsx";
import Monitoring from "./Monitoring.jsx";

/* Rahmen um die beiden Seiten.

   Die Seiten sind voneinander unabhaengig: eigene Zustaende, eigene
   Speicherplaetze, keine gemeinsamen Daten. Der Rahmen merkt sich nur, welche
   zuletzt offen war, damit ein Neustart (etwa nach einem Update) nicht
   mitten in der Arbeit auf die andere Seite springt. */
const SEITE_SCHLUESSEL = "app:seite";

export default function App() {
  const t = useT();
  const [seite, setSeite] = useState("verjuengung");
  const [sprache, setSprache] = useState("de");
  const [einstellungenOffen, setEinstellungenOffen] = useState(false);
  const einstellungen = useEinstellungen();
  useWachhalten(einstellungen.wach);

  useEffect(() => {
    setSprache(spracheLaden());
    einstellungenLaden();
  }, []);

  useEffect(() => {
    try {
      const gemerkt = localStorage.getItem(SEITE_SCHLUESSEL);
      if (["baum", "verjuengung", "monitoring"].includes(gemerkt)) setSeite(gemerkt);
    } catch {
      // Ohne gemerkte Seite faengt die App bei der Verjuengungsaufnahme an.
    }
  }, []);

  const wechseln = (ziel) => {
    setSeite(ziel);
    try {
      localStorage.setItem(SEITE_SCHLUESSEL, ziel);
    } catch {
      // Nicht merken zu koennen ist kein Grund, den Wechsel zu verweigern.
    }
  };

  const reiter = (ziel, text) => (
    <button
      onClick={() => wechseln(ziel)}
      style={{
        flex: 1,
        background: seite === ziel ? farben.surfaceHi : "transparent",
        border: "none",
        borderBottom: `2px solid ${seite === ziel ? farben.unverb : "transparent"}`,
        color: seite === ziel ? farben.text : farben.muted,
        padding: "12px 0",
        fontSize: 14,
        fontWeight: seite === ziel ? 700 : 400,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {text}
    </button>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: farben.bg,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
      }}
    >
      <div
        className="no-print"
        style={{
          display: "flex",
          maxWidth: 560,
          margin: "0 auto",
          borderBottom: `1px solid ${farben.line}`,
        }}
      >
        {reiter("verjuengung", t("Verjüngung"))}
        {reiter("baum", t("Baummessung"))}
        {reiter("monitoring", t("Monitoring"))}

        {/* Sprachwahl und Einstellungen. Klein und rechts aussen: beide
            werden einmal eingestellt und danach nie wieder angetippt -
            sie sollen nicht so breit sein wie ein Arbeitsbereich. */}
        {/* Ohne Innenabstand rechts: Bei 320 px stand die Gruppe sonst
            genau einen Pixel ueber dem Bildschirmrand. */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {SPRACHEN.map((s) => (
            <button
              key={s.kuerzel}
              onClick={() => {
                setzeSprache(s.kuerzel);
                setSprache(s.kuerzel);
              }}
              aria-label={s.name}
              aria-pressed={sprache === s.kuerzel}
              style={{
                background: "transparent",
                border: "none",
                color: sprache === s.kuerzel ? farben.unverb : farben.muted,
                fontWeight: sprache === s.kuerzel ? 700 : 400,
                fontSize: 12,
                padding: "12px 5px",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {s.kuerzel.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => setEinstellungenOffen((o) => !o)}
            aria-label={t("Einstellungen")}
            aria-pressed={einstellungenOffen}
            style={{
              background: "transparent",
              border: "none",
              color: einstellungenOffen ? farben.text : farben.muted,
              fontSize: 15,
              padding: "12px 6px",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ⚙
          </button>
        </div>
      </div>

      {/* Zwei Schalter fuers Geraet, nicht fuer die Aufnahme. Zugeklappt,
          weil sie einmal gesetzt und dann vergessen werden. */}
      {einstellungenOffen && (
        <div
          className="no-print"
          style={{
            maxWidth: 560,
            margin: "0 auto",
            padding: "10px 14px 12px",
            borderBottom: `1px solid ${farben.line}`,
            background: farben.surface,
          }}
        >
          {[
            {
              name: "wach",
              titel: t("Bildschirm wachhalten"),
              dazu: t("Solange die App offen ist. Kostet Akku."),
            },
            {
              name: "stups",
              titel: t("Stups beim Zählen"),
              dazu: t("Kurzes Ticken, wenn eine Pflanze gezählt ist."),
            },
          ].map((s) => {
            const an = einstellungen[s.name];
            return (
              <button
                key={s.name}
                onClick={() => setzeEinstellung(s.name, !an)}
                role="switch"
                aria-checked={an}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "transparent",
                  border: "none",
                  color: farben.text,
                  padding: "10px 0",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {/* Ein Haken statt eines Schiebers: Er ist auch im
                    Gegenlicht eindeutig, und er braucht keine Animation. */}
                <div
                  style={{
                    width: 26,
                    height: 26,
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 8,
                    border: `1px solid ${an ? farben.unverb : farben.line}`,
                    background: an ? farben.unverb : "transparent",
                    color: farben.bg,
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  {an ? "✓" : ""}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>{s.titel}</div>
                  <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.4 }}>
                    {s.dazu}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {seite === "verjuengung" && <Verjuengung />}
      {seite === "baum" && <Baummessung />}
      {seite === "monitoring" && <Monitoring />}
    </div>
  );
}
