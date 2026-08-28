import { useState } from "react";
import { farben } from "../konfiguration.js";
import {
  BAUMARTEN, BZT_LISTE, MISCHUNG, SCHICHTUNG, STRUKTUR, VERBISSZIEL_STUFEN,
  VERTEILUNG, KRONENSCHLUSS, BODENVEGETATION, BODENVEGETATIONSTYP, BODENGARE,
  artNach,
} from "./stammdaten.js";
import {
  probekreisflaeche, zielProfil, aktiverBzt, verjuengungsfreundlich, giltAlsVerlegt,
} from "./berechnung.js";
import { nachUtm33, ausUtm33, entfernung, peilung, himmelsrichtung } from "../utm33.js";
import { Abschnitt, Feld, TextFeld, AuswahlFeld, KnopfWahl, JaNein, beschriftung } from "./Felder.jsx";

const nk = (wert, stellen = 1) =>
  Number(wert).toLocaleString("de-DE", {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  });

/* Ein errechneter Wert. Nichts hier ist eintippbar - das ist Absicht: was
   die App ausrechnet, soll niemand im Gelaende versehentlich ueberschreiben. */
function AutoFeld({ titel, wert, hinweis }) {
  return (
    <Feld titel={titel} hinweis={hinweis}>
      <div
        style={{
          background: farben.surface,
          border: `1px solid ${farben.line}`,
          borderRadius: 10,
          padding: "10px 11px",
          fontSize: 15,
          color: wert ? farben.text : farben.muted,
          fontWeight: wert ? 600 : 400,
        }}
      >
        {wert || "— ergibt sich aus den Angaben darüber —"}
      </div>
    </Feld>
  );
}

