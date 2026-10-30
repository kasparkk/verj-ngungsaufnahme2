/* Deutsch -> Englisch.

   Schluessel ist der deutsche Text, so wie er im Quelltext steht. Fehlt ein
   Eintrag, erscheint der deutsche Text; pruefungen/sprache.mjs findet solche
   Luecken, indem es alle t()-Aufrufe im Quelltext einliest und mit dieser
   Datei vergleicht.

   Was hier NICHT steht, ist auch nicht uebersetzt - und das mit Absicht:

   - Die Spalten der Excel-, CSV- und GeoJSON-Dateien bleiben deutsch. Sonst
     entstuenden aus einer Spracheinstellung zwei Dateiformate, und die
     Tabelle des Kollegen passte nicht mehr zur eigenen.
   - Die Stammdaten der Landesforst-Aufnahme (BZT, Mischung, Schichtung,
     Verbissziel-Stufen, Hoehenklassen) bleiben deutsch. Es sind die Werte
     des amtlichen Bogens; sie werden so gespeichert und so abgegeben.
   - Baumartennamen stehen weiter unten in ARTEN - und auch die nur fuer die
     ANZEIGE. Gespeichert und exportiert wird immer "Fichte".

   Die Fachbegriffe sind die forstlich gebraeuchlichen, nicht die
   woertlichen: Winkelzaehlprobe = angle count sampling (Bitterlich),
   Zaehlfaktor = basal area factor, BHD = DBH, Grenzradius = limiting
   distance, Formzahl = form factor, Verjuengung = regeneration, Verbiss =
   browsing, Festmeter = m³, Derbholz = merchantable timber. */
