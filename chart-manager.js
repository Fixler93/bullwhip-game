// chart-manager.js
// Handles all chart rendering and data visualization

export class ChartManager {
  static renderLineChart(data, width = 400, height = 200, options = {}) {
    const {
      color = '#3B82F6',
      showPoints = true,
      showGrid = true,
      maxValue = null,
      minValue = 0
    } = options;

    if (!data || data.length === 0) {
      return null;
    }

    const max = maxValue || Math.max(...data, 10);
    const min = minValue;
    const range = max - min;

    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Generate points
    const points = data.map((value, index) => {
      const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
      return { x, y, value };
    });

    // Create path
    const pathData = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
    ).join(' ');

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {showGrid && (
          <g opacity="0.1">
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const y = padding.top + chartHeight * (1 - ratio);
              return (
                <line
                  key={ratio}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#000"
                  strokeWidth="1"
                />
              );
            })}
          </g>
        )}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />

        {/* Data line */}
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Area fill */}
        <path
          d={`${pathData} L ${width - padding.right},${height - padding.bottom} L ${padding.left},${height - padding.bottom} Z`}
          fill={color}
          opacity="0.1"
        />

        {/* Data points */}
        {showPoints && points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="4"
            fill={color}
            stroke="white"
            strokeWidth="2"
          />
        ))}

        {/* Y-axis labels */}
        {[max, max * 0.5, 0].map((value, index) => {
          const y = padding.top + chartHeight * (index / 2);
          return (
            <text
              key={value}
              x={padding.left - 10}
              y={y}
              textAnchor="end"
              alignmentBaseline="middle"
              className="text-xs fill-gray-600"
            >
              {Math.round(value)}
            </text>
          );
        })}
      </svg>
    );
  }

  static renderBarChart(data, width = 400, height = 200, options = {}) {
    const {
      color = '#3B82F6',
      maxValue = null,
      labels = []
    } = options;

    if (!data || data.length === 0) {
      return null;
    }

    const max = maxValue || Math.max(...data, 1);
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = chartWidth / data.length * 0.8;
    const gap = chartWidth / data.length * 0.2;

    return (
      <svg width={width} height={height}>
        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />

        {/* Bars */}
        {data.map((value, index) => {
          const barHeight = (value / max) * chartHeight;
          const x = padding.left + index * (barWidth + gap) + gap / 2;
          const y = height - padding.bottom - barHeight;

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={color}
                opacity="0.8"
              />
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-xs font-bold"
                fill={color}
              >
                {value}
              </text>
              {labels[index] && (
                <text
                  x={x + barWidth / 2}
                  y={height - padding.bottom + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {labels[index]}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  static renderMultiLineChart(datasets, width = 800, height = 300, options = {}) {
    const {
      showLegend = true,
      showGrid = true,
      legendPosition = 'bottom'
    } = options;

    if (!datasets || datasets.length === 0) {
      return null;
    }

    // Find global min/max
    const allValues = datasets.flatMap(ds => ds.data);
    const max = Math.max(...allValues, 10);
    const min = 0;
    const range = max - min;

    const padding = { top: 30, right: 30, bottom: 60, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    return (
      <svg width={width} height={height}>
        {/* Grid */}
        {showGrid && (
          <g opacity="0.1">
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const y = padding.top + chartHeight * (1 - ratio);
              return (
                <line
                  key={ratio}
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#000"
                  strokeWidth="1"
                />
              );
            })}
          </g>
        )}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="#666"
          strokeWidth="2"
        />

        {/* Data lines */}
        {datasets.map((dataset, dsIndex) => {
          const points = dataset.data.map((value, index) => {
            const x = padding.left + (index / (dataset.data.length - 1 || 1)) * chartWidth;
            const y = padding.top + chartHeight - ((value - min) / range) * chartHeight;
            return { x, y };
          });

          const pathData = points.map((p, i) => 
            `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
          ).join(' ');

          return (
            <path
              key={dsIndex}
              d={pathData}
              fill="none"
              stroke={dataset.color}
              strokeWidth="2.5"
              opacity="0.8"
            />
          );
        })}

        {/* Y-axis labels */}
        {[max, max * 0.5, 0].map((value, index) => {
          const y = padding.top + chartHeight * (index / 2);
          return (
            <text
              key={value}
              x={padding.left - 10}
              y={y}
              textAnchor="end"
              alignmentBaseline="middle"
              className="text-xs fill-gray-600"
            >
              {Math.round(value)}
            </text>
          );
        })}

        {/* Legend */}
        {showLegend && legendPosition === 'bottom' && (
          <g transform={`translate(${width / 2 - (datasets.length * 70)}, ${height - 30})`}>
            {datasets.map((dataset, index) => (
              <g key={index} transform={`translate(${index * 140}, 0)`}>
                <line
                  x1="0"
                  y1="0"
                  x2="20"
                  y2="0"
                  stroke={dataset.color}
                  strokeWidth="3"
                />
                <text
                  x="25"
                  y="0"
                  alignmentBaseline="middle"
                  className="text-xs fill-gray-700"
                >
                  {dataset.label}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
    );
  }

  static renderAreaChart(data, width = 400, height = 200, options = {}) {
    const {
      color = '#3B82F6',
      gradient = true
    } = options;

    if (!data || data.length === 0) {
      return null;
    }

    const max = Math.max(...data, 10);
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points = data.map((value, index) => {
      const x = padding.left + (index / (data.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - (value / max) * chartHeight;
      return { x, y };
    });

    const pathData = points.map((p, i) => 
      `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
    ).join(' ');

    const areaPath = `${pathData} L ${width - padding.right},${height - padding.bottom} L ${padding.left},${height - padding.bottom} Z`;

    return (
      <svg width={width} height={height}>
        {gradient && (
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
        )}

        <path
          d={areaPath}
          fill={gradient ? 'url(#areaGradient)' : color}
          opacity={gradient ? 1 : 0.3}
        />

        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
        />
      </svg>
    );
  }

  static renderSparkline(data, width = 100, height = 30, color = '#3B82F6') {
    if (!data || data.length === 0) {
      return null;
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} style={{ display: 'block' }}>
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
      </svg>
    );
  }
}

export default ChartManager;
