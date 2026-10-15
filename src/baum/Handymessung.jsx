import { useEffect, useRef, useState } from "react";
import { farben } from "../konfiguration.js";
import { baumhoehe, durchmesser, neigung } from "./handyBerechnung.js";

const rund = (n) => n.toFixed(1);
const taste = { background: farben.surfaceHi, color: farben.text, border: `1px solid ${farben.line}`, borderRadius: 10, padding: "11px 12px", cursor: "pointer", minHeight: 44 };

export default function Handymessung({ onHoehe, onBhd }) {
  const [offen, setOffen] = useState(false);
  return <div style={{ margin: "10px 0 16px" }}>
    <button type="button" style={{ ...taste, width: "100%" }} aria-expanded={offen} onClick={() => setOffen(!offen)}>
      {offen ? "Handymessung schließen" : "Mit dem Handy messen · Höhe / BHD"}
    </button>
    {offen && <Messgeraet onHoehe={onHoehe} onBhd={onBhd} />}
  </div>;
}

function Messgeraet({ onHoehe, onBhd }) {
  const [distanz, setDistanz] = useState("");
  const [fuss, setFuss] = useState("");
  const [spitze, setSpitze] = useState("");
  const [umfang, setUmfang] = useState("");
  const [winkel, setWinkel] = useState(null);
  const [sensor, setSensor] = useState(false);
  const [kamera, setKamera] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [meldung, setMeldung] = useState("");
  const [sensorInfo, setSensorInfo] = useState("");
  const [kameraInfo, setKameraInfo] = useState("");
  const video = useRef(null), stream = useRef(null), aktiv = useRef(true), letzte = useRef(0);
  useEffect(() => {
    aktiv.current = true;
    return () => { aktiv.current = false; stream.current?.getTracks().forEach((t) => t.stop()); };
  }, []);
  useEffect(() => {
    if (kamera && video.current) {
      video.current.srcObject = stream.current;
      video.current.play().catch(() => setKameraInfo("Kameravorschau nicht verfügbar. Winkel manuell eingeben."));
    }
  }, [kamera]);
  useEffect(() => {
    if (!sensor) return;
    const lesen = (e) => {
      const quer = Math.abs(window.screen.orientation?.angle ?? window.orientation ?? 0) % 180 !== 0;
      setWinkel(quer ? null : neigung(e.beta, e.gamma));
      letzte.current = Date.now();
    };
    window.addEventListener("deviceorientation", lesen);
    const timer = setInterval(() => {
      if (Date.now() - letzte.current > 1500) setWinkel(null);
    }, 500);
    return () => { window.removeEventListener("deviceorientation", lesen); clearInterval(timer); };
  }, [sensor]);
  const sensorStart = async () => {
    setSensorInfo("");
    try {
      if (!window.isSecureContext || !window.DeviceOrientationEvent) throw new Error();
      if (typeof window.DeviceOrientationEvent.requestPermission === "function") {
        const erlaubnis = await window.DeviceOrientationEvent.requestPermission();
        if (erlaubnis !== "granted") throw new Error();
      }
      if (aktiv.current) setSensor(true);
    } catch { if (aktiv.current) setSensorInfo("Neigungssensor nicht verfügbar oder nicht erlaubt. Winkel unten manuell eingeben."); }
  };
  const kameraStart = async () => {
    setLaedt(true); setKameraInfo("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error();
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!aktiv.current) { s.getTracks().forEach((t) => t.stop()); return; }
      stream.current = s; setKamera(true);
    } catch { if (aktiv.current) setKameraInfo("Kamera nicht verfügbar oder nicht erlaubt. Entlang der Handy-Rückseite zielen oder Winkel manuell eingeben."); }
    finally { if (aktiv.current) setLaedt(false); }
  };
  const h = baumhoehe(distanz, fuss, spitze), dm = durchmesser(umfang);
  const feld = (titel, wert, setzen) => <label style={{ display: "block", fontSize: 12, color: farben.muted, margin: "10px 0" }}>{titel}
    <input value={wert} onChange={(e) => { setzen(e.target.value); setMeldung(""); }} inputMode="decimal" style={{ display: "block", boxSizing: "border-box", width: "100%", marginTop: 5, padding: 10, borderRadius: 8, border: `1px solid ${farben.line}`, background: farben.surfaceHi, color: farben.text, fontSize: 18 }} />
  </label>;
  return <section aria-label="Handymessung" style={{ background: farben.surface, border: `1px solid ${farben.line}`, borderRadius: 14, padding: 14, marginTop: 8 }}>
    <div style={{ fontSize: 11, letterSpacing: 1, color: farben.unverb }}>FELDWERKZEUG / HÖHE</div>
    <h3 style={{ margin: "8px 0" }}>Fußpunkt und Baumspitze anpeilen</h3>
    <p style={{ fontSize: 13, lineHeight: 1.6, color: farben.muted }}>Horizontalen Abstand zum Stamm mit Maßband oder Entfernungsmesser bestimmen. Am selben Standort erst den Stammfuß, dann die Spitze anpeilen. Handy aufrecht im Hochformat halten, Rückkamera zum Baum. Beim Anpeilen die Höhe des Handys unverändert lassen.</p>
    {feld("Horizontaler Abstand zum Baum (m)", distanz, setDistanz)}
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <button type="button" style={taste} disabled={sensor} onClick={sensorStart}>{sensor ? "Sensor aktiv" : "Neigung aktivieren"}</button>
      <button type="button" style={taste} disabled={laedt} onClick={kamera ? () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setKamera(false); } : kameraStart}>{laedt ? "Kamera startet …" : kamera ? "Kamera ausschalten" : "Kamera öffnen"}</button>
    </div>
    <p role="status" style={{ fontSize: 12, color: farben.muted }}>{sensorInfo} {kameraInfo}</p>
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 12, background: farben.surfaceHi, height: kamera ? 260 : 130, marginTop: 12 }}>
      {kamera && <video ref={video} autoPlay muted playsInline aria-label="Rückkamera mit Zielfaden" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", color: "white", textShadow: "0 1px 4px #222", fontSize: 42 }}>+</div>
      <output style={{ position: "absolute", bottom: 10, left: 10, background: farben.surface, padding: "6px 10px", borderRadius: 8 }}>{winkel == null ? "Kein gültiger Sensorwinkel" : `${rund(winkel)}°`}</output>
    </div>
    {sensor && <p style={{ fontSize: 12, color: farben.muted }}>Ohne Winkel: Hochformat prüfen, Handy gerade halten oder Winkel manuell eingeben.</p>}
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <button type="button" style={{ ...taste, flex: 1 }} disabled={winkel == null} onClick={() => { setFuss(rund(winkel)); setMeldung(""); }}>1 · Fuß erfassen</button>
      <button type="button" style={{ ...taste, flex: 1 }} disabled={winkel == null} onClick={() => { setSpitze(rund(winkel)); setMeldung(""); }}>2 · Spitze erfassen</button>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {feld("Fußwinkel (°, vorzeichenbehaftet)", fuss, setFuss)}
      {feld("Spitzenwinkel (°)", spitze, setSpitze)}
    </div>
    <p style={{ fontSize: 12, color: farben.muted }}>Winkel lassen sich manuell korrigieren: unter dem Horizont negativ, darüber positiv. Beide Winkel müssen zwischen −85° und +85° liegen; die Spitze liegt über dem Fuß.</p>
    <div style={{ fontSize: 28, fontWeight: 700, color: farben.unverb }}>{h == null ? "—" : `≈ ${rund(h)} m`}</div>
    <button type="button" style={{ ...taste, width: "100%", marginTop: 10 }} disabled={h == null || Number(rund(h)) <= 0} onClick={() => { onHoehe(rund(h)); setMeldung("Höhe ins Eingabefeld übernommen. Zum Speichern wie gewohnt hinzufügen."); }}>Höhe ins Eingabefeld übernehmen</button>
    <p style={{ fontSize: 12, lineHeight: 1.5, color: farben.muted }}>Schätzung aus Abstand und Neigung, keine automatische Entfernungsmessung. Sensorfehler, schiefe Bäume und eine versetzte Krone beeinflussen das Ergebnis. Vor der Übernahme prüfen. Kameraaufnahmen werden nicht gespeichert oder hochgeladen.</p>
    <div style={{ borderTop: `1px solid ${farben.line}`, paddingTop: 14, marginTop: 16 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, color: farben.unverb }}>FELDWERKZEUG / DURCHMESSER</div>
      <p style={{ fontSize: 13, lineHeight: 1.5, color: farben.muted }}>Stammumfang mit einem Maßband in 1,30 m Höhe messen (hangseitig). BHD = Umfang ÷ π; setzt einen annähernd runden Stamm voraus.</p>
      {feld("Stammumfang (cm)", umfang, setUmfang)}
      <div style={{ fontSize: 26, fontWeight: 700 }}>{dm == null ? "—" : `${rund(dm)} cm BHD`}</div>
      <button type="button" style={{ ...taste, width: "100%", marginTop: 10 }} disabled={dm == null || Number(rund(dm)) <= 0} onClick={() => { onBhd(rund(dm)); setMeldung("BHD ins Eingabefeld übernommen. Zum Speichern wie gewohnt hinzufügen."); }}>BHD ins Eingabefeld übernehmen</button>
    </div>
    <p role="status" style={{ fontSize: 13, color: farben.unverb }}>{meldung}</p>
  </section>;
}
