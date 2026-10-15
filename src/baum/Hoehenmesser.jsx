import { useState, useEffect, useRef } from "react";
import { farben } from "../konfiguration.js";
import { baumHoehe, neigungAusBeta } from "./hoehe.js";

/* Hoehenmessung mit dem Neigungssensor des Handys.

   Das Handy senkrecht halten und ueber die Oberkante peilen - erst den
   Stammfuss, dann die Spitze. Aus beiden Winkeln und der waagerechten
   Entfernung ergibt sich die Hoehe (die Rechnung steht in hoehe.js).

   Warum zwei Winkel: So fallen Augenhoehe und Hangneigung von selbst
   heraus. Niemand muss seine Koerpergroesse eintragen, und am Hang stimmt
   es auch.

   Warum die Entfernung von Hand: Ein Browser kann sie nicht messen. Dafuer
   braeuchte es einen Entfernungsmesser oder die Kamera mit Tiefendaten -
   beides steht einer Web-App nicht zur Verfuegung. Abschreiten oder mit
   dem Band messen bleibt also noetig, und das ist auch die groesste
   Fehlerquelle: Die Hoehe haengt linear an der Entfernung.

   Ohne Sensor - am Rechner, oder wenn das Geraet nichts liefert - lassen
   sich die Winkel eintippen. Dann ist es ein Rechner statt eines
   Messgeraets, aber es bleibt benutzbar. */