export const WOERTER = {
  "Verjüngung":
    "Regeneration",
  // Reiter: "Tree measurement" brach auf dem Handy in zwei Zeilen um und
  // machte die ganze Reiterleiste hoeher als die anderen beiden Reiter.
  "Baummessung":
    "Tree survey",
  "Monitoring":
    "Monitoring",
  "Speichern fehlgeschlagen":
    "Could not save",
  "Kein GPS auf diesem Gerät":
    "No GPS on this device",
  "Standort nicht verfügbar":
    "Location not available",
  "{name} gespeichert":
    "{name} saved",
  "Noch nichts gezählt":
    "Nothing counted yet",
  "Excel":
    "Excel",
  "CSV":
    "CSV",
  "Geodaten":
    "Geodata",
  "PDF":
    "PDF",
  "Schließen":
    "Close",
  "Abbrechen":
    "Cancel",
  "Übernehmen":
    "Use value",
  "Zurücksetzen":
    "Reset",
  "Hinzufügen":
    "Add",
  "entfernen":
    "remove",
  "Aktualisieren":
    "Refresh",
  "Wird geladen ...":
    "Loading ...",
  "📍 Standort erfassen":
    "📍 Record location",
  "Erst den Standort erfassen – ohne Punkt keine Karte":
    "Record the location first – no point, no map",
  "Noch keine Bäume eingetragen":
    "No trees entered yet",
  "Standort gespeichert":
    "Location saved",
  "Excel-Datei gespeichert":
    "Excel file saved",
  "ORT / BESTAND":
    "SITE / STAND",
  "ALTER Jahre":
    "AGE years",
  "Das Alter gilt für alle Baumarten – bei jeder Baumart lässt es sich einzeln überschreiben.":
    "The age applies to all species – it can be overridden for each species individually.",
  "Winkelzählprobe":
    "Angle count sampling",
  "Einzelbäume":
    "Individual trees",
  "Formzahlen ausblenden":
    "Hide form factors",
  "Formzahlen anpassen":
    "Adjust form factors",
  "Geodaten: eine GeoJSON-Datei (.geojson) mit dem Standpunkt und den Ergebnissen – zum Öffnen in QGIS, OsmAnd, Organic Maps oder einem anderen Kartenprogramm.":
    "Geodata: a GeoJSON file (.geojson) with the sampling point and the results – opens in QGIS, OsmAnd, Organic Maps or any other mapping program.",
  "{kreise} Probekreise mit {pflanzen} Pflanzen geholt":
    "Fetched {kreise} sample plots with {pflanzen} plants",
  "Dafür braucht es eine Person":
    "That needs a person first",
  "{wer}: nichts in der Datenbank":
    "{wer}: nothing in the database",
  "ohne Gebiet":
    "no area",
  "Abruf fehlgeschlagen":
    "Could not fetch",
  "Für diesen Tag steht doch nichts da":
    "There is nothing for this day after all",
  "{art} ist schon in der Liste":
    "{art} is already in the list",
  "Kopiert – in Excel-Zelle A2 einfügen, fällt direkt in die Spalten":
    "Copied – paste into cell A2 in Excel and it drops straight into the columns",
  "Text unten markieren und kopieren":
    "Select the text below and copy it",
  "Verjüngungsaufnahme":
    "Regeneration survey",
  "Excel-Datei gespeichert – in den Downloads antippen":
    "Excel file saved – tap it in your downloads",
  "Datei hier nicht möglich – Text unten markieren und kopieren":
    "No file possible here – select the text below and copy it",
  "Für den Probekreis ist kein Standort erfasst – 📍 antippen":
    "No location recorded for this sample plot – tap 📍",
  "Kein Probekreis hat einen Standort – 📍 antippen":
    "No sample plot has a location – tap 📍",
  "{n} Probekreise gespeichert":
    "{n} sample plots saved",
  " – {n} ohne Standort weggelassen":
    " – {n} left out for lack of a location",
  "Kein Netz – Ergebnis kann gerade nicht geladen werden":
    "No connection – the result cannot be loaded right now",
  "Auf diesem Blatt sind {n} Pflanzen gezählt – {blatt}.":
    "This sheet has {n} plants counted on it – {blatt}.",
  "{neu} fängt mit einem leeren Blatt an. Die Zahlen bleiben bei {alt} und gehen nicht verloren; zurückstellen holt sie wieder.":
    "{neu} starts with an empty sheet. The counts stay with {alt} and are not lost; switching back brings them up again.",
  "Zu {neu} wechseln?":
    "Switch to {neu}?",
  "„{ziel}“ bekommt ein eigenes, leeres Blatt. Die Zahlen bleiben bei {bisher} und gehen nicht verloren; zurückstellen holt sie wieder.":
    "“{ziel}” gets its own empty sheet. The counts stay with {bisher} and are not lost; switching back brings them up again.",
  "Zu „{ziel}“ wechseln?":
    "Switch to “{ziel}”?",
  "Person eintragen – dann wird automatisch abgeglichen":
    "Enter a person – then syncing happens automatically",
  "Gleicht ab ...":
    "Syncing ...",
  "✓ Abgeglichen":
    "✓ Synced",
  "Datenbank schläft – Zahlen sind gesichert und werden nachgetragen":
    "Database asleep – your counts are safe and will be sent later",
  "Abgleich fehlgeschlagen – wird erneut versucht":
    "Sync failed – will try again",
  "Kein Netz – wird nachgeholt, sobald wieder Empfang da ist":
    "No connection – will catch up as soon as there is reception",
  "DATUM":
    "DATE",
  "Zählst du für den {datum}?":
    "Are you counting for {datum}?",
  "Heute ist {tag}, der {datum}.":
    "Today is {tag}, {datum}.",
  "{n} Pflanzen stehen schon auf diesem Blatt.":
    "{n} plants are already on this sheet.",
  "Wenn du für heute zählst, tippe auf „Auf heute umstellen“.":
    "If you are counting for today, tap “Switch to today”.",
  "Auf heute umstellen":
    "Switch to today",
  "Person wählen – ohne Person wird nichts abgeglichen.":
    "Choose a person – without one nothing is synced.",
  "Ergebnis aller Personen ansehen":
    "View the result for everyone",
  "ABTEILUNG":
    "COMPARTMENT",
  "FLÄCHE m²":
    "AREA m²",
  "Kreis davor":
    "Previous plot",
  "Voriger Kreis":
    "Previous plot",
  "PROBEKREIS":
    "SAMPLE PLOT",
  "{n} Pflanzen":
    "{n} plants",
  "Neuer Kreis":
    "New plot",
  "Nächster Kreis":
    "Next plot",
  "Holt ...":
    "Fetching ...",
  "Zählung aus der Datenbank holen":
    "Fetch the count from the database",
  "Für {wer} steht etwas an diesen Tagen – antippen zum Holen:":
    "There is data for {wer} on these days – tap one to fetch it:",
  "{kreise} Probekreise · {pflanzen} Pflanzen":
    "{kreise} sample plots · {pflanzen} plants",
  "Übersicht ausblenden":
    "Hide overview",
  "Übersicht anzeigen":
    "Show overview",
  "Standorte ausblenden":
    "Hide locations",
  "Standorte anzeigen":
    "Show locations",
  "Schon irgendwo gezählt – erst überall auf 0 setzen, dann entfernbar":
    "Already counted somewhere – set every count to 0 first, then it can be removed",
  "verbissen":
    "browsed",
  "unverbissen":
    "unbrowsed",
  "Baumart ergänzen":
    "Add a species",
  "VORSCHLÄGE":
    "SUGGESTIONS",
  "Bereits kopiert – nur falls nötig hier markieren. Beim automatischen Kopieren fallen die Werte in Excel direkt in die Spalten; wird dieser Text von Hand kopiert, in Excel: Daten › Text in Spalten › Semikolon.":
    "Already copied – select it here only if you need to. Copied automatically, the values drop straight into the columns in Excel; if you copy this text by hand, use Data › Text to Columns › Semicolon in Excel.",
  "Als Datei versuchen":
    "Try as a file",
  "Keine Freigabe für die Kamera":
    "No permission for the camera",
  "AR lässt sich hier nicht starten":
    "AR cannot be started here",
  "Fadenkreuz auf den *Stammfuß* richten – dorthin, wo der Stamm den Boden trifft. Das Handy dabei langsam bewegen, damit der Boden erkannt wird.":
    "Aim the crosshair at the *base of the trunk* – where the stem meets the ground. Move the phone slowly so the ground is detected.",
  "WAAGERECHTE ENTFERNUNG":
    "HORIZONTAL DISTANCE",
  "Boden wird gesucht – Handy langsam schwenken":
    "Looking for the ground – pan the phone slowly",
  "BHD eintragen":
    "Enter the DBH",
  "BAUMART":
    "SPECIES",
  "BHD cm":
    "DBH cm",
  "HÖHE m":
    "HEIGHT m",
  "HÖHE messen":
    "Measure HEIGHT",
  "Formzahl {wert} für {art}":
    "Form factor {wert} for {art}",
  " – Höhenstufe bei {m} m":
    " – height band at {m} m",
  " – Grundwert, die Höhenstufe greift erst mit eingetragener Höhe":
    " – base value; the height band only applies once a height is entered",
  "ERGEBNIS · {n} Baum":
    "RESULT · {n} tree",
  "ERGEBNIS · {n} Bäume":
    "RESULT · {n} trees",
  "Vorrat fm/ha":
    "Growing stock m³/ha",
  "Grundfläche m²/ha":
    "Basal area m²/ha",
  "Stämme/ha":
    "Stems/ha",
  "Fläche eintragen, dann wird auf Hektar hochgerechnet.":
    "Enter the area, then it is scaled up to the hectare.",
  "Summe Grundfläche {g} m² · Summe Volumen {v} fm":
    "Total basal area {g} m² · total volume {v} m³",
  "Mittelhöhe {h} m · Grundflächenmittelstamm {d} cm":
    "Mean height {h} m · quadratic mean diameter {d} cm",
  "Baum entfernen":
    "Remove tree",
  "Die Formzahl beschreibt, wie stark sich der Stamm nach oben verjüngt. Die Werte sind Richtwerte für Derbholz – je nach Alter, Bonität und Herkunft weichen sie ab. Das Volumen ist damit eine Schätzung, keine Massentafel. Eigene Werte gerne eintragen; sie gelten für beide Verfahren.":
    "The form factor describes how much the stem tapers towards the top. These values are rules of thumb for merchantable timber – they vary with age, site class and provenance. The volume is therefore an estimate, not a volume table. Feel free to enter your own values; they apply to both methods.",
  "{n} Höhenstufe":
    "{n} height band",
  "{n} Höhenstufen":
    "{n} height bands",
  "Formzahl {art}":
    "Form factor {art}",
  "Höhenstaffelung ausblenden":
    "Hide height bands",
  "Nach Höhe staffeln (freiwillig)":
    "Band by height (optional)",
  "Eine Formzahl je Baumart ist eine Vereinfachung: Ein schlanker Stangenbestand hat eine andere als derselbe Bestand 60 Jahre später. Wer Werte aus seiner Ertragstafel oder der Betriebsanweisung hat, kann sie hier nach Höhe staffeln.":
    "One form factor per species is a simplification: a slender pole stand has a different one from the same stand 60 years later. If you have values from your yield table or your management instructions, you can band them by height here.",
  "Die App bringt dafür keine Zahlen mit – erfundene Werte wären von richtigen nicht zu unterscheiden und würden jeden Vorrat verschieben. Solange hier nichts steht, gilt der Grundwert von oben, und gerechnet wird genau wie bisher.":
    "The app ships no numbers for this – invented values would be indistinguishable from real ones and would shift every stock figure. As long as nothing is entered here, the base value above applies and the calculation stays exactly as before.",
  "Keine Stufen für {art} – es gilt der Grundwert {wert}.":
    "No bands for {art} – the base value {wert} applies.",
  "BIS m":
    "UP TO m",
  "Stufe {n} bis Meter":
    "Band {n} up to metres",
  "FORMZAHL":
    "FORM FACTOR",
  "Stufe {n} Formzahl":
    "Band {n} form factor",
  "Stufe {n} entfernen":
    "Remove band {n}",
  "+ Stufe":
    "+ Band",
  "So wird gelesen:":
    "Read as:",
  "bis {m} m → {wert}":
    "up to {m} m → {wert}",
  "über {m} m → {wert} (Grundwert)":
    "above {m} m → {wert} (base value)",
  "Grenzstamm schließen":
    "Close borderline tree",
  "Grenzstamm prüfen":
    "Check borderline tree",
  "Für Bäume, bei denen man es nicht sieht: BHD kluppen, Entfernung zur Stammmitte messen. Zählfaktor {k} m²/ha.":
    "For trees you cannot judge by eye: caliper the DBH, measure the distance to the centre of the stem. Basal area factor {k} m²/ha.",
  "BHD des Grenzstamms":
    "DBH of the borderline tree",
  "ENTFERNUNG m":
    "DISTANCE m",
  "Entfernung zum Grenzstamm":
    "Distance to the borderline tree",
  "Entfernung mit AR messen":
    "Measure the distance with AR",
  "GRENZRADIUS":
    "LIMITING DISTANCE",
  "Bäume innerhalb dieser Entfernung werden gezählt":
    "Trees closer than this are counted",
  "zählt mit":
    "counts",
  "zählt nicht":
    "does not count",
  "{m} m innerhalb der Grenze":
    "{m} m inside the limit",
  "{m} m außerhalb der Grenze":
    "{m} m outside the limit",
  "d (waagerecht)":
    "d (horizontal)",
  "Spitze":
    "Top",
  "Fuß":
    "Base",
  "Höhe messen":
    "Measure height",
  "Fadenkreuz auf den Stammfuß richten und antippen, dann auf die Spitze.":
    "Aim the crosshair at the base of the trunk and tap, then at the top.",
  "So geht’s":
    "How it works",
  "So weit vom Baum weg, dass du die Spitze gut siehst – etwa eine Baumlänge. Die Strecke abschreiten oder messen.":
    "Stand far enough from the tree to see the top clearly – about one tree length. Pace out or measure that distance.",
  "Entfernung unten eintragen. *Waagerecht gemeint:* am Hang ist die abgeschrittene Strecke länger als die waagerechte.":
    "Enter the distance below. *Horizontal is meant:* on a slope the paced distance is longer than the horizontal one.",
  "Fadenkreuz auf den *Stammfuß* → „Fuß“ antippen.":
    "Crosshair on the *base of the trunk* → tap “Base”.",
  "Fadenkreuz auf die *Spitze* → „Spitze“ antippen.":
    "Crosshair on the *top* → tap “Top”.",
  "Höhe steht da → „Übernehmen“, dann mit + in die Liste.":
    "The height appears → “Use value”, then + to add it to the list.",
  "Warum zwei Winkel: So fallen Augenhöhe und Hangneigung von selbst heraus – du musst weder deine Körpergröße eintragen noch am Hang nachrechnen.":
    "Why two angles: eye height and slope cancel out by themselves – you need neither enter your body height nor do any extra arithmetic on a slope.",
  "*Bei kleinen Bäumen* – bis etwa {grenze} m Entfernung – kann die App die Entfernung aus dem Fußwinkel schätzen, sobald der Fuß angepeilt ist. Dafür muss die Handyhöhe stimmen und der Boden waagerecht sein. Weiter weg peilt man zu flach: dort macht ein Grad Sensorfehler aus 25 m alles zwischen 20 und 34 m, und die App bietet deshalb gar keine Zahl mehr an.":
    "*For small trees* – up to about {grenze} m away – the app can estimate the distance from the angle to the base, as soon as the base has been sighted. For that the phone height must be right and the ground level. Further away the angle gets too shallow: at 25 m one degree of sensor error turns it into anything between 20 and 34 m, so the app offers no number at all there.",
  "*Zur Probe:* denselben Baum aus zwei verschiedenen Entfernungen messen. Kommt zweimal dasselbe heraus, stimmt die Entfernung. Weichen die Werte ab, lag es daran und nicht am Sensor.":
    "*As a check:* measure the same tree from two different distances. If you get the same result twice, the distance was right. If the values differ, that was the reason – not the sensor.",
  "Häufigster Fehler im Bestand: ein Seitenast wird für die Spitze gehalten. Bei Laubholz mit breiter Krone lieber einen Schritt zur Seite gehen und noch einmal schauen.":
    "The most common mistake in the stand: mistaking a side branch for the top. With broadleaves and wide crowns, take a step sideways and look again.",
  "WAAGERECHTE ENTFERNUNG m":
    "HORIZONTAL DISTANCE m",
  "Entfernung":
    "Distance",
  "HANDYHÖHE m":
    "PHONE HEIGHT m",
  "Handyhöhe über dem Boden":
    "Phone height above the ground",
  "über dem Boden, beim Peilen. Einmal messen – 10 cm daneben sind 6 % Fehler.":
    "above the ground, as you sight. Measure it once – 10 cm out is a 6 % error.",
  "AUS DER NEIGUNG ({grad}° nach unten)":
    "FROM THE TILT ({grad}° downwards)",
  "mindestens {m} m":
    "at least {m} m",
  "{von} – {bis} m":
    "{von} – {bis} m",
  "Als Entfernung übernehmen":
    "Use as the distance",
  "Setzt *waagerechten Boden* zwischen dir und dem Stammfuß voraus – am Hang ist diese Rechnung nicht ungenau, sondern falsch. Dann schreiten oder messen.":
    "Assumes *level ground* between you and the base of the trunk – on a slope this calculation is not imprecise but wrong. Pace it out or measure it instead.",
  "Der Fuß liegt nur {grad}° unter waagerecht. So flach lässt sich die Entfernung nicht mehr schätzen":
    "The base is only {grad}° below horizontal. That is too shallow to estimate the distance",
  " – nach oben ist alles offen.":
    " – and there is no upper bound at all.",
  ": ein Grad Sensorfehler macht daraus {von} bis {bis} m.":
    ": one degree of sensor error turns it into anything from {von} to {bis} m.",
  "Über {grenze} m hilft nur schreiten oder messen.":
    "Beyond {grenze} m, only pacing or measuring will do.",
  "Neigungssensor freigeben":
    "Allow the tilt sensor",
  "FUSS Grad":
    "BASE degrees",
  "Winkel zum Fuß":
    "Angle to the base",
  "SPITZE Grad":
    "TOP degrees",
  "Winkel zur Spitze":
    "Angle to the top",
  "Sucher":
    "Viewfinder",
  "NEIGUNG":
    "TILT",
  "ruhig":
    "steady",
  "wackelt ±{grad}° – ruhiger halten":
    "wobbling ±{grad}° – hold it steadier",
  "anpeilen":
    "sight it",
  "HÖHE":
    "HEIGHT",
  "±{m} m bei 5 % Fehler in der Entfernung":
    "±{m} m at 5 % error in the distance",
  "Winkel lieber eintippen":
    "Type the angles instead",
  "Die Entfernung muss waagerecht sein – am Hang ist die abgeschrittene Strecke länger als die waagerechte. Die Höhe hängt linear daran: zehn Prozent zu weit geschätzt heißt zehn Prozent zu hoch gemessen. Das ist der größte Fehler, nicht der Sensor.":
    "The distance has to be horizontal – on a slope the paced distance is longer than the horizontal one. The height depends on it linearly: ten per cent too far means ten per cent too tall. That is the biggest source of error, not the sensor.",
  "Ohne Kamerabild gilt: Der Winkel gehört zu der Richtung, in die die Rückkamera zeigt – also senkrecht zur Bildschirmfläche, nicht entlang der Oberkante.":
    "Without the camera image: the angle belongs to the direction the rear camera points in – perpendicular to the screen, not along its top edge.",
  "{was} messen":
    "Measure {was}",
  "Kopiert":
    "Copied",
  "Kopieren hier nicht möglich – Werte abtippen":
    "Copying is not possible here – type the values over",
  "Erst Zähler auf 0 setzen":
    "Set the counter to 0 first",
  "ZÄHLFAKTOR m²/ha":
    "BASAL AREA FACTOR m²/ha",
  "ERGEBNIS · {n} gezählte Bäume":
    "RESULT · {n} trees counted",
  "Für den Vorrat fehlt noch mindestens eine gemessene Höhe.":
    "At least one measured height is still missing for the growing stock.",
  "gezählt":
    "counted",
  "HÖHEN":
    "HEIGHTS",
  "Mittel {h} m":
    "Mean {h} m",
  "BHD":
    "DBH",
  "Mittelstamm {d} cm":
    "Mean stem {d} cm",
  "{g} m²/ha":
    "{g} m²/ha",
  " · {v} fm/ha (Formzahl {f})":
    " · {v} m³/ha (form factor {f})",
  "{n} Stämme/ha · Mittelstamm {d} cm":
    "{n} stems/ha · mean stem {d} cm",
  " mit {v} fm":
    " holding {v} m³",
  "FÜR DIE ERTRAGSTAFEL":
    "FOR THE YIELD TABLE",
  "Alter":
    "Age",
  "Alter {art}":
    "Age {art}",
  "Höhe":
    "Height",
  "G":
    "G",
  "Kopieren":
    "Copy",
  "BAUMART ERGÄNZEN":
    "ADD A SPECIES",
  "Ertragstafel-Rechner öffnen ›":
    "Open the yield table calculator ›",
  "Landesforst Brandenburg – Alter, Mittelhöhe und Grundfläche dort eintragen":
    "Landesforst Brandenburg – enter age, mean height and basal area there",
  "Am Standpunkt einmal im Kreis drehen und jeden Baum zählen, der in Brusthöhe breiter erscheint als der Spalt am Zählstab. Grundfläche je Hektar = gezählte Bäume × Zählfaktor; der Vorrat ergibt sich daraus mit der mittleren Höhe und der Formzahl. Trägt man auch Durchmesser ein, kommt der Mittelstamm dazu und daraus die Stammzahl je Hektar.":
    "Turn once in a full circle at the sampling point and count every tree that looks wider at breast height than the gap on the angle gauge. Basal area per hectare = trees counted × basal area factor; the growing stock follows from that with the mean height and the form factor. If you also enter diameters, you get the mean stem and from it the number of stems per hectare.",
  "Datenbank nicht erreichbar – sie schläft vermutlich (kostenloser Tarif, nach etwa einer Woche ohne Nutzung). Sie muss einmal im Supabase-Konto geweckt werden, von allein passiert das nicht. Die eigenen Zahlen auf diesem Gerät sind davon nicht betroffen und werden nachgetragen.":
    "Database unreachable – it is probably asleep (free tier, after about a week without use). It has to be woken once in the Supabase account; that does not happen by itself. Your own counts on this device are unaffected and will be sent later.",
  "Abruf fehlgeschlagen ({status})":
    "Could not fetch ({status})",
  "Kein Aufnahmedatum gesetzt – ohne Datum keine Ausgabe":
    "No survey date set – no output without a date",
  "Für den {datum} gibt es hier keine Einträge":
    "There are no entries here for {datum}",
  "Kein Probekreis hat eine Ortung – es gäbe nichts zu zeigen":
    "No sample plot has a location – there would be nothing to show",
  " – {n} ohne Ortung weggelassen":
    " – {n} left out for lack of a location",
  "Ergebnis":
    "Result",
  "Alle zusammen":
    "Everyone together",
  "Nur diese Person":
    "This person only",
  "ohne Abteilung":
    "no compartment",
  "nur {wer}":
    "{wer} only",
  "alle Personen zusammen":
    "everyone together",
  "Für diese Abteilung und dieses Datum liegt noch nichts vor. Zuerst abgleichen lassen – und prüfen, ob Abteilung und Datum bei allen Personen gleich eingetragen sind.":
    "Nothing has arrived yet for this compartment and date. Let it sync first – and check that compartment and date are entered the same way for everyone.",
  "PROBEKREISE INSGESAMT":
    "SAMPLE PLOTS IN TOTAL",
  "Stk/ha":
    "no./ha",
  "{gesamt} gezählt · {verbissen} verbissen":
    "{gesamt} counted · {verbissen} browsed",
  "ALLE EINTRÄGE ({n})":
    "ALL ENTRIES ({n})",
  "Person":
    "Person",
  "Datum":
    "Date",
  "Kreis":
    "Plot",
  "Baumart":
    "Species",
  "verb.":
    "brw.",
  "unverb.":
    "unbrw.",
  "Die Excel-Datei enthält nur {gebiet} vom {datum} – {n} {eintraege}":
    "The Excel file contains only {gebiet} from {datum} – {n} {eintraege}",
  "die Aufnahme ohne Abteilung":
    "the survey without a compartment",
  "Eintrag":
    "entry",
  "Einträge":
    "entries",
  ", {n} von anderen Tagen bleiben draußen":
    ", {n} from other days are left out",
  "Drei Blätter: Zählungen (je Probekreis und Baumart eine Zeile), Probekreise (je Kreis eine Zeile mit Koordinate und Kartenlink) und Auswertung (je Baumart, über alle Kreise zusammengefasst).":
    "Three sheets: counts (one row per sample plot and species), sample plots (one row per plot with its coordinate and a map link) and summary (one row per species across all plots).",
  "{mitOrt} von {alle} Probekreisen haben eine Koordinate.":
    "{mitOrt} of {alle} sample plots have a coordinate.",
  "Die Geodaten sind eine GeoJSON-Datei (.geojson) mit einem Punkt je Probekreis – zum Öffnen in QGIS, OsmAnd, Organic Maps oder einem anderen Kartenprogramm.":
    "The geodata is a GeoJSON file (.geojson) with one point per sample plot – opens in QGIS, OsmAnd, Organic Maps or any other mapping program.",
  "Für die Excel-Datei fehlt das Aufnahmedatum. Sie soll immer genau einen Tag enthalten – oben ein Datum setzen.":
    "The survey date is missing for the Excel file. It should always contain exactly one day – set a date above.",
  "UTM-Koordinate kopieren":
    "Copy the UTM coordinate",
  "Breite/Länge":
    "Lat/lon",
  "Breite und Länge kopieren":
    "Copy latitude and longitude",
  "Grad":
    "Degrees",
  "Kopieren hier nicht möglich":
    "Copying is not possible here",
  "{was} kopiert":
    "{was} copied",
  "PERSON":
    "PERSON",
  "Person zurück":
    "Previous person",
  "Gewählte Person":
    "Chosen person",
  "Person weiter":
    "Next person",
  "Lage der Probekreise zueinander, Norden oben – ohne Kartenhintergrund, damit es auch ohne Empfang funktioniert.":
    "The sample plots relative to each other, north up – without a map background, so it works without reception too.",
  "Für diesen Tag ist noch kein Standort erfasst. Beim Probekreis oben auf „📍 Standort erfassen“ tippen.":
    "No location has been recorded for this day yet. Tap “📍 Record location” at the sample plot above.",
  "Lageskizze ausblenden":
    "Hide sketch map",
  "Lageskizze anzeigen (ohne Netz)":
    "Show sketch map (works offline)",
  "Zahl eingeben":
    "Enter a number",
  "Eins abziehen":
    "Subtract one",
  "Fünf dazu":
    "Add five",
  "Datei nicht lesbar":
    "File cannot be read",
  "{n} Sollpunkte aus {format} übernommen":
    "{n} target points taken from {format}",
  " ({n} vorhandenen ergänzt)":
    " ({n} existing ones completed)",
  "Punkt enthält Daten – erst Pflanzen löschen":
    "The point holds data – delete its plants first",
  "Der letzte Punkt bleibt stehen":
    "The last point stays",
  "Noch kein Punkt hat eine Koordinate":
    "No point has a coordinate yet",
  "Punkt {nr}":
    "Point {nr}",
  "Neuer Punkt":
    "New point",
  "Punkt":
    "Point",
  "Sollpunkte aus dem Geoprogramm laden":
    "Load target points from your GIS",
  "GeoJSON, CSV (Rechts-/Hochwert oder Länge/Breite), GPX oder KML. Das Format und das Bezugssystem erkennt die App selbst.":
    "GeoJSON, CSV (easting/northing or lon/lat), GPX or KML. The app works out the format and the reference system itself.",
  "{fertig} von {alle} Punkten abgeschlossen · Punkt {nr}":
    "{fertig} of {alle} points completed · point {nr}",
  "(verlegt)":
    "(relocated)",
  ", davon {n} verbissen":
    ", {n} of them browsed",
  "Excel und CSV enthalten alle Punkte in den Spalten der Mastertabelle, eine Zeile je Pflanze. Die Geodaten-Datei (GeoJSON) enthält die Aufnahmepunkte mit Ist- und Soll-Lage für die Wiederholungsaufnahme.":
    "Excel and CSV contain all points in the columns of the master table, one row per plant. The geodata file (GeoJSON) holds the survey points with their actual and target positions for the repeat survey.",
  "Diesen Punkt löschen":
    "Delete this point",
  "— bitte wählen —":
    "— please choose —",
  "— ergibt sich aus den Angaben darüber —":
    "— follows from the entries above —",
  "Rechts- und Hochwert prüfen (UTM 33N)":
    "Check easting and northing (UTM 33N)",
  "Koordinate vom Messstab übernommen":
    "Coordinate taken from the survey pole",
  "A — Allgemeine Aufnahmedaten":
    "A — General survey data",
  "Name Monitorer/in":
    "Name of the surveyor",
  "Vor- und Nachname":
    "First and last name",
  "Untersuchungsgebiet":
    "Survey area",
  "Probekreis-Radius (m)":
    "Plot radius (m)",
  "Probekreisfläche (m²)":
    "Plot area (m²)",
  "Sollpunkt":
    "Target point",
  "➤ Entfernung und Richtung zum Sollpunkt":
    "➤ Distance and bearing to the target point",
  "Ist-Position":
    "Actual position",
  "📍 Position wird gesucht …":
    "📍 Looking for the position …",
  "📍 Mit dem Handy erfassen":
    "📍 Record with the phone",
  "vom Messstab":
    "from the survey pole",
  "vom Handy":
    "from the phone",
  "Vom Messstab (UTM 33N)":
    "From the survey pole (UTM 33N)",
  "Rechtswert":
    "Easting",
  "Hochwert":
    "Northing",
  "Genauigkeit m":
    "Accuracy m",
  "Koordinate vom Messstab eintragen …":
    "Enter a coordinate from the survey pole …",
  "als verlegt vermerkt":
    "noted as relocated",
  "✓ als verlegt vermerkt":
    "✓ noted as relocated",
  "Punkt als verlegt vermerken":
    "Note the point as relocated",
  "Hauptbestand / BZT":
    "Main stand / BZT",
  "Man. ZB1":
    "Man. ZB1",
  "Man. ZB2":
    "Man. ZB2",
  "► Aktiver BZT":
    "► Active BZT",
  "Eine manuelle Zielbaumart überschreibt den Standard-BZT.":
    "A manually chosen target species overrides the default BZT.",
  "Referenzbaum zur Punktverortung":
    "Reference tree for locating the point",
  "Kein geeigneter Referenzbaum vorhanden? Unter „Bemerkungen“ vermerken.":
    "No suitable reference tree? Note it under “Remarks”.",
  "BHD (cm)":
    "DBH (cm)",
  "Winkel (gon)":
    "Angle (gon)",
  "Abstand (m)":
    "Distance (m)",
  "B — Ziel-Profil & Verbissziel":
    "B — Target profile & browsing target",
  "VZ1 tolerierbar · VZ2 kritisch · VZ3 nicht akzeptabel":
    "VZ1 tolerable · VZ2 critical · VZ3 not acceptable",
  "Ziel-Mischung":
    "Target mixture",
  "Ziel-Schichtung":
    "Target layering",
  "Ziel-Struktur horizontal":
    "Target structure, horizontal",
  "Ziel-Profil":
    "Target profile",
  "Verbissziel ZB1 (Haupt-Zielbaumart)":
    "Browsing target ZB1 (main target species)",
  "VZ1 ≤ 20 % · VZ2 ≤ 35 %":
    "VZ1 ≤ 20 % · VZ2 ≤ 35 %",
  "Verbissziel ZB2 (Struktur-/Nebenbaumart)":
    "Browsing target ZB2 (structural / secondary species)",
  "VZ1 ≤ 25 % · VZ2 ≤ 40 %":
    "VZ1 ≤ 25 % · VZ2 ≤ 40 %",
  "C — Bestandesbeschreibung":
    "C — Stand description",
  "Verjüngungsverteilung":
    "Distribution of regeneration",
  "Kronenschluss":
    "Canopy closure",
  "Bodenvegetation":
    "Ground vegetation",
  "Bodenvegetationstyp":
    "Type of ground vegetation",
  "Bis zu drei Angaben.":
    "Up to three entries.",
  "Bodengare":
    "Soil mellowness",
  "Samenbäume vorhanden":
    "Seed trees present",
  "Randeffekte":
    "Edge effects",
  "Hasenverbiss signifikant":
    "Hare browsing significant",
  "Erkennbar am glatten Schrägschnitt.":
    "Recognisable by the clean diagonal cut.",
  "Zäune / Weisergatter":
    "Fences / control exclosures",
  "Bemerkungen":
    "Remarks",
  "Besondere Beobachtungen":
    "Particular observations",
  "Verjüngungsfreundlich":
    "Favourable for regeneration",
  "Aus Kronenschluss, Bodenvegetation, Bodengare, Samenbäumen, Randeffekten und Hasenverbiss.":
    "From canopy closure, ground vegetation, soil mellowness, seed trees, edge effects and hare browsing.",
  "D — Zielbaumarten":
    "D — Target tree species",
  "Nur aktive Baumarten stehen bei der Pflanzenaufnahme zur Wahl. ZB1 = Haupt-Zielbaumart, ZB2 = Struktur-/Nebenbaumart, BW = Begleiter.":
    "Only active species can be chosen when recording plants. ZB1 = main target species, ZB2 = structural / secondary species, BW = companion.",
  "Noch keine Baumart aktiv — ohne aktive Baumart lässt sich keine Pflanze aufnehmen.":
    "No species is active yet — without an active species no plant can be recorded.",
  "— Baumart wählen —":
    "— choose a species —",
  "Höhenklasse fehlt":
    "Height class missing",
  "Baumart wählen":
    "Choose a species",
  "Geändert":
    "Changed",
  "Pflanze {n} ändern":
    "Edit plant {n}",
  "Pflanze {n} von höchstens {max}":
    "Plant {n} of at most {max}",
  "— andere Baumart —":
    "— another species —",
  "andere Baumart …":
    "another species …",
  "Rolle":
    "Role",
  "Höhenklasse":
    "Height class",
  "Merkmale":
    "Characteristics",
  "Änderung speichern":
    "Save the change",
  "+ Pflanze aufnehmen":
    "+ Record plant",
  "ohne Befund":
    "no findings",
  "Pflanze {n} löschen":
    "Delete plant {n}",
  "BZT":
    "BZT",
  "Bestandesbeschreibung":
    "Stand description",
  "Pflanzenaufnahme":
    "Plant records",
  "Pflanzen":
    "Plants",
  "Pflanzen/ha":
    "Plants/ha",
  "Verbiss je Zielbaumartengruppe":
    "Browsing by target species group",
  "keine Pflanzen dieser Gruppe":
    "no plants in this group",
  "Je Baumart":
    "By species",
  "Art":
    "Species",
  "Punkt abschließen":
    "Complete the point",
  "Alle Angaben vollständig.":
    "All entries complete.",
  "✓ Punkt abgeschlossen":
    "✓ Point completed",
  "Keine Punkte in der {format}-Datei gefunden":
    "No points found in the {format} file",
  "Format nicht erkannt":
    "Format not recognised",
  "{art} deaktivieren":
    "Deactivate {art}",
  "Kopf":
    "General",
  "Auswertung":
    "Summary",
  "Baumart aktivieren":
    "Activate a species",
};

