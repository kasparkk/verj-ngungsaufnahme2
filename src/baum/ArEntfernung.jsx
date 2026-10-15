import { useState, useEffect, useRef } from "react";
import { farben } from "../konfiguration.js";
import { waagerechteEntfernung } from "./hoehe.js";

/* Entfernung mit AR messen (WebXR, auf Android mit ARCore dahinter).

   Die Kamera verfolgt ihre eigene Bewegung und erkennt den Boden. Ein
   Strahl aus der Bildmitte trifft darauf - wo er auftrifft, steht der
   Zielpunkt. Daraus und aus der Position des Geraetes ergibt sich die
   WAAGERECHTE Entfernung, und zwar direkt: Die Hoehendifferenz faellt in
   waagerechteEntfernung() ausdruecklich heraus. Am Hang entfaellt damit
   das Umrechnen von der abgeschrittenen auf die waagerechte Strecke.

   Auf dem iPhone gibt es kein WebXR; dort erscheint der Knopf gar nicht
   erst. Auch auf Android kann es misslingen - im Bestand ist die
   Flaechenerkennung das Schwierige: unebene Streu, Unterwuchs, wenig
   Licht. Deshalb ersetzt das hier NICHTS: Die getippte Entfernung bleibt,
   dieser Weg traegt nur einen Wert dort hinein, den man noch ansehen und
   verwerfen kann. */

export async function arMoeglich() {
  try {
    if (!navigator.xr?.isSessionSupported) return false;
    return await navigator.xr.isSessionSupported("immersive-ar");
  } catch {
    return false;
  }
}

export default function ArEntfernung({ offen, onSchliessen, onUebernehmen }) {
  const [entfernung, setEntfernung] = useState(null);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const sitzungRef = useRef(null);
  const letzteRef = useRef(null);
  const huelleRef = useRef(null);

  useEffect(() => {
    if (!offen) return;
    let beendet = false;

    const starten = async () => {
      setFehler("");
      setEntfernung(null);
      try {
        /* Ein Leinwand-Element mit WebGL ist Pflicht: Ohne Basis-Ebene
           lehnt die Sitzung ab. Gezeichnet wird nichts - das Kamerabild
           kommt vom System, und ein Fadenkreuz legt die Oberflaeche
           darueber. */
        const leinwand = document.createElement("canvas");
        const gl = leinwand.getContext("webgl", { xrCompatible: true, alpha: true });
        if (!gl) throw new Error("WebGL nicht verfügbar");

        const sitzung = await navigator.xr.requestSession("immersive-ar", {
          requiredFeatures: ["hit-test"],
          optionalFeatures: ["dom-overlay"],
          domOverlay: huelleRef.current ? { root: huelleRef.current } : undefined,
        });
        if (beendet) {
          sitzung.end();
          return;
        }
        sitzungRef.current = sitzung;
        setLaeuft(true);

        await gl.makeXRCompatible?.();
        sitzung.updateRenderState({ baseLayer: new XRWebGLLayer(sitzung, gl) });

        const bezug = await sitzung.requestReferenceSpace("local");
        const vonHier = await sitzung.requestReferenceSpace("viewer");
        const strahl = await sitzung.requestHitTestSource({ space: vonHier });

        sitzung.addEventListener("end", () => {
          sitzungRef.current = null;
          setLaeuft(false);
        });

        const bild = (zeit, rahmen) => {
          if (!sitzungRef.current) return;
          sitzungRef.current.requestAnimationFrame(bild);
          const treffer = rahmen.getHitTestResults(strahl);
          const blick = rahmen.getViewerPose(bezug);
          if (!treffer.length || !blick) return;
          const ziel = treffer[0].getPose(bezug);
          if (!ziel) return;
          const d = waagerechteEntfernung(blick.transform.position, ziel.transform.position);
          letzteRef.current = d;
          setEntfernung(d);
        };
        sitzung.requestAnimationFrame(bild);
      } catch (e) {
        if (!beendet) {
          setLaeuft(false);
          setFehler(
            e?.name === "NotAllowedError"
              ? "Keine Freigabe für die Kamera"
              : "AR lässt sich hier nicht starten",
          );
        }
      }
    };
    starten();

    // Die Sitzung MUSS beendet werden - sonst bleibt die Kamera an.
    return () => {
      beendet = true;
      sitzungRef.current?.end().catch(() => {});
      sitzungRef.current = null;
      setLaeuft(false);
    };
  }, [offen]);

  if (!offen) return null;

  const uebernehmen = () => {
    const d = letzteRef.current;
    sitzungRef.current?.end().catch(() => {});
    if (d != null) onUebernehmen(Math.round(d * 10) / 10);
    else onSchliessen();
  };

  const knopf = {
    border: `1px solid ${farben.line}`,
    background: "rgba(18,22,15,0.82)",
    color: farben.text,
    borderRadius: 12,
    padding: "13px 16px",
    fontSize: 14,
    cursor: "pointer",
  };

  return (
    <div
      ref={huelleRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 40,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: laeuft ? "transparent" : farben.bg,
        padding: "16px 14px 28px",
      }}
    >
      <div
        style={{
          background: "rgba(18,22,15,0.82)",
          borderRadius: 12,
          padding: "10px 12px",
          fontSize: 12,
          color: farben.text,
          lineHeight: 1.5,
        }}
      >
        Fadenkreuz auf den <b>Stammfuß</b> richten – dorthin, wo der Stamm den
        Boden trifft. Das Handy dabei langsam bewegen, damit der Boden erkannt
        wird.
      </div>

      {/* Fadenkreuz: der Strahl geht durch die Bildmitte. */}
      {laeuft && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "50%", left: "42%", right: "42%", height: 1, background: farben.unverb }} />
          <div style={{ position: "absolute", left: "50%", top: "44%", bottom: "44%", width: 1, background: farben.unverb }} />
        </div>
      )}

      <div>
        <div
          style={{
            textAlign: "center",
            background: "rgba(18,22,15,0.82)",
            borderRadius: 14,
            padding: "12px 0",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
            WAAGERECHTE ENTFERNUNG
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: entfernung == null ? farben.muted : farben.unverb,
              lineHeight: 1.1,
            }}
          >
            {entfernung == null ? "–" : `${entfernung.toFixed(1)} m`}
          </div>
          {entfernung == null && !fehler && (
            <div style={{ fontSize: 11, color: farben.muted }}>
              Boden wird gesucht – Handy langsam schwenken
            </div>
          )}
          {fehler && <div style={{ fontSize: 12, color: farben.verb }}>{fehler}</div>}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => {
              sitzungRef.current?.end().catch(() => {});
              onSchliessen();
            }}
            style={{ ...knopf, flex: 1 }}
          >
            Abbrechen
          </button>
          <button
            onClick={uebernehmen}
            disabled={entfernung == null}
            style={{
              ...knopf,
              flex: 2,
              background: entfernung == null ? "rgba(18,22,15,0.82)" : farben.unverb,
              color: entfernung == null ? farben.muted : farben.bg,
              border: `1px solid ${entfernung == null ? farben.line : farben.unverb}`,
              fontWeight: 700,
              cursor: entfernung == null ? "default" : "pointer",
            }}
          >
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  );
}
