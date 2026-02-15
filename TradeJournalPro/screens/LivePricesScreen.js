import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, RefreshControl } from 'react-native';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { getSupportedPairs, getLivePrices } from '../api/prices';

const LivePricesScreen = ({ navigation }) => {
    const { token } = useAuth();
    const { currentStyles, t } = useAppData();
    const { isConnected, livePrices, subscribePair, unsubscribePair } = useSocket();
    const [pairs, setPairs] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadPairs();
    }, []);

    useEffect(() => {
        // Subscribe to all pairs when screen mounts
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
            const data = await getLivePrices(token);
            // Merge REST data with live data
        } catch (error) {
            console.error('Refresh error:', error);
        }
        setRefreshing(false);
    };

    const formatPrice = (price) => {
        if (!price) return '---';
        return price.toFixed(5);
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
                    <Text style={styles.backText}>{'<'} {t('close')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('menu_live_prices')}</Text>
                <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4ade80' : '#ef4444' }]} />
            </View>

            {/* Connection Status */}
            <View style={[styles.statusBar, { backgroundColor: isConnected ? '#065f46' : '#7f1d1d' }]}>
                <Text style={styles.statusText}>
                    {isConnected ? t('connected') : t('disconnected')}
                </Text>
            </View>

            {/* Price List */}
            <ScrollView
                style={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {pairs.map(pair => {
                    const priceData = livePrices[pair.symbol];
                    const price = priceData?.price;
                    const change = priceData?.changePercent;
                    const isUp = change >= 0;

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
                                    {formatPrice(price)}
                                </Text>
                                <View style={[styles.changeBadge, { backgroundColor: isUp ? 'rgba(74,222,128,0.15)' : 'rgba(248,113,113,0.15)' }]}>
                                    <Text style={[styles.changeText, { color: isUp ? '#4ade80' : '#f87171' }]}>
                                        {formatChange(change)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.spreadInfo}>
                                <Text style={styles.spreadLabel}>Bid</Text>
                                <Text style={styles.spreadValue}>{formatPrice(priceData?.bid)}</Text>
                                <Text style={styles.spreadLabel}>Ask</Text>
                                <Text style={styles.spreadValue}>{formatPrice(priceData?.ask)}</Text>
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
        paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 40 : 50, paddingBottom: 12,
        backgroundColor: '#1f2937',
    },
    backButton: { padding: 4 },
    backText: { color: '#60a5fa', fontSize: 16 },
    headerTitle: { color: '#f9fafb', fontSize: 18, fontWeight: 'bold' },
    statusDot: { width: 12, height: 12, borderRadius: 6 },
    statusBar: { paddingVertical: 4, paddingHorizontal: 16, alignItems: 'center' },
    statusText: { color: '#fff', fontSize: 12 },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    priceCard: {
        backgroundColor: '#374151', borderRadius: 12, padding: 16, marginBottom: 12,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    pairInfo: { flex: 1 },
    pairName: { color: '#f9fafb', fontSize: 18, fontWeight: 'bold' },
    pairSymbol: { color: '#6b7280', fontSize: 12, marginTop: 2 },
    priceInfo: { alignItems: 'flex-end', marginRight: 12 },
    price: { fontSize: 18, fontWeight: 'bold' },
    changeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
    changeText: { fontSize: 12, fontWeight: '600' },
    spreadInfo: { alignItems: 'flex-end' },
    spreadLabel: { color: '#6b7280', fontSize: 10 },
    spreadValue: { color: '#9ca3af', fontSize: 12 },
});

export default LivePricesScreen;
