import { doublePrecision, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

export const kartenStandorte = pgTable("karten_standorte", {
  trupp: text("trupp").notNull(),
  datum: text("aufnahmedatum").notNull(),
  abteilung: text("abteilung").notNull(),
  nr: integer("kreis").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  aktualisiert: timestamp("aktualisiert", { withTimezone: true }).notNull().defaultNow(),
}, (tabelle) => [primaryKey({ columns: [tabelle.trupp, tabelle.datum, tabelle.abteilung, tabelle.nr] })]);
