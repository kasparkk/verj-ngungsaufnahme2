import { farben } from "../konfiguration.js";

/* Skizze zur Hoehenmessung.

   Ein Bild erklaert in zwei Sekunden, wofuer der Text drei Saetze
   braucht - vor allem, dass die Entfernung WAAGERECHT gemeint ist und
   dass zwei Winkel gebraucht werden.

   Selbstgezeichnet statt Bilddatei: so bleibt sie im dunklen Design
   lesbar, skaliert mit und kostet keinen Ladevorgang im Funkloch. */
export default function HoeheSkizze() {
  const boden = 112;      // Hoehe der Gelaendelinie
  const augeX = 26;       // Standort des Messenden
  const augeY = 74;       // Augenhoehe
  const baumX = 266;      // Stamm
  const spitzeY = 16;     // Baumspitze
  const strich = farben.line;

  return (
    <svg viewBox="0 0 300 132" style={{ width: "100%", display: "block" }} aria-hidden="true">
      {/* Gelaende */}
      <line x1="4" y1={boden} x2="296" y2={boden} stroke={strich} strokeWidth="1.5" />

      {/* Baum: Stamm und Krone */}
      <line x1={baumX} y1={boden} x2={baumX} y2={spitzeY + 6} stroke={farben.muted} strokeWidth="3" />
      <path
        d={`M${baumX} ${spitzeY} L${baumX - 20} ${boden - 18} L${baumX + 20} ${boden - 18} Z`}
        fill={farben.surfaceHi}
        stroke={farben.muted}
        strokeWidth="1.2"
      />

      {/* Messender mit Handy */}
      <circle cx={augeX} cy={augeY - 8} r="5" fill="none" stroke={farben.muted} strokeWidth="1.3" />
      <line x1={augeX} y1={augeY - 3} x2={augeX} y2={boden} stroke={farben.muted} strokeWidth="1.3" />
      <rect x={augeX + 5} y={augeY - 10} width="7" height="11" rx="1.5"
            fill={farben.surfaceHi} stroke={farben.unverb} strokeWidth="1.2" />

      {/* Waagerechte Entfernung - der Bezug, auf den alles ankommt */}
      <line x1={augeX} y1={augeY} x2={baumX} y2={augeY}
            stroke={farben.muted} strokeWidth="1" strokeDasharray="4 3" />
      <text x={(augeX + baumX) / 2} y={augeY - 5} fill={farben.muted}
            fontSize="9" textAnchor="middle">d (waagerecht)</text>

      {/* Peilung zur Spitze */}
      <line x1={augeX} y1={augeY} x2={baumX} y2={spitzeY}
            stroke={farben.unverb} strokeWidth="1.6" />
      <text x={augeX + 46} y={augeY - 17} fill={farben.unverb} fontSize="9">Spitze</text>

      {/* Peilung zum Stammfuss */}
      <line x1={augeX} y1={augeY} x2={baumX} y2={boden}
            stroke={farben.verb} strokeWidth="1.6" />
      <text x={augeX + 52} y={augeY + 24} fill={farben.verb} fontSize="9">Fuß</text>

      {/* Die gesuchte Hoehe */}
      <line x1={baumX + 16} y1={spitzeY} x2={baumX + 16} y2={boden}
            stroke={farben.text} strokeWidth="1" />
      <line x1={baumX + 12} y1={spitzeY} x2={baumX + 20} y2={spitzeY}
            stroke={farben.text} strokeWidth="1" />
      <line x1={baumX + 12} y1={boden} x2={baumX + 20} y2={boden}
            stroke={farben.text} strokeWidth="1" />
      <text x={baumX + 22} y={(spitzeY + boden) / 2} fill={farben.text} fontSize="11" fontWeight="700">h</text>
    </svg>
  );
}
