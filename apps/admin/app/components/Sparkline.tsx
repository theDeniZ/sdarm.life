type Props = {
  values: number[];
  width?: number;
  height?: number;
};

export default function Sparkline({ values, width = 220, height = 44 }: Props) {
  const max = Math.max(1, ...values);
  const barW = width / values.length;
  const gap = Math.min(4, barW * 0.2);

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      {values.map((v, i) => {
        const barHeight = Math.max(2, (v / max) * height);
        return (
          <rect key={i} x={i * barW + gap / 2} y={height - barHeight} width={barW - gap} height={barHeight} rx={1.5} />
        );
      })}
    </svg>
  );
}
