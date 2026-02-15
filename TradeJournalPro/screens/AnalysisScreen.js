import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { getCandles, getIndicators, getSupportedPairs } from '../api/prices';
import { LineChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width - 32;

const AnalysisScreen = ({ navigation }) => {
    const { token } = useAuth();
    const { t, state } = useAppData();

    const [pairs, setPairs] = useState([]);
    const [selectedPair, setSelectedPair] = useState('');
    const [selectedDisplay, setSelectedDisplay] = useState('');
    const [resolution, setResolution] = useState('D');
    const [candles, setCandles] = useState([]);
    const [indicators, setIndicators] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadPairs();
    }, []);

    useEffect(() => {
        if (selectedPair) loadAnalysis();
    }, [selectedPair, resolution]);

    const loadPairs = async () => {
        try {
            const data = await getSupportedPairs(token);
            setPairs(data);
            if (data.length > 0) {
                setSelectedPair(data[0].symbol);
                setSelectedDisplay(data[0].display);
            }
        } catch (error) {
            console.error('Failed to load pairs:', error);
        }
    };

    const loadAnalysis = async () => {
        setLoading(true);
        try {
            const [candleData, indicatorData] = await Promise.all([
                getCandles(token, selectedPair, resolution),
                getIndicators(token, selectedPair, resolution),
            ]);
            setCandles(candleData);
            setIndicators(indicatorData);
        } catch (error) {
            console.error('Analysis load error:', error);
        }
        setLoading(false);
    };

    // Statistics calculations
    const calcStats = () => {
        if (candles.length < 2) return null;

        const closes = candles.map(c => c.close);
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);

        const highest = Math.max(...highs);
        const lowest = Math.min(...lows);
        const avgPrice = closes.reduce((a, b) => a + b, 0) / closes.length;

        // Volatility (standard deviation of returns)
        const returns = [];
        for (let i = 1; i < closes.length; i++) {
            returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
        }
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        const volatility = Math.sqrt(variance) * 100;

        // Pip range
        const pipRange = (highest - lowest) * 10000; // For major pairs

        // Trade correlation
        const trades = state.trades.filter(tr =>
            tr.pair && selectedDisplay &&
            tr.pair.toUpperCase().includes(selectedDisplay.replace('/', '').substring(0, 3))
        );
        const winTrades = trades.filter(tr => tr.pnl > 0);
        const winRate = trades.length > 0 ? (winTrades.length / trades.length * 100) : 0;

        return {
            highest, lowest, avgPrice, volatility, pipRange,
            totalTrades: trades.length, winRate,
            totalPnl: trades.reduce((sum, tr) => sum + (tr.pnl || 0), 0),
        };
    };

    const stats = calcStats();
    const chartCloses = candles.slice(-30).map(c => c.close);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>{'<'} {t('close')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('menu_analysis')}</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Pair Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pairScroll}>
                    {pairs.map(p => (
                        <TouchableOpacity
                            key={p.symbol}
                            style={[styles.pairChip, selectedPair === p.symbol && styles.pairChipActive]}
                            onPress={() => { setSelectedPair(p.symbol); setSelectedDisplay(p.display); }}
                        >
                            <Text style={[styles.pairChipText, selectedPair === p.symbol && { color: '#fff' }]}>
                                {p.display}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Resolution Selector */}
                <View style={styles.resRow}>
                    {['15', '60', 'D', 'W'].map(r => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.resChip, resolution === r && styles.resChipActive]}
                            onPress={() => setResolution(r)}
                        >
                            <Text style={[styles.resChipText, resolution === r && { color: '#fff' }]}>
                                {r === 'D' ? 'Daily' : r === 'W' ? 'Weekly' : `${r}m`}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Price Chart */}
                        {chartCloses.length > 5 && (
                            <View style={styles.chartBox}>
                                <LineChart
                                    data={{
                                        labels: [],
                                        datasets: [{ data: chartCloses }],
                                    }}
                                    width={screenWidth}
                                    height={180}
                                    chartConfig={{
                                        backgroundColor: '#1f2937',
                                        backgroundGradientFrom: '#1f2937',
                                        backgroundGradientTo: '#374151',
                                        decimalPlaces: 5,
                                        color: (opacity = 1) => `rgba(96, 165, 250, ${opacity})`,
                                        propsForDots: { r: '0' },
                                        propsForBackgroundLines: { stroke: '#374151' },
                                    }}
                                    bezier
                                    withDots={false}
                                    withInnerLines={false}
                                    withOuterLines={false}
                                    style={{ borderRadius: 8 }}
                                />
                            </View>
                        )}

                        {/* Statistics Grid */}
                        {stats && (
                            <View style={styles.statsGrid}>
                                <StatCard title={t('highest_price')} value={stats.highest.toFixed(5)} color="#4ade80" />
                                <StatCard title={t('lowest_price')} value={stats.lowest.toFixed(5)} color="#f87171" />
                                <StatCard title={t('avg_price')} value={stats.avgPrice.toFixed(5)} />
                                <StatCard title={t('volatility')} value={`${stats.volatility.toFixed(2)}%`} />
                                <StatCard title="Pip Range" value={stats.pipRange.toFixed(0)} />
                                <StatCard title={t('win_rate')} value={`${stats.winRate.toFixed(1)}%`} color={stats.winRate > 50 ? '#4ade80' : '#f87171'} />
                            </View>
                        )}

                        {/* Trade Correlation */}
                        {stats && stats.totalTrades > 0 && (
                            <View style={styles.tradeCorrelation}>
                                <Text style={styles.sectionTitle}>{t('trade_correlation')}</Text>
                                <View style={styles.correlRow}>
                                    <Text style={styles.correlLabel}>{t('total_trades')}</Text>
                                    <Text style={styles.correlValue}>{stats.totalTrades}</Text>
                                </View>
                                <View style={styles.correlRow}>
                                    <Text style={styles.correlLabel}>{t('net_pnl')}</Text>
                                    <Text style={[styles.correlValue, { color: stats.totalPnl >= 0 ? '#4ade80' : '#f87171' }]}>
                                        {stats.totalPnl >= 0 ? '+' : ''}{stats.totalPnl.toFixed(2)}$
                                    </Text>
                                </View>
                            </View>
                        )}

                        {/* Indicators Summary */}
                        {indicators && (
                            <View style={styles.indicatorsCard}>
                                <Text style={styles.sectionTitle}>Technical Indicators</Text>
                                {indicators.rsi?.length > 0 && (
                                    <IndicRow label="RSI(14)" value={indicators.rsi[indicators.rsi.length - 1]?.toFixed(2)} />
                                )}
                                {indicators.sma20?.length > 0 && (
                                    <IndicRow label="SMA(20)" value={indicators.sma20[indicators.sma20.length - 1]?.toFixed(5)} />
                                )}
                                {indicators.sma50?.length > 0 && (
                                    <IndicRow label="SMA(50)" value={indicators.sma50[indicators.sma50.length - 1]?.toFixed(5)} />
                                )}
                                {indicators.macd?.length > 0 && (
                                    <IndicRow label="MACD" value={indicators.macd[indicators.macd.length - 1]?.MACD?.toFixed(5)} />
                                )}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
};

const StatCard = ({ title, value, color = '#f9fafb' }) => (
    <View style={styles.statCard}>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
);

const IndicRow = ({ label, value }) => (
    <View style={styles.indicRow}>
        <Text style={styles.indicLabel}>{label}</Text>
        <Text style={styles.indicValue}>{value || '---'}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 12,
        backgroundColor: '#1f2937',
    },
    backText: { color: '#60a5fa', fontSize: 16 },
    headerTitle: { color: '#f9fafb', fontSize: 18, fontWeight: 'bold' },
    content: { flex: 1, padding: 16 },
    pairScroll: { maxHeight: 44, marginBottom: 12 },
    pairChip: {
        backgroundColor: '#374151', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 8,
    },
    pairChipActive: { backgroundColor: '#2563eb' },
    pairChipText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
    resRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    resChip: {
        flex: 1, backgroundColor: '#374151', paddingVertical: 8, borderRadius: 6, alignItems: 'center',
    },
    resChipActive: { backgroundColor: '#2563eb' },
    resChipText: { color: '#9ca3af', fontSize: 13 },
    chartBox: { borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    statCard: {
        backgroundColor: '#374151', borderRadius: 8, padding: 12,
        width: (Dimensions.get('window').width - 52) / 3,
    },
    statTitle: { color: '#6b7280', fontSize: 11 },
    statValue: { fontSize: 15, fontWeight: 'bold', marginTop: 4 },
    tradeCorrelation: { backgroundColor: '#374151', borderRadius: 10, padding: 16, marginBottom: 16 },
    sectionTitle: { color: '#f9fafb', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    correlRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    correlLabel: { color: '#9ca3af', fontSize: 14 },
    correlValue: { color: '#f9fafb', fontSize: 16, fontWeight: '600' },
    indicatorsCard: { backgroundColor: '#374151', borderRadius: 10, padding: 16, marginBottom: 40 },
    indicRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#4b5563' },
    indicLabel: { color: '#9ca3af', fontSize: 14 },
    indicValue: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
});

export default AnalysisScreen;
