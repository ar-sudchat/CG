import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, RefreshControl } from 'react-native';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { getSupportedPairs, getLivePrices } from '../api/prices';

const { width: SCREEN_W } = Dimensions.get('window');
const IS_WIDE = SCREEN_W >= 900;

const getDecimals = (symbol) => {
    if (!symbol) return 5;
    if (symbol.includes('XAU') || symbol.includes('GOLD')) return 2;
    if (symbol.includes('JPY')) return 3;
    return 5;
};

const LivePricesScreen = ({ navigation }) => {
    const { token } = useAuth();
    const { t } = useAppData();
    const { isConnected, livePrices, subscribePair, unsubscribePair } = useSocket();
    const [pairs, setPairs] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadPairs();
    }, []);

    useEffect(() => {
        pairs.forEach(p => subscribePair(p.symbol));
        return () => {
            pairs.forEach(p => unsubscribePair(p.symbol));
        };
    }, [pairs]);

    const loadPairs = async () => {
        try {
            const data = await getSupportedPairs(token);
            setPairs(data);
        } catch (error) {
            console.error('Failed to load pairs:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await getLivePrices(token);
        } catch (error) {
            console.error('Refresh error:', error);
        }
        setRefreshing(false);
    };

    const formatPrice = (price, symbol) => {
        if (!price) return '---';
        return price.toFixed(getDecimals(symbol));
    };

    const formatChange = (change) => {
        if (!change) return '0.00%';
        return `${change >= 0 ? '+' : ''}${change.toFixed(4)}%`;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Text style={styles.backText}>{'\u2190'} Back</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('menu_live_prices')}</Text>
                <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4ade80' : '#ef4444' }]} />
            </View>

            {/* Connection Status */}
            <View style={[styles.statusBar, { backgroundColor: isConnected ? '#065f46' : '#7f1d1d' }]}>
                <Text style={styles.statusText}>
                    {isConnected ? t('connected') : t('disconnected')} | {pairs.length} pairs
                </Text>
            </View>

            {/* Table Header for Wide */}
            {IS_WIDE && (
                <View style={styles.tableHeader}>
                    <Text style={[styles.thText, { flex: 2 }]}>Pair</Text>
                    <Text style={[styles.thText, { flex: 2, textAlign: 'right' }]}>Price</Text>
                    <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>Change</Text>
                    <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>Bid</Text>
                    <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>Ask</Text>
                    <Text style={[styles.thText, { flex: 1.5, textAlign: 'right' }]}>Spread</Text>
                </View>
            )}

            {/* Price List */}
            <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {pairs.map(pair => {
                    const priceData = livePrices[pair.symbol];
                    const price = priceData?.price;
                    const change = priceData?.changePercent;
                    const isUp = change >= 0;
                    const dec = getDecimals(pair.symbol);

                    if (IS_WIDE) {
                        return (
                            <TouchableOpacity
                                key={pair.symbol}
                                style={styles.tableRow}
                                onPress={() => navigation.navigate('PairDetail', { symbol: pair.symbol, displaySymbol: pair.display })}
                            >
                                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Text style={styles.pairName}>{pair.display}</Text>
                                    <Text style={styles.pairSymbol}>{pair.symbol.replace('OANDA:', '')}</Text>
                                </View>
                                <Text style={[styles.tablePrice, { flex: 2, textAlign: 'right', color: priceData ? '#f9fafb' : '#6b7280' }]}>
                                    {formatPrice(price, pair.symbol)}
                                </Text>
                                <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                                    <View style={[styles.changeBadge, { backgroundColor: isUp ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)' }]}>
                                        <Text style={[styles.changeText, { color: isUp ? '#4ade80' : '#f87171' }]}>
                                            {formatChange(change)}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{formatPrice(priceData?.bid, pair.symbol)}</Text>
                                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{formatPrice(priceData?.ask, pair.symbol)}</Text>
                                <Text style={[styles.tableCell, { flex: 1.5, textAlign: 'right' }]}>{priceData?.spread ? priceData.spread.toFixed(dec) : '---'}</Text>
                            </TouchableOpacity>
                        );
                    }

                    return (
                        <TouchableOpacity
                            key={pair.symbol}
                            style={styles.priceCard}
                            onPress={() => navigation.navigate('PairDetail', { symbol: pair.symbol, displaySymbol: pair.display })}
                        >
                            <View style={styles.pairInfo}>
                                <Text style={styles.pairName}>{pair.display}</Text>
                                <Text style={styles.pairSymbol}>{pair.symbol.replace('OANDA:', '')}</Text>
                            </View>
                            <View style={styles.priceInfo}>
                                <Text style={[styles.price, { color: priceData ? '#f9fafb' : '#6b7280' }]}>
                                    {formatPrice(price, pair.symbol)}
                                </Text>
                                <View style={[styles.changeBadge, { backgroundColor: isUp ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)' }]}>
                                    <Text style={[styles.changeText, { color: isUp ? '#4ade80' : '#f87171' }]}>
                                        {formatChange(change)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.spreadInfo}>
                                <Text style={styles.spreadLabel}>Bid</Text>
                                <Text style={styles.spreadValue}>{formatPrice(priceData?.bid, pair.symbol)}</Text>
                                <Text style={styles.spreadLabel}>Ask</Text>
                                <Text style={styles.spreadValue}>{formatPrice(priceData?.ask, pair.symbol)}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#111827' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingBottom: 12,
        backgroundColor: '#1f2937',
    },
    backButton: { padding: 4 },
    backText: { color: '#60a5fa', fontSize: 15, fontWeight: '600' },
    headerTitle: { color: '#f9fafb', fontSize: 18, fontWeight: 'bold' },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    statusBar: { paddingVertical: 4, paddingHorizontal: 20, alignItems: 'center' },
    statusText: { color: '#fff', fontSize: 12 },
    // Table header (wide)
    tableHeader: {
        flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 10,
        backgroundColor: '#1f2937', borderBottomWidth: 1, borderBottomColor: '#374151',
        maxWidth: 1200, alignSelf: 'center', width: '100%',
    },
    thText: { color: '#6b7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
    // List
    list: { flex: 1 },
    listContent: { paddingHorizontal: IS_WIDE ? 20 : 16, paddingTop: 12, maxWidth: 1200, alignSelf: 'center', width: '100%' },
    // Table row (wide)
    tableRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4,
        borderBottomWidth: 1, borderBottomColor: '#1f2937',
    },
    tablePrice: { fontSize: 16, fontWeight: 'bold' },
    tableCell: { color: '#9ca3af', fontSize: 14 },
    // Card (narrow)
    priceCard: {
        backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 10,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    pairInfo: { flex: 1 },
    pairName: { color: '#f9fafb', fontSize: 17, fontWeight: 'bold' },
    pairSymbol: { color: '#6b7280', fontSize: 12, marginTop: 2 },
    priceInfo: { alignItems: 'flex-end', marginRight: 12 },
    price: { fontSize: 17, fontWeight: 'bold' },
    changeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginTop: 4 },
    changeText: { fontSize: 12, fontWeight: '600' },
    spreadInfo: { alignItems: 'flex-end' },
    spreadLabel: { color: '#6b7280', fontSize: 10 },
    spreadValue: { color: '#9ca3af', fontSize: 12 },
});

export default LivePricesScreen;