/* Werte des amtlichen Aufnahmebogens - ebenfalls nur fuer die ANZEIGE.

   Gespeichert und exportiert wird immer der deutsche Wert: Er ist der
   Inhalt des Bogens, der an die Landesforst zurueckgeht. Uebersetzt wird
   er trotzdem, denn sonst waere die Maske fuer jemanden ohne Deutsch nicht
   bedienbar - "raeumdig" oder "truppweise" raet niemand.

   NICHT uebersetzt sind die Kuerzel: BZT (GKI-RBU), Verbissziel-Stufen
   (VZ1) und Baumart-Kuerzel sind Schluessel, keine Woerter.

   Aufgerufen werden diese Texte ueber Variablen (t(w) in Felder.jsx),
   nicht woertlich - pruefungen/sprache.mjs prueft sie deshalb gegen die
   Stammdaten statt gegen den Quelltext. */
export const WERTE = {
  // Typ der Baumart
  "Nadel": "Conifer",
  "Laub": "Broadleaf",
  // Ja/Nein
  "ja": "yes",
  "nein": "no",
  // Verjuengungsverteilung
  "gleichmäßig": "even",
  "ungleichmäßig": "uneven",
  "truppweise": "in groups",
  "fehlend": "absent",
  // Kronenschluss
  "gedrängt": "crowded",
  "geschlossen": "closed",
  "locker": "loose",
  "licht": "open",
  "räumdig": "sparse",
  "mit Lücken": "with gaps",
  "mit Löchern": "with holes",
  // Bodenvegetation
  "gering": "slight",
  "mittel": "moderate",
  "stark": "heavy",
  "dominant": "dominant",
  // Bodenvegetationstyp
  "Nein": "None",
  "Farn": "Fern",
  "Brombeere": "Bramble",
  "Moos": "Moss",
  "Gräser": "Grasses",
  "Kraut": "Herbs",
  // Bodengare
  "gut": "good",
  "schlecht": "poor",
  // Merkmale je Pflanze
  "Schutz": "Protection",
  "Winterverbiss": "Winter browsing",
  "Fegeschaden": "Fraying damage",
  "Trockenheit": "Drought",
  "Frost": "Frost",
  "Insektenfraß": "Insect damage",
  // Ziel-Mischung
  "Nadeldominiert (≥70 % Nadel)": "Conifer-dominated (≥70 % conifer)",
  "Nadel mit Laubbeimischung": "Conifer with broadleaf admixture",
  "Gleichverteilung Nadel/Laub (je ca. 40–60 %)":
    "Even conifer/broadleaf mix (about 40–60 % each)",
  "Laubdominiert mit Nadelbeimischung": "Broadleaf-dominated with conifer admixture",
  "Laubdominiert (≥70 % Laub)": "Broadleaf-dominated (≥70 % broadleaf)",
  "Diverser Mischwald (≥3 Baumarten, keine >60 %)":
    "Diverse mixed stand (≥3 species, none above 60 %)",
  // Ziel-Schichtung
  "Einschichtig": "Single-layered",
  "Zweischichtig (Ober- und Unterschicht)": "Two-layered (upper and lower storey)",
  "Mehrschichtig (≥3 Schichten)": "Multi-layered (≥3 storeys)",
  // Ziel-Struktur
  "Homogen (gleichmäßige Verteilung)": "Homogeneous (even distribution)",
  "Differenziert (Trupp-/Gruppenstruktur)": "Differentiated (clump/group structure)",
  "Plenter-/dauerwaldähnlich": "Selection-forest-like (continuous cover)",
};

