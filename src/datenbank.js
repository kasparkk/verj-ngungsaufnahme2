import { SUPABASE_URL, SUPABASE_KEY } from "./konfiguration.js";
import { auswertenAusZeilen } from "./auswerten.js";

const kopfzeilen = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

/* Der kostenlose Tarif von Supabase legt eine Datenbank schlafen, wenn sie
   etwa eine Woche lang nicht benutzt wurde. Sie antwortet dann mit einem
   Serverfehler - und in der App sah das bisher aus wie "nichts eingetragen"
   statt wie "Datenbank schlaeft". Genau dieser Unterschied entscheidet aber,
   ob man weitersucht oder Bescheid gibt.

   Wichtig: Eine schlafende Datenbank wacht NICHT davon auf, dass man sie
   anfragt - sie muss im Supabase-Konto geweckt werden. Wer im Gelaende
   darauf wartet, wartet vergebens. Die eigenen Zahlen auf dem Geraet sind
   davon nie betroffen; der Abgleich holt alles nach, sobald sie wieder
   laeuft. */
const SCHLAEFT = [500, 502, 503, 504, 521, 522, 540, 544];

export const istSchlafend = (status) => SCHLAEFT.includes(status);

export const RUHE_HINWEIS =
  "Datenbank nicht erreichbar – sie schläft vermutlich (kostenloser Tarif, " +
  "nach etwa einer Woche ohne Nutzung). Sie muss einmal im Supabase-Konto " +
  "geweckt werden, von allein passiert das nicht. Die eigenen Zahlen auf " +
  "diesem Gerät sind davon nicht betroffen und werden nachgetragen.";

/* Schickt die gezaehlten Zeilen hoch. Gleiche Kombination aus Person, Datum,
   Kreis und Baumart wird ueberschrieben statt doppelt angelegt - deshalb darf
   der automatische Abgleich beliebig oft laufen. */
export async function zeilenHochladen(zeilen) {
  const antwort = await fetch(
    `${SUPABASE_URL}/rest/v1/verjuengung?on_conflict=trupp,aufnahmedatum,kreis,baumart`,
    {
      method: "POST",
      headers: {
        ...kopfzeilen,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(zeilen),
    }
  );

  if (antwort.ok) return { ok: true };

  // Grund mitgeben, damit die Anzeige nicht nur "fehlgeschlagen" sagen muss.
  const text = await antwort.text();
  console.error("Supabase:", antwort.status, text);
  let grund = "";
  try {
    grund = JSON.parse(text).message || "";
  } catch {
    grund = text.slice(0, 80);
  }
  return { ok: false, status: antwort.status, grund };
}

// Filter auf Abteilung und (falls vorhanden) Datum, wie ihn beide Abrufe brauchen.
function filter(abteilung, datum) {
  const nachAbteilung = abteilung
    ? `abteilung=eq.${encodeURIComponent(abteilung)}`
    : "abteilung=is.null";
  const nachDatum = datum ? `&aufnahmedatum=eq.${datum}` : "";
  return `${nachAbteilung}${nachDatum}`;
}

/* Ergebnis aller Personen: fertige Auswertung aus der Datenbank-Sicht plus
   alle Einzelzeilen (fuer die Kreis-Zaehlung je Person und die Liste). */
export async function ergebnisAllePersonen(abteilung, datum) {
  const wo = filter(abteilung, datum);

  const [auswertung, rohzeilen] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/verjuengung_auswertung?select=*&${wo}`, { headers: kopfzeilen }),
    /* Koordinaten und Kreisflaeche kommen mit, damit sich aus derselben
       Abfrage auch die Probekreisliste und der Export bauen lassen. */
    fetch(
      `${SUPABASE_URL}/rest/v1/verjuengung` +
        `?select=trupp,abteilung,aufnahmedatum,kreis,kreisflaeche,baumart,verbissen,unverbissen,lat,lon,genauigkeit_m` +
        `&${wo}`,
      { headers: kopfzeilen }
    ),
  ]);

  if (!auswertung.ok || !rohzeilen.ok) {
    const status = auswertung.ok ? rohzeilen.status : auswertung.status;
    throw new Error(istSchlafend(status) ? RUHE_HINWEIS : `Abruf fehlgeschlagen (${status})`);
  }

  return { auswertung: await auswertung.json(), zeilen: await rohzeilen.json() };
}

/* Ergebnis einer einzelnen Person. Die Datenbank-Sicht fasst immer alle
   Personen zusammen, deshalb wird hier aus den Einzelzeilen selbst gerechnet. */
export async function ergebnisEinePerson(person, abteilung, datum) {
  const antwort = await fetch(
    `${SUPABASE_URL}/rest/v1/verjuengung` +
      `?select=trupp,abteilung,aufnahmedatum,kreis,kreisflaeche,baumart,verbissen,unverbissen,lat,lon,genauigkeit_m` +
      `&trupp=eq.${encodeURIComponent(person)}&${filter(abteilung, datum)}`,
    { headers: kopfzeilen }
  );

  if (!antwort.ok) {
    throw new Error(
      istSchlafend(antwort.status) ? RUHE_HINWEIS : `Abruf fehlgeschlagen (${antwort.status})`,
    );
  }

  const zeilen = await antwort.json();
  const { auswertung, kreiseGesamt } = auswertenAusZeilen(zeilen);

  return { auswertung, zeilen, kreiseGesamt };
}
