import { farben } from "../konfiguration.js";

/* Alle Kreise dieser Aufnahme auf einen Blick: eine Zeile je Kreis, eine
   Spalte je Baumart, Werte als "verbissen / unverbissen".
   Rein lokal - zeigt auch, was noch nicht abgeglichen ist. */
export default function UebersichtTabelle({ arten, kreise }) {
  return (
    <div
      style={{
        overflowX: "auto",
        marginBottom: 14,
        border: `1px solid ${farben.line}`,
        borderRadius: 10,
      }}
    >
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "6px 8px",
                color: farben.muted,
                position: "sticky",
                left: 0,
                background: farben.surface,
                whiteSpace: "nowrap",
              }}
            >
              Kreis
            </th>
            {arten.map((art) => (
              <th
                key={art.id}
                style={{
                  padding: "6px 8px",
                  color: farben.muted,
                  whiteSpace: "nowrap",
                  fontWeight: 600,
                }}
              >
                {art.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {kreise.map((kreis) => (
            <tr key={kreis.nr} style={{ borderTop: `1px solid ${farben.line}` }}>
              <td
                style={{
                  padding: "6px 8px",
                  fontWeight: 700,
                  position: "sticky",
                  left: 0,
                  background: farben.bg,
                }}
              >
                {kreis.nr}
              </td>
              {arten.map((art) => {
                const zahl = kreis.counts[art.id] || { v: 0, u: 0 };
                return (
                  <td
                    key={art.id}
                    style={{ padding: "6px 8px", textAlign: "center", whiteSpace: "nowrap" }}
                  >
                    <span style={{ color: farben.verb }}>{zahl.v || 0}</span>
                    <span style={{ color: farben.muted }}>/</span>
                    <span style={{ color: farben.unverb }}>{zahl.u || 0}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
