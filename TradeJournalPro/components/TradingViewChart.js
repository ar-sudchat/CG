import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

// lightweight-charts is ESM-only & web-only
let lcModule = null;
if (Platform.OS === 'web') {
    try { lcModule = require('lightweight-charts'); } catch (e) { /* native fallback */ }
}

// ─── Box Drawing Primitive (lightweight-charts v5 ISeriesPrimitive) ───
class BoxPrimitive {
    constructor(p1, p2, color) {
        this._p1 = p1; // { time, price }
        this._p2 = p2;
        this._color = color;
        this._paneViews = [new BoxPaneView(this)];
        this._chart = null;
        this._series = null;
    }
    updateAllViews() {}
    paneViews() { return this._paneViews; }
    attached(param) {
        this._chart = param.chart;
        this._series = param.series;
        this._requestUpdate = param.requestUpdate;
    }
    detached() {
        this._chart = null;
        this._series = null;
    }
}

class BoxPaneView {
    constructor(source) { this._source = source; }
    zOrder() { return 'normal'; }
    renderer() { return new BoxRenderer(this._source); }
}

class BoxRenderer {
    constructor(source) { this._source = source; }
    draw(target) {
        target.useBitmapCoordinateSpace(scope => {
            const s = this._source;
            if (!s._series || !s._chart) return;

            const y1 = s._series.priceToCoordinate(s._p1.price);
            const y2 = s._series.priceToCoordinate(s._p2.price);
            const x1 = s._chart.timeScale().timeToCoordinate(s._p1.time);
            const x2 = s._chart.timeScale().timeToCoordinate(s._p2.time);

            if (y1 === null || y2 === null || x1 === null || x2 === null) return;

            const ctx = scope.context;
            const hpr = scope.horizontalPixelRatio;
            const vpr = scope.verticalPixelRatio;

            const left = Math.min(x1, x2) * hpr;
            const right = Math.max(x1, x2) * hpr;
            const top = Math.min(y1, y2) * vpr;
            const bottom = Math.max(y1, y2) * vpr;

            ctx.fillStyle = s._color + '30';
            ctx.fillRect(left, top, right - left, bottom - top);

            ctx.strokeStyle = s._color;
            ctx.lineWidth = 2;
            ctx.strokeRect(left, top, right - left, bottom - top);

            // Label
            ctx.font = `${11 * vpr}px -apple-system, sans-serif`;
            ctx.fillStyle = s._color;
            const label = s._label || '';
            if (label) {
                ctx.fillText(label, left + 4 * hpr, top + 14 * vpr);
            }
        });
    }
}

// ─── Drawing Colors (SMC Zone Types) ───
const ZONE_COLORS = [
    { id: 'demand', color: '#22c55e', label: 'Demand' },
    { id: 'supply', color: '#ef4444', label: 'Supply' },
    { id: 'ob', color: '#3b82f6', label: 'OB' },
    { id: 'fvg', color: '#8b5cf6', label: 'FVG' },
];

// ─── SMC Pattern Style Map ───
const SMC_STYLES = {
    order_block_bull: { color: '#3b82f6', label: 'Bull OB', type: 'box' },
    order_block_bear: { color: '#ef4444', label: 'Bear OB', type: 'box' },
    fvg_bull: { color: '#8b5cf6', label: 'Bull FVG', type: 'box' },
    fvg_bear: { color: '#f87171', label: 'Bear FVG', type: 'box' },
    bos_bull: { color: '#10b981', label: 'BOS ↑', type: 'line' },
    bos_bear: { color: '#ef4444', label: 'BOS ↓', type: 'line' },
    choch_bull: { color: '#f59e0b', label: 'CHoCH ↑', type: 'line' },
    choch_bear: { color: '#f87171', label: 'CHoCH ↓', type: 'line' },
    liquidity_sweep_high: { color: '#ef4444', label: 'Liq ↑', type: 'line' },
    liquidity_sweep_low: { color: '#4ade80', label: 'Liq ↓', type: 'line' },
    ote_zone: { color: '#06b6d4', label: 'OTE', type: 'box' },
};

