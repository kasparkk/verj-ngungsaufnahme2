import { useState } from "react";
import { farben } from "../konfiguration.js";
import { useT } from "../sprache.js";

/* Eine eigene Baumart eintragen.

   Dasselbe Feld in beiden Verfahren, deshalb hier und nicht zweimal:
   Die Winkelzaehlprobe und die Einzelbaumaufnahme teilen sich die
   Artenliste, wie sie sich auch Ort und Formzahlen teilen.

   Die neue Art bekommt die Standard-Formzahl, bis jemand eine eintraegt.
   Der Hinweis darauf steht in der Formzahl-Liste, nicht hier - hier
   wuerde er nur im Weg stehen. */
export default function ArtErgaenzen({ onHinzu, setHinweis }) {
  const t = useT();
  const [name, setName] = useState("");

  const hinzu = () => {
    const sauber = name.trim();
    if (!sauber) return;
    const grund = onHinzu(sauber);
    if (grund) {
      setHinweis?.(grund);
      return;
    }
    setName("");
  };

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && hinzu()}
        placeholder={t("eigene Baumart")}
        aria-label={t("eigene Baumart")}
        style={{
          flex: 1,
          minWidth: 0,
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${farben.line}`,
          color: farben.text,
          padding: "9px 0",
          fontSize: 16,
          outline: "none",
        }}
      />
      <button
        onClick={hinzu}
        style={{
          background: farben.surfaceHi,
          border: `1px solid ${farben.line}`,
          color: farben.text,
          borderRadius: 10,
          padding: "6px 14px",
          fontSize: 13,
          cursor: "pointer",
        }}
      >
        {t("Hinzufügen")}
      </button>
    </div>
  );
}
