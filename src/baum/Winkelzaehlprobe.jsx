import { useState } from "react";
import { farben } from "../konfiguration.js";
import Hoehenmesser from "./Hoehenmesser.jsx";
import Grenzstamm from "./Grenzstamm.jsx";
import { ZAEHLFAKTOREN, zahl, wzpAuswerten } from "./berechnung.js";
import { leereArt } from "./speicher.js";
import ZaehlBox from "../komponenten/ZaehlBox.jsx";
import { useT, artName, zahlOrt } from "../sprache.js";
import ArtErgaenzen from "./ArtErgaenzen.jsx";
import { useEinstellungen } from "../einstellungen.js";
import { stups, FESTGEHALTEN, GEZAEHLT } from "../stups.js";

const nk = (wert, stellen = 1) =>
  Number(wert).toLocaleString(zahlOrt(), {
    minimumFractionDigits: stellen,
    maximumFractionDigits: stellen,
  });

/* Liste gemessener Werte (Hoehen bzw. Durchmesser) mit Mittelwert.

   Eintippen genuegt: Der Wert wandert in die Liste, sobald das Feld die
   Eingabe verlaesst - beim Tippen irgendwohin, beim Schliessen der
   Tastatur, beim Wechsel ins Nachbarfeld. Das + und die Eingabetaste tun
   dasselbe und bleiben fuer alle, die sie gewohnt sind.

   Gemeldet als "man muss das Plus druecken, um den Wert zu speichern" -
   und auf dem Handy ist das kein Nebensaechliches: Eine Zahlentastatur
   hat gar keine Eingabetaste, das + war also der einzige Weg.

   Ein versehentlich eingetragener Wert kostet einen Tipp: Jeder Wert in
   der Liste ist ein Knopf, der ihn wieder herausnimmt. */
