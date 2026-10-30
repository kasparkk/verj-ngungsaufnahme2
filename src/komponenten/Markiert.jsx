/* Ein uebersetzter Satz, in dem ein Teil fett steht.

   Warum nicht einfach <b> mitten in den Satz: Dann muesste der Satz zum
   Uebersetzen in drei Stuecke zerfallen ("Fadenkreuz auf den", "Stammfuß",
   "richten"), und im Englischen stehen die Stuecke in anderer Reihenfolge.
   Mit Sternchen bleibt der Satz ein Satz:

       <Markiert text={t("Fadenkreuz auf den *Stammfuß* richten")} />

   Uebersetzt wird vorher, von t() - deshalb findet pruefungen/sprache.mjs
   diese Texte wie jeden anderen auch. */
export default function Markiert({ text }) {
  return String(text)
    .split(/(\*[^*]+\*)/)
    .filter((teil) => teil !== "")
    .map((teil, i) =>
      teil.startsWith("*") && teil.endsWith("*") ? (
        <b key={i}>{teil.slice(1, -1)}</b>
      ) : (
        <span key={i}>{teil}</span>
      ),
    );
}
