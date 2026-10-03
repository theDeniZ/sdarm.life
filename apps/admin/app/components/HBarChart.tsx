type Props = {
  // `detail` replaces the number in the value column (e.g. a formatted size);
  // `sub` is a muted second line under the label (e.g. which songbook).
  rows: { label: string; value: number; detail?: string; sub?: string }[];
};

// Horizontal bar chart (inline SVG-free — plain divs scale cleanly with text).
export default function HBarChart({ rows }: Props) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="hbar-chart">
      {rows.map((row) => (
        <div className="hbar-chart__row" key={`${row.label}|${row.sub ?? ''}`}>
          <span className="hbar-chart__label" title={row.sub ? `${row.label} — ${row.sub}` : row.label}>
            {row.label}
            {row.sub && <span className="hbar-chart__sub">{row.sub}</span>}
          </span>
          <div className="hbar-chart__track">
            <div className="hbar-chart__bar" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <span className="hbar-chart__value">{row.detail ?? row.value}</span>
        </div>
      ))}
    </div>
  );
}
