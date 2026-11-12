import { useState, useEffect, useRef } from "react";
import { farben } from "../konfiguration.js";
import {
  baumHoehe,
  neigungAusBeta,
  geglaettet,
  unruhe,
  entfernungAusNeigung,
  NEIGUNG_GRENZE_M,
} from "./hoehe.js";
import {
  handyhoeheLaden,
  handyhoeheSpeichern,
  STANDARD_HANDYHOEHE,
} from "./handyhoehe.js";
import HoeheSkizze from "./HoeheSkizze.jsx";
import ArEntfernung, { arMoeglich } from "./ArEntfernung.jsx";
import { useT, zahlOrt } from "../sprache.js";
import Markiert from "../komponenten/Markiert.jsx";

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
  const t = useT();
  /* Leer, nicht "20".
     Die Entfernung ging vorher als Vorgabe ins Feld - eine Zahl, die aussah
     wie ein Vorschlag, aber gerechnet wurde. Wer sie stehenliess, bekam die
     Hoehe eines 20-m-Abstands, ohne Hinweis. Die Hoehe haengt linear daran,
     also war das der teuerste stille Fehler im Messer. Jetzt bleibt die
     Hoehe "-", bis eine Entfernung dasteht; innerhalb der Sitzung bleibt
     die eingetippte erhalten. */
  const [entfernung, setEntfernung] = useState("");
  /* Handyhoehe fuer die Schaetzung aus der Neigung. Gehoert zur Person,
     nicht zur Messung - deshalb aus dem eigenen Speicher. */
  const [handyhoehe, setHandyhoehe] = useState(STANDARD_HANDYHOEHE);
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
    setHandyhoehe(handyhoeheLaden());
  }, [offen]);

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
          strom.getTracks().forEach((spur) => spur.stop());
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
      stromRef.current?.getTracks().forEach((spur) => spur.stop());
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

  /* Welcher Schritt ist gerade dran.

     Zwei gleich aussehende Knoepfe zwingen dazu, sich die Reihenfolge zu
     merken, und sagen nicht, warum unten nichts steht. Im Bestand, mit
     kalten Haenden, ist das genau die Stelle, an der man zweimal dasselbe
     festhaelt. Deshalb fuehrt die App jetzt: Sie sagt, was dran ist, und
     hebt den Knopf hervor, der gemeint ist. */
  const hatEntfernung = Number(String(entfernung).replace(",", ".")) > 0;
  const schritt = u == null ? "fuss" : o == null ? "spitze" : "fertig";

  /* Vorschlag fuer die Entfernung aus dem Fusswinkel. Erscheint erst, wenn
     der Fuss angepeilt ist - vorher gibt es nichts zu rechnen. */
  const schaetzung = entfernungAusNeigung(handyhoehe.replace(",", "."), u);
  const nk1 = (x) =>
    Number(x).toLocaleString(zahlOrt(), { minimumFractionDigits: 1, maximumFractionDigits: 1 });

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

  /* Gefuellt heisst "jetzt tippen", umrandet heisst "steht schon" - dieselbe
     Sprache wie beim "+5" in den Zaehlboxen. */
  const peilKnopf = (dran) => ({
    flex: 1,
    background: dran ? farben.unverb : "transparent",
    border: `1px solid ${dran ? farben.unverb : farben.line}`,
    color: dran ? farben.bg : farben.text,
    borderRadius: 12,
    padding: "14px 0",
    fontSize: 14,
    fontWeight: dran ? 700 : 400,
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
        <div style={{ fontSize: 18, fontWeight: 700, color: farben.text }}>{t("Höhe messen")}</div>
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

      {/* Eine Zeile bleibt immer sichtbar. Die ausfuehrliche Anleitung ist
          zugeklappt - ganz ohne Hinweis dazustehen waere aber der falsche
          Tausch, wenn jemand den Messer zum ersten Mal oeffnet. */}
      <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, margin: "8px 0 2px" }}>
        {t("Fadenkreuz auf den Stammfuß richten und antippen, dann auf die Spitze.")}
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
        {anleitungOffen ? "▾" : "▸"} {t("So geht’s")}
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
              {t(
                "So weit vom Baum weg, dass du die Spitze gut siehst – etwa eine Baumlänge. Die Strecke abschreiten oder messen.",
              )}
            </li>
            <li>
              <Markiert
                text={t(
                  "Entfernung unten eintragen. *Waagerecht gemeint:* am Hang ist die abgeschrittene Strecke länger als die waagerechte.",
                )}
              />
            </li>
            <li>
              <Markiert text={t("Fadenkreuz auf den *Stammfuß* → „Fuß“ antippen.")} />
            </li>
            <li>
              <Markiert text={t("Fadenkreuz auf die *Spitze* → „Spitze“ antippen.")} />
            </li>
            <li>{t("Höhe steht da → „Übernehmen“, dann mit + in die Liste.")}</li>
          </ol>
          <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, marginTop: 10 }}>
            {t(
              "Warum zwei Winkel: So fallen Augenhöhe und Hangneigung von selbst heraus – du musst weder deine Körpergröße eintragen noch am Hang nachrechnen.",
            )}
            <br />
            <br />
            <Markiert
              text={t(
                "*Bei kleinen Bäumen* – bis etwa {grenze} m Entfernung – kann die App die Entfernung aus dem Fußwinkel schätzen, sobald der Fuß angepeilt ist. Dafür muss die Handyhöhe stimmen und der Boden waagerecht sein. Weiter weg peilt man zu flach: dort macht ein Grad Sensorfehler aus 25 m alles zwischen 20 und 34 m, und die App bietet deshalb gar keine Zahl mehr an.",
                { grenze: NEIGUNG_GRENZE_M },
              )}
            />
            <br />
            <br />
            <Markiert
              text={t(
                "*Zur Probe:* denselben Baum aus zwei verschiedenen Entfernungen messen. Kommt zweimal dasselbe heraus, stimmt die Entfernung. Weichen die Werte ab, lag es daran und nicht am Sensor.",
              )}
            />
            <br />
            <br />
            {t(
              "Häufigster Fehler im Bestand: ein Seitenast wird für die Spitze gehalten. Bei Laubholz mit breiter Krone lieber einen Schritt zur Seite gehen und noch einmal schauen.",
            )}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
          {t("WAAGERECHTE ENTFERNUNG m")}
        </div>
        <input
          style={feld}
          value={entfernung}
          onChange={(e) => setEntfernung(e.target.value)}
          inputMode="decimal"
          placeholder={t("hier Entfernung eintragen")}
          aria-label={t("Entfernung")}
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
            {t("Entfernung mit AR messen")}
          </button>
        )}

        {/* Schaetzung aus dem Fusswinkel. Steht bewusst UNTER dem Feld und
            traegt sich nicht von selbst ein: Sie ist ein Vorschlag, und
            jenseits weniger Meter ein schlechter.

            Nur sichtbar, solange keine Entfernung dasteht. Wer geschritten
            oder gemessen hat, braucht keinen Vorschlag - und erst recht
            keine rote Warnung darueber, dass der Vorschlag nicht taugt,
            den er gar nicht benutzt. */}
        {schaetzung && !hatEntfernung && (
          <div
            style={{
              background: farben.surface,
              borderRadius: 12,
              padding: "10px 12px",
              marginTop: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 8 }}>
              <div style={{ width: 92 }}>
                <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
                  {t("HANDYHÖHE m")}
                </div>
                <input
                  style={{ ...feld, fontSize: 16 }}
                  value={handyhoehe}
                  onChange={(e) => {
                    setHandyhoehe(e.target.value);
                    handyhoeheSpeichern(e.target.value);
                  }}
                  inputMode="decimal"
                  aria-label={t("Handyhöhe über dem Boden")}
                />
              </div>
              <div style={{ flex: 1, fontSize: 11, color: farben.muted, lineHeight: 1.4 }}>
                {t("über dem Boden, beim Peilen. Einmal messen – 10 cm daneben sind 6 % Fehler.")}
              </div>
            </div>

            {schaetzung.brauchbar ? (
              <>
                <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
                  {t("AUS DER NEIGUNG ({grad}° nach unten)", {
                    grad: nk1(schaetzung.neigung),
                  })}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <div style={{ fontSize: 26, fontWeight: 800, color: farben.text }}>
                    {nk1(schaetzung.d)} m
                  </div>
                  <div style={{ fontSize: 12, color: farben.muted }}>
                    {schaetzung.max == null
                      ? t("mindestens {m} m", { m: nk1(schaetzung.min) })
                      : t("{von} – {bis} m", {
                          von: nk1(schaetzung.min),
                          bis: nk1(schaetzung.max),
                        })}
                  </div>
                </div>
                <button
                  onClick={() => setEntfernung(nk1(schaetzung.d))}
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
                  {t("Als Entfernung übernehmen")}
                </button>
                <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, marginTop: 8 }}>
                  <Markiert
                    text={t(
                      "Setzt *waagerechten Boden* zwischen dir und dem Stammfuß voraus – am Hang ist diese Rechnung nicht ungenau, sondern falsch. Dann schreiten oder messen.",
                    )}
                  />
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: farben.verb, lineHeight: 1.5 }}>
                {t(
                  "Der Fuß liegt nur {grad}° unter waagerecht. So flach lässt sich die Entfernung nicht mehr schätzen",
                  { grad: nk1(schaetzung.neigung) },
                )}
                {schaetzung.max == null
                  ? t(" – nach oben ist alles offen.")
                  : t(": ein Grad Sensorfehler macht daraus {von} bis {bis} m.", {
                      von: nk1(schaetzung.min),
                      bis: nk1(schaetzung.max),
                    })}{" "}
                {t("Über {grenze} m hilft nur schreiten oder messen.", {
                  grenze: NEIGUNG_GRENZE_M,
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {sensor === "gesperrt" && (
        <button
          onClick={erlaubnisHolen}
          style={{ ...knopf(false), width: "100%", marginBottom: 16 }}
        >
          {t("Neigungssensor freigeben")}
        </button>
      )}

      {eintippen ? (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
              {t("FUSS Grad")}
            </div>
            <input
              style={feld}
              value={untenText}
              onChange={(e) => setUntenText(e.target.value)}
              inputMode="decimal"
              aria-label={t("Winkel zum Fuß")}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
              {t("SPITZE Grad")}
            </div>
            <input
              style={feld}
              value={obenText}
              onChange={(e) => setObenText(e.target.value)}
              inputMode="decimal"
              aria-label={t("Winkel zur Spitze")}
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
              aria-label={t("Sucher")}
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
              <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
                {t("NEIGUNG")}
              </div>
              <div style={{ fontSize: 40, fontWeight: 800, color: farben.text, lineHeight: 1.1 }}>
                {winkel == null ? "–" : `${nk1(winkel)}°`}
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
                  {zittern <= 1
                    ? t("ruhig")
                    : t("wackelt ±{grad}° – ruhiger halten", {
                        grad: nk1(zittern / 2),
                      })}
                </div>
              )}
            </div>
          </div>
          {/* Was jetzt dran ist - direkt ueber den Knoepfen, dort schaut
              man ohnehin hin, wenn man vom Fadenkreuz herunterblickt. */}
          <div
            style={{
              textAlign: "center",
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 8,
              lineHeight: 1.4,
              color:
                schritt === "fertig" && hoehe != null
                  ? farben.unverb
                  : schritt === "fertig"
                    ? farben.verb
                    : farben.text,
            }}
          >
            {schritt === "fuss"
              ? t("1 · Stammfuß anpeilen")
              : schritt === "spitze"
                ? t("2 · Spitze anpeilen")
                : hoehe != null
                  ? t("✓ Fertig – die Höhe steht unten")
                  : hatEntfernung
                    ? t("Die Spitze liegt unter dem Fuß – einen der beiden neu anpeilen")
                    : t("Jetzt fehlt nur noch die Entfernung oben")}
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => setUnten(winkel)}
              aria-label={t("Fuß festhalten")}
              style={peilKnopf(schritt === "fuss")}
            >
              {t("Fuß")}
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                {unten == null ? t("anpeilen") : `✓ ${nk1(unten)}°`}
              </div>
            </button>
            <button
              onClick={() => setOben(winkel)}
              aria-label={t("Spitze festhalten")}
              style={peilKnopf(schritt === "spitze")}
            >
              {t("Spitze")}
              <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2 }}>
                {oben == null ? t("anpeilen") : `✓ ${nk1(oben)}°`}
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
        <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>{t("HÖHE")}</div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 800,
            color: hoehe == null ? farben.muted : farben.unverb,
            lineHeight: 1.1,
          }}
        >
          {hoehe == null ? "–" : `${nk1(hoehe)} m`}
        </div>
        {hoehe != null && (
          <div style={{ fontSize: 11, color: farben.muted, marginTop: 4 }}>
            {t("±{m} m bei 5 % Fehler in der Entfernung", {
              m: nk1(hoehe * 0.05),
            })}
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
          {t("Zurücksetzen")}
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
          {t("Übernehmen")}
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
          {t("Winkel lieber eintippen")}
        </button>
      )}

      <div style={{ fontSize: 10, color: farben.muted, lineHeight: 1.5, marginTop: 16 }}>
        {t(
          "Die Entfernung muss waagerecht sein – am Hang ist die abgeschrittene Strecke länger als die waagerechte. Die Höhe hängt linear daran: zehn Prozent zu weit geschätzt heißt zehn Prozent zu hoch gemessen. Das ist der größte Fehler, nicht der Sensor.",
        )}
        {kamera === "nein" &&
          " " +
            t(
              "Ohne Kamerabild gilt: Der Winkel gehört zu der Richtung, in die die Rückkamera zeigt – also senkrecht zur Bildschirmfläche, nicht entlang der Oberkante.",
            )}
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
