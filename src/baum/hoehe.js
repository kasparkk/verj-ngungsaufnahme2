/* Baumhoehe aus zwei Winkeln und der Entfernung.

   Das trigonometrische Verfahren, wie es jedes Hoehenmessgeraet benutzt:
   Vom Standort aus wird einmal zur Baumspitze und einmal zum Stammfuss
   angepeilt. Mit der waagerechten Entfernung d ergibt sich

       h = d * (tan(oben) - tan(unten))

   Beide Winkel zaehlen von der Waagerechten, nach oben positiv. Der Fuss
   liegt beim Messen fast immer UNTER der Waagerechten, sein Winkel ist
   also negativ - und aus dem Minus wird eine Summe. Genau deshalb braucht
   es zwei Winkel und nicht einen: so fallen Augenhoehe und Hangneigung von
   selbst heraus, ohne dass jemand seine Koerpergroesse eingeben muss.

   Entscheidend ist, dass d die WAAGERECHTE Entfernung ist. Am Hang ist die
   abgeschrittene Strecke laenger als die waagerechte; wer das verwechselt,
   misst zu hoch. */

export const GRAD = Math.PI / 180;

/* Rueckgabe null heisst: damit laesst sich nicht rechnen. Der Aufrufer
   zeigt dann nichts an, statt eine Scheinzahl auszugeben. */
export function baumHoehe(entfernung, winkelUnten, winkelOben) {
  const d = Number(entfernung);
  const u = Number(winkelUnten);
  const o = Number(winkelOben);

  if (!Number.isFinite(d) || d <= 0) return null;
  if (!Number.isFinite(u) || !Number.isFinite(o)) return null;
  // Bei 90 Grad laeuft der Tangens ins Unendliche - sinnlos und gefaehrlich.
  if (Math.abs(u) >= 89 || Math.abs(o) >= 89) return null;
  // Die Spitze muss ueber dem Fuss liegen, sonst wurde verwechselt.
  if (o <= u) return null;

  return d * (Math.tan(o * GRAD) - Math.tan(u * GRAD));
}

/* Wie stark wirkt sich ein Fehler in der Entfernung aus?

   Die Hoehe haengt linear an d: zehn Prozent zu weit geschaetzt heisst
   zehn Prozent zu hoch gemessen. Das ist der groesste Fehler in der
   Praxis, groesser als alles, was der Neigungssensor beitraegt - deshalb
   steht es in der Oberflaeche. */
export const fehlerDurchEntfernung = (hoehe, abweichungProzent) =>
  hoehe == null ? null : (hoehe * abweichungProzent) / 100;

/* Der Neigungswinkel aus der Lage des Geraetes.

   beta ist die Vorne-Hinten-Neigung: 0 heisst flach auf dem Tisch, 90
   heisst senkrecht aufgestellt. Haelt man das Handy senkrecht und peilt
   ueber die Oberkante, ist der Blick waagerecht - also beta - 90.

   Ueber Kopf (beta ueber 180) liefern manche Geraete Werte, die sonst
   umschlagen; der Fall wird hier zurueckgeholt. */
export function neigungAusBeta(beta) {
  if (!Number.isFinite(beta)) return null;
  let b = beta;
  if (b > 180) b -= 360;
  return b - 90;
}

/* Geglaetteter Winkel aus den letzten Messwerten.

   Der rohe Sensorwert zappelt: Handzittern, Rauschen im Beschleunigungs-
   messer, und bei jedem Antippen erwischt man zufaellig irgendeinen Wert
   aus diesem Zappeln. Ein Grad daneben sind bei 20 m Entfernung schon
   knapp 90 cm Hoehe - das ist kein Rundungsfehler mehr.

   Genommen wird der MEDIAN, nicht der Mittelwert. Ein einzelner
   Ausreisser - ein Ruckler, ein Stoss - zieht den Mittelwert mit, den
   Median nicht. Genau solche einzelnen Aussetzer liefert ein
   Handy-Sensor aber staendig.

   Das Fenster ist bewusst kurz: Eine halbe Sekunde beruhigt die Anzeige,
   ohne dass sie beim Schwenken hinterherhinkt. */
export const GLAETT_FENSTER_MS = 500;

export function geglaettet(werte, jetzt = Date.now(), fenster = GLAETT_FENSTER_MS) {
  const frisch = (werte ?? [])
    .filter((w) => w && Number.isFinite(w.wert) && jetzt - w.zeit <= fenster)
    .map((w) => w.wert)
    .sort((a, b) => a - b);

  if (!frisch.length) return null;
  const mitte = Math.floor(frisch.length / 2);
  return frisch.length % 2 ? frisch[mitte] : (frisch[mitte - 1] + frisch[mitte]) / 2;
}

/* Wie unruhig liegt das Geraet gerade?

   Die Spanne der frischen Werte. Daraus macht die Oberflaeche einen
   Hinweis: ruhig halten lohnt sich, und man sieht, wann es so weit ist. */
