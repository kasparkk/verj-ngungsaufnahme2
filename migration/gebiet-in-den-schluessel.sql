-- Das Gebiet gehoert in den Schluessel.
--
-- Bisher galt eine Zeile als dieselbe, wenn Person, Datum, Kreis und Baumart
-- uebereinstimmten. Zwei Abteilungen mit derselben Kreisnummer am selben Tag
-- waren damit dieselbe Zeile - die zweite ueberschrieb die erste, ohne
-- Meldung. Nachgestellt und an einer Kopie der echten Daten geprueft.
--
-- NULLS NOT DISTINCT: eine leere Abteilung soll sich wie ein Wert verhalten,
-- sonst legte jeder Abgleich ohne Gebiet eine neue Zeile an.

begin;

alter table verjuengung
  drop constraint verjuengung_trupp_aufnahmedatum_kreis_baumart_key;

create unique index verjuengung_schluessel
  on verjuengung (trupp, aufnahmedatum, abteilung, kreis, baumart)
  nulls not distinct;

commit;
