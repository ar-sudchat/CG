import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { getCandles, getSmcPatterns, getSupportedPairs } from '../api/prices';
import TradingViewChart from '../components/TradingViewChart';
import SmcChecklist from '../components/SmcChecklist';

const RESOLUTIONS = ['1', '15', '60', '240'];
const RESOLUTION_LABELS = { '1': '1m', '15': '15m', '60': '1H', '240': '4H' };
const AUTO_REFRESH_MS = 30000;

const getDecimals = (symbol) => {
    if (!symbol) return 5;
    if (symbol.includes('XAU') || symbol.includes('GOLD')) return 2;
    if (symbol.includes('JPY')) return 3;
    return 5;
};

const AnalysisScreen = ({ navigation }) => {
    const { token } = useAuth();
    const { t, state } = useAppData();
    const dark = state.currentTheme !== 'light';

    const [pairs, setPairs] = useState([]);
    const [selectedPair, setSelectedPair] = useState('');
    const [selectedDisplay, setSelectedDisplay] = useState('');
    const [resolution, setResolution] = useState('60');
    const [candles, setCandles] = useState([]);
    const [smcPatterns, setSmcPatterns] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const refreshRef = useRef(null);

    const decimals = getDecimals(selectedPair);

    const c = {
        bg: dark ? '#0a0e1a' : '#f0f2f5',
        card: dark ? '#111827' : '#ffffff',
        text: dark ? '#f9fafb' : '#0f172a',
        sub: dark ? '#7a8baa' : '#64748b',
        border: dark ? '#1e2a45' : '#e2e8f0',
        muted: dark ? '#3d4e6e' : '#cbd5e1',
    };

    useEffect(() => {
        loadPairs();
    }, []);

    useEffect(() => {
        if (selectedPair) loadAnalysis();
    }, [selectedPair, resolution]);

    // Auto-refresh
    useEffect(() => {
        if (!selectedPair) return;
        refreshRef.current = setInterval(() => {
            loadAnalysis(true);
        }, AUTO_REFRESH_MS);
        return () => clearInterval(refreshRef.current);
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

    const loadAnalysis = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [candleData, smcData] = await Promise.all([
                getCandles(token, selectedPair, resolution).catch(() => []),
                getSmcPatterns(token, selectedPair, resolution).catch(() => null),
            ]);
            setCandles(candleData || []);
            setSmcPatterns(smcData);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Analysis load error:', error);
        }
        if (!silent) setLoading(false);
    };

    const patternLabels = {
        order_block_bull: { label: 'Bullish OB', color: '#3b82f6', icon: 'arrow-up' },
        order_block_bear: { label: 'Bearish OB', color: '#ef4444', icon: 'arrow-down' },
        fvg_bull: { label: 'Bullish FVG', color: '#8b5cf6', icon: 'arrow-up' },
        fvg_bear: { label: 'Bearish FVG', color: '#f87171', icon: 'arrow-down' },
        bos_bull: { label: 'Bullish BOS', color: '#10b981', icon: 'arrow-up' },
        bos_bear: { label: 'Bearish BOS', color: '#ef4444', icon: 'arrow-down' },
        choch_bull: { label: 'Bullish CHoCH', color: '#f59e0b', icon: 'swap-vertical' },
        choch_bear: { label: 'Bearish CHoCH', color: '#f87171', icon: 'swap-vertical' },
        liquidity_sweep_high: { label: 'Liq. Sweep High', color: '#ef4444', icon: 'warning' },
        liquidity_sweep_low: { label: 'Liq. Sweep Low', color: '#4ade80', icon: 'warning' },
        ote_zone: { label: 'OTE Zone', color: '#06b6d4', icon: 'locate' },
    };

    // Price stats from candles
    const calcStats = () => {
        if (candles.length < 2) return null;
        const highs = candles.map(c => c.high);
        const lows = candles.map(c => c.low);
        const closes = candles.map(c => c.close);
        const highest = Math.max(...highs);
        const lowest = Math.min(...lows);
        const range = highest - lowest;
        const pipMultiplier = selectedPair.includes('JPY') ? 100 : selectedPair.includes('XAU') ? 1 : 10000;
        return {
            highest, lowest, range,
            pipRange: (range * pipMultiplier).toFixed(0),
            candleCount: candles.length,
            lastClose: closes[closes.length - 1],
        };
    };
    const stats = calcStats();

    return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: c.card }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#60a5fa" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: c.text }]}>{t('menu_analysis')}</Text>
                <View style={styles.headerRightRow}>
                    <View style={styles.liveDot}>
                        <View style={styles.pulseDot} />
                        <Text style={[styles.liveText, { color: '#22c55e' }]}>LIVE</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.aiHeaderBtn}
                        onPress={() => navigation.navigate('AiAnalysis', { symbol: selectedPair, displaySymbol: selectedDisplay, resolution })}
                    >
                        <Ionicons name="sparkles" size={14} color="#fff" />
                        <Text style={styles.aiHeaderBtnText}>AI</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
                {/* Pair Selector */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pairScroll}>
                    {pairs.map(p => (
                        <TouchableOpacity
                            key={p.symbol}
                            style={[styles.pairChip, { borderColor: c.border },
                                selectedPair === p.symbol && styles.pairChipActive]}
                            onPress={() => { setSelectedPair(p.symbol); setSelectedDisplay(p.display); }}
                        >
                            <Text style={[styles.pairChipText, selectedPair === p.symbol && { color: '#fff' }]}>
                                {p.display}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Timeframe Selector */}
                <View style={styles.tfRow}>
                    {RESOLUTIONS.map(r => (
                        <TouchableOpacity
                            key={r}
                            style={[styles.tfChip, { backgroundColor: dark ? '#1e293b' : '#e2e8f0' },
                                resolution === r && styles.tfChipActive]}
                            onPress={() => setResolution(r)}
                        >
                            <Text style={[styles.tfChipText, resolution === r && { color: '#fff' }]}>
                                {RESOLUTION_LABELS[r]}
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {lastUpdate && (
                        <Text style={[styles.updateLabel, { color: c.muted }]}>
                            {lastUpdate.toLocaleTimeString()}
                        </Text>
                    )}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 60 }} />
                ) : (
                    <>
                        {/* CHART - Main Focus */}
                        <TradingViewChart
                            candles={candles}
                            decimals={decimals}
                            dark={dark}
                        />

                        {/* SMC Patterns Summary */}
                        {smcPatterns?.summary && (
                            <View style={[styles.smcBar, { backgroundColor: c.card, borderColor: c.border }]}>
                                <Text style={[styles.smcBarTitle, { color: c.text }]}>
                                    <Ionicons name="layers" size={14} color="#8b5cf6" />{' '}SMC Patterns
                                </Text>
                                <View style={styles.smcBadges}>
                                    {[
                                        { key: 'orderBlocks', label: 'OB', color: '#3b82f6' },
                                        { key: 'fvg', label: 'FVG', color: '#8b5cf6' },
                                        { key: 'bos', label: 'BOS', color: '#10b981' },
                                        { key: 'choch', label: 'CHoCH', color: '#f59e0b' },
                                        { key: 'liquiditySweeps', label: 'Liq', color: '#ef4444' },
                                        { key: 'oteZones', label: 'OTE', color: '#06b6d4' },
                                    ].map(item => (
                                        <View key={item.key} style={[styles.smcMini, { borderColor: item.color }]}>
                                            <Text style={[styles.smcMiniCount, { color: item.color }]}>
                                                {smcPatterns.summary[item.key] || 0}
                                            </Text>
                                            <Text style={[styles.smcMiniLabel, { color: c.sub }]}>{item.label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* SMC Checklist */}
                        <SmcChecklist dark={dark} />

                        {/* More Info Toggle */}
                        <TouchableOpacity
                            onPress={() => setShowInfo(!showInfo)}
                            style={[styles.moreInfoBtn, { backgroundColor: c.card, borderColor: c.border }]}
                        >
                            <View style={styles.moreInfoLeft}>
                                <Ionicons name="information-circle-outline" size={18} color={c.sub} />
                                <Text style={[styles.moreInfoText, { color: c.sub }]}>
                                    {showInfo ? 'Hide Details' : 'Show Analysis Details'}
                                </Text>
                            </View>
                            <Ionicons name={showInfo ? 'chevron-up' : 'chevron-down'} size={18} color={c.sub} />
                        </TouchableOpacity>

                        {/* Collapsible Details */}
                        {showInfo && (
                            <View style={[styles.detailCard, { backgroundColor: c.card, borderColor: c.border }]}>
                                {/* Price Stats */}
                                {stats && (
                                    <View style={styles.statsRow}>
                                        <View style={styles.statItem}>
                                            <Text style={[styles.statLabel, { color: c.sub }]}>High</Text>
                                            <Text style={[styles.statValue, { color: '#22c55e' }]}>{stats.highest.toFixed(decimals)}</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={[styles.statLabel, { color: c.sub }]}>Low</Text>
                                            <Text style={[styles.statValue, { color: '#ef4444' }]}>{stats.lowest.toFixed(decimals)}</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={[styles.statLabel, { color: c.sub }]}>Pip Range</Text>
                                            <Text style={[styles.statValue, { color: c.text }]}>{stats.pipRange}</Text>
                                        </View>
                                        <View style={styles.statItem}>
                                            <Text style={[styles.statLabel, { color: c.sub }]}>Candles</Text>
                                            <Text style={[styles.statValue, { color: c.text }]}>{stats.candleCount}</Text>
                                        </View>
                                    </View>
                                )}

                                {/* SMC Pattern Details */}
                                {smcPatterns?.patterns?.length > 0 && (
                                    <View style={{ marginTop: 12 }}>
                                        <Text style={[styles.detailSectionTitle, { color: c.text }]}>Recent Patterns</Text>
                                        {smcPatterns.patterns
                                            .filter(p => !p.patternType?.startsWith('kill_zone'))
                                            .slice(-10)
                                            .map((p, i) => {
                                                const info = patternLabels[p.patternType] || { label: p.patternType, color: '#6b7280', icon: 'ellipse' };
                                                return (
                                                    <View key={i} style={[styles.patternRow, { borderBottomColor: c.border }]}>
                                                        <View style={[styles.patternDot, { backgroundColor: info.color }]}>
                                                            <Ionicons name={info.icon} size={12} color="#fff" />
                                                        </View>
                                                        <Text style={[styles.patternLabel, { color: info.color }]}>{info.label}</Text>
                                                        <Text style={[styles.patternPrice, { color: c.sub }]}>
                                                            {p.priceLow?.toFixed(decimals)} - {p.priceHigh?.toFixed(decimals)}
                                                        </Text>
                                                    </View>
                                                );
                                            })}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Detail View & AI Buttons */}
                        <TouchableOpacity
                            style={[styles.detailBtn, { backgroundColor: c.card, borderColor: c.border }]}
                            onPress={() => navigation.navigate('PairDetail', { symbol: selectedPair, displaySymbol: selectedDisplay })}
                        >
                            <Ionicons name="expand-outline" size={16} color="#60a5fa" />
                            <Text style={styles.detailBtnText}>{selectedDisplay} Full View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.aiButton}
                            onPress={() => navigation.navigate('AiAnalysis', { symbol: selectedPair, displaySymbol: selectedDisplay, resolution })}
                        >
                            <Ionicons name="sparkles" size={18} color="#fff" />
                            <Text style={styles.aiButtonText}>{t('ai_analyze')}</Text>
                        </TouchableOpacity>
                    </>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 12,
    },
    backBtn: { padding: 8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    liveDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
    liveText: { fontSize: 11, fontWeight: '700' },
    aiHeaderBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: '#7c3aed', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
    },
    aiHeaderBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    content: { flex: 1 },
    contentInner: { padding: 16, maxWidth: 1400, alignSelf: 'center', width: '100%' },
    pairScroll: { maxHeight: 44, marginBottom: 12 },
    pairChip: {
        backgroundColor: 'transparent', borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 8, marginRight: 8,
    },
    pairChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    pairChipText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
    tfRow: { flexDirection: 'row', gap: 8, marginBottom: 16, alignItems: 'center' },
    tfChip: {
        flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center',
    },
    tfChipActive: { backgroundColor: '#2563eb' },
    tfChipText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
    updateLabel: { fontSize: 11, marginLeft: 8 },

    // SMC Bar
    smcBar: { marginTop: 12, borderRadius: 12, padding: 12, borderWidth: 1 },
    smcBarTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    smcBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    smcMini: {
        borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
        alignItems: 'center', flex: 1, minWidth: 55,
    },
    smcMiniCount: { fontSize: 18, fontWeight: 'bold' },
    smcMiniLabel: { fontSize: 9, marginTop: 1 },

    // More Info
    moreInfoBtn: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 10,
    },
    moreInfoLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    moreInfoText: { fontSize: 14, fontWeight: '600' },

    // Detail Card
    detailCard: { borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 8 },
    detailSectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
    statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    statItem: {
        flex: 1, minWidth: 80, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8,
        padding: 10, alignItems: 'center',
    },
    statLabel: { fontSize: 11, marginBottom: 4 },
    statValue: { fontSize: 15, fontWeight: 'bold' },
    patternRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
        borderBottomWidth: 1, gap: 8,
    },
    patternDot: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    patternLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
    patternPrice: { fontSize: 12 },

    // Buttons
    detailBtn: {
        borderWidth: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
        marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    detailBtnText: { color: '#60a5fa', fontSize: 14, fontWeight: '600' },
    aiButton: {
        backgroundColor: '#7c3aed', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
        marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    aiButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default AnalysisScreen;
