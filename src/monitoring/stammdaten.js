/* Stammdaten des Verjuengungszustandsmonitorings (LFB Brandenburg).

   Diese Listen sind unveraendert aus der Aufnahmemaske
   "Verjuengungsmonitoring_Gebersdorf" uebernommen - Blatt 3_Referenz fuer
   Baumarten, BZT und Hoehenklassen, Blatt 4_Verbissziele fuer die
   Grenzwerte. Sie sind hier maschinell aus der Datei erzeugt und nicht
   abgetippt, damit Kuerzel, Nummern und Schreibweisen exakt zur Excel-Maske
   passen: der Export soll sich ohne Nacharbeit weiterverwenden lassen.

   "rolle" und "aktiv" sind die Vorbelegung aus der gelieferten Datei
   (Blatt 1_Metadaten, Abschnitt D). Beides ist je Aufnahmepunkt aenderbar -
   welche Baumart Ziel-, Struktur- oder Begleitbaumart ist, entscheidet der
   Bestand, nicht die Liste. */

// 42 Baumarten. nr = Baumartennummer der Landesforst.
export const BAUMARTEN = [
  {
    "kuerzel": "GKI",
    "name": "Gemeine Kiefer",
    "wiss": "Pinus sylvestris",
    "typ": "Nadel",
    "nr": 1,
    "rolle": "ZB1",
    "aktiv": true
  },
  {
    "kuerzel": "GFI",
    "name": "Gemeine Fichte",
    "wiss": "Picea abies",
    "typ": "Nadel",
    "nr": 2,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "ELA",
    "name": "Europ. Lärche",
    "wiss": "Larix decidua",
    "typ": "Nadel",
    "nr": 3,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "JLA",
    "name": "Japan. Lärche",
    "wiss": "Larix kaempferi",
    "typ": "Nadel",
    "nr": 4,
    "rolle": "ZB1",
    "aktiv": false
  },
  {
    "kuerzel": "WTA",
    "name": "Weißtanne",
    "wiss": "Abies alba",
    "typ": "Nadel",
    "nr": 5,
    "rolle": "ZB2",
    "aktiv": false
  },
  {
    "kuerzel": "GDG",
    "name": "Douglasie",
    "wiss": "Pseudotsuga menziesii",
    "typ": "Nadel",
    "nr": 6,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "SKI",
    "name": "Schwarzkiefer",
    "wiss": "Pinus nigra",
    "typ": "Nadel",
    "nr": 7,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "KTA",
    "name": "Küstentanne",
    "wiss": "Abies grandis",
    "typ": "Nadel",
    "nr": 8,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "SEI",
    "name": "Stiel-Eiche",
    "wiss": "Quercus robur",
    "typ": "Laub",
    "nr": 9,
    "rolle": "ZB2",
    "aktiv": true
  },
  {
    "kuerzel": "TEI",
    "name": "Trauben-Eiche",
    "wiss": "Quercus petraea",
    "typ": "Laub",
    "nr": 10,
    "rolle": "ZB2",
    "aktiv": true
  },
  {
    "kuerzel": "RBU",
    "name": "Rot-Buche",
    "wiss": "Fagus sylvatica",
    "typ": "Laub",
    "nr": 11,
    "rolle": "ZB1",
    "aktiv": false
  },
  {
    "kuerzel": "HBU",
    "name": "Hainbuche",
    "wiss": "Carpinus betulus",
    "typ": "Laub",
    "nr": 12,
    "rolle": "ZB2",
    "aktiv": false
  },
  {
    "kuerzel": "GES",
    "name": "Gem. Esche",
    "wiss": "Fraxinus excelsior",
    "typ": "Laub",
    "nr": 13,
    "rolle": "ZB2",
    "aktiv": false
  },
  {
    "kuerzel": "FAH",
    "name": "Feld-Ahorn",
    "wiss": "Acer campestre",
    "typ": "Laub",
    "nr": 14,
    "rolle": "ZB2",
    "aktiv": false
  },
  {
    "kuerzel": "SAH",
    "name": "Spitz-Ahorn",
    "wiss": "Acer platanoides",
    "typ": "Laub",
    "nr": 15,
    "rolle": "BW",
    "aktiv": true
  },
  {
    "kuerzel": "BAH",
    "name": "Berg-Ahorn",
    "wiss": "Acer pseudoplatanus",
    "typ": "Laub",
    "nr": 16,
    "rolle": "ZB2",
    "aktiv": false
  },
  {
    "kuerzel": "WLI",
    "name": "Winter-Linde",
    "wiss": "Tilia cordata",
    "typ": "Laub",
    "nr": 17,
    "rolle": "ZB2",
    "aktiv": false
  },
  {
    "kuerzel": "SLI",
    "name": "Sommer-Linde",
    "wiss": "Tilia platyphyllos",
    "typ": "Laub",
    "nr": 18,
    "rolle": "ZB2",
    "aktiv": false
  },
  {
    "kuerzel": "GBI",
    "name": "Sand-Birke",
    "wiss": "Betula pendula",
    "typ": "Laub",
    "nr": 19,
    "rolle": "BW",
    "aktiv": true
  },
  {
    "kuerzel": "MBI",
    "name": "Moor-Birke",
    "wiss": "Betula pubescens",
    "typ": "Laub",
    "nr": 20,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "SWE",
    "name": "Sal-Weide",
    "wiss": "Salix caprea",
    "typ": "Laub",
    "nr": 21,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "BRU",
    "name": "Bruch-Weide",
    "wiss": "Salix fragilis",
    "typ": "Laub",
    "nr": 22,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "SEr",
    "name": "Schwarz-Erle",
    "wiss": "Alnus glutinosa",
    "typ": "Laub",
    "nr": 23,
    "rolle": "ZB2",
    "aktiv": false
  },
  {
    "kuerzel": "WEr",
    "name": "Weiß-Erle",
    "wiss": "Alnus incana",
    "typ": "Laub",
    "nr": 24,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "VKB",
    "name": "Vogelkirsche",
    "wiss": "Prunus avium",
    "typ": "Laub",
    "nr": 25,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "EIB",
    "name": "Eibe",
    "wiss": "Taxus baccata",
    "typ": "Nadel",
    "nr": 26,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "FUL",
    "name": "Feld-Ulme",
    "wiss": "Ulmus minor",
    "typ": "Laub",
    "nr": 27,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "BUL",
    "name": "Berg-Ulme",
    "wiss": "Ulmus glabra",
    "typ": "Laub",
    "nr": 28,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "WNU",
    "name": "Walnuss",
    "wiss": "Juglans regia",
    "typ": "Laub",
    "nr": 29,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "SNU",
    "name": "Schwarznuss",
    "wiss": "Juglans nigra",
    "typ": "Laub",
    "nr": 30,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "REI",
    "name": "Rot-Eiche",
    "wiss": "Quercus rubra",
    "typ": "Laub",
    "nr": 31,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "RO",
    "name": "Robinie",
    "wiss": "Robinia pseudoacacia",
    "typ": "Laub",
    "nr": 32,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "EK",
    "name": "Edelkastanie",
    "wiss": "Castanea sativa",
    "typ": "Laub",
    "nr": 33,
    "rolle": "ZB1",
    "aktiv": false
  },
  {
    "kuerzel": "AS",
    "name": "Pappel",
    "wiss": "Populus spp.",
    "typ": "Laub",
    "nr": 34,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "BB",
    "name": "Wildbirne",
    "wiss": "Pyrus pyraster",
    "typ": "Laub",
    "nr": 35,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "AB",
    "name": "Wildapfel",
    "wiss": "Malus sylvestris",
    "typ": "Laub",
    "nr": 36,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "EB",
    "name": "Eberesche",
    "wiss": "Sorbus aucuparia",
    "typ": "Laub",
    "nr": 37,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "STK",
    "name": "Spätbl. Traubenkirsche",
    "wiss": "Prunus serotina",
    "typ": "Laub",
    "nr": 38,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "FTK",
    "name": "Frühbl. Traubenkirsche",
    "wiss": "Prunus padus",
    "typ": "Laub",
    "nr": 39,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "FLB",
    "name": "Faulbaum",
    "wiss": "Frangula alnus",
    "typ": "Laub",
    "nr": 42,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "SoLb",
    "name": "Sonstige Laubbäume",
    "wiss": "—",
    "typ": "Laub",
    "nr": 40,
    "rolle": "BW",
    "aktiv": false
  },
  {
    "kuerzel": "SoNd",
    "name": "Sonstige Nadelbäume",
    "wiss": "—",
    "typ": "Nadel",
    "nr": 41,
    "rolle": "BW",
    "aktiv": false
  }
];

