import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { useSocket } from '../context/SocketContext';
import { getCandles, getIndicators, getSmcPatterns } from '../api/prices';
import { LineChart } from 'react-native-chart-kit';

const RESOLUTIONS = ['1', '5', '15', '60', 'D'];
const RESOLUTION_LABELS = { '1': '1m', '5': '5m', '15': '15m', '60': '1H', 'D': '1D' };
const screenWidth = Dimensions.get('window').width - 32;

const PairDetailScreen = ({ navigation, route }) => {
    const { symbol, displaySymbol } = route.params;
    const { token } = useAuth();
    const { t } = useAppData();
    const { livePrices, subscribePair, unsubscribePair } = useSocket();

    const [resolution, setResolution] = useState('60');
    const [candles, setCandles] = useState([]);
    const [indicators, setIndicators] = useState(null);
    const [smcPatterns, setSmcPatterns] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('chart'); // 'chart', 'indicators', 'smc'

    useEffect(() => {
        subscribePair(symbol);
        return () => unsubscribePair(symbol);
    }, [symbol]);

    useEffect(() => {
        loadData();
    }, [resolution]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [candleData, indicatorData, smcData] = await Promise.all([
                getCandles(token, symbol, resolution),
                getIndicators(token, symbol, resolution),
                getSmcPatterns(token, symbol, resolution),
            ]);
            setCandles(candleData);
            setIndicators(indicatorData);
            setSmcPatterns(smcData);
        } catch (error) {
            console.error('Load data error:', error);
        }
        setLoading(false);
    };

    const livePrice = livePrices[symbol];
    const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;
    const currentPrice = livePrice?.price || lastCandle?.close;

    // Prepare chart data (last 50 close prices)
    const chartCloses = candles.slice(-50).map(c => c.close);
    const chartLabels = candles.slice(-50).map((c, i) => i % 10 === 0 ? new Date(c.timestamp * 1000).getHours() + ':00' : '');

    const renderSmcSummary = () => {
        if (!smcPatterns?.summary) return null;
        const s = smcPatterns.summary;
        return (
            <View style={styles.smcGrid}>
                <SmcBadge label="Order Blocks" count={s.orderBlocks} color="#3b82f6" />
                <SmcBadge label="FVG" count={s.fvg} color="#8b5cf6" />
                <SmcBadge label="BOS" count={s.bos} color="#10b981" />
                <SmcBadge label="CHoCH" count={s.choch} color="#f59e0b" />
                <SmcBadge label="Liquidity" count={s.liquiditySweeps} color="#ef4444" />
                <SmcBadge label="OTE Zones" count={s.oteZones} color="#06b6d4" />
            </View>
        );
    };

    const renderIndicators = () => {
        if (!indicators) return <Text style={styles.noData}>{t('no_data')}</Text>;
        return (
            <View style={styles.indicatorList}>
                {indicators.rsi?.length > 0 && (
                    <IndicatorRow label="RSI(14)" value={indicators.rsi[indicators.rsi.length - 1]?.toFixed(2)}
                        color={indicators.rsi[indicators.rsi.length - 1] > 70 ? '#ef4444' : indicators.rsi[indicators.rsi.length - 1] < 30 ? '#4ade80' : '#f9fafb'} />
                )}
                {indicators.sma20?.length > 0 && (
                    <IndicatorRow label="SMA(20)" value={indicators.sma20[indicators.sma20.length - 1]?.toFixed(5)} />
                )}
                {indicators.sma50?.length > 0 && (
                    <IndicatorRow label="SMA(50)" value={indicators.sma50[indicators.sma50.length - 1]?.toFixed(5)} />
                )}
                {indicators.macd?.length > 0 && (
                    <IndicatorRow label="MACD" value={indicators.macd[indicators.macd.length - 1]?.MACD?.toFixed(5)}
                        subValue={`Signal: ${indicators.macd[indicators.macd.length - 1]?.signal?.toFixed(5)}`} />
                )}
                {indicators.bollingerBands?.length > 0 && (
                    <IndicatorRow label="BB Upper" value={indicators.bollingerBands[indicators.bollingerBands.length - 1]?.upper?.toFixed(5)} />
                )}
                {indicators.pivotPoints && (
                    <IndicatorRow label="Pivot" value={indicators.pivotPoints.pivot?.toFixed(5)}
                        subValue={`R1: ${indicators.pivotPoints.r1?.toFixed(5)} | S1: ${indicators.pivotPoints.s1?.toFixed(5)}`} />
                )}
            </View>
        );
    };

    const renderSmcPatterns = () => {
        if (!smcPatterns?.patterns || smcPatterns.patterns.length === 0) {
            return <Text style={styles.noData}>No SMC patterns detected</Text>;
        }

        const patternLabels = {
            order_block_bull: { label: 'Bullish OB', color: '#3b82f6' },
            order_block_bear: { label: 'Bearish OB', color: '#ef4444' },
            fvg_bull: { label: 'Bullish FVG', color: '#8b5cf6' },
            fvg_bear: { label: 'Bearish FVG', color: '#f87171' },
            bos_bull: { label: 'Bullish BOS', color: '#10b981' },
            bos_bear: { label: 'Bearish BOS', color: '#ef4444' },
            choch_bull: { label: 'Bullish CHoCH', color: '#f59e0b' },
            choch_bear: { label: 'Bearish CHoCH', color: '#f87171' },
            liquidity_sweep_high: { label: 'Liq. Sweep High', color: '#ef4444' },
            liquidity_sweep_low: { label: 'Liq. Sweep Low', color: '#4ade80' },
            ote_zone: { label: 'OTE Zone', color: '#06b6d4' },
        };

        return (
            <View>
                {smcPatterns.patterns.slice(-15).map((p, i) => {
                    const info = patternLabels[p.patternType] || { label: p.patternType, color: '#6b7280' };
                    return (
                        <View key={i} style={styles.patternRow}>
                            <View style={[styles.patternDot, { backgroundColor: info.color }]} />
                            <View style={styles.patternInfo}>
                                <Text style={[styles.patternLabel, { color: info.color }]}>{info.label}</Text>
                                <Text style={styles.patternPrice}>
                                    {p.priceLow?.toFixed(5)} - {p.priceHigh?.toFixed(5)}
                                </Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>{'<'}</Text>
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>{displaySymbol}</Text>
                    <Text style={[styles.headerPrice, { color: currentPrice ? '#f9fafb' : '#6b7280' }]}>
                        {currentPrice?.toFixed(5) || '---'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.alertButton}
                    onPress={() => navigation.navigate('NewAlert', { symbol, displaySymbol })}
                >
                    <Text style={styles.alertButtonText}>{t('set_alert')}</Text>
                </TouchableOpacity>
            </View>

            {/* Resolution Tabs */}
            <View style={styles.resolutionTabs}>
                {RESOLUTIONS.map(r => (
                    <TouchableOpacity
                        key={r}
                        style={[styles.resTab, resolution === r && styles.resTabActive]}
                        onPress={() => setResolution(r)}
                    >
                        <Text style={[styles.resTabText, resolution === r && styles.resTabTextActive]}>
                            {RESOLUTION_LABELS[r]}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView style={styles.content}>
                {loading ? (
                    <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Price Chart */}
                        {chartCloses.length > 5 && (
                            <View style={styles.chartContainer}>
                                <LineChart
                                    data={{
                                        labels: chartLabels,
                                        datasets: [{ data: chartCloses }],
                                    }}
                                    width={screenWidth}
                                    height={220}
                                    chartConfig={{
                                        backgroundColor: '#1f2937',
                                        backgroundGradientFrom: '#1f2937',
                                        backgroundGradientTo: '#374151',
                                        decimalPlaces: 5,
                                        color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
                                        labelColor: () => '#6b7280',
                                        propsForDots: { r: '0' },
                                        propsForBackgroundLines: { stroke: '#374151' },
                                    }}
                                    bezier
                                    withDots={false}
                                    withInnerLines={true}
                                    withOuterLines={false}
                                    style={{ borderRadius: 8 }}
                                />
                            </View>
                        )}

                        {/* SMC Summary Badges */}
                        {renderSmcSummary()}

                        {/* Tab Selector */}
                        <View style={styles.tabRow}>
                            <TouchableOpacity onPress={() => setActiveTab('indicators')} style={[styles.tab, activeTab === 'indicators' && styles.tabActive]}>
                                <Text style={[styles.tabText, activeTab === 'indicators' && styles.tabTextActive]}>Indicators</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setActiveTab('smc')} style={[styles.tab, activeTab === 'smc' && styles.tabActive]}>
                                <Text style={[styles.tabText, activeTab === 'smc' && styles.tabTextActive]}>SMC Patterns</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tab Content */}
                        <View style={styles.tabContent}>
                            {activeTab === 'indicators' && renderIndicators()}
                            {activeTab === 'smc' && renderSmcPatterns()}
                        </View>

                        {/* AI Analysis Button */}
                        <TouchableOpacity
                            style={styles.aiButton}
                            onPress={() => navigation.navigate('AiAnalysis', { symbol, displaySymbol, resolution })}
                        >
                            <Text style={styles.aiButtonText}>{t('ai_analyze')}</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const SmcBadge = ({ label, count, color }) => (
    <View style={[styles.smcBadge, { borderColor: color }]}>
        <Text style={[styles.smcBadgeCount, { color }]}>{count}</Text>
        <Text style={styles.smcBadgeLabel}>{label}</Text>
    </View>
);

const IndicatorRow = ({ label, value, subValue, color = '#f9fafb' }) => (
    <View style={styles.indicatorRow}>
        <Text style={styles.indicatorLabel}>{label}</Text>
        <View style={styles.indicatorValueCol}>
            <Text style={[styles.indicatorValue, { color }]}>{value || '---'}</Text>
            {subValue && <Text style={styles.indicatorSub}>{subValue}</Text>}
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 12,
        backgroundColor: '#1f2937',
    },
    backButton: { padding: 8 },
    backText: { color: '#60a5fa', fontSize: 24, fontWeight: 'bold' },
    headerCenter: { alignItems: 'center' },
    headerTitle: { color: '#f9fafb', fontSize: 18, fontWeight: 'bold' },
    headerPrice: { fontSize: 14, marginTop: 2 },
    alertButton: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    alertButtonText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
    resolutionTabs: {
        flexDirection: 'row', backgroundColor: '#1f2937', paddingHorizontal: 16, paddingBottom: 8,
    },
    resTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6, marginHorizontal: 2 },
    resTabActive: { backgroundColor: '#2563eb' },
    resTabText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
    resTabTextActive: { color: '#fff' },
    content: { flex: 1, paddingHorizontal: 16 },
    chartContainer: { marginTop: 16, borderRadius: 8, overflow: 'hidden' },
    smcGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    smcBadge: {
        borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center',
        minWidth: (Dimensions.get('window').width - 56) / 3,
    },
    smcBadgeCount: { fontSize: 20, fontWeight: 'bold' },
    smcBadgeLabel: { color: '#9ca3af', fontSize: 10, marginTop: 2 },
    tabRow: { flexDirection: 'row', marginTop: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    tabActive: { borderBottomWidth: 2, borderBottomColor: '#2563eb' },
    tabText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
    tabTextActive: { color: '#2563eb' },
    tabContent: { paddingVertical: 16 },
    indicatorList: {},
    indicatorRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937',
    },
    indicatorLabel: { color: '#9ca3af', fontSize: 14 },
    indicatorValueCol: { alignItems: 'flex-end' },
    indicatorValue: { fontSize: 16, fontWeight: '600' },
    indicatorSub: { color: '#6b7280', fontSize: 11, marginTop: 2 },
    patternRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: '#1f2937',
    },
    patternDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
    patternInfo: {},
    patternLabel: { fontSize: 14, fontWeight: '600' },
    patternPrice: { color: '#6b7280', fontSize: 12, marginTop: 2 },
    noData: { color: '#6b7280', textAlign: 'center', paddingVertical: 20 },
    aiButton: {
        backgroundColor: '#7c3aed', paddingVertical: 16, borderRadius: 10, alignItems: 'center',
        marginVertical: 20,
    },
    aiButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default PairDetailScreen;
