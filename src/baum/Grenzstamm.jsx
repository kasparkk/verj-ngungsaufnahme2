import { useState } from "react";
import { farben } from "../konfiguration.js";
import { grenzRadius, zaehltMit } from "./berechnung.js";
import ArEntfernung, { arMoeglich } from "./ArEntfernung.jsx";
import { useT } from "../sprache.js";

/* Grenzstammpruefung.

   Am Standpunkt zaehlt ein Baum, wenn er in Brusthoehe breiter erscheint
   als der Spalt am Zaehlstab. Bei Baeumen genau an der Grenze hilft das
   Auge nicht weiter - und raten verfaelscht die Grundflaeche, weil JEDER
   Baum den vollen Zaehlfaktor beitraegt. Bei k=4 sind das vier
   Quadratmeter je Hektar fuer eine Entscheidung.

   Deshalb: BHD kluppen, Entfernung messen, nachsehen. Mehr steckt nicht
   dahinter - r = 0,5 * BHD / Wurzel(k), hergeleitet in berechnung.js. */
export default function Grenzstamm({ zaehlfaktor }) {
  const t = useT();
  const [offen, setOffen] = useState(false);
  const [bhd, setBhd] = useState("");
  const [weite, setWeite] = useState("");
  const [arKann, setArKann] = useState(false);
  const [arOffen, setArOffen] = useState(false);

  const auf = () => {
    setOffen((o) => !o);
    arMoeglich().then(setArKann);
  };

  const radius = grenzRadius(bhd, zaehlfaktor);
  const zaehlt = zaehltMit(bhd, zaehlfaktor, weite);
  const abstand =
    radius == null
      ? null
      : Math.abs(Number(String(weite).replace(",", ".")) - radius).toFixed(2);

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
  const beschriftung = { fontSize: 10, color: farben.muted, letterSpacing: 0.6 };

  return (
    <>
      <button
        onClick={auf}
        style={{
          width: "100%",
          background: "transparent",
          border: `1px solid ${farben.line}`,
          color: farben.muted,
          borderRadius: 10,
          padding: "11px 0",
          fontSize: 13,
          marginTop: 10,
          cursor: "pointer",
        }}
      >
        {offen ? t("Grenzstamm schließen") : t("Grenzstamm prüfen")}
      </button>

      {offen && (
        <div
          style={{
            background: farben.surface,
            borderRadius: 14,
            padding: "12px 12px 14px",
            marginTop: 8,
          }}
        >
          <div style={{ fontSize: 11, color: farben.muted, lineHeight: 1.5, marginBottom: 10 }}>
            {t(
              "Für Bäume, bei denen man es nicht sieht: BHD kluppen, Entfernung zur Stammmitte messen. Zählfaktor {k} m²/ha.",
              { k: zaehlfaktor || "–" },
            )}
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={beschriftung}>{t("BHD cm")}</div>
              <input
                style={feld}
                value={bhd}
                onChange={(e) => setBhd(e.target.value)}
                inputMode="decimal"
                placeholder={t("BHD in cm")}
                aria-label={t("BHD des Grenzstamms")}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={beschriftung}>{t("ENTFERNUNG m")}</div>
              <input
                style={feld}
                value={weite}
                onChange={(e) => setWeite(e.target.value)}
                inputMode="decimal"
                placeholder={t("Entfernung in m")}
                aria-label={t("Entfernung zum Grenzstamm")}
              />
            </div>
          </div>

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
                marginTop: 10,
                cursor: "pointer",
              }}
            >
              {t("Entfernung mit AR messen")}
            </button>
          )}

          <div
            style={{
              textAlign: "center",
              border: `1px solid ${
                zaehlt == null ? farben.line : zaehlt ? farben.unverb : farben.verb
              }`,
              borderRadius: 12,
              padding: "12px 10px",
              marginTop: 12,
            }}
          >
            {radius == null ? (
              <div style={{ fontSize: 12, color: farben.muted }}>{t("BHD eintragen")}</div>
            ) : (
              <>
                <div style={beschriftung}>{t("GRENZRADIUS")}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: farben.text }}>
                  {radius.toFixed(2)} m
                </div>
                <div style={{ fontSize: 11, color: farben.muted, marginTop: 2 }}>
                  {t("Bäume innerhalb dieser Entfernung werden gezählt")}
                </div>
                {zaehlt != null && (
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      marginTop: 8,
                      color: zaehlt ? farben.unverb : farben.verb,
                    }}
                  >
                    {zaehlt ? t("zählt mit") : t("zählt nicht")}
                    <div style={{ fontSize: 11, fontWeight: 400, opacity: 0.85 }}>
                      {zaehlt
                        ? t("{m} m innerhalb der Grenze", { m: abstand })
                        : t("{m} m außerhalb der Grenze", { m: abstand })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <ArEntfernung
        offen={arOffen}
        onSchliessen={() => setArOffen(false)}
        onUebernehmen={(meter) => {
          setWeite(String(meter));
          setArOffen(false);
        }}
      />
    </>
  );
}
