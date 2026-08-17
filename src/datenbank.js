import { SUPABASE_URL, SUPABASE_KEY } from "./konfiguration.js";

const kopfzeilen = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

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

  if (!antwort.ok) {
    const text = await antwort.text();
    console.error("Supabase:", text);
  }
  return antwort.ok;
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
    fetch(
      `${SUPABASE_URL}/rest/v1/verjuengung?select=trupp,kreis,baumart,verbissen,unverbissen&${wo}`,
      { headers: kopfzeilen }
    ),
  ]);

  if (!auswertung.ok || !rohzeilen.ok) {
    throw new Error(`Abruf fehlgeschlagen (${auswertung.ok ? rohzeilen.status : auswertung.status})`);
  }

  return { auswertung: await auswertung.json(), zeilen: await rohzeilen.json() };
}

/* Ergebnis einer einzelnen Person. Die Datenbank-Sicht fasst immer alle
   Personen zusammen, deshalb wird hier aus den Einzelzeilen selbst gerechnet. */
export async function ergebnisEinePerson(person, abteilung, datum) {
  const antwort = await fetch(
    `${SUPABASE_URL}/rest/v1/verjuengung` +
      `?select=kreis,baumart,verbissen,unverbissen,kreisflaeche` +
      `&trupp=eq.${encodeURIComponent(person)}&${filter(abteilung, datum)}`,
    { headers: kopfzeilen }
  );

  if (!antwort.ok) throw new Error(`Abruf fehlgeschlagen (${antwort.status})`);

  const zeilen = await antwort.json();
  const kreiseGesamt = new Set(zeilen.map((z) => z.kreis)).size;
  const flaeche = zeilen.length ? Number(zeilen[0].kreisflaeche) || 100 : 100;

  const jeBaumart = new Map();
  zeilen.forEach((z) => {
    const eintrag = jeBaumart.get(z.baumart) || { baumart: z.baumart, verbissen: 0, unverbissen: 0 };
    eintrag.verbissen += z.verbissen;
    eintrag.unverbissen += z.unverbissen;
    jeBaumart.set(z.baumart, eintrag);
  });

  const auswertung = [...jeBaumart.values()].map((eintrag) => {
    const gesamt = eintrag.verbissen + eintrag.unverbissen;
    return {
      ...eintrag,
      gesamt,
      verbiss_prozent: gesamt ? Math.round((eintrag.verbissen / gesamt) * 1000) / 10 : null,
      kreise_gesamt: kreiseGesamt,
      stueck_je_ha: kreiseGesamt && flaeche ? Math.round((gesamt * 10000) / (kreiseGesamt * flaeche)) : null,
    };
  });

  return { auswertung, zeilen, kreiseGesamt };
}
