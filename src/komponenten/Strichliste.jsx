/* Zeigt den Zaehlerstand als Strichliste (Fuenferbuendel mit Querstrich).
   Ab 12 Buendeln wird abgekuerzt, sonst wird die Box zu hoch. */
export default function Strichliste({ n, color }) {
  if (n === 0) return null;

  const buendel = Math.floor(n / 5);
  const rest = n % 5;
  const gruppen = [];
  for (let i = 0; i < buendel; i++) gruppen.push(5);
  if (rest) gruppen.push(rest);

  const sichtbar = gruppen.slice(0, 12);
  const abgekuerzt = gruppen.length > 12;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {sichtbar.map((anzahl, i) => (
        <svg key={i} width="22" height="16" viewBox="0 0 22 16" aria-hidden="true">
          {[0, 1, 2, 3].slice(0, Math.min(anzahl, 4)).map((strich) => (
            <line
              key={strich}
              x1={3 + strich * 4.5}
              y1="2"
              x2={3 + strich * 4.5}
              y2="14"
              stroke={color}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ))}
          {anzahl === 5 && (
            <line x1="1.5" y1="13" x2="19" y2="3" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
          )}
        </svg>
      ))}
      {abgekuerzt && <span style={{ color, fontSize: 12, alignSelf: "center" }}>…</span>}
    </div>
  );
}
