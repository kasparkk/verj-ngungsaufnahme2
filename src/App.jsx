import { useState, useEffect } from "react";
import { farben } from "./konfiguration.js";
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
  const [seite, setSeite] = useState("verjuengung");

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
        {reiter("verjuengung", "Verjüngung")}
        {reiter("baum", "Baummessung")}
        {reiter("monitoring", "Monitoring")}
      </div>

      {seite === "verjuengung" && <Verjuengung />}
      {seite === "baum" && <Baummessung />}
      {seite === "monitoring" && <Monitoring />}
    </div>
  );
}
