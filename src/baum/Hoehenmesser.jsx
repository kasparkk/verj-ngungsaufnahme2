import { useState, useEffect, useRef } from "react";
import { farben } from "../konfiguration.js";
import { baumHoehe, neigungAusBeta, geglaettet, unruhe } from "./hoehe.js";
import HoeheSkizze from "./HoeheSkizze.jsx";
import ArEntfernung, { arMoeglich } from "./ArEntfernung.jsx";

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
  const [winkel, setWinkel] = useState(null);   // geglaettete Neigung
  const [zittern, setZittern] = useState(null); // Spanne der letzten Werte
  /* Die letzten Rohwerte. Als Ref, nicht als Zustand: Der Sensor feuert
     bis zu sechzigmal je Sekunde - jedes Mal neu zu zeichnen waere
     Verschwendung, gezeichnet wird nur der geglaettete Wert. */
  const rohwerte = useRef([]);
  /* AR nur anbieten, wenn das Geraet es wirklich kann. Auf dem iPhone
     gibt es kein WebXR - dort soll kein Knopf stehen, der nichts tut. */
  const [arKann, setArKann] = useState(false);
  const [arOffen, setArOffen] = useState(false);
  const [unten, setUnten] = useState(null);
  const [oben, setOben] = useState(null);
  const [sensor, setSensor] = useState("unbekannt"); // unbekannt|laeuft|nein|gesperrt
  const [vonHand, setVonHand] = useState(false);
  const [untenText, setUntenText] = useState("");
  const [obenText, setObenText] = useState("");
  const kamAn = useRef(false);
  // Die Anleitung steht zugeklappt; wer sie braucht, tippt sie auf.
  const [anleitungOffen, setAnleitungOffen] = useState(false);
  const [kamera, setKamera] = useState("unbekannt"); // unbekannt|laeuft|nein
  const videoRef = useRef(null);
  const stromRef = useRef(null);

  const lesen = (e) => {
    if (e.beta == null) return;
    kamAn.current = true;
    setSensor("laeuft");
    const roh = neigungAusBeta(e.beta);
    if (roh == null) return;

    const jetzt = Date.now();
    // Nur das kurze Fenster behalten - der Rest wird nie wieder gebraucht.
    rohwerte.current = [...rohwerte.current, { zeit: jetzt, wert: roh }].filter(
      (w) => jetzt - w.zeit <= 800,
    );
    setWinkel(geglaettet(rohwerte.current, jetzt));
    setZittern(unruhe(rohwerte.current, jetzt));
  };

  useEffect(() => {
    if (!offen) return;
    let gilt = true;
    arMoeglich().then((kann) => gilt && setArKann(kann));
    return () => {
      gilt = false;
    };
  }, [offen]);

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

  /* Die Rueckkamera als Sucher.

     Nicht Zierde, sondern noetig: Die Neigung, die der Sensor liefert, ist
     die der KAMERA-ACHSE - also senkrecht zum Bildschirm. Ohne Bild muss
     man sich diese Achse vorstellen, und die erste Fassung erklaerte dazu
     "ueber die Oberkante peilen", was 90 Grad daneben liegt. Mit einem
     Fadenkreuz im Sucher stimmt Anleitung und Rechnung ueberein: Worauf
     das Kreuz zeigt, dazu gehoert der angezeigte Winkel.

     Ohne Kamera - am Rechner, abgelehnte Freigabe - bleibt die Zahl allein
     stehen; gerechnet wird genauso. */
  useEffect(() => {
    if (!offen) return;
    let abgebrochen = false;

    const starten = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setKamera("nein");
        return;
      }
      try {
        const strom = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (abgebrochen) {
          strom.getTracks().forEach((t) => t.stop());
          return;
        }
        stromRef.current = strom;
        if (videoRef.current) videoRef.current.srcObject = strom;
        setKamera("laeuft");
      } catch {
        if (!abgebrochen) setKamera("nein");
      }
    };
    starten();

    /* Der Strom MUSS beim Schliessen angehalten werden. Sonst laeuft die
       Kamera im Hintergrund weiter, das Laempchen bleibt an und der Akku
       geht im Bestand unnoetig drauf. */
    return () => {
      abgebrochen = true;
      stromRef.current?.getTracks().forEach((t) => t.stop());
      stromRef.current = null;
      setKamera("unbekannt");
      /* Alles zuruecksetzen, was zu DIESEM Baum gehoert.

         Nicht nur Kosmetik: Blieben die Winkel stehen, koennte man beim
         naechsten Baum nur "Spitze" antippen und bekaeme eine Hoehe, die
         den Fuss vom vorigen Baum benutzt - ohne dass irgendetwas darauf
         hinweist. Die Entfernung bleibt dagegen stehen; sie ist gross
         sichtbar und oft dieselbe. */
      rohwerte.current = [];
      setWinkel(null);
      setZittern(null);
      setUnten(null);
      setOben(null);
      setUntenText("");
      setObenText("");
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

      {/* Eine Zeile bleibt immer sichtbar. Die ausfuehrliche Anleitung ist
          zugeklappt - ganz ohne Hinweis dazustehen waere aber der falsche
          Tausch, wenn jemand den Messer zum ersten Mal oeffnet. */}
      <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, margin: "8px 0 2px" }}>
        Fadenkreuz auf den Stammfuß richten und antippen, dann auf die Spitze.
      </div>

      <button
        onClick={() => setAnleitungOffen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          color: farben.muted,
          fontSize: 12,
          padding: "8px 0",
          cursor: "pointer",
        }}
      >
        {anleitungOffen ? "▾" : "▸"} So geht’s
      </button>

      {anleitungOffen && (
        <div
          style={{
            background: farben.surface,
            borderRadius: 14,
            padding: "12px 12px 14px",
            marginBottom: 14,
          }}
        >
          <HoeheSkizze />
          <ol
            style={{
              margin: "10px 0 0",
              paddingLeft: 18,
              fontSize: 12,
              color: farben.text,
              lineHeight: 1.6,
            }}
          >
            <li>
              So weit vom Baum weg, dass du die Spitze gut siehst – etwa eine
              Baumlänge. Die Strecke abschreiten oder messen.
            </li>
            <li>
              Entfernung unten eintragen. <b>Waagerecht gemeint:</b> am Hang ist
              die abgeschrittene Strecke länger als die waagerechte.
            </li>
            <li>Fadenkreuz auf den <b>Stammfuß</b> → „Fuß“ antippen.</li>
            <li>Fadenkreuz auf die <b>Spitze</b> → „Spitze“ antippen.</li>
            <li>Höhe steht da → „Übernehmen“, dann mit + in die Liste.</li>
          </ol>
          <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, marginTop: 10 }}>
            Warum zwei Winkel: So fallen Augenhöhe und Hangneigung von selbst
            heraus – du musst weder deine Körpergröße eintragen noch am Hang
            nachrechnen.
            <br />
            <br />
            <b>Zur Probe:</b> denselben Baum aus zwei verschiedenen Entfernungen
            messen. Kommt zweimal dasselbe heraus, stimmt die Entfernung. Weichen
            die Werte ab, lag es daran und nicht am Sensor.
            <br />
            <br />
            Häufigster Fehler im Bestand: ein Seitenast wird für die Spitze
            gehalten. Bei Laubholz mit breiter Krone lieber einen Schritt zur
            Seite gehen und noch einmal schauen.
          </div>
        </div>
      )}

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
        {arKann && (
          <button
            onClick={() => setArOffen(true)}
            style={{
              width: "100%",
              background: "transparent",
              border: `1px solid ${farben.line}`,
              color: farben.text,
              borderRadius: 10,
              padding: "9px 0",
              fontSize: 13,
              marginTop: 8,
              cursor: "pointer",
            }}
          >
            Entfernung mit AR messen
          </button>
        )}
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
              position: "relative",
              background: farben.surface,
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 12,
              aspectRatio: kamera === "laeuft" ? "3 / 4" : undefined,
              maxWidth: "100%",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              aria-label="Sucher"
              style={{
                display: kamera === "laeuft" ? "block" : "none",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* Fadenkreuz in der Mitte - dort zeigt die Kameraachse hin,
                und genau dazu gehoert der Winkel darunter. */}
            {kamera === "laeuft" && (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 0,
                    right: 0,
                    height: 1,
                    background: farben.unverb,
                    opacity: 0.9,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "42%",
                    bottom: "42%",
                    width: 1,
                    background: farben.unverb,
                    opacity: 0.9,
                  }}
                />
              </div>
            )}

            <div
              style={{
                position: kamera === "laeuft" ? "absolute" : "static",
                left: 0,
                right: 0,
                bottom: 0,
                textAlign: "center",
                padding: "10px 0",
                background: kamera === "laeuft" ? "rgba(18,22,15,0.72)" : "transparent",
              }}
            >
              <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>NEIGUNG</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: farben.text, lineHeight: 1.1 }}>
                {winkel == null ? "–" : `${winkel.toFixed(1)}°`}
              </div>
              {/* Sagt, wann sich das Antippen lohnt. Ohne das taeuscht die
                  geglaettete Zahl Ruhe vor, die gar nicht da ist. */}
              {zittern != null && (
                <div
                  style={{
                    fontSize: 11,
                    marginTop: 2,
                    color: zittern <= 1 ? farben.unverb : farben.verb,
                  }}
                >
                  {zittern <= 1 ? "ruhig" : `wackelt ±${(zittern / 2).toFixed(1)}° – ruhiger halten`}
                </div>
              )}
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
        {kamera === "nein" &&
          " Ohne Kamerabild gilt: Der Winkel gehört zu der Richtung, in die die" +
            " Rückkamera zeigt – also senkrecht zur Bildschirmfläche, nicht" +
            " entlang der Oberkante."}
      </div>

      <ArEntfernung
        offen={arOffen}
        onSchliessen={() => setArOffen(false)}
        onUebernehmen={(meter) => {
          setEntfernung(String(meter));
          setArOffen(false);
        }}
      />
    </div>
  );
}