function WerteFeld({
  titel,
  einheit,
  werte,
  entwurf,
  setEntwurf,
  onHinzu,
  onWeg,
  mittelwert,
  mittelText,
  onMessen,
}) {
  const t = useT();
  const feldStil = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${farben.line}`,
    color: farben.text,
    padding: "9px 0",
    fontSize: 18,
    fontWeight: 700,
    outline: "none",
    flex: 1,
    minWidth: 0,
  };

  return (
    <div
      style={{
        flex: 1,
        // Ohne dies waechst das Feld auf seine Inhaltsbreite und schiebt die
        // Seite ueber den Bildschirmrand hinaus.
        minWidth: 0,
        background: farben.surfaceHi,
        border: `1px solid ${farben.line}`,
        borderRadius: 12,
        padding: "8px 10px",
      }}
    >
      <div style={{ fontSize: 10, color: farben.muted, letterSpacing: 0.6 }}>
        {titel} {einheit}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <input
          style={feldStil}
          value={entwurf}
          onChange={(e) => setEntwurf(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onHinzu()}
          onBlur={() => onHinzu()}
          inputMode="decimal"
          /* Kurz: Die Spalte ist auf einem Handy keine 180 px breit, und
             darueber steht ohnehin, was hier hineingehoert. Der lange
             Hinweis wurde mittendrin abgeschnitten. */
          placeholder={t("eintragen")}
          aria-label={t("{was} eintragen", { was: `${titel} ${einheit}` })}
        />
        <button
          onClick={onHinzu}
          aria-label={t("{was} eintragen", { was: `${titel} ${einheit}` }) + " +"}
          style={{
            background: farben.surface,
            border: `1px solid ${farben.line}`,
            color: farben.text,
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          +
        </button>
      </div>

      {/* Der Weg zum Hoehenmesser steht in voller Breite unter dem Feld:
          neben dem + blieben dem Eingabefeld keine 90 px, und der
          Platzhalter wurde mittendrin abgeschnitten. */}
      {onMessen && (
        <button
          onClick={onMessen}
          aria-label={t("{was} messen", { was: titel })}
          style={{
            width: "100%",
            marginTop: 8,
            background: farben.surface,
            border: `1px solid ${farben.line}`,
            color: farben.text,
            borderRadius: 8,
            padding: "10px 0",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {t("📐 messen")}
        </button>
      )}

      {werte.length > 0 && (
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}
        >
          {werte.map((w, i) => (
            <button
              key={i}
              onClick={() => onWeg(i)}
              style={{
                background: "transparent",
                border: `1px solid ${farben.line}`,
                color: farben.muted,
                borderRadius: 999,
                /* Man tippt sie nicht nur aus Versehen an, sondern auch
                   absichtlich: Ein Vertipper wird hier geheilt. */
                padding: "7px 11px",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {w} ×
            </button>
          ))}
        </div>
      )}

      {mittelwert > 0 && (
        <div style={{ fontSize: 12, color: farben.muted, marginTop: 7 }}>
          {mittelText}
        </div>
      )}
    </div>
  );
}

/* Winkelzaehlprobe: am Standpunkt einmal im Kreis drehen und jeden Baum
   zaehlen, der breiter erscheint als der Spalt am Zaehlstab. */
export default function Winkelzaehlprobe({
  arten,
  onArtHinzu,
  alter,
  wzp,
  setWzp,
  formzahlen,
  formzahlStufen,
  setHinweis,
}) {
  const t = useT();
  const [neueHoehe, setNeueHoehe] = useState({});
  const [neuerDm, setNeuerDm] = useState({});
  /* Fuer welche Baumart der Hoehenmesser offen ist. Der gemessene Wert
     geht direkt in die Liste dieser Art: "Übernehmen" IST die
     Bestaetigung, ein zweites Antippen von + war nur ein zweiter Weg,
     dasselbe zu sagen. Verworfen wird er wie jeder andere Wert - der
     Wert in der Liste ist ein Knopf, der ihn herausnimmt. */
  const [messenFuer, setMessenFuer] = useState(null);
  const { stups: stupsAn } = useEinstellungen();

  /* Das Alter oben gilt als Vorgabe; je Baumart laesst es sich ueberschreiben. */
  const erg = wzpAuswerten(wzp.arten, wzp.zaehlfaktor, formzahlen, alter, formzahlStufen);

  /* Die drei Werte, die der Ertragstafel-Rechner der Landesforst braucht.
     Vorausfuellen per Link geht dort nicht - der Rechner nimmt keine Werte
     ueber die Adresse entgegen -, deshalb stehen sie hier zum Ablesen und
     Kopieren beieinander. */
  const kopieren = async (a) => {
    /* Die Zeile bleibt deutsch, auch im englischen Bildschirm: Sie wird in
       den Ertragstafel-Rechner der Landesforst Brandenburg eingetragen, und
       der ist deutsch. */
    const zeile =
      `${a.name} · Alter ${a.alterJahre || "?"} Jahre · Mittelhöhe ${nk(a.mittelHoehe, 1)} m` +
      ` · Grundfläche ${nk(a.gHa, 0)} m²/ha`;
    try {
      await navigator.clipboard.writeText(zeile);
      setHinweis(t("Kopiert"));
    } catch {
      setHinweis(t("Kopieren hier nicht möglich – Werte abtippen"));
    }
  };

  const aendere = (id, wie) =>
    setWzp((alt) => ({
      ...alt,
      arten: alt.arten.map((a) => (a.id === id ? wie(a) : a)),
    }));

  const hoeheHinzu = (id) => {
    const wert = (neueHoehe[id] ?? "").trim();
    if (zahl(wert) <= 0) return;
    aendere(id, (a) => ({ ...a, hoehen: [...a.hoehen, wert] }));
    setNeueHoehe((alt) => ({ ...alt, [id]: "" }));
    if (stupsAn) stups(GEZAEHLT);
  };

  const hoeheWeg = (id, i) =>
    aendere(id, (a) => ({ ...a, hoehen: a.hoehen.filter((_, j) => j !== i) }));

  const dmHinzu = (id) => {
    const wert = (neuerDm[id] ?? "").trim();
    if (zahl(wert) <= 0) return;
    aendere(id, (a) => ({
      ...a,
      durchmesser: [...(a.durchmesser ?? []), wert],
    }));
    setNeuerDm((alt) => ({ ...alt, [id]: "" }));
    if (stupsAn) stups(GEZAEHLT);
  };

  const dmWeg = (id, i) =>
    aendere(id, (a) => ({
      ...a,
      durchmesser: (a.durchmesser ?? []).filter((_, j) => j !== i),
    }));

  const artWeg = (id) => {
    const art = wzp.arten.find((a) => a.id === id);
    if (
      art &&
      (art.anzahl > 0 || art.hoehen.length || (art.durchmesser ?? []).length)
    ) {
      setHinweis(t("Erst Zähler auf 0 setzen"));
      return;
    }
    setWzp((alt) => ({ ...alt, arten: alt.arten.filter((a) => a.id !== id) }));
  };

  const feldStil = {
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${farben.line}`,
    color: farben.text,
    padding: "4px 0",
    fontSize: 14,
    outline: "none",
  };
  const beschriftung = {
    fontSize: 10,
    color: farben.muted,
    letterSpacing: 0.6,
  };

  const offeneArten = arten.filter((b) => !wzp.arten.some((a) => a.name === b.name));

  return (
    <>
    <div>
      {/* Zaehlfaktor */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ ...beschriftung, marginBottom: 6 }}>{t("ZÄHLFAKTOR m²/ha")}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {ZAEHLFAKTOREN.map((k) => (
            <button
              key={k}
              onClick={() => setWzp((alt) => ({ ...alt, zaehlfaktor: k }))}
              /* Welcher Faktor gilt, sagt bisher nur die Farbe. Eine
                 Vorlesehilfe sieht keine Farbe - und eine Pruefung auch
                 nicht. */
              aria-pressed={wzp.zaehlfaktor === k}
              style={{
                flex: 1,
                background:
                  wzp.zaehlfaktor === k ? farben.unverb : "transparent",
                border: `1px solid ${wzp.zaehlfaktor === k ? farben.unverb : farben.line}`,
                color: wzp.zaehlfaktor === k ? farben.bg : farben.muted,
                borderRadius: 10,
                padding: "10px 0",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Ergebnis */}
      <Grenzstamm zaehlfaktor={wzp.zaehlfaktor} />

      {erg.gesamt.anzahl > 0 && (
        <div
          style={{
            background: farben.surface,
            borderRadius: 14,
            padding: "12px 14px",
            marginBottom: 14,
          }}
        >
          <div style={{ ...beschriftung, marginBottom: 8 }}>
            {t("ERGEBNIS · {n} gezählte Bäume", { n: erg.gesamt.anzahl })}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {nk(erg.gesamt.gHa, 0)}
              </div>
              <div style={{ fontSize: 10, color: farben.muted }}>
                {t("Grundfläche m²/ha")}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {erg.gesamt.vHa > 0 ? nk(erg.gesamt.vHa, 0) : "–"}
              </div>
              <div style={{ fontSize: 10, color: farben.muted }}>{t("Vorrat fm/ha")}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {erg.gesamt.nHa > 0 ? nk(erg.gesamt.nHa, 0) : "–"}
              </div>
              <div style={{ fontSize: 10, color: farben.muted }}>{t("Stämme/ha")}</div>
            </div>
          </div>
          {erg.gesamt.vHa === 0 && (
            <div style={{ fontSize: 11, color: farben.verb, marginTop: 8 }}>
              {t("Für den Vorrat fehlt noch mindestens eine gemessene Höhe.")}
            </div>
          )}
        </div>
      )}

      {/* Je Baumart */}
      {wzp.arten.map((a) => {
        const z = erg.jeArt.find((x) => x.id === a.id);
        return (
          <div key={a.id} style={{ marginBottom: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 600 }}>{artName(a.name)}</div>
              <button
                onClick={() => artWeg(a.id)}
                style={{
                  background: "none",
                  border: "none",
                  color:
                    a.anzahl > 0 ||
                    a.hoehen.length ||
                    (a.durchmesser ?? []).length
                      ? farben.line
                      : farben.muted,
                  fontSize: 12,
                  padding: "9px 4px",
                  cursor:
                    a.anzahl > 0 ||
                    a.hoehen.length ||
                    (a.durchmesser ?? []).length
                      ? "default"
                      : "pointer",
                }}
              >
                {t("entfernen")}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <ZaehlBox
                label={t("gezählt")}
                wert={a.anzahl}
                farbe={farben.unverb}
                onPlus={() =>
                  aendere(a.id, (x) => ({ ...x, anzahl: x.anzahl + 1 }))
                }
                onMinus={() =>
                  aendere(a.id, (x) => ({
                    ...x,
                    anzahl: Math.max(0, x.anzahl - 1),
                  }))
                }
                onSet={(n) =>
                  aendere(a.id, (x) => ({ ...x, anzahl: Math.max(0, n) }))
                }
                gross
              />

              <div style={{ display: "flex", gap: 10 }}>
                <WerteFeld
                  titel={t("HÖHEN")}
                  einheit="m"
                  werte={a.hoehen}
                  entwurf={neueHoehe[a.id] ?? ""}
                  setEntwurf={(w) =>
                    setNeueHoehe((alt) => ({ ...alt, [a.id]: w }))
                  }
                  onHinzu={() => hoeheHinzu(a.id)}
                  onWeg={(i) => hoeheWeg(a.id, i)}
                  onMessen={() => setMessenFuer(a.id)}
                  mittelwert={z.mittelHoehe}
                  mittelText={t("Mittel {h} m", { h: nk(z.mittelHoehe, 1) })}
                />
                <WerteFeld
                  titel={t("BHD")}
                  einheit="cm"
                  werte={a.durchmesser ?? []}
                  entwurf={neuerDm[a.id] ?? ""}
                  setEntwurf={(w) =>
                    setNeuerDm((alt) => ({ ...alt, [a.id]: w }))
                  }
                  onHinzu={() => dmHinzu(a.id)}
                  onWeg={(i) => dmWeg(a.id, i)}
                  mittelwert={z.dg}
                  mittelText={t("Mittelstamm {d} cm", { d: nk(z.dg, 1) })}
                />
              </div>
            </div>

            {z.anzahl > 0 && (
              <>
                <div
                  style={{
                    fontSize: 12,
                    color: farben.muted,
                    marginTop: 6,
                    lineHeight: 1.5,
                  }}
                >
                  {t("{g} m²/ha", { g: z.gHa })}
                  {z.vHa > 0
                    ? t(" · {v} fm/ha (Formzahl {f})", {
                        v: nk(z.vHa, 0),
                        f: nk(z.formzahl, 2),
                      })
                    : ""}
                  {z.nHa > 0 && (
                    <>
                      <br />
                      {t("{n} Stämme/ha · Mittelstamm {d} cm", {
                        n: nk(z.nHa, 0),
                        d: nk(z.dg, 1),
                      })}
                      {z.vMittelstamm > 0
                        ? t(" mit {v} fm", { v: nk(z.vMittelstamm, 2) })
                        : ""}
                    </>
                  )}
                </div>

                {/* Die drei Werte fuer den Ertragstafel-Rechner. Das Alter
                    steht hier als eigenes Feld: im Mischbestand ist die Buche
                    unter der Kiefer selten gleich alt. Bleibt es leer, gilt
                    das Bestandesalter von oben. */}
                <div
                  style={{
                    marginTop: 8,
                    border: `1px solid ${farben.line}`,
                    borderRadius: 10,
                    padding: "8px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 9,
                        color: farben.muted,
                        letterSpacing: 0.6,
                      }}
                    >
                      {t("FÜR DIE ERTRAGSTAFEL")}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        marginTop: 3,
                        display: "flex",
                        alignItems: "baseline",
                        flexWrap: "wrap",
                        gap: 4,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <span>{t("Alter")}</span>
                      <input
                        value={a.alter ?? ""}
                        onChange={(e) =>
                          aendere(a.id, (x) => ({ ...x, alter: e.target.value }))
                        }
                        placeholder={String(zahl(alter) || "?")}
                        inputMode="numeric"
                        aria-label={t("Alter {art}", { art: artName(a.name) })}
                        style={{
                          width: 52,
                          background: "transparent",
                          border: "none",
                          borderBottom: `1px solid ${farben.line}`,
                          color: z.alterJahre ? farben.text : farben.verb,
                          // 16 px, sonst zoomt iOS beim Antippen hinein.
                          fontSize: 16,
                          fontWeight: 700,
                          padding: "6px 0",
                          outline: "none",
                        }}
                      />
                      <span>
                        · {t("Höhe")}{" "}
                        <b style={{ color: z.mittelHoehe > 0 ? farben.text : farben.verb }}>
                          {z.mittelHoehe > 0 ? `${nk(z.mittelHoehe, 1)} m` : "?"}
                        </b>{" "}
                        · {t("G")} <b>{nk(z.gHa, 0)} m²/ha</b>
                      </span>
                    </div>
                  </div>
                  {z.mittelHoehe > 0 && (
                    <button
                      onClick={() => kopieren(z)}
                      style={{
                        background: "transparent",
                        border: `1px solid ${farben.line}`,
                        color: farben.text,
                        borderRadius: 10,
                        padding: "9px 14px",
                        fontSize: 13,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t("Kopieren")}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: 4 }}>
        <div style={{ ...beschriftung, marginBottom: 6 }}>{t("BAUMART ERGÄNZEN")}</div>
        {offeneArten.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {offeneArten.map((b) => (
              <button
                key={b.name}
                onClick={() =>
                  setWzp((alt) => ({
                    ...alt,
                    arten: [...alt.arten, leereArt(b.name)],
                  }))
                }
                style={{
                  background: "transparent",
                  border: `1px solid ${farben.line}`,
                  color: farben.muted,
                  borderRadius: 999,
                  padding: "9px 12px",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + {artName(b.name)}
              </button>
            ))}
          </div>
        )}
        <ArtErgaenzen
          onHinzu={(name) => {
            const grund = onArtHinzu(name);
            // Gleich mitzaehlen koennen: Wer sie eintraegt, hat sie vor sich.
            if (!grund) setWzp((alt) => ({ ...alt, arten: [...alt.arten, leereArt(name)] }));
            return grund;
          }}
          setHinweis={setHinweis}
        />
      </div>

      <a
        href="https://brandenburg-forst.de/ertragstafel/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          textAlign: "center",
          marginTop: 18,
          border: `1px solid ${farben.line}`,
          borderRadius: 10,
          padding: "11px 0",
          fontSize: 13,
          color: farben.text,
          textDecoration: "none",
        }}
      >
        {t("Ertragstafel-Rechner öffnen ›")}
      </a>
      <div
        style={{
          fontSize: 10,
          color: farben.muted,
          marginTop: 6,
          textAlign: "center",
        }}
      >
        {t("Landesforst Brandenburg – Alter, Mittelhöhe und Grundfläche dort eintragen")}
      </div>

      <div
        style={{
          fontSize: 11,
          color: farben.muted,
          marginTop: 16,
          lineHeight: 1.5,
        }}
      >
        {t(
          "Am Standpunkt einmal im Kreis drehen und jeden Baum zählen, der in Brusthöhe breiter erscheint als der Spalt am Zählstab. Grundfläche je Hektar = gezählte Bäume × Zählfaktor; der Vorrat ergibt sich daraus mit der mittleren Höhe und der Formzahl. Trägt man auch Durchmesser ein, kommt der Mittelstamm dazu und daraus die Stammzahl je Hektar.",
        )}
      </div>
    </div>

      <Hoehenmesser
        offen={messenFuer != null}
        onSchliessen={() => setMessenFuer(null)}
        /* Nach dem Scrollen durch vier Baumarten ist nicht mehr
           selbstverstaendlich, fuer welche man gerade misst. */
        titelZusatz={artName(wzp.arten.find((a) => a.id === messenFuer)?.name ?? "")}
        uebernehmenText={t("Übernehmen & eintragen")}
        onUebernehmen={(hoehe) => {
          const id = messenFuer;
          /* In der Schreibweise der Sprache ablegen - sonst steht in der
             deutschen Liste zwischen "28,5" und "31,0" ploetzlich ein
             "23.5" mit Punkt. Gerechnet wird ohnehin mit zahl(). */
          aendere(id, (a) => ({ ...a, hoehen: [...a.hoehen, nk(hoehe, 1)] }));
          if (stupsAn) stups(FESTGEHALTEN);
          setMessenFuer(null);
        }}
      />
    </>
  );
}