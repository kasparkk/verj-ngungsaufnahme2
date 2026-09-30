import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { datenbank } from "../../db/index.js";
import { kartenStandorte } from "../../db/schema.js";

function antwort(inhalt: unknown, status = 200) {
  return Response.json(inhalt, { status, headers: { "Cache-Control": "no-store" } });
}

function kontextGueltig(trupp: unknown, datum: unknown, abteilung: unknown) {
  return typeof trupp === "string" && /^[A-Z]$/.test(trupp) &&
    typeof datum === "string" && /^\d{4}-\d{2}-\d{2}$/.test(datum) &&
    Number.isFinite(Date.parse(datum)) && new Date(datum).toISOString().slice(0, 10) === datum &&
    typeof abteilung === "string" && abteilung.length <= 200;
}

export default async (request: Request) => {
  if (request.method !== "GET" && request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, POST" } });
  }
  const url = new URL(request.url);
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin) return antwort({ fehler: "Anfrage nicht erlaubt." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) {
      return antwort({ fehler: "JSON erwartet." }, 415);
    }
    if (Number(request.headers.get("content-length") || 0) > 4096) {
      return antwort({ fehler: "Anfrage zu groß." }, 413);
    }
  }
  let eingabe;
  try {
    if (request.method === "GET") {
      eingabe = Object.fromEntries(url.searchParams);
    } else {
      const roh = await request.text();
      if (roh.length > 4096) return antwort({ fehler: "Anfrage zu groß." }, 413);
      eingabe = JSON.parse(roh);
    }
  } catch {
    return antwort({ fehler: "Ungültige Anfrage." }, 400);
  }
  if (!eingabe || !kontextGueltig(eingabe.trupp, eingabe.datum, eingabe.abteilung)) {
    return antwort({ fehler: "Person, Aufnahmedatum und Gebiet prüfen." }, 400);
  }
  const { trupp, datum, abteilung } = eingabe;
  if (request.method === "POST" && (!Number.isInteger(eingabe.nr) || eingabe.nr < 1 || eingabe.nr > 1000000 ||
      !Number.isFinite(eingabe.lat) || Math.abs(eingabe.lat) > 85.05112878 ||
      !Number.isFinite(eingabe.lon) || Math.abs(eingabe.lon) > 180)) {
    return antwort({ fehler: "Probekreis und Koordinaten prüfen." }, 400);
  }
  try {
    const db = datenbank();
    if (request.method === "GET") {
      const standorte = await db.select().from(kartenStandorte).where(and(
        eq(kartenStandorte.trupp, trupp), eq(kartenStandorte.datum, datum),
        eq(kartenStandorte.abteilung, abteilung),
      )).limit(10000);
      return antwort({ standorte });
    }
    const { nr, lat, lon } = eingabe;
    const aktualisiert = new Date();
    const [standort] = await db.insert(kartenStandorte).values({ trupp, datum, abteilung, nr, lat, lon, aktualisiert })
      .onConflictDoUpdate({
        target: [kartenStandorte.trupp, kartenStandorte.datum, kartenStandorte.abteilung, kartenStandorte.nr],
        set: { lat, lon, aktualisiert },
      }).returning();
    return antwort({ standort });
  } catch {
    return antwort({ fehler: "Kartenpositionen sind momentan nicht erreichbar. Bitte erneut versuchen." }, 503);
  }
};

export const config: Config = { path: "/api/karten-standorte" };