// Bestandeszieltypen (BZT) zur Auswahl im Kopf der Aufnahme.
export const BZT_LISTE = [
  "GKI",
  "GKI-L",
  "GKI-RBU",
  "GKI-GBI",
  "GKI-TEI",
  "GKI-SEI",
  "GKI-REI",
  "GKI-GDG",
  "ELA-RBU",
  "ELA-L",
  "GDG-RBU",
  "GDG-L",
  "RBU",
  "RBU-HBU",
  "RBU-EDL",
  "RBU-TEI",
  "RBU-SEI",
  "RBU-GDG",
  "RBU-ELA",
  "RBU-N",
  "TEI",
  "TEI-GKI",
  "TEI-RBU",
  "TEI-WLI-HBU",
  "TEI-EDL",
  "SEI-RBU",
  "SEI-EDL",
  "SEI-WLI-HBU",
  "SEI-BI",
  "SEI-RER",
  "REI",
  "REI-L",
  "RER",
  "RER-MBI",
  "RER-EDL",
  "EDL",
  "EDL-RBU",
  "EDL-WLI-HBU",
  "EDL-RER",
  "EDL-SEI",
  "MBI",
  "MBI-GKI",
  "GBI",
  "GBI-GKI",
  "WE-SPA",
  "RO"
];

