import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle, G, Defs, LinearGradient, Stop, Rect, Text as SvgText } from 'react-native-svg';

const PADDING = { top: 10, right: 55, bottom: 28, left: 8 };
const GRID_COLOR = '#1e293b';

const COLORS = {
  price: '#3b82f6',
  sma20: '#f59e0b',
  sma50: '#ef4444',
  ema12: '#22c55e',
  ema26: '#a855f7',
  bbUpper: '#6366f1',
  bbLower: '#6366f1',
  bbMiddle: '#818cf8',
};

const PriceLineChart = ({
  candles = [],
  indicators = null,
  height = 280,
  decimals = 2,
  showVolume = true,
}) => {
  const screenWidth = Dimensions.get('window').width;
  const width = Math.min(screenWidth - 40, 900);

  const chartData = useMemo(() => {
    if (!candles || candles.length === 0) return null;

    const maxPoints = Math.min(candles.length, 80);
    const visible = candles.slice(-maxPoints);

    const closes = visible.map(c => c.close);
    const volumes = visible.map(c => c.volume || 0);

    // Collect all values to find y range (include indicator values)
    let allValues = [...closes];
    const indicatorLines = [];

    if (indicators) {
      const addLine = (key, data, color, label) => {
        if (!data || data.length === 0) return;
        const sliced = data.slice(-maxPoints);
        const validValues = sliced.filter(v => v != null && !isNaN(v));
        if (validValues.length === 0) return;
        allValues = [...allValues, ...validValues];
        indicatorLines.push({ key, data: sliced, color, label });
      };

      addLine('sma20', indicators.sma20, COLORS.sma20, 'SMA 20');
      addLine('sma50', indicators.sma50, COLORS.sma50, 'SMA 50');
      addLine('ema12', indicators.ema12, COLORS.ema12, 'EMA 12');
      addLine('ema26', indicators.ema26, COLORS.ema26, 'EMA 26');

      if (indicators.bollingerBands && indicators.bollingerBands.length > 0) {
        const bbSliced = indicators.bollingerBands.slice(-maxPoints);
        const upperVals = bbSliced.map(b => b?.upper).filter(v => v != null);
        const lowerVals = bbSliced.map(b => b?.lower).filter(v => v != null);
        if (upperVals.length > 0) {
          allValues = [...allValues, ...upperVals, ...lowerVals];
          indicatorLines.push({
            key: 'bbUpper', data: bbSliced.map(b => b?.upper), color: COLORS.bbUpper, label: 'BB Upper', dashed: true,
          });
          indicatorLines.push({
            key: 'bbLower', data: bbSliced.map(b => b?.lower), color: COLORS.bbLower, label: 'BB Lower', dashed: true,
          });
        }
      }
    }

    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const range = maxVal - minVal || 1;
    const pad = range * 0.05;

    const volumeH = showVolume ? 30 : 0;
    const chartW = width - PADDING.left - PADDING.right;
    const chartH = height - PADDING.top - PADDING.bottom - volumeH;
    const stepX = chartW / (visible.length - 1 || 1);

    const scaleY = (val) => {
      if (val == null || isNaN(val)) return null;
      return PADDING.top + chartH - ((val - (minVal - pad)) / (range + pad * 2)) * chartH;
    };
    const scaleX = (i) => PADDING.left + i * stepX;

    // Build close price path
    const buildPath = (values) => {
      let d = '';
      let started = false;
      values.forEach((val, i) => {
        if (val == null || isNaN(val)) return;
        const x = scaleX(i);
        const y = scaleY(val);
        if (y == null) return;
        if (!started) {
          d += `M ${x} ${y}`;
          started = true;
        } else {
          d += ` L ${x} ${y}`;
        }
      });
      return d;
    };

    // Area fill path
    const closeAreaPath = () => {
      const pathD = buildPath(closes);
      if (!pathD) return '';
      const lastX = scaleX(visible.length - 1);
      const firstX = scaleX(0);
      const bottomY = PADDING.top + chartH;
      return `${pathD} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    };

    // Current price dot
    const lastClose = closes[closes.length - 1];
    const lastPoint = { x: scaleX(visible.length - 1), y: scaleY(lastClose) };

    // Grid lines
    const gridLines = [];
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const price = minVal - pad + ((range + pad * 2) / gridCount) * i;
      gridLines.push({ y: scaleY(price), price });
    }

    // Time labels
    const timeLabels = [];
    const labelInterval = Math.max(1, Math.floor(visible.length / 5));
    for (let i = 0; i < visible.length; i += labelInterval) {
      const c = visible[i];
      const x = scaleX(i);
      const date = new Date(c.timestamp * 1000);
      const label = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      timeLabels.push({ x, label });
    }

    // Volume bars
    const maxVol = Math.max(...volumes, 1);
    const volBars = showVolume ? visible.map((c, i) => {
      const isBull = c.close >= c.open;
      const barH = (volumes[i] / maxVol) * volumeH;
      const barW = Math.max(stepX * 0.6, 2);
      return {
        x: scaleX(i) - barW / 2,
        y: height - PADDING.bottom - barH,
        w: barW,
        h: Math.max(barH, 1),
        color: isBull ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)',
      };
    }) : [];

    // Indicator paths
    const indicatorPaths = indicatorLines.map(line => ({
      ...line,
      path: buildPath(line.data),
    }));

    return {
      closePath: buildPath(closes),
      areaPath: closeAreaPath(),
      lastPoint,
      lastClose,
      gridLines,
      timeLabels,
      volBars,
      indicatorPaths,
      chartH,
    };
  }, [candles, indicators, width, height, decimals, showVolume]);

  if (!chartData) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noData}>No price data</Text>
      </View>
    );
  }

  const { closePath, areaPath, lastPoint, lastClose, gridLines, timeLabels, volBars, indicatorPaths } = chartData;

  return (
    <View style={styles.container}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3b82f6" stopOpacity="0.25" />
            <Stop offset="1" stopColor="#3b82f6" stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Grid */}
        {gridLines.map((g, i) => (
          <G key={`grid-${i}`}>
            <Line
              x1={PADDING.left} y1={g.y}
              x2={width - PADDING.right} y2={g.y}
              stroke={GRID_COLOR} strokeWidth={1} strokeDasharray="4,3"
            />
            <SvgText
              x={width - PADDING.right + 6} y={g.y + 4}
              fontSize={10} fill="#64748b" textAnchor="start"
            >
              {g.price.toFixed(decimals)}
            </SvgText>
          </G>
        ))}

        {/* Volume bars */}
        {volBars.map((bar, i) => (
          <Rect
            key={`vol-${i}`}
            x={bar.x} y={bar.y}
            width={bar.w} height={bar.h}
            fill={bar.color} rx={1}
          />
        ))}

        {/* Area fill */}
        {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}

        {/* Indicator lines */}
        {indicatorPaths.map((ip) => (
          ip.path ? (
            <Path
              key={ip.key}
              d={ip.path}
              stroke={ip.color}
              strokeWidth={1.5}
              fill="none"
              strokeDasharray={ip.dashed ? '5,4' : undefined}
            />
          ) : null
        ))}

        {/* Close price line */}
        {closePath ? (
          <Path d={closePath} stroke={COLORS.price} strokeWidth={2} fill="none" />
        ) : null}

        {/* Current price dot */}
        {lastPoint.y != null && (
          <>
            <Circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={COLORS.price} />
            <Circle cx={lastPoint.x} cy={lastPoint.y} r={7} fill={COLORS.price} opacity={0.2} />
          </>
        )}

        {/* Bottom axis */}
        <Line
          x1={PADDING.left}
          y1={height - PADDING.bottom}
          x2={width - PADDING.right}
          y2={height - PADDING.bottom}
          stroke="#334155" strokeWidth={1}
        />

        {/* Time labels */}
        {timeLabels.map((tl, i) => (
          <SvgText
            key={`time-${i}`}
            x={tl.x} y={height - PADDING.bottom + 16}
            fontSize={10} fill="#64748b" textAnchor="middle"
          >
            {tl.label}
          </SvgText>
        ))}
      </Svg>

      {/* Legend */}
      {indicatorPaths.length > 0 && (
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.price }]} />
            <Text style={styles.legendText}>Close</Text>
          </View>
          {indicatorPaths.map(ip => (
            <View key={ip.key} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: ip.color }]} />
              <Text style={styles.legendText}>{ip.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    overflow: 'hidden',
  },
  noData: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 40,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
});

export default PriceLineChart;
