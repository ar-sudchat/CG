import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { useSocket } from '../context/SocketContext';
import { getCandles, getSmcPatterns } from '../api/prices';
import TradingViewChart from '../components/TradingViewChart';
import SmcChecklist from '../components/SmcChecklist';

const RESOLUTIONS = ['1', '15', '60', '240'];
const RESOLUTION_LABELS = { '1': '1m', '15': '15m', '60': '1H', '240': '4H' };
const AUTO_REFRESH_MS = 30000; // 30 seconds

const getDecimals = (symbol) => {
    if (!symbol) return 5;
    if (symbol.includes('XAU') || symbol.includes('GOLD')) return 2;
    if (symbol.includes('JPY')) return 3;
    return 5;
};

const PairDetailScreen = ({ navigation, route }) => {
    const { symbol, displaySymbol } = route.params;
    const { token } = useAuth();
    const { t, state } = useAppData();
    const { livePrices, subscribePair, unsubscribePair } = useSocket();
    const dark = state.currentTheme !== 'light';

    const [resolution, setResolution] = useState('60');
    const [candles, setCandles] = useState([]);
    const [smcPatterns, setSmcPatterns] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInfo, setShowInfo] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const refreshRef = useRef(null);

    const decimals = getDecimals(symbol);

    const c = {
        bg: dark ? '#0a0e1a' : '#f0f2f5',
        card: dark ? '#111827' : '#ffffff',
        text: dark ? '#f9fafb' : '#0f172a',
        sub: dark ? '#7a8baa' : '#64748b',
        border: dark ? '#1e2a45' : '#e2e8f0',
        muted: dark ? '#3d4e6e' : '#cbd5e1',
    };

    useEffect(() => {
        subscribePair(symbol);
        return () => unsubscribePair(symbol);
    }, [symbol]);

    useEffect(() => {
        loadData();
    }, [resolution]);

    // Auto-refresh
    useEffect(() => {
        refreshRef.current = setInterval(() => {
            loadData(true);
        }, AUTO_REFRESH_MS);
        return () => clearInterval(refreshRef.current);
    }, [resolution, symbol]);

    const loadData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [candleData, smcData] = await Promise.all([
                getCandles(token, symbol, resolution).catch(() => []),
                getSmcPatterns(token, symbol, resolution).catch(() => null),
            ]);
            setCandles(candleData || []);
            setSmcPatterns(smcData);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Load data error:', error);
        }
        if (!silent) setLoading(false);
    };

    const livePrice = livePrices[symbol];
    const lastCandle = candles.length > 0 ? candles[candles.length - 1] : null;
    const currentPrice = livePrice?.price || lastCandle?.close;

    // SMC Pattern Labels
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

    return (
        <View style={[styles.container, { backgroundColor: c.bg }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: c.card }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color="#60a5fa" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: c.text }]}>{displaySymbol}</Text>
                    <View style={styles.priceRow}>
                        <Text style={[styles.headerPrice, { color: currentPrice ? c.text : c.muted }]}>
                            {currentPrice?.toFixed(decimals) || '---'}
                        </Text>
                        {livePrice?.changePercent !== undefined && (
                            <View style={[styles.changeBadge, {
                                backgroundColor: livePrice.changePercent >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                            }]}>
                                <Ionicons
                                    name={livePrice.changePercent >= 0 ? 'caret-up' : 'caret-down'}
                                    size={10}
                                    color={livePrice.changePercent >= 0 ? '#22c55e' : '#ef4444'}
                                />
                                <Text style={{ color: livePrice.changePercent >= 0 ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: '700' }}>
                                    {livePrice.changePercent >= 0 ? '+' : ''}{livePrice.changePercent.toFixed(2)}%
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.aiBtn}
                        onPress={() => navigation.navigate('AiAnalysis', { symbol, displaySymbol, resolution })}
                    >
                        <Ionicons name="sparkles" size={14} color="#fff" />
                        <Text style={styles.aiBtnText}>AI</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Timeframe Selector */}
            <View style={[styles.tfRow, { backgroundColor: c.card }]}>
                {RESOLUTIONS.map(r => (
                    <TouchableOpacity
                        key={r}
                        style={[styles.tfBtn, resolution === r && styles.tfBtnActive]}
                        onPress={() => setResolution(r)}
                    >
                        <Text style={[styles.tfText, resolution === r && styles.tfTextActive]}>
                            {RESOLUTION_LABELS[r]}
                        </Text>
                    </TouchableOpacity>
                ))}
                {/* Auto-refresh indicator */}
                <View style={styles.refreshBadge}>
                    <View style={styles.pulseDot} />
                    <Text style={[styles.refreshText, { color: c.sub }]}>Auto 30s</Text>
                </View>
            </View>

            {/* Content */}
            {loading ? (
                <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 60 }} />
            ) : (
                <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
                    {/* CHART - Main Focus */}
                    <TradingViewChart
                        candles={candles}
                        decimals={decimals}
                        dark={dark}
                    />

                    {/* SMC Patterns Summary (always visible - key for SMC trading) */}
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
                                {showInfo ? 'Hide Details' : 'Show Market Details'}
                            </Text>
                        </View>
                        <Ionicons name={showInfo ? 'chevron-up' : 'chevron-down'} size={18} color={c.sub} />
                    </TouchableOpacity>

                    {/* Collapsible Details */}
                    {showInfo && (
                        <View style={[styles.detailCard, { backgroundColor: c.card, borderColor: c.border }]}>
                            {/* Bid / Ask / Spread */}
                            {livePrice && (
                                <View style={styles.bidAskRow}>
                                    <View style={[styles.bidAskBox, { backgroundColor: dark ? '#065f46' : '#dcfce7' }]}>
                                        <Text style={[styles.bidAskLabel, { color: dark ? 'rgba(255,255,255,0.6)' : '#16a34a' }]}>BID</Text>
                                        <Text style={[styles.bidAskValue, { color: dark ? '#f9fafb' : '#15803d' }]}>{livePrice.bid?.toFixed(decimals)}</Text>
                                    </View>
                                    <View style={[styles.bidAskBox, { backgroundColor: dark ? '#1e293b' : '#f1f5f9' }]}>
                                        <Text style={[styles.bidAskLabel, { color: c.sub }]}>SPREAD</Text>
                                        <Text style={[styles.bidAskValue, { color: c.text }]}>{livePrice.spread?.toFixed(decimals)}</Text>
                                    </View>
                                    <View style={[styles.bidAskBox, { backgroundColor: dark ? '#7f1d1d' : '#fef2f2' }]}>
                                        <Text style={[styles.bidAskLabel, { color: dark ? 'rgba(255,255,255,0.6)' : '#dc2626' }]}>ASK</Text>
                                        <Text style={[styles.bidAskValue, { color: dark ? '#f9fafb' : '#b91c1c' }]}>{livePrice.ask?.toFixed(decimals)}</Text>
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

                            {/* Last update */}
                            {lastUpdate && (
                                <Text style={[styles.updateTime, { color: c.muted }]}>
                                    Updated: {lastUpdate.toLocaleTimeString()}
                                </Text>
                            )}
                        </View>
                    )}

                    {/* AI Analysis Button */}
                    <TouchableOpacity
                        style={styles.aiButton}
                        onPress={() => navigation.navigate('AiAnalysis', { symbol, displaySymbol, resolution })}
                    >
                        <Ionicons name="sparkles" size={18} color="#fff" />
                        <Text style={styles.aiButtonText}>{t('ai_analyze')}</Text>
                    </TouchableOpacity>

                    <View style={{ height: 40 }} />
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 12,
    },
    backButton: { padding: 8 },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
    headerPrice: { fontSize: 16, fontWeight: '600' },
    changeBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
    },
    headerRight: { flexDirection: 'row', gap: 8 },
    aiBtn: {
        backgroundColor: '#7c3aed', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
        flexDirection: 'row', alignItems: 'center', gap: 4,
    },
    aiBtnText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    tfRow: {
        flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4, gap: 6, alignItems: 'center',
    },
    tfBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
    tfBtnActive: { backgroundColor: '#2563eb' },
    tfText: { color: '#6b7280', fontSize: 14, fontWeight: '600' },
    tfTextActive: { color: '#fff' },
    refreshBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 8 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
    refreshText: { fontSize: 11, fontWeight: '600' },
    content: { flex: 1 },
    contentInner: { paddingHorizontal: 16, maxWidth: 1400, alignSelf: 'center', width: '100%', paddingTop: 8 },

    // SMC Summary Bar
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
    bidAskRow: { flexDirection: 'row', gap: 8 },
    bidAskBox: { flex: 1, borderRadius: 10, padding: 12, alignItems: 'center' },
    bidAskLabel: { fontSize: 11, marginBottom: 4, fontWeight: '600' },
    bidAskValue: { fontSize: 15, fontWeight: 'bold' },
    patternRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
        borderBottomWidth: 1, gap: 8,
    },
    patternDot: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    patternLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
    patternPrice: { fontSize: 12 },
    updateTime: { textAlign: 'center', fontSize: 11, marginTop: 12, paddingTop: 8 },

    // AI Button
    aiButton: {
        backgroundColor: '#7c3aed', paddingVertical: 16, borderRadius: 12, alignItems: 'center',
        marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 8,
    },
    aiButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default PairDetailScreen;