/* Hoehenklassen der Verjuengungspflanzen. HK 1 ist der Keimling, HK 5 die
   Pflanze, die dem Aeser weitgehend entwachsen ist. */
export const HOEHENKLASSEN = [
  {
    "stufe": 1,
    "bereich": "0–20 cm"
  },
  {
    "stufe": 2,
    "bereich": "21–40 cm"
  },
  {
    "stufe": 3,
    "bereich": "41–80 cm"
  },
  {
    "stufe": 4,
    "bereich": "81–130 cm"
  },
  {
    "stufe": 5,
    "bereich": "131–200 cm"
  }
];

/* Verbissziele: bis zu welchem Verbissanteil das Zielprofil noch erreichbar
   ist. VZ1 tolerierbar, VZ2 kritisch, darueber VZ3 nicht akzeptabel.
   BW_L und BW_N ergeben sich aus Rolle "BW" und Typ Laub bzw. Nadel. */
export const VERBISSZIELE = [
  {
    "gruppe": "ZB1",
    "beschreibung": "Haupt-Zielbaumarten (z.B. TEI, SEI, RBU, EDL)",
    "vz1": 20,
    "vz2": 35
  },
  {
    "gruppe": "ZB2",
    "beschreibung": "Zweite Ziel-/Strukturbaumartengruppe (z.B. HBU, WLI, FAH)",
    "vz1": 25,
    "vz2": 40
  },
  {
    "gruppe": "BW_L",
    "beschreibung": "Laub-Begleitbaumarten (z.B. GBI, EB, SWE, VKB) Rolle=BW + Typ=Laub",
    "vz1": 30,
    "vz2": 50
  },
  {
    "gruppe": "BW_N",
    "beschreibung": "Nadel-Begleitbaumarten (z.B. GKI, GDG, GFI) Rolle=BW + Typ=Nadel",
    "vz1": 35,
    "vz2": 60
  }
];

// Auswahllisten des Kopfbogens (Blatt 1_Metadaten).
export const MISCHUNG = [
  { wert: "N", text: "Nadeldominiert (≥70 % Nadel)" },
  { wert: "NL", text: "Nadel mit Laubbeimischung" },
  { wert: "GL", text: "Gleichverteilung Nadel/Laub (je ca. 40–60 %)" },
  { wert: "LN", text: "Laubdominiert mit Nadelbeimischung" },
  { wert: "L", text: "Laubdominiert (≥70 % Laub)" },
  { wert: "D", text: "Diverser Mischwald (≥3 Baumarten, keine >60 %)" },
];

export const SCHICHTUNG = [
  { wert: "1S", text: "Einschichtig" },
  { wert: "2S", text: "Zweischichtig (Ober- und Unterschicht)" },
  { wert: "MS", text: "Mehrschichtig (≥3 Schichten)" },
];

export const STRUKTUR = [
  { wert: "H", text: "Homogen (gleichmäßige Verteilung)" },
  { wert: "DI", text: "Differenziert (Trupp-/Gruppenstruktur)" },
  { wert: "PL", text: "Plenter-/dauerwaldähnlich" },
];

export const VERBISSZIEL_STUFEN = ["VZ1", "VZ2", "VZ3"];

export const VERTEILUNG = ["gleichmäßig", "ungleichmäßig", "truppweise", "fehlend"];

export const KRONENSCHLUSS = [
  "gedrängt", "geschlossen", "locker", "licht", "räumdig", "mit Lücken", "mit Löchern",
];

export const BODENVEGETATION = ["gering", "mittel", "stark", "dominant"];

export const BODENVEGETATIONSTYP = ["Nein", "Farn", "Brombeere", "Moos", "Gräser", "Kraut"];

export const BODENGARE = ["gut", "mittel", "schlecht"];

/* Die sechs Merkmale je Pflanze. "schutz" ist kein Schaden, sondern die
   Feststellung, dass die Pflanze geschuetzt ist; die drei letzten zaehlen
   erst gemeinsam als starker Schaden. */
export const MERKMALE = [
  { feld: "schutz", kurz: "Schutz", lang: "Verbissschutz" },
  { feld: "winter", kurz: "Winterverbiss", lang: "Winterverbiss" },
  { feld: "fege", kurz: "Fegeschaden", lang: "Fegeschaden" },
  { feld: "trocken", kurz: "Trockenheit", lang: "Trockenheit" },
  { feld: "frost", kurz: "Frost", lang: "Frost" },
  { feld: "insekt", kurz: "Insektenfraß", lang: "Insektenfraß" },
];

// Mehr Pflanzen je Punkt sieht die Maske nicht vor.
export const MAX_PFLANZEN = 50;

export const artNach = (kuerzel) => BAUMARTEN.find((a) => a.kuerzel === kuerzel) ?? null;
