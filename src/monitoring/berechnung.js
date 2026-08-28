/* Die Felder, die die Excel-Maske selbst ausrechnet.

   Alles hier ist eins zu eins aus den Formeln der Datei uebernommen. Wo die
   Datei sich widerspricht, steht es als Kommentar dabei - stillschweigend
   etwas anderes zu rechnen waere schlimmer als der Widerspruch selbst. */

import { BAUMARTEN, VERBISSZIELE, artNach } from "./stammdaten.js";
import { entfernung } from "../utm33.js";

export const zahl = (wert) => {
  const n = parseFloat(String(wert ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// Probekreisflaeche aus dem Radius: A = pi * r^2, auf 0,1 m^2 gerundet.
export const probekreisflaeche = (radius) => {
  const r = zahl(radius);
  return r > 0 ? Math.round(Math.PI * r * r * 10) / 10 : 0;
};

/* Gilt der Punkt als verlegt?

   Ein verlegter Punkt liegt nicht mehr dort, wo er geplant war. Die Frage
   ist, ab welcher Abweichung das gilt - und dabei zaehlt, womit gemessen
   wurde: der Messstab trifft auf Zentimeter, das Handy im Bestand auf
   5 bis 15 m. Wuerde jede Abweichung ueber 10 m als Verlegung gelten,
   waere bei einer Handy-Messung fast jeder Punkt verlegt, obwohl der Pfahl
   unveraendert steht.

   Deshalb muss die Abweichung sowohl den Probekreis als auch die doppelte
   Messgenauigkeit ueberschreiten. Der Schalter bleibt trotzdem von Hand
   bedienbar: wer den Punkt versetzt hat, weiss es besser als die Rechnung. */
export function giltAlsVerlegt(sollBreite, sollLaenge, breite, laenge, radius, genauigkeit) {
  if (sollBreite == null || sollLaenge == null || breite == null || laenge == null) return null;
  const abstand = entfernung(sollBreite, sollLaenge, breite, laenge);
  const schwelle = Math.max(10, zahl(radius), 2 * (zahl(genauigkeit) || 0));
  return abstand > schwelle;
}

/* Ziel-Profil = Mischung-Schichtung-Struktur, z.B. "LN-MS-DI".
   Erst vollstaendig, wenn alle drei gewaehlt sind. */
export const zielProfil = (mix, schicht, struktur) =>
  mix && schicht && struktur ? `${mix}-${schicht}-${struktur}` : "";

/* Aktiver BZT: ein manuell gesetzter Zielbaumarten-Bestandeszieltyp
   ueberschreibt den Standard. Sind beide manuellen Felder gefuellt, werden
   sie mit Bindestrich verbunden. */
export function aktiverBzt(standard, manZb1, manZb2) {
  if (manZb1) return manZb2 ? `${manZb1}-${manZb2}` : manZb1;
  return standard || "";
}

/* Rolle einer Baumart am Punkt: ZB1 (Haupt-Zielbaumart), ZB2 (Struktur-
   bzw. Nebenbaumart) oder BW (Begleiter). */
export const rolleVon = (kuerzel, arten) => arten?.[kuerzel]?.rolle ?? "—";

/* Verbiss ist in dieser Maske eine Ja-Nein-Feststellung: frischer
   Winterverbiss oder ein Fegeschaden zaehlt, alles andere nicht. */
export const istVerbissen = (p) => p.winter === 1 || p.fege === 1;

/* Schadensklasse, genau nach der Formel in Spalte N:

     3 - stark:  Winterverbiss oder Fegeschaden, oder mindestens zwei der
                 drei uebrigen Schaeden (Trockenheit, Frost, Insektenfrass)
     1 - gering: kein Winterverbiss, kein Fegeschaden, HK 4 oder 5 und
                 keiner der drei uebrigen Schaeden
     2 - mittel: alles dazwischen                                        */
export function schadensklasse(p) {
  if (!p.kuerzel) return "";
  if (!p.hk) return "—";
  const uebrige = (p.trocken ?? 0) + (p.frost ?? 0) + (p.insekt ?? 0);
  if (p.winter === 1 || p.fege === 1 || uebrige >= 2) return "3 — stark";
  if (p.winter !== 1 && p.fege !== 1 && zahl(p.hk) >= 4 && uebrige === 0) return "1 — gering";
  return "2 — mittel";
}

/* Verjuengungsfreundlichkeit des Punktes.

   Die Formel im Blatt zaehlt sechs erfuellte Bedingungen und stuft ab 5 als
   "gut", ab 3 als "bedingt" ein. Der Erklaertext daneben spricht dagegen von
   drei Bedingungen und "2 von 3". Hier gilt die Formel, denn sie ist es, die
   die Werte in der gelieferten Datei erzeugt hat. */
export function verjuengungsfreundlich(b) {
  if (!b.kronenschluss || !b.bodenvegetation || !b.bodengare) return "";
  const offen = ["locker", "licht", "räumdig", "mit Lücken", "mit Löchern"];
  const punkte =
    (offen.includes(b.kronenschluss) ? 1 : 0) +
    (["gering", "mittel"].includes(b.bodenvegetation) ? 1 : 0) +
    (["gut", "mittel"].includes(b.bodengare) ? 1 : 0) +
    (b.samenbaeume === "ja" ? 1 : 0) +
    (b.randeffekte === "nein" ? 1 : 0) +
    (b.hasenverbiss === "nein" ? 1 : 0);
  if (punkte >= 5) return "✔ gut";
  if (punkte >= 3) return "⚡ bedingt";
  return "✘ nicht gut";
}

/* Gruppe fuer die Verbissziele: ZB1 und ZB2 stehen direkt in der Rolle,
   Begleiter werden nach Laub und Nadel getrennt. */
export function verbissGruppe(kuerzel, arten) {
  const rolle = rolleVon(kuerzel, arten);
  if (rolle === "ZB1" || rolle === "ZB2") return rolle;
  const art = artNach(kuerzel);
  if (!art) return null;
  return art.typ === "Nadel" ? "BW_N" : "BW_L";
}

/* Verbissauswertung je Gruppe.

   Diese Ampel rechnet die Excel-Maske nicht selbst - dort stehen nur das
   gewaehlte Verbissziel und die Grenzwerttabelle nebeneinander, verglichen
   wird im Kopf. Die Rechnung ist aber genau die, die die Tabelle beschreibt:
   Anteil verbissener Pflanzen an allen Pflanzen der Gruppe, gemessen an
   VZ1_max und VZ2_max. */
export function verbissAuswertung(pflanzen, arten) {
  const gruppen = VERBISSZIELE.map((ziel) => {
    const eigene = pflanzen.filter(
      (p) => p.kuerzel && verbissGruppe(p.kuerzel, arten) === ziel.gruppe,
    );
    const verbissen = eigene.filter(istVerbissen).length;
    const anteil = eigene.length ? (verbissen / eigene.length) * 100 : null;

    let stufe = null;
    if (anteil !== null) {
      if (anteil <= ziel.vz1) stufe = "VZ1";
      else if (anteil <= ziel.vz2) stufe = "VZ2";
      else stufe = "VZ3";
    }
    return { ...ziel, anzahl: eigene.length, verbissen, anteil, stufe };
  });

  const gesamt = pflanzen.filter((p) => p.kuerzel);
  return {
    gruppen,
    gesamt: {
      anzahl: gesamt.length,
      verbissen: gesamt.filter(istVerbissen).length,
      anteil: gesamt.length
        ? (gesamt.filter(istVerbissen).length / gesamt.length) * 100
        : null,
    },
  };
}

/* Verteilung der Pflanzen auf Baumarten und Hoehenklassen - die Uebersicht,
   die man am Punkt zur Kontrolle braucht, bevor man ihn abschliesst. */
export function jeBaumart(pflanzen, arten) {
  const map = new Map();
  for (const p of pflanzen) {
    if (!p.kuerzel) continue;
    if (!map.has(p.kuerzel)) {
      map.set(p.kuerzel, {
        kuerzel: p.kuerzel,
        name: artNach(p.kuerzel)?.name ?? p.kuerzel,
        rolle: rolleVon(p.kuerzel, arten),
        anzahl: 0,
        verbissen: 0,
        hk: [0, 0, 0, 0, 0],
      });
    }
    const e = map.get(p.kuerzel);
    e.anzahl += 1;
    if (istVerbissen(p)) e.verbissen += 1;
    const stufe = zahl(p.hk);
    if (stufe >= 1 && stufe <= 5) e.hk[stufe - 1] += 1;
  }
  return [...map.values()].sort((a, b) => b.anzahl - a.anzahl);
}

/* Hochrechnung auf den Hektar. Der Probekreis ist die einzige bekannte
   Bezugsflaeche; ohne Radius gibt es keine Stammzahl je Hektar. */
export function stammzahlJeHektar(anzahl, radius) {
  const flaeche = probekreisflaeche(radius);
  return flaeche > 0 ? (anzahl * 10000) / flaeche : null;
}

// Alle Baumarten, die am Punkt aktiv geschaltet sind - in Listenreihenfolge.
export const aktiveArten = (arten) =>
  BAUMARTEN.filter((a) => arten?.[a.kuerzel]?.aktiv);
