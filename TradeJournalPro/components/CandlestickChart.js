import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, G, Text as SvgText } from 'react-native-svg';

const PADDING = { top: 10, right: 55, bottom: 28, left: 8 };
const AXIS_COLOR = '#334155';
const GRID_COLOR = '#1e293b';
const BULL_COLOR = '#22c55e';
const BEAR_COLOR = '#ef4444';
const DOJI_COLOR = '#94a3b8';

const CandlestickChart = ({ candles = [], height = 300, decimals = 2 }) => {
  const screenWidth = Dimensions.get('window').width;
  const width = Math.min(screenWidth - 40, 900);

  const chartData = useMemo(() => {
    if (!candles || candles.length === 0) return null;

    // Limit visible candles for performance
    const maxCandles = Math.min(candles.length, 80);
    const visible = candles.slice(-maxCandles);

    const allHighs = visible.map(c => c.high);
    const allLows = visible.map(c => c.low);
    const maxPrice = Math.max(...allHighs);
    const minPrice = Math.min(...allLows);
    const priceRange = maxPrice - minPrice || 1;
    const pricePad = priceRange * 0.05;

    const chartW = width - PADDING.left - PADDING.right;
    const chartH = height - PADDING.top - PADDING.bottom;
    const candleFullW = chartW / visible.length;
    const candleBodyW = Math.max(candleFullW * 0.65, 2);
    const wickW = Math.max(1, candleBodyW * 0.15);

    const scaleY = (price) => {
      return PADDING.top + chartH - ((price - (minPrice - pricePad)) / (priceRange + pricePad * 2)) * chartH;
    };

    // Price grid lines (5 levels)
    const gridLines = [];
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const price = minPrice - pricePad + ((priceRange + pricePad * 2) / gridCount) * i;
      gridLines.push({ y: scaleY(price), price });
    }

    // Time labels (max 5)
    const timeLabels = [];
    const labelInterval = Math.max(1, Math.floor(visible.length / 5));
    for (let i = 0; i < visible.length; i += labelInterval) {
      const c = visible[i];
      const x = PADDING.left + i * candleFullW + candleFullW / 2;
      const date = new Date(c.timestamp * 1000);
      const label = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      timeLabels.push({ x, label });
    }

    // Build candle shapes
    const candleShapes = visible.map((c, i) => {
      const x = PADDING.left + i * candleFullW + candleFullW / 2;
      const isBull = c.close >= c.open;
      const color = c.close === c.open ? DOJI_COLOR : isBull ? BULL_COLOR : BEAR_COLOR;

      const bodyTop = scaleY(isBull ? c.close : c.open);
      const bodyBottom = scaleY(isBull ? c.open : c.close);
      const bodyH = Math.max(bodyBottom - bodyTop, 1);

      const wickTop = scaleY(c.high);
      const wickBottom = scaleY(c.low);

      return { x, bodyTop, bodyH, bodyW: candleBodyW, wickTop, wickBottom, wickW, color };
    });

    return { candleShapes, gridLines, timeLabels, maxPrice, minPrice };
  }, [candles, width, height, decimals]);

  if (!chartData) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={styles.noData}>No candle data</Text>
      </View>
    );
  }

  const { candleShapes, gridLines, timeLabels } = chartData;

  return (
    <View style={[styles.container, { height: height + 4 }]}>
      <Svg width={width} height={height}>
        {/* Grid lines & price labels */}
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

        {/* Candles */}
        {candleShapes.map((c, i) => (
          <G key={`candle-${i}`}>
            {/* Wick */}
            <Line
              x1={c.x} y1={c.wickTop}
              x2={c.x} y2={c.wickBottom}
              stroke={c.color} strokeWidth={c.wickW}
            />
            {/* Body */}
            <Rect
              x={c.x - c.bodyW / 2} y={c.bodyTop}
              width={c.bodyW} height={c.bodyH}
              fill={c.color}
              rx={1}
            />
          </G>
        ))}

        {/* Bottom axis line */}
        <Line
          x1={PADDING.left}
          y1={height - PADDING.bottom}
          x2={width - PADDING.right}
          y2={height - PADDING.bottom}
          stroke={AXIS_COLOR} strokeWidth={1}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  noData: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default CandlestickChart;
