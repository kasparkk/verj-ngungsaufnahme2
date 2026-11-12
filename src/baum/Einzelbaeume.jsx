import { useEffect, useState } from "react";
import { farben } from "../konfiguration.js";
import Hoehenmesser from "./Hoehenmesser.jsx";
import { zahl, volumen, auswerten, formzahlFuer } from "./berechnung.js";
import { useT, artName, zahlOrt } from "../sprache.js";
import ArtErgaenzen from "./ArtErgaenzen.jsx";
import { useEinstellungen } from "../einstellungen.js";
import { stups, FESTGEHALTEN } from "../stups.js";

const nk = (wert, stellen = 2) =>
  Number(wert).toLocaleString(zahlOrt(), { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/* Einzelbaeume: jeder Baum wird mit BHD und Hoehe auf einer abgesteckten
   Flaeche erfasst. Aufwendiger als die Winkelzaehlprobe, dafuer hat man die
   Einzelwerte. */
export default function Einzelbaeume({
  arten,
  onArtHinzu,
  flaeche,
  setFlaeche,
  formzahlen,
  formzahlStufen,
  baeume,
  setBaeume,
  setHinweis,
}) {
  const t = useT();
  const [art, setArt] = useState(arten[0].name);
  const [bhd, setBhd] = useState("");
  // Offen oder nicht; der gemessene Wert landet im Hoehenfeld darunter.
  const [misst, setMisst] = useState(false);
  const [hoehe, setHoehe] = useState("");
  /* Der zuletzt aufgenommene Baum wird kurz hervorgehoben. Im Bestand
     schaut man beim Antippen auf den Baum, nicht auf den Bildschirm -
     der Stups sagt "drin", die Markierung zeigt beim naechsten Blick,
     was drin ist. */
  const [frisch, setFrisch] = useState(null);
  const { stups: stupsAn } = useEinstellungen();

  /* Formzahl des Baums - mit seiner eigenen Hoehe nachgeschlagen, falls fuer
     die Art Hoehenstufen eingetragen sind. Ohne Stufen kommt der Grundwert
     heraus, also genau das Bisherige. */
  const formzahlVon = (name, hoeheM) => formzahlFuer(name, hoeheM, formzahlen, formzahlStufen);
  const gestaffelt = (formzahlStufen?.[art] ?? []).length > 0;

  /* Die Hoehe kommt als Wert herein, nicht aus dem Zustand: Wird der Baum
     direkt aus dem Hoehenmesser heraus aufgenommen, steht die frisch
     gemessene Hoehe noch gar nicht im Feld. */
  const hinzufuegen = (hoeheWert = hoehe) => {
    if (zahl(bhd) <= 0) {
      setHinweis(t("BHD eintragen"));
      return;
    }
    const id = `b${Date.now()}`;
    setBaeume((alle) => [
      ...alle,
      { id, art, bhd, hoehe: hoeheWert, formzahl: String(formzahlVon(art, hoeheWert)) },
    ]);
    if (stupsAn) stups(FESTGEHALTEN);
    setFrisch(id);
    // Baumart stehen lassen - meist misst man mehrere derselben Art nacheinander.
    setBhd("");
    setHoehe("");
  };

  useEffect(() => {
    if (frisch == null) return;
    const uhr = setTimeout(() => setFrisch(null), 1400);
    return () => clearTimeout(uhr);
  }, [frisch]);

  const erg = auswerten(baeume, flaeche);

  const feldStil = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${farben.line}`,
    color: farben.text,
    padding: "9px 0",
    fontSize: 16,
    width: "100%",
    outline: "none",
  };
  const beschriftung = { fontSize: 10, color: farben.muted, letterSpacing: 0.6 };
  const kennzahl = { fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" };

  return (
    <>
    <div>
      <div style={{ marginBottom: 14, maxWidth: 140 }}>
        <div style={beschriftung}>{t("FLÄCHE m²")}</div>
        <input
          style={feldStil}
          value={flaeche}
          onChange={(e) => setFlaeche(e.target.value)}
          inputMode="decimal"
          placeholder={t("Fläche in m²")}
          aria-label={t("FLÄCHE m²")}
        />
      </div>

      <div style={{ background: farben.surface, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
        <div style={{ ...beschriftung, marginBottom: 6 }}>{t("BAUMART")}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {arten.map((a) => (
            <button
              key={a.name}
              onClick={() => setArt(a.name)}
              style={{
                background: art === a.name ? farben.unverb : "transparent",
                border: `1px solid ${art === a.name ? farben.unverb : farben.line}`,
                color: art === a.name ? farben.bg : farben.muted,
                borderRadius: 999,
                /* Gross genug fuer einen Daumen (38 px hoch), schmal
                   genug, dass auf 320 px noch mehrere Arten in eine
                   Zeile passen - bei zwoelf Arten sind das sonst sieben
                   Reihen ueber der Eingabe. */
                padding: "10px 13px",
                fontSize: 14,
                fontWeight: art === a.name ? 700 : 400,
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {artName(a.name)}
            </button>
          ))}
        </div>

        {/* Etwas Luft nach unten: Ohne sie klebt die Unterkante des Feldes
            an der Beschriftung "BHD cm" darunter. */}
        <div style={{ marginBottom: 14 }}>
        <ArtErgaenzen
          onHinzu={(name) => {
            const grund = onArtHinzu(name);
            // Gleich ausgewaehlt: Wer sie eintraegt, will sie als Naechstes messen.
            if (!grund) setArt(name);
            return grund;
          }}
          setHinweis={setHinweis}
        />
        </div>

        {/* BHD und Hoehe nebeneinander, darunter die beiden Knoepfe in
            voller Breite.

            Vorher standen BHD, Hoehe, ein 📐-Knopf und ein "+" in EINER
            Zeile. Auf 320 px blieb vom Hoehenfeld ein Streifen uebrig
            ("Höhe in r"), und der Weg zur Hoehenmessung war das
            kleinste Ziel auf dem Bildschirm - obwohl er zum
            meistgebrauchten gehoert. */}
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={beschriftung}>{t("BHD cm")}</div>
            <input
              style={{ ...feldStil, fontSize: 26, fontWeight: 700 }}
              value={bhd}
              onChange={(e) => setBhd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hinzufuegen()}
              inputMode="decimal"
              placeholder={t("BHD in cm")}
              aria-label={t("BHD cm")}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={beschriftung}>{t("HÖHE m")}</div>
            <input
              style={{ ...feldStil, fontSize: 26, fontWeight: 700 }}
              value={hoehe}
              onChange={(e) => setHoehe(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && hinzufuegen()}
              inputMode="decimal"
              placeholder={t("Höhe in m")}
              aria-label={t("HÖHE m")}
            />
          </div>
        </div>

        <button
          onClick={() => setMisst(true)}
          aria-label={t("HÖHE messen")}
          style={{
            width: "100%",
            background: "transparent",
            border: `1px solid ${farben.line}`,
            color: farben.text,
            borderRadius: 12,
            padding: "13px 0",
            fontSize: 15,
            marginTop: 12,
            cursor: "pointer",
          }}
        >
          {t("📐 Höhe messen")}
        </button>

        {/* Der Knopf, der am haeufigsten getroffen werden muss, ist der
            groesste - und er sagt, was er tut. Ein blosses "+" am Rand
            war beides nicht. */}
        <button
          onClick={() => hinzufuegen()}
          style={{
            width: "100%",
            background: farben.unverb,
            border: "none",
            color: farben.bg,
            borderRadius: 14,
            padding: "16px 0",
            fontSize: 17,
            fontWeight: 700,
            marginTop: 10,
            cursor: "pointer",
          }}
        >
          {t("+ Baum aufnehmen")}
        </button>

        <div style={{ fontSize: 11, color: farben.muted, marginTop: 10, lineHeight: 1.5 }}>
          {t("Formzahl {wert} für {art}", {
            wert: nk(formzahlVon(art, hoehe), 2),
            art: artName(art),
          })}
          {gestaffelt &&
            (zahl(hoehe) > 0
              ? t(" – Höhenstufe bei {m} m", { m: nk(zahl(hoehe), 0) })
              : t(" – Grundwert, die Höhenstufe greift erst mit eingetragener Höhe"))}
        </div>
      </div>

      {erg.anzahl > 0 && (
        <div style={{ background: farben.surface, borderRadius: 14, padding: "12px 14px", marginBottom: 14 }}>
          <div style={{ ...beschriftung, marginBottom: 8 }}>
            {erg.anzahl === 1
              ? t("ERGEBNIS · {n} Baum", { n: erg.anzahl })
              : t("ERGEBNIS · {n} Bäume", { n: erg.anzahl })}
          </div>

          {erg.jeHektar ? (
            <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={kennzahl}>{nk(erg.jeHektar.vorrat, 1)}</div>
                <div style={{ fontSize: 10, color: farben.muted }}>{t("Vorrat fm/ha")}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={kennzahl}>{nk(erg.jeHektar.grundflaeche, 1)}</div>
                <div style={{ fontSize: 10, color: farben.muted }}>{t("Grundfläche m²/ha")}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={kennzahl}>{nk(erg.jeHektar.staemme, 0)}</div>
                <div style={{ fontSize: 10, color: farben.muted }}>{t("Stämme/ha")}</div>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: farben.verb, marginBottom: 10 }}>
              {t("Fläche eintragen, dann wird auf Hektar hochgerechnet.")}
            </div>
          )}

          <div style={{ fontSize: 12, color: farben.muted, lineHeight: 1.6 }}>
            {t("Summe Grundfläche {g} m² · Summe Volumen {v} fm", {
              g: nk(erg.summeG, 3),
              v: nk(erg.summeV, 3),
            })}
            <br />
            {t("Mittelhöhe {h} m · Grundflächenmittelstamm {d} cm", {
              h: nk(erg.mittelHoehe, 1),
              d: nk(erg.dg, 1),
            })}
          </div>
        </div>
      )}

      {baeume.length > 0 && (
        <div style={{ border: `1px solid ${farben.line}`, borderRadius: 10, overflow: "hidden" }}>
          {baeume.map((b, i) => (
            <div
              key={b.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 10px",
                borderTop: i === 0 ? "none" : `1px solid ${farben.line}`,
                fontSize: 14,
                /* Der zuletzt aufgenommene Baum bleibt kurz markiert. */
                background: b.id === frisch ? farben.surfaceHi : "transparent",
                transition: "background 400ms",
              }}
            >
              <div style={{ width: 22, color: farben.muted, fontVariantNumeric: "tabular-nums" }}>{i + 1}</div>
              <div style={{ flex: 1, fontWeight: 600, minWidth: 0 }}>{artName(b.art)}</div>
              <div style={{ fontVariantNumeric: "tabular-nums", color: farben.muted }}>
                {nk(zahl(b.bhd), 0)} cm · {nk(zahl(b.hoehe), 0)} m
              </div>
              <div style={{ fontVariantNumeric: "tabular-nums", width: 62, textAlign: "right" }}>
                {nk(volumen(b.bhd, b.hoehe, b.formzahl), 3)}
              </div>
              <button
                onClick={() => setBaeume((alle) => alle.filter((x) => x.id !== b.id))}
                aria-label={t("Baum entfernen")}
                style={{
                  background: "none",
                  border: "none",
                  color: farben.muted,
                  fontSize: 18,
                  cursor: "pointer",
                  padding: "0 2px",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>

      {/* Steht der BHD schon da, ist der Baum mit dem Übernehmen fertig -
          das zweite Antippen von "+ Baum aufnehmen" sagte nichts mehr
          dazu. Fehlt der BHD, landet die Höhe wie bisher nur im Feld:
          Ohne ihn gibt es keinen Baum, den man aufnehmen koennte. */}
      <Hoehenmesser
        offen={misst}
        onSchliessen={() => setMisst(false)}
        uebernehmenText={zahl(bhd) > 0 ? t("Übernehmen & aufnehmen") : undefined}
        onUebernehmen={(wert) => {
          // Mit Komma, wie alles andere im deutschen Bildschirm auch.
          const text = nk(wert, 1);
          setHoehe(text);
          setMisst(false);
          if (zahl(bhd) > 0) hinzufuegen(text);
        }}
      />
    </>
  );
}