export default function Hoehenmesser({ offen, onSchliessen, onUebernehmen }) {
  const [entfernung, setEntfernung] = useState("20");
  const [winkel, setWinkel] = useState(null); // laufende Neigung
  const [unten, setUnten] = useState(null);
  const [oben, setOben] = useState(null);
  const [sensor, setSensor] = useState("unbekannt"); // unbekannt|laeuft|nein|gesperrt
  const [vonHand, setVonHand] = useState(false);
  const [untenText, setUntenText] = useState("");
  const [obenText, setObenText] = useState("");
  const kamAn = useRef(false);

  const lesen = (e) => {
    if (e.beta == null) return;
    kamAn.current = true;
    setSensor("laeuft");
    setWinkel(neigungAusBeta(e.beta));
  };

  useEffect(() => {
    if (!offen) return;
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setSensor("nein");
      return;
    }
    /* Auf dem iPhone muss die Erlaubnis aus einer Nutzergeste heraus
       erfragt werden - dafuer gibt es den Knopf unten. Android liefert
       ohne Nachfrage. */
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      setSensor("gesperrt");
      return;
    }
    window.addEventListener("deviceorientation", lesen, true);
    /* Kommt binnen zwei Sekunden nichts, hat das Geraet keinen brauchbaren
       Sensor - dann lieber ehrlich auf Eintippen umstellen, als auf ein
       Ereignis zu warten, das nie kommt. */
    const frist = setTimeout(() => {
      if (!kamAn.current) setSensor("nein");
    }, 2000);
    return () => {
      window.removeEventListener("deviceorientation", lesen, true);
      clearTimeout(frist);
    };
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

  if (!offen) return null;

  const u = vonHand || sensor === "nein" ? Number(untenText.replace(",", ".")) : unten;
  const o = vonHand || sensor === "nein" ? Number(obenText.replace(",", ".")) : oben;
  const hoehe = baumHoehe(entfernung.replace(",", "."), u, o);
  const eintippen = vonHand || sensor === "nein";

  const feld = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${farben.line}`,
    color: farben.text,
    padding: "4px 0",
    fontSize: 20,
    fontWeight: 700,
    width: "100%",
    outline: "none",
  };
  const knopf = (aktiv) => ({
    flex: 1,
    background: aktiv ? farben.surfaceHi : "transparent",
    border: `1px solid ${aktiv ? farben.unverb : farben.line}`,
    color: farben.text,
    borderRadius: 12,
    padding: "14px 0",
    fontSize: 14,
    cursor: "pointer",
  });

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
        <div style={{ fontSize: 18, fontWeight: 700, color: farben.text }}>Höhe messen</div>
        <button
          onClick={onSchliessen}
          aria-label="Schließen"
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

      <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, margin: "8px 0 16px" }}>
        Handy senkrecht halten und über die Oberkante peilen: erst den Stammfuß,
        dann die Spitze. Augenhöhe und Hangneigung fallen dabei von selbst heraus.
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
          WAAGERECHTE ENTFERNUNG m
        </div>
        <input
          style={feld}
          value={entfernung}
          onChange={(e) => setEntfernung(e.target.value)}
          inputMode="decimal"
          placeholder="20"
          aria-label="Entfernung"
        />
      </div>

      {sensor === "gesperrt" && (
        <button
          onClick={erlaubnisHolen}
          style={{ ...knopf(false), width: "100%", marginBottom: 16 }}
        >
          Neigungssensor freigeben
        </button>
      )}

      {eintippen ? (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
              FUSS Grad
            </div>
            <input
              style={feld}
              value={untenText}
              onChange={(e) => setUntenText(e.target.value)}
              inputMode="decimal"
              placeholder="-10"
              aria-label="Winkel zum Fuß"
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
              SPITZE Grad
            </div>
            <input
              style={feld}
              value={obenText}
              onChange={(e) => setObenText(e.target.value)}
              inputMode="decimal"
              placeholder="45"
              aria-label="Winkel zur Spitze"
            />
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              textAlign: "center",
              background: farben.surface,
              borderRadius: 14,
              padding: "14px 0",
              marginBottom: 12,
            }}
          >
            <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>NEIGUNG</div>
            <div style={{ fontSize: 40, fontWeight: 800, color: farben.text, lineHeight: 1.1 }}>
              {winkel == null ? "–" : `${winkel.toFixed(1)}°`}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setUnten(winkel)} style={knopf(unten != null)}>
              Fuß
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                {unten == null ? "anpeilen" : `${unten.toFixed(1)}°`}
              </div>
            </button>
            <button onClick={() => setOben(winkel)} style={knopf(oben != null)}>
              Spitze
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>
                {oben == null ? "anpeilen" : `${oben.toFixed(1)}°`}
              </div>
            </button>
          </div>
        </>
      )}

      <div
        style={{
          textAlign: "center",
          border: `1px solid ${hoehe == null ? farben.line : farben.unverb}`,
          borderRadius: 14,
          padding: "16px 0",
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>HÖHE</div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: hoehe == null ? farben.muted : farben.unverb,
            lineHeight: 1.1,
          }}
        >
          {hoehe == null ? "–" : `${hoehe.toFixed(1)} m`}
        </div>
        {hoehe != null && (
          <div style={{ fontSize: 11, color: farben.muted, marginTop: 4 }}>
            ±{(hoehe * 0.05).toFixed(1)} m bei 5 % Fehler in der Entfernung
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => {
            setUnten(null);
            setOben(null);
            setUntenText("");
            setObenText("");
          }}
          style={{ ...knopf(false), flex: 1 }}
        >
          Zurücksetzen
        </button>
        <button
          onClick={() => hoehe != null && onUebernehmen(Math.round(hoehe * 10) / 10)}
          disabled={hoehe == null}
          style={{
            ...knopf(false),
            flex: 2,
            background: hoehe == null ? "transparent" : farben.unverb,
            color: hoehe == null ? farben.muted : farben.bg,
            border: `1px solid ${hoehe == null ? farben.line : farben.unverb}`,
            fontWeight: 700,
            cursor: hoehe == null ? "default" : "pointer",
          }}
        >
          Übernehmen
        </button>
      </div>

      {!eintippen && (
        <button
          onClick={() => setVonHand(true)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            color: farben.muted,
            fontSize: 11,
            marginTop: 14,
            cursor: "pointer",
          }}
        >
          Winkel lieber eintippen
        </button>
      )}

      <div style={{ fontSize: 10, color: farben.muted, lineHeight: 1.5, marginTop: 16 }}>
        Die Entfernung muss waagerecht sein – am Hang ist die abgeschrittene
        Strecke länger als die waagerechte. Die Höhe hängt linear daran: zehn
        Prozent zu weit geschätzt heißt zehn Prozent zu hoch gemessen. Das ist
        der größte Fehler, nicht der Sensor.
      </div>
    </div>
  );
}
