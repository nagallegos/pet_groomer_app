interface AnalyticsLineChartPoint {
  label: string;
  value: number;
}

interface AnalyticsLineChartProps {
  points: AnalyticsLineChartPoint[];
  color?: string;
  ariaLabel: string;
  formatValue?: (value: number) => string;
  detailsLabel?: string;
}

export default function AnalyticsLineChart({
  points,
  color = "#2f6b5c",
  ariaLabel,
  formatValue = (value) => value.toString(),
  detailsLabel = "View Data Points",
}: AnalyticsLineChartProps) {
  const width = 720;
  const height = 240;
  const padding = 24;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(...points.map((point) => point.value), 1);

  const getX = (index: number) => {
    if (points.length === 1) {
      return width / 2;
    }

    return padding + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (value: number) =>
    height - padding - (value / maxValue) * chartHeight;

  const polylinePoints = points
    .map((point, index) => `${getX(index)},${getY(point.value)}`)
    .join(" ");

  const guideValues = [0, maxValue / 2, maxValue];

  return (
    <div className="analytics-chart-shell">
      <svg
        className="analytics-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
      >
        {guideValues.map((value) => (
          <g key={value}>
            <line
              x1={padding}
              x2={width - padding}
              y1={getY(value)}
              y2={getY(value)}
              className="analytics-grid-line"
            />
            <text
              x={padding - 8}
              y={getY(value) + 4}
              textAnchor="end"
              className="analytics-axis-label"
            >
              {formatValue(Math.round(value))}
            </text>
          </g>
        ))}

        <polyline
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={polylinePoints}
        />

        {points.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle
              cx={getX(index)}
              cy={getY(point.value)}
              r="4"
              fill={color}
            />
          </g>
        ))}
      </svg>

      <details className="analytics-details">
        <summary className="analytics-details-summary">{detailsLabel}</summary>
        <ul className="analytics-chart-labels" aria-label={detailsLabel}>
          {points.map((point, index) => (
            <li key={`${point.label}-${index}`} className="analytics-chart-label-item">
              <span className="analytics-chart-label-text">{point.label}</span>
              <span className="analytics-chart-label-value">
                {formatValue(point.value)}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