const TradingViewChart = ({ candles = [], smcPatterns = null, height: propHeight, decimals = 2, dark = true }) => {
    const chartWrapRef = useRef(null);
    const chartContainerRef = useRef(null);
    const overlayRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);

    const [drawTool, setDrawTool] = useState('none'); // 'none' | 'box' | 'hline'
    const [drawColor, setDrawColor] = useState('#22c55e');
    const [drawLabel, setDrawLabel] = useState('Demand');
    const [drawCount, setDrawCount] = useState(0);
    const [previewBox, setPreviewBox] = useState(null);
    const [showSmc, setShowSmc] = useState(true); // Toggle SMC overlay

    const drawingsRef = useRef([]);
    const smcDrawingsRef = useRef([]); // Auto-drawn SMC patterns
    const isDrawingRef = useRef(false);
    const drawStartRef = useRef(null);

    // Calculate chart height: 60% of window or minimum 400px
    const windowH = Dimensions.get('window').height;
    const chartHeight = propHeight || Math.max(Math.round(windowH * 0.6), 400);

    const colors = {
        bg: dark ? '#0a0e1a' : '#ffffff',
        text: dark ? '#7a8baa' : '#64748b',
        grid: dark ? '#1e2a45' : '#e2e8f0',
        border: dark ? '#1e2a45' : '#e2e8f0',
        toolbar: dark ? '#111827' : '#f8fafc',
        toolActive: dark ? '#1e3a5f' : '#dbeafe',
        up: '#22c55e',
        down: '#ef4444',
    };

    // ─── Create Chart (mount only) ───
    useEffect(() => {
        if (Platform.OS !== 'web' || !lcModule || !chartContainerRef.current) return;

        const { createChart, ColorType, CrosshairMode } = lcModule;

        const div = document.createElement('div');
        div.style.width = '100%';
        div.style.height = chartHeight + 'px';
        chartContainerRef.current.appendChild(div);

        const chart = createChart(div, {
            height: chartHeight,
            layout: {
                background: { type: ColorType.Solid, color: colors.bg },
                textColor: colors.text,
                fontSize: 12,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
            grid: {
                vertLines: { color: colors.grid, style: 1 },
                horzLines: { color: colors.grid, style: 1 },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { color: '#3b82f6', width: 1, style: 2, labelBackgroundColor: '#3b82f6' },
                horzLine: { color: '#3b82f6', width: 1, style: 2, labelBackgroundColor: '#3b82f6' },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: colors.grid,
                rightOffset: 5,
            },
            rightPriceScale: {
                borderColor: colors.grid,
                scaleMargins: { top: 0.05, bottom: 0.05 },
                minimumWidth: 80,
            },
            handleScroll: true,
            handleScale: true,
        });

        const CandlestickSeries = lcModule.CandlestickSeries;
        const series = chart.addSeries(CandlestickSeries, {
            upColor: colors.up,
            downColor: colors.down,
            borderUpColor: colors.up,
            borderDownColor: colors.down,
            wickUpColor: colors.up,
            wickDownColor: colors.down,
            priceFormat: {
                type: 'price',
                precision: decimals,
                minMove: 1 / Math.pow(10, decimals),
            },
        });

        chartRef.current = chart;
        seriesRef.current = series;

        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                chart.applyOptions({ width: entry.contentRect.width });
            }
        });
        ro.observe(chartContainerRef.current);

        return () => {
            ro.disconnect();
            chart.remove();
            if (div.parentNode) div.parentNode.removeChild(div);
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, []);

    // ─── Update Theme ───
    useEffect(() => {
        if (!chartRef.current || !lcModule) return;
        const { ColorType } = lcModule;
        chartRef.current.applyOptions({
            layout: {
                background: { type: ColorType.Solid, color: dark ? '#0a0e1a' : '#ffffff' },
                textColor: dark ? '#7a8baa' : '#64748b',
            },
            grid: {
                vertLines: { color: dark ? '#1e2a45' : '#e2e8f0' },
                horzLines: { color: dark ? '#1e2a45' : '#e2e8f0' },
            },
            timeScale: { borderColor: dark ? '#1e2a45' : '#e2e8f0' },
            rightPriceScale: { borderColor: dark ? '#1e2a45' : '#e2e8f0' },
        });
    }, [dark]);

    // ─── Update Candle Data ───
    useEffect(() => {
        if (!seriesRef.current || !candles.length) return;

        const formatted = candles
            .filter(c => (c.timestamp || c.t) && (c.open != null || c.o != null))
            .map(c => ({
                time: c.timestamp || c.t,
                open: c.open != null ? c.open : c.o,
                high: c.high != null ? c.high : c.h,
                low: c.low != null ? c.low : c.l,
                close: c.close != null ? c.close : c.c,
            }))
            .sort((a, b) => a.time - b.time);

        if (formatted.length > 0) {
            seriesRef.current.setData(formatted);
            chartRef.current.timeScale().fitContent();
        }
    }, [candles]);

    // ─── Auto-Draw SMC Patterns ───
    useEffect(() => {
        if (!seriesRef.current || !chartRef.current) return;

        // Clear previous SMC drawings
        _clearSmcDrawings();

        if (!showSmc || !smcPatterns?.patterns?.length || !candles.length) return;

        const candleData = candles
            .filter(c => (c.timestamp || c.t))
            .sort((a, b) => (a.timestamp || a.t) - (b.timestamp || b.t));

        if (candleData.length === 0) return;

        const lastTime = candleData[candleData.length - 1].timestamp || candleData[candleData.length - 1].t;

        // Draw each pattern (skip kill_zone)
        for (const p of smcPatterns.patterns) {
            if (!p.patternType || p.patternType.startsWith('kill_zone')) continue;

            const style = SMC_STYLES[p.patternType];
            if (!style) continue;

            const pTime = p.timestamp || (p.metadata?.candleIndex != null ? (candleData[p.metadata.candleIndex]?.timestamp || candleData[p.metadata.candleIndex]?.t) : null);
            if (!pTime) continue;

            if (style.type === 'box' && p.priceLow != null && p.priceHigh != null) {
                // Draw box from pattern time extending 10 candles right (or to end)
                const boxEndIdx = Math.min((p.metadata?.candleIndex || 0) + 10, candleData.length - 1);
                const boxEndTime = candleData[boxEndIdx]?.timestamp || candleData[boxEndIdx]?.t || lastTime;

                const box = new BoxPrimitive(
                    { time: pTime, price: p.priceLow },
                    { time: boxEndTime, price: p.priceHigh },
                    style.color
                );
                box._label = style.label;

                try {
                    seriesRef.current.attachPrimitive(box);
                    smcDrawingsRef.current.push({ type: 'box', primitive: box });
                } catch (e) { /* ignore draw errors */ }

            } else if (style.type === 'line' && (p.priceLow != null || p.priceHigh != null)) {
                // Draw horizontal line for BOS/CHoCH/Liquidity
                const price = p.priceHigh || p.priceLow;
                try {
                    const priceLine = seriesRef.current.createPriceLine({
                        price,
                        color: style.color,
                        lineWidth: 1,
                        lineStyle: 2, // dashed
                        axisLabelVisible: false,
                        title: style.label,
                    });
                    smcDrawingsRef.current.push({ type: 'line', priceLine });
                } catch (e) { /* ignore draw errors */ }
            }
        }
    }, [smcPatterns, showSmc, candles]);

    const _clearSmcDrawings = () => {
        for (const d of smcDrawingsRef.current) {
            try {
                if (d.type === 'box' && d.primitive && seriesRef.current) {
                    seriesRef.current.detachPrimitive(d.primitive);
                } else if (d.type === 'line' && d.priceLine && seriesRef.current) {
                    seriesRef.current.removePriceLine(d.priceLine);
                }
            } catch (e) { /* ignore */ }
        }
        smcDrawingsRef.current = [];
    };

    // ─── Drawing Mode ↔ Chart Interaction ───
    useEffect(() => {
        if (!chartRef.current) return;
        const drawing = drawTool !== 'none';
        chartRef.current.applyOptions({
            handleScroll: !drawing,
            handleScale: !drawing,
        });
    }, [drawTool]);

    // ─── Drawing Event Listeners ───
    useEffect(() => {
        if (Platform.OS !== 'web' || drawTool === 'none') return;
        const overlay = overlayRef.current;
        if (!overlay) return;

        const getXY = (e) => {
            if (e.changedTouches && e.changedTouches.length) {
                const rect = overlay.getBoundingClientRect();
                return { x: e.changedTouches[0].clientX - rect.left, y: e.changedTouches[0].clientY - rect.top };
            }
            if (e.touches && e.touches.length) {
                const rect = overlay.getBoundingClientRect();
                return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
            }
            return { x: e.offsetX, y: e.offsetY };
        };

        const onDown = (e) => {
            if (!chartRef.current || !seriesRef.current) return;
            e.preventDefault();

            const { x, y } = getXY(e);
            const time = chartRef.current.timeScale().coordinateToTime(x);
            const price = seriesRef.current.coordinateToPrice(y);
            if (time == null || price == null) return;

            if (drawTool === 'hline') {
                const priceLine = seriesRef.current.createPriceLine({
                    price,
                    color: drawColor,
                    lineWidth: 2,
                    lineStyle: 2,
                    axisLabelVisible: true,
                    title: drawLabel,
                });
                drawingsRef.current.push({ type: 'hline', data: { price, color: drawColor }, priceLine });
                setDrawCount(c => c + 1);
                return;
            }

            isDrawingRef.current = true;
            drawStartRef.current = { x, y, time, price };
        };

        const onMove = (e) => {
            if (!isDrawingRef.current || drawTool !== 'box') return;
            e.preventDefault();
            const { x, y } = getXY(e);
            const start = drawStartRef.current;
            if (!start) return;

            setPreviewBox({
                left: Math.min(start.x, x),
                top: Math.min(start.y, y),
                width: Math.abs(x - start.x),
                height: Math.abs(y - start.y),
            });
        };

        const onUp = (e) => {
            if (!isDrawingRef.current || drawTool !== 'box') return;

            const { x, y } = getXY(e);
            const time = chartRef.current?.timeScale().coordinateToTime(x);
            const price = seriesRef.current?.coordinateToPrice(y);
            const start = drawStartRef.current;

            isDrawingRef.current = false;
            drawStartRef.current = null;
            setPreviewBox(null);

            if (!start || time == null || price == null) return;
            if (Math.abs(x - start.x) < 10 || Math.abs(y - start.y) < 10) return;

            const box = new BoxPrimitive(
                { time: start.time, price: start.price },
                { time, price },
                drawColor
            );
            box._label = drawLabel;
            seriesRef.current.attachPrimitive(box);
            drawingsRef.current.push({
                type: 'box',
                data: { p1: { time: start.time, price: start.price }, p2: { time, price }, color: drawColor, label: drawLabel },
                primitive: box,
            });
            setDrawCount(c => c + 1);
        };

        overlay.addEventListener('mousedown', onDown);
        overlay.addEventListener('mousemove', onMove);
        overlay.addEventListener('mouseup', onUp);
        overlay.addEventListener('touchstart', onDown, { passive: false });
        overlay.addEventListener('touchmove', onMove, { passive: false });
        overlay.addEventListener('touchend', onUp);

        return () => {
            isDrawingRef.current = false;
            drawStartRef.current = null;
            setPreviewBox(null);
            overlay.removeEventListener('mousedown', onDown);
            overlay.removeEventListener('mousemove', onMove);
            overlay.removeEventListener('mouseup', onUp);
            overlay.removeEventListener('touchstart', onDown);
            overlay.removeEventListener('touchmove', onMove);
            overlay.removeEventListener('touchend', onUp);
        };
    }, [drawTool, drawColor, drawLabel]);

    // ─── Undo / Clear ───
    const handleUndo = useCallback(() => {
        const drawings = drawingsRef.current;
        if (!drawings.length) return;
        const last = drawings.pop();
        if (last.type === 'box' && last.primitive && seriesRef.current) {
            seriesRef.current.detachPrimitive(last.primitive);
        } else if (last.type === 'hline' && last.priceLine && seriesRef.current) {
            seriesRef.current.removePriceLine(last.priceLine);
        }
        setDrawCount(c => c + 1);
    }, []);

    const handleClearAll = useCallback(() => {
        drawingsRef.current.forEach(d => {
            if (d.type === 'box' && d.primitive && seriesRef.current) {
                seriesRef.current.detachPrimitive(d.primitive);
            } else if (d.type === 'hline' && d.priceLine && seriesRef.current) {
                seriesRef.current.removePriceLine(d.priceLine);
            }
        });
        drawingsRef.current = [];
        setDrawCount(0);
    }, []);

    const selectColor = (zc) => {
        setDrawColor(zc.color);
        setDrawLabel(zc.label);
    };

    const hasDrawings = drawingsRef.current.length > 0;
    const hasSmcPatterns = smcPatterns?.patterns?.filter(p => !p.patternType?.startsWith('kill_zone')).length > 0;

    // ─── Toolbar ───
    const renderToolbar = () => (
        <View style={[styles.toolbar, { backgroundColor: colors.toolbar, borderColor: colors.border }]}>
            {/* Cursor (no draw) */}
            <TouchableOpacity
                onPress={() => setDrawTool('none')}
                style={[styles.toolBtn, drawTool === 'none' && { backgroundColor: colors.toolActive }]}
            >
                <Ionicons name="hand-left" size={16} color={drawTool === 'none' ? '#3b82f6' : colors.text} />
            </TouchableOpacity>

            {/* Box tool */}
            <TouchableOpacity
                onPress={() => setDrawTool(drawTool === 'box' ? 'none' : 'box')}
                style={[styles.toolBtn, drawTool === 'box' && { backgroundColor: colors.toolActive }]}
            >
                <Ionicons name="square-outline" size={16} color={drawTool === 'box' ? '#3b82f6' : colors.text} />
            </TouchableOpacity>

            {/* H-Line tool */}
            <TouchableOpacity
                onPress={() => setDrawTool(drawTool === 'hline' ? 'none' : 'hline')}
                style={[styles.toolBtn, drawTool === 'hline' && { backgroundColor: colors.toolActive }]}
            >
                <MaterialCommunityIcons name="minus" size={20} color={drawTool === 'hline' ? '#3b82f6' : colors.text} />
            </TouchableOpacity>

            <View style={[styles.toolSep, { backgroundColor: colors.border }]} />

            {/* Zone color picker */}
            {ZONE_COLORS.map(zc => (
                <TouchableOpacity
                    key={zc.id}
                    onPress={() => selectColor(zc)}
                    style={[styles.colorDot, { backgroundColor: zc.color, opacity: drawColor === zc.color ? 1 : 0.4 }]}
                >
                    {drawColor === zc.color && <View style={styles.colorDotCheck} />}
                </TouchableOpacity>
            ))}

            <View style={[styles.toolSep, { backgroundColor: colors.border }]} />

            {/* SMC Toggle */}
            {hasSmcPatterns && (
                <TouchableOpacity
                    onPress={() => setShowSmc(!showSmc)}
                    style={[styles.toolBtn, showSmc && { backgroundColor: '#8b5cf620' }]}
                >
                    <Ionicons name="layers" size={16} color={showSmc ? '#8b5cf6' : colors.text} />
                </TouchableOpacity>
            )}

            {/* Undo */}
            <TouchableOpacity onPress={handleUndo} style={styles.toolBtn} disabled={!hasDrawings}>
                <Ionicons name="arrow-undo" size={16} color={hasDrawings ? colors.text : colors.border} />
            </TouchableOpacity>

            {/* Clear all */}
            <TouchableOpacity onPress={handleClearAll} style={styles.toolBtn} disabled={!hasDrawings}>
                <Ionicons name="trash-outline" size={16} color={hasDrawings ? '#ef4444' : colors.border} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            {/* Active tool / SMC label */}
            {drawTool !== 'none' ? (
                <View style={[styles.activeLabel, { backgroundColor: drawColor + '20' }]}>
                    <View style={[styles.activeDot, { backgroundColor: drawColor }]} />
                    <Text style={[styles.activeLabelText, { color: drawColor }]}>
                        {drawLabel} {drawTool === 'box' ? 'Box' : 'Line'}
                    </Text>
                </View>
            ) : showSmc && hasSmcPatterns ? (
                <View style={[styles.activeLabel, { backgroundColor: '#8b5cf620' }]}>
                    <Ionicons name="layers" size={12} color="#8b5cf6" />
                    <Text style={[styles.activeLabelText, { color: '#8b5cf6' }]}>SMC ON</Text>
                </View>
            ) : null}
        </View>
    );

    // ─── Fallback for non-web ───
    if (Platform.OS !== 'web' || !lcModule) {
        return (
            <View style={[styles.fallback, { height: chartHeight, backgroundColor: colors.bg }]}>
                <Ionicons name="bar-chart-outline" size={48} color={colors.text} />
                <Text style={{ color: colors.text, marginTop: 12 }}>Chart available on web</Text>
            </View>
        );
    }

    return (
        <View ref={chartWrapRef} style={styles.wrapper}>
            {renderToolbar()}
            <View style={[styles.chartArea, { height: chartHeight, backgroundColor: colors.bg }]}>
                {/* Chart container - lightweight-charts renders here */}
                <View ref={chartContainerRef} style={styles.chartContainer} />

                {/* Drawing overlay */}
                <View
                    ref={overlayRef}
                    style={[styles.overlay, {
                        cursor: drawTool === 'box' ? 'crosshair' : drawTool === 'hline' ? 'row-resize' : 'default',
                    }]}
                    pointerEvents={drawTool !== 'none' ? 'auto' : 'none'}
                />

                {/* Box preview during drag */}
                {previewBox && (
                    <View
                        style={[styles.previewBox, {
                            left: previewBox.left,
                            top: previewBox.top,
                            width: previewBox.width,
                            height: previewBox.height,
                            backgroundColor: drawColor + '25',
                            borderColor: drawColor,
                        }]}
                        pointerEvents="none"
                    />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {},
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        gap: 4,
        flexWrap: 'wrap',
    },
    toolBtn: {
        width: 34,
        height: 34,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolSep: {
        width: 1,
        height: 22,
        marginHorizontal: 4,
    },
    colorDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginHorizontal: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorDotCheck: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    activeLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeLabelText: {
        fontSize: 12,
        fontWeight: '600',
    },
    chartArea: {
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        borderWidth: 1,
        borderTopWidth: 0,
        borderColor: '#1e2a45',
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    chartContainer: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
    },
    previewBox: {
        position: 'absolute',
        borderWidth: 2,
        borderStyle: 'dashed',
        zIndex: 20,
    },
    fallback: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
});

export default TradingViewChart;
