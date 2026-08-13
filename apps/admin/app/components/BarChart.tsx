type Props = {
  values: number[];
  labels: string[];
  height?: number;
};

// Vertical monthly bar chart (inline SVG, no dependency — same mold as Sparkline).
export default function BarChart({ values, labels, height = 120 }: Props) {
  const width = 440;
  const labelH = 16;
  const chartH = height - labelH;
  const max = Math.max(1, ...values);
  const barW = width / values.length;
  const gap = Math.min(8, barW * 0.25);

  return (
    <svg
      className="bar-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Monthly values: ${values.join(', ')}`}
    >
      {values.map((v, i) => {
        const barHeight = Math.max(v > 0 ? 3 : 1, (v / max) * (chartH - 14));
        return (
          <g key={i}>
            <rect
              className="bar-chart__bar"
              x={i * barW + gap / 2}
              y={chartH - barHeight}
              width={barW - gap}
              height={barHeight}
              rx={2}
            />
            {v > 0 && (
              <text className="bar-chart__value" x={i * barW + barW / 2} y={chartH - barHeight - 4} textAnchor="middle">
                {v}
              </text>
            )}
            <text className="bar-chart__label" x={i * barW + barW / 2} y={height - 3} textAnchor="middle">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
