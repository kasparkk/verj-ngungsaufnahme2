import { farben } from "../konfiguration.js";

/* Die Bausteine der Aufnahmemaske.

   Alles ist auf Bedienung mit Handschuhen ausgelegt: grosse Flaechen, kurze
   Wege, keine Feinmotorik. Kurze Listen werden zu Knopfreihen - man sieht
   ohne Antippen, was zur Wahl steht. Lange Listen (Baumarten, BZT) bleiben
   ein echtes Auswahlfeld, weil das Handy dafuer seine eigene, grosse
   Auswahl einblendet. */

export const beschriftung = {
  fontSize: 10,
  color: farben.muted,
  letterSpacing: 0.6,
  textTransform: "uppercase",
};

export function Abschnitt({ titel, hinweis, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div
        style={{
          ...beschriftung,
          borderBottom: `1px solid ${farben.line}`,
          paddingBottom: 6,
          marginBottom: 12,
        }}
      >
        {titel}
      </div>
      {hinweis && (
        <div style={{ fontSize: 11, color: farben.muted, marginBottom: 12, lineHeight: 1.5 }}>
          {hinweis}
        </div>
      )}
      {children}
    </div>
  );
}

export function Feld({ titel, hinweis, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ ...beschriftung, marginBottom: 5 }}>{titel}</div>
      {children}
      {hinweis && (
        <div style={{ fontSize: 10, color: farben.muted, marginTop: 4, lineHeight: 1.45 }}>
          {hinweis}
        </div>
      )}
    </div>
  );
}

const eingabeStil = {
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
  background: farben.surfaceHi,
  border: `1px solid ${farben.line}`,
  borderRadius: 10,
  color: farben.text,
  padding: "10px 11px",
  fontSize: 16,
  outline: "none",
};

export function TextFeld({ wert, setWert, platzhalter, mehrzeilig, inputMode }) {
  if (mehrzeilig) {
    return (
      <textarea
        value={wert ?? ""}
        onChange={(e) => setWert(e.target.value)}
        placeholder={platzhalter}
        rows={2}
        style={{ ...eingabeStil, resize: "vertical", fontFamily: "inherit" }}
      />
    );
  }
  return (
    <input
      value={wert ?? ""}
      onChange={(e) => setWert(e.target.value)}
      placeholder={platzhalter}
      inputMode={inputMode}
      style={eingabeStil}
    />
  );
}

/* Auswahl aus einer langen Liste. Der leere Eintrag bleibt waehlbar: eine
   versehentlich gesetzte Angabe muss sich zuruecknehmen lassen. */
export function AuswahlFeld({ wert, setWert, werte, leerText = "— bitte wählen —" }) {
  return (
    <select
      value={wert ?? ""}
      onChange={(e) => setWert(e.target.value)}
      style={{ ...eingabeStil, appearance: "none", cursor: "pointer" }}
    >
      <option value="">{leerText}</option>
      {werte.map((w) => {
        const schluessel = typeof w === "string" ? w : w.wert;
        const text = typeof w === "string" ? w : `${w.wert} — ${w.text}`;
        return (
          <option key={schluessel} value={schluessel}>
            {text}
          </option>
        );
      })}
    </select>
  );
}

/* Knopfreihe fuer kurze Listen. Erneutes Antippen der gewaehlten Antwort
   nimmt sie zurueck - sonst liesse sich eine Fehleingabe nicht loeschen. */
export function KnopfWahl({ wert, setWert, werte, spalten }) {
  return (
    <div
      style={
        spalten
          ? { display: "grid", gridTemplateColumns: `repeat(${spalten}, 1fr)`, gap: 6 }
          : { display: "flex", flexWrap: "wrap", gap: 6 }
      }
    >
      {werte.map((w) => {
        const schluessel = typeof w === "string" ? w : w.wert;
        const text = typeof w === "string" ? w : w.kurz ?? w.wert;
        const gewaehlt = String(wert ?? "") === String(schluessel);
        return (
          <button
            key={schluessel}
            onClick={() => setWert(gewaehlt ? "" : schluessel)}
            style={{
              flex: spalten ? undefined : "0 1 auto",
              minWidth: 0,
              background: gewaehlt ? farben.unverb : "transparent",
              border: `1px solid ${gewaehlt ? farben.unverb : farben.line}`,
              color: gewaehlt ? farben.bg : farben.muted,
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 14,
              fontWeight: gewaehlt ? 700 : 400,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

export const JaNein = ({ wert, setWert }) => (
  <KnopfWahl wert={wert} setWert={setWert} werte={["ja", "nein"]} spalten={2} />
);

/* Ein Schalter, der an oder aus ist - fuer die Merkmale je Pflanze. Anders
   als bei der Knopfwahl gibt es hier keinen dritten Zustand: nicht
   angetippt heisst 0. */
export function Schalter({ an, setAn, text, farbe }) {
  const ton = farbe ?? farben.verb;
  return (
    <button
      onClick={() => setAn(an ? 0 : 1)}
      style={{
        background: an ? ton : "transparent",
        border: `1px solid ${an ? ton : farben.line}`,
        color: an ? farben.bg : farben.muted,
        borderRadius: 10,
        padding: "11px 8px",
        fontSize: 13,
        fontWeight: an ? 700 : 400,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        minWidth: 0,
      }}
    >
      {text}
    </button>
  );
}