/* Baumarten, nur fuer die Anzeige - siehe artName() in sprache.js.

   Gespeichert bleibt der deutsche Name: Er ist Teil des Schluessels in der
   Datenbank (Person, Datum, Abteilung, Kreis, BAUMART) und steht so in den
   Tabellen des Kollegen. Haenge der gespeicherte Wert an der
   Spracheinstellung, waeren dieselben Baeume je nach Handy zwei
   verschiedene Arten.

   Die englischen Namen sind die gebraeuchlichen Trivialnamen. Wo der
   deutsche Name ungenau ist ("Fichte", "Kiefer" in der Baummessung), steht
   auch im Englischen der kurze Name; wo er genau ist (Stammdaten der
   Landesforst), steht der genaue. */
export const ARTEN = {
  "Fichte": "Spruce",
  "Kiefer": "Pine",
  "Tanne": "Silver fir",
  "Douglasie": "Douglas fir",
  "Lärche": "Larch",
  "Buche": "Beech",
  "Eiche": "Oak",
  "Birke": "Birch",
  "Erle": "Alder",
  "Esche": "Ash",
  "Ahorn": "Maple",
  "Linde": "Lime",
  "Pappel": "Poplar",
  "Buche Saat": "Beech, sown",
  "Buche alt": "Beech, old",
  "Eiche Saat": "Oak, sown",
  "Eiche alt": "Oak, old",
  "Trauben-Eiche": "Sessile oak",
  "Stiel-Eiche": "Pedunculate oak",
  "Sand-Birke": "Silver birch",
  "Faulbaum": "Alder buckthorn",
  "Eberesche": "Rowan",
  "Zitterpappel": "Aspen",
  "Hainbuche": "Hornbeam",
  "Winter-Linde": "Small-leaved lime",
  "Spitz-Ahorn": "Norway maple",
  "Berg-Ahorn": "Sycamore maple",
  "Schwarz-Erle": "Black alder",
  "Robinie": "Black locust",
  "Späte Traubenkirsche": "Black cherry",
  "Weide": "Willow",
  "Ulme": "Elm",
  "Gemeine Kiefer": "Scots pine",
  "Gemeine Fichte": "Norway spruce",
  "Europ. Lärche": "European larch",
  "Japan. Lärche": "Japanese larch",
  "Weißtanne": "Silver fir",
  "Schwarzkiefer": "Austrian pine",
  "Küstentanne": "Grand fir",
  "Rot-Buche": "Common beech",
  "Gem. Esche": "Common ash",
  "Feld-Ahorn": "Field maple",
  "Sommer-Linde": "Large-leaved lime",
  "Moor-Birke": "Downy birch",
  "Sal-Weide": "Goat willow",
  "Bruch-Weide": "Crack willow",
  "Weiß-Erle": "Grey alder",
  "Vogelkirsche": "Wild cherry",
  "Eibe": "Yew",
  "Feld-Ulme": "Field elm",
  "Berg-Ulme": "Wych elm",
  "Walnuss": "Common walnut",
  "Schwarznuss": "Black walnut",
  "Rot-Eiche": "Red oak",
  "Edelkastanie": "Sweet chestnut",
  "Wildbirne": "Wild pear",
  "Wildapfel": "Crab apple",
  "Spätbl. Traubenkirsche": "Black cherry",
  "Frühbl. Traubenkirsche": "Bird cherry",
  "Sonstige Laubbäume": "Other broadleaves",
  "Sonstige Nadelbäume": "Other conifers",
};
