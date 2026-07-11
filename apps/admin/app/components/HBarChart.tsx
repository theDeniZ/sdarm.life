type Props = {
  rows: { label: string; value: number; detail?: string }[];
};

// Horizontal bar chart (inline SVG-free — plain divs scale cleanly with text).
export default function HBarChart({ rows }: Props) {
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <div className="hbar-chart">
      {rows.map((row) => (
        <div className="hbar-chart__row" key={row.label}>
          <span className="hbar-chart__label" title={row.label}>
            {row.label}
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