export function unruhe(werte, jetzt = Date.now(), fenster = GLAETT_FENSTER_MS) {
  const frisch = (werte ?? [])
    .filter((w) => w && Number.isFinite(w.wert) && jetzt - w.zeit <= fenster)
    .map((w) => w.wert);
  if (frisch.length < 2) return null;
  return Math.max(...frisch) - Math.min(...frisch);
}

/* Waagerechte Entfernung zwischen zwei Punkten im Raum.

   WebXR legt die y-Achse nach oben. Fuer die Hoehenmessung zaehlt nur die
   Grundflaeche: Wie weit steht man vom Stamm weg, am Boden gemessen? Die
   Hoehendifferenz zwischen Auge und Stammfuss geht ausdruecklich NICHT
   ein - sonst waere es die Schraegstrecke, und genau die ist der Fehler,
   den das Verfahren mit den zwei Winkeln vermeidet.

   Damit faellt am Hang auch die Umrechnung weg: Was hier herauskommt, ist
   schon die waagerechte Strecke. */
export function waagerechteEntfernung(a, b) {
  if (!a || !b) return null;
  const dx = Number(b.x) - Number(a.x);
  const dz = Number(b.z) - Number(a.z);
  if (!Number.isFinite(dx) || !Number.isFinite(dz)) return null;
  return Math.sqrt(dx * dx + dz * dz);
}

/* --- Entfernung aus der Neigung schaetzen ------------------------------

   Wer das Handy in bekannter Hoehe haelt und auf den Stammfuss
   herunterpeilt, hat ein rechtwinkliges Dreieck:

       d = Handyhoehe / tan(Neigung nach unten)

   Kein Band, kein Abschreiten, kein ARCore - nur der Lagesensor. Das
   koennen auch Geraete ohne WebXR, und es geht im Dunkeln.

   DER HAKEN, und deshalb steht er hier und nicht nur in der Oberflaeche:
   Je weiter der Baum weg ist, desto flacher peilt man, und bei flachen
   Winkeln bricht die Rechnung zusammen. Mit 1,60 m Handyhoehe peilt man
   auf 25 m nur 3,7 Grad nach unten; ein Grad Sensorfehler macht daraus
   19,6 bis 34,4 m. Die Hoehe haengt linear an der Entfernung, aus einer
   25-m-Fichte wuerde also eine zwischen 20 und 35 m.

   Nah dran ist es dagegen brauchbar: auf 5 m sind es rund 6 Prozent.
   Deshalb liefert diese Rechnung IMMER die Spanne mit, und oberhalb von
   NEIGUNG_GRENZE_M meldet sie brauchbar=false. Eine Zahl ohne ihre
   Spanne waere hier schlimmer als gar keine.

   Zwei Annahmen stecken drin, die im Bestand oft nicht stimmen: Der
   Boden zwischen Standpunkt und Stammfuss muss waagerecht sein - am Hang
   ist die Rechnung nicht ungenau, sondern falsch -, und die Handyhoehe
   muss wirklich stimmen (10 cm Irrtum sind 6 Prozent).

   Das Verfahren mit den zwei Winkeln bleibt davon unberuehrt: Es
   braucht die Entfernung weiterhin, hier wird nur ein Vorschlag dafuer
   erzeugt, den man ansehen und verwerfen kann.                        */

// Bis hierher taugt die Schaetzung; darueber wird nur noch die Spanne gezeigt.
export const NEIGUNG_GRENZE_M = 8;
// Was der geglaettete Sensor im Feld realistisch danebenliegt.
export const SENSOR_FEHLER_GRAD = 1;

export function entfernungAusNeigung(handyhoeheM, winkelUnten, fehlerGrad = SENSOR_FEHLER_GRAD) {
  const hh = Number(handyhoeheM);
  const w = Number(winkelUnten);
  if (!Number.isFinite(hh) || !(hh > 0) || hh > 3) return null;
  if (!Number.isFinite(w)) return null;

  // Nach unten gepeilt wird mit negativem Winkel; waagerecht geht nicht.
  const ab = -w;
  if (!(ab > 0.5) || ab >= 89) return null;

  const d = (grad) => hh / Math.tan(grad * GRAD);
  const flacher = ab - fehlerGrad;

  return {
    neigung: ab,
    d: d(ab),
    // Steiler gepeilt heisst naeher dran.
    min: d(ab + fehlerGrad),
    // Flacher als der Fehler: dann ist nach oben alles offen.
    max: flacher > 0 ? d(flacher) : null,
    /* Auf den Zentimeter entschieden. Ohne das Runden faellt genau die
       Grenze durch - aus dem Winkel zurueckgerechnet kommen 8,000000000002
       heraus. Genau auf der Grenze gilt sie als brauchbar, wie beim
       Grenzstamm auch. */
    brauchbar: Math.round(d(ab) * 100) / 100 <= NEIGUNG_GRENZE_M,
  };
}