export default function Kopf({ punkt, aendere, setHinweis }) {
  const [gpsLaeuft, setGpsLaeuft] = useState(false);
  const [artOffen, setArtOffen] = useState(false);
  const [stabOffen, setStabOffen] = useState(false);
  const [stab, setStab] = useState({ x: "", y: "", genau: "" });
  // Ergebnis des letzten Peilens zum Sollpunkt - bewusst nicht gespeichert,
  // es gilt nur fuer den Augenblick, in dem man dort steht.
  const [peil, setPeil] = useState(null);

  const setzeBeschreibung = (feld) => (wert) =>
    aendere((p) => ({ ...p, beschreibung: { ...p.beschreibung, [feld]: wert } }));
  const setzeReferenz = (feld) => (wert) =>
    aendere((p) => ({ ...p, referenz: { ...p.referenz, [feld]: wert } }));
  const setzeFeld = (feld) => (wert) => aendere((p) => ({ ...p, [feld]: wert }));

  const orten = () => {
    if (!navigator.geolocation) {
      setHinweis("Kein GPS auf diesem Gerät");
      return;
    }
    setGpsLaeuft(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLaeuft(false);
        aendere((p) => ({
          ...p,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          genauigkeit: pos.coords.accuracy,
          quelle: "geraet",
          verlegt:
            giltAlsVerlegt(
              p.sollLat, p.sollLon,
              pos.coords.latitude, pos.coords.longitude,
              p.radius, pos.coords.accuracy,
            ) ?? p.verlegt,
        }));
      },
      () => {
        setGpsLaeuft(false);
        setHinweis("Standort nicht verfügbar");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  /* Uebernimmt die am Messstab abgelesene Koordinate. Gerechnet wird
     intern in Laenge und Breite, damit Karte, Entfernung und Export
     dieselbe Grundlage haben wie eine Handy-Messung. */
  const stabUebernehmen = () => {
    const x = parseFloat(String(stab.x).replace(",", "."));
    const y = parseFloat(String(stab.y).replace(",", "."));
    const grad = ausUtm33(x, y);
    if (!grad) {
      setHinweis("Rechts- und Hochwert prüfen (UTM 33N)");
      return;
    }
    const genau = parseFloat(String(stab.genau).replace(",", "."));
    aendere((p) => ({
      ...p,
      lat: grad.breite,
      lon: grad.laenge,
      genauigkeit: Number.isFinite(genau) ? genau : null,
      quelle: "stab",
      verlegt:
        giltAlsVerlegt(
          p.sollLat, p.sollLon, grad.breite, grad.laenge,
          p.radius, Number.isFinite(genau) ? genau : 0,
        ) ?? p.verlegt,
    }));
    setStabOffen(false);
    setStab({ x: "", y: "", genau: "" });
    setHinweis("Koordinate vom Messstab übernommen");
  };

  /* Peilung zum Sollpunkt: einmal messen, Entfernung und Richtung anzeigen.
     Kein Dauerbetrieb - eine laufende Ortung leert im Bestand den Akku,
     ohne genauer zu werden. */
  const peilen = () => {
    if (!navigator.geolocation) {
      setHinweis("Kein GPS auf diesem Gerät");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setPeil({
          m: entfernung(pos.coords.latitude, pos.coords.longitude, punkt.sollLat, punkt.sollLon),
          grad: peilung(pos.coords.latitude, pos.coords.longitude, punkt.sollLat, punkt.sollLon),
          genau: pos.coords.accuracy,
        }),
      () => setHinweis("Standort nicht verfügbar"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const utm = punkt.lat != null && punkt.lon != null ? nachUtm33(punkt.lat, punkt.lon) : null;
  const sollUtm =
    punkt.sollLat != null && punkt.sollLon != null ? nachUtm33(punkt.sollLat, punkt.sollLon) : null;
  const abweichung =
    punkt.lat != null && punkt.sollLat != null
      ? {
          m: entfernung(punkt.sollLat, punkt.sollLon, punkt.lat, punkt.lon),
          grad: peilung(punkt.sollLat, punkt.sollLon, punkt.lat, punkt.lon),
        }
      : null;

  const aktive = BAUMARTEN.filter((a) => punkt.arten[a.kuerzel]?.aktiv);
  const offene = BAUMARTEN.filter((a) => !punkt.arten[a.kuerzel]?.aktiv);

  const setzeArt = (kuerzel, wie) =>
    aendere((p) => ({
      ...p,
      arten: { ...p.arten, [kuerzel]: { ...p.arten[kuerzel], ...wie } },
    }));

  return (
    <div>
      <Abschnitt titel="A — Allgemeine Aufnahmedaten">
        <Feld titel="Name Monitorer/in">
          <TextFeld wert={punkt.monitorer} setWert={setzeFeld("monitorer")} platzhalter="Vor- und Nachname" />
        </Feld>
        <Feld titel="Untersuchungsgebiet">
          <TextFeld wert={punkt.gebiet} setWert={setzeFeld("gebiet")} platzhalter="FB Gebersdorf" />
        </Feld>
        <Feld titel="Datum">
          <input
            type="date"
            value={punkt.datum ?? ""}
            onChange={(e) => e.target.value && setzeFeld("datum")(e.target.value)}
            style={{
              width: "100%", boxSizing: "border-box", background: farben.surfaceHi,
              border: `1px solid ${farben.line}`, borderRadius: 10, color: farben.text,
              padding: "10px 11px", fontSize: 16, outline: "none",
            }}
          />
        </Feld>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Feld titel="Probekreis-Radius (m)">
              <TextFeld wert={punkt.radius} setWert={setzeFeld("radius")} platzhalter="5" inputMode="decimal" />
            </Feld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <AutoFeld
              titel="Probekreisfläche (m²)"
              wert={probekreisflaeche(punkt.radius) ? nk(probekreisflaeche(punkt.radius)) : ""}
            />
          </div>
        </div>

        {/* Sollpunkt anlaufen */}
        {punkt.sollLat != null && (
          <Feld titel="Sollpunkt">
            <div style={{ fontSize: 12, color: farben.muted, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
              {sollUtm ? `X ${nk(sollUtm.x, 2)} · Y ${nk(sollUtm.y, 2)}` : ""}
            </div>
            <button
              onClick={peilen}
              style={{
                width: "100%", background: "transparent", border: `1px solid ${farben.line}`,
                borderRadius: 10, color: farben.text, padding: "12px 11px", fontSize: 14,
                cursor: "pointer", textAlign: "left",
              }}
            >
              {peil
                ? `➤ noch ${nk(peil.m, 0)} m Richtung ${himmelsrichtung(peil.grad)} (${nk(peil.grad, 0)}°)`
                : "➤ Entfernung und Richtung zum Sollpunkt"}
            </button>
            {peil && (
              <div style={{ fontSize: 10, color: farben.muted, marginTop: 4 }}>
                Vom Handy gemessen, ±{Math.round(peil.genau)} m. Zum Anlaufen reicht das;
                die genaue Lage kommt vom Messstab.
              </div>
            )}
          </Feld>
        )}

        {/* Ist-Position */}
        <Feld titel="Ist-Position">
          <button
            onClick={orten}
            style={{
              width: "100%", background: farben.surfaceHi, border: `1px solid ${farben.line}`,
              borderRadius: 10, color: farben.text, padding: "13px 11px", fontSize: 15,
              cursor: "pointer", textAlign: "left",
            }}
          >
            {gpsLaeuft
              ? "📍 Position wird gesucht …"
              : punkt.lat != null
                ? `📍 ${punkt.lat.toFixed(6)}, ${punkt.lon.toFixed(6)}` +
                  (punkt.genauigkeit != null ? `  ±${nk(punkt.genauigkeit, 2)} m` : "")
                : "📍 Mit dem Handy erfassen"}
          </button>

          {utm && (
            <div style={{ fontSize: 11, color: farben.muted, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
              ETRS89 / UTM 33N: X {nk(utm.x, 2)} · Y {nk(utm.y, 2)}
              {punkt.quelle === "stab" ? " · vom Messstab" : punkt.quelle === "geraet" ? " · vom Handy" : ""}
            </div>
          )}

          {/* Der Messstab liefert Zentimeter, das Handy Meter. Wer den Stab
              dabei hat, traegt dessen Rechts- und Hochwert hier ein - dann
              steht in den Daten die genaue Lage und nicht die ungefaehre. */}
          {stabOffen ? (
            <div style={{ marginTop: 8, border: `1px solid ${farben.line}`, borderRadius: 10, padding: 10 }}>
              <div style={{ ...beschriftung, marginBottom: 6 }}>Vom Messstab (UTM 33N)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TextFeld wert={stab.x} setWert={(w) => setStab((a) => ({ ...a, x: w }))} platzhalter="Rechtswert" inputMode="decimal" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TextFeld wert={stab.y} setWert={(w) => setStab((a) => ({ ...a, y: w }))} platzhalter="Hochwert" inputMode="decimal" />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <TextFeld wert={stab.genau} setWert={(w) => setStab((a) => ({ ...a, genau: w }))} platzhalter="Genauigkeit m" inputMode="decimal" />
                </div>
                <button onClick={stabUebernehmen} style={{
                  flex: 1, background: farben.unverb, border: "none", color: farben.bg,
                  borderRadius: 10, padding: "10px 0", fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}>
                  Übernehmen
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setStabOffen(true)}
              style={{
                marginTop: 6, background: "transparent", border: `1px dashed ${farben.line}`,
                color: farben.muted, borderRadius: 8, padding: "9px 12px", fontSize: 13, cursor: "pointer",
              }}
            >
              Koordinate vom Messstab eintragen …
            </button>
          )}

          {abweichung && (
            <div style={{ fontSize: 11, color: punkt.verlegt ? farben.verb : farben.muted, marginTop: 6 }}>
              {nk(abweichung.m, 1)} m {himmelsrichtung(abweichung.grad)} vom Sollpunkt
              {punkt.verlegt ? " · als verlegt vermerkt" : ""}
            </div>
          )}
          {punkt.lat != null && (
            <button
              onClick={() => aendere((p) => ({ ...p, verlegt: !p.verlegt }))}
              style={{
                marginTop: 6, background: "transparent", border: `1px solid ${farben.line}`,
                color: farben.muted, borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer",
              }}
            >
              {punkt.verlegt ? "✓ als verlegt vermerkt" : "Punkt als verlegt vermerken"}
            </button>
          )}
        </Feld>

        <Feld titel="Hauptbestand / BZT">
          <AuswahlFeld wert={punkt.bzt} setWert={setzeFeld("bzt")} werte={BZT_LISTE} />
        </Feld>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Feld titel="Man. ZB1">
              <AuswahlFeld wert={punkt.manZb1} setWert={setzeFeld("manZb1")} werte={BAUMARTEN.map((a) => a.kuerzel)} leerText="—" />
            </Feld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Feld titel="Man. ZB2">
              <AuswahlFeld wert={punkt.manZb2} setWert={setzeFeld("manZb2")} werte={BAUMARTEN.map((a) => a.kuerzel)} leerText="—" />
            </Feld>
          </div>
        </div>
        <AutoFeld
          titel="► Aktiver BZT"
          wert={aktiverBzt(punkt.bzt, punkt.manZb1, punkt.manZb2)}
          hinweis="Eine manuelle Zielbaumart überschreibt den Standard-BZT."
        />
      </Abschnitt>

      <Abschnitt
        titel="Referenzbaum zur Punktverortung"
        hinweis="Kein geeigneter Referenzbaum vorhanden? Unter „Bemerkungen“ vermerken."
      >
        <Feld titel="Baumart">
          <AuswahlFeld wert={punkt.referenz.art} setWert={setzeReferenz("art")} werte={BAUMARTEN.map((a) => a.name)} />
        </Feld>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Feld titel="BHD (cm)">
              <TextFeld wert={punkt.referenz.bhd} setWert={setzeReferenz("bhd")} platzhalter="47,8" inputMode="decimal" />
            </Feld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Feld titel="Winkel (gon)" hinweis="0–400">
              <TextFeld wert={punkt.referenz.winkel} setWert={setzeReferenz("winkel")} platzhalter="245" inputMode="decimal" />
            </Feld>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Feld titel="Abstand (m)">
              <TextFeld wert={punkt.referenz.abstand} setWert={setzeReferenz("abstand")} platzhalter="4,64" inputMode="decimal" />
            </Feld>
          </div>
        </div>
      </Abschnitt>

      <Abschnitt
        titel="B — Ziel-Profil & Verbissziel"
        hinweis="VZ1 tolerierbar · VZ2 kritisch · VZ3 nicht akzeptabel"
      >
        <Feld titel="Ziel-Mischung">
          <AuswahlFeld wert={punkt.mix} setWert={setzeFeld("mix")} werte={MISCHUNG} />
        </Feld>
        <Feld titel="Ziel-Schichtung">
          <AuswahlFeld wert={punkt.schicht} setWert={setzeFeld("schicht")} werte={SCHICHTUNG} />
        </Feld>
        <Feld titel="Ziel-Struktur horizontal">
          <AuswahlFeld wert={punkt.struktur} setWert={setzeFeld("struktur")} werte={STRUKTUR} />
        </Feld>
        <AutoFeld titel="Ziel-Profil" wert={zielProfil(punkt.mix, punkt.schicht, punkt.struktur)} />

        <Feld titel="Verbissziel ZB1 (Haupt-Zielbaumart)" hinweis="VZ1 ≤ 20 % · VZ2 ≤ 35 %">
          <KnopfWahl wert={punkt.vzZb1} setWert={setzeFeld("vzZb1")} werte={VERBISSZIEL_STUFEN} spalten={3} />
        </Feld>
        <Feld titel="Verbissziel ZB2 (Struktur-/Nebenbaumart)" hinweis="VZ1 ≤ 25 % · VZ2 ≤ 40 %">
          <KnopfWahl wert={punkt.vzZb2} setWert={setzeFeld("vzZb2")} werte={VERBISSZIEL_STUFEN} spalten={3} />
        </Feld>
      </Abschnitt>

      <Abschnitt titel="C — Bestandesbeschreibung">
        <Feld titel="Verjüngungsverteilung">
          <KnopfWahl wert={punkt.beschreibung.verteilung} setWert={setzeBeschreibung("verteilung")} werte={VERTEILUNG} spalten={2} />
        </Feld>
        <Feld titel="Kronenschluss">
          <KnopfWahl wert={punkt.beschreibung.kronenschluss} setWert={setzeBeschreibung("kronenschluss")} werte={KRONENSCHLUSS} spalten={2} />
        </Feld>
        <Feld titel="Bodenvegetation">
          <KnopfWahl wert={punkt.beschreibung.bodenvegetation} setWert={setzeBeschreibung("bodenvegetation")} werte={BODENVEGETATION} spalten={4} />
        </Feld>
        <Feld titel="Bodenvegetationstyp" hinweis="Bis zu drei Angaben.">
          <div style={{ display: "flex", gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ flex: 1, minWidth: 0 }}>
                <AuswahlFeld
                  wert={punkt.beschreibung.bvTyp[i] ?? ""}
                  setWert={(w) =>
                    aendere((p) => {
                      const bvTyp = [...p.beschreibung.bvTyp];
                      bvTyp[i] = w;
                      return { ...p, beschreibung: { ...p.beschreibung, bvTyp } };
                    })
                  }
                  werte={BODENVEGETATIONSTYP}
                  leerText="—"
                />
              </div>
            ))}
          </div>
        </Feld>
        <Feld titel="Bodengare">
          <KnopfWahl wert={punkt.beschreibung.bodengare} setWert={setzeBeschreibung("bodengare")} werte={BODENGARE} spalten={3} />
        </Feld>
        <Feld titel="Samenbäume vorhanden">
          <JaNein wert={punkt.beschreibung.samenbaeume} setWert={setzeBeschreibung("samenbaeume")} />
        </Feld>
        <Feld titel="Randeffekte">
          <JaNein wert={punkt.beschreibung.randeffekte} setWert={setzeBeschreibung("randeffekte")} />
        </Feld>
        <Feld titel="Hasenverbiss signifikant" hinweis="Erkennbar am glatten Schrägschnitt.">
          <JaNein wert={punkt.beschreibung.hasenverbiss} setWert={setzeBeschreibung("hasenverbiss")} />
        </Feld>
        <Feld titel="Zäune / Weisergatter">
          <JaNein wert={punkt.beschreibung.zaeune} setWert={setzeBeschreibung("zaeune")} />
        </Feld>
        <Feld titel="Bemerkungen">
          <TextFeld wert={punkt.beschreibung.bemerkungen} setWert={setzeBeschreibung("bemerkungen")} platzhalter="Besondere Beobachtungen" mehrzeilig />
        </Feld>
        <AutoFeld
          titel="Verjüngungsfreundlich"
          wert={verjuengungsfreundlich(punkt.beschreibung)}
          hinweis="Aus Kronenschluss, Bodenvegetation, Bodengare, Samenbäumen, Randeffekten und Hasenverbiss."
        />
      </Abschnitt>

      <Abschnitt
        titel="D — Zielbaumarten"
        hinweis="Nur aktive Baumarten stehen bei der Pflanzenaufnahme zur Wahl. ZB1 = Haupt-Zielbaumart, ZB2 = Struktur-/Nebenbaumart, BW = Begleiter."
      >
        {aktive.map((a) => (
          <div
            key={a.kuerzel}
            style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
              background: farben.surface, borderRadius: 10, padding: "8px 10px",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 10, color: farben.muted }}>
                {a.kuerzel} · {a.typ}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["ZB1", "ZB2", "BW"].map((r) => {
                const gewaehlt = punkt.arten[a.kuerzel]?.rolle === r;
                return (
                  <button
                    key={r}
                    onClick={() => setzeArt(a.kuerzel, { rolle: r })}
                    style={{
                      background: gewaehlt ? farben.unverb : "transparent",
                      border: `1px solid ${gewaehlt ? farben.unverb : farben.line}`,
                      color: gewaehlt ? farben.bg : farben.muted,
                      borderRadius: 8, padding: "7px 8px", fontSize: 12,
                      fontWeight: gewaehlt ? 700 : 400, cursor: "pointer",
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setzeArt(a.kuerzel, { aktiv: false })}
              aria-label={`${a.name} deaktivieren`}
              style={{
                background: "none", border: "none", color: farben.muted,
                fontSize: 18, cursor: "pointer", padding: "0 2px",
              }}
            >
              ×
            </button>
          </div>
        ))}

        {!aktive.length && (
          <div style={{ fontSize: 12, color: farben.verb, marginBottom: 8 }}>
            Noch keine Baumart aktiv — ohne aktive Baumart lässt sich keine Pflanze aufnehmen.
          </div>
        )}

        {artOffen ? (
          <AuswahlFeld
            wert=""
            setWert={(k) => {
              if (k) setzeArt(k, { aktiv: true });
              setArtOffen(false);
            }}
            werte={offene.map((a) => ({ wert: a.kuerzel, text: a.name }))}
            leerText="— Baumart wählen —"
          />
        ) : (
          <button
            onClick={() => setArtOffen(true)}
            style={{
              width: "100%", background: "transparent", border: `1px dashed ${farben.line}`,
              color: farben.muted, borderRadius: 10, padding: "11px 0", fontSize: 13, cursor: "pointer",
            }}
          >
            + Baumart aktivieren
          </button>
        )}
      </Abschnitt>
    </div>
  );
}
