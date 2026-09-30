async function anfrage(url, optionen) {
  let antwort;
  try {
    antwort = await fetch(url, { ...optionen, signal: AbortSignal.timeout(15000), cache: "no-store" });
  } catch {
    throw new Error("Kartenposition nicht gespeichert: Verbindung prüfen und erneut versuchen.");
  }
  let inhalt;
  try {
    inhalt = await antwort.json();
  } catch {
    throw new Error("Kartenpositionen sind momentan nicht erreichbar.");
  }
  if (!antwort.ok) throw new Error(inhalt.fehler || "Kartenposition konnte nicht gespeichert werden.");
  return inhalt;
}

export async function ladeKartenStandorte(kontext) {
  const inhalt = await anfrage(`/api/karten-standorte?${new URLSearchParams(kontext)}`);
  return inhalt.standorte;
}

export async function speichereKartenStandort(kontext, nr, punkt) {
  const inhalt = await anfrage("/api/karten-standorte", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...kontext, nr, lat: punkt.lat, lon: punkt.lon }),
  });
  return inhalt.standort;
}
