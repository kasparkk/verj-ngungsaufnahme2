CREATE TABLE "karten_standorte" (
	"trupp" text,
	"aufnahmedatum" text,
	"abteilung" text,
	"kreis" integer,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL,
	"aktualisiert" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "karten_standorte_pkey" PRIMARY KEY("trupp","aufnahmedatum","abteilung","kreis")
);
