import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, RefreshControl } from 'react-native';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { getAlerts, deleteAlert as deleteAlertApi } from '../api/alerts';

const AlertsScreen = ({ navigation }) => {
    const { token } = useAuth();
    const { t } = useAppData();
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState('all'); // 'all', 'active', 'triggered'
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAlerts();
    }, [filter]);

    const loadAlerts = async () => {
        try {
            const status = filter === 'all' ? undefined : filter;
            const data = await getAlerts(token, status);
            setAlerts(data);
        } catch (error) {
            console.error('Failed to load alerts:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAlerts();
        setRefreshing(false);
    };

    const handleDelete = (alertId) => {
        Alert.alert(
            t('confirm_delete'),
            t('confirm_delete_alert'),
            [
                { text: t('close'), style: 'cancel' },
                {
                    text: t('delete'), style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAlertApi(token, alertId);
                            setAlerts(prev => prev.filter(a => a._id !== alertId));
                        } catch (error) {
                            console.error('Delete error:', error);
                        }
                    },
                },
            ]
        );
    };

    const alertTypeLabels = {
        price_above: 'Price Above',
        price_below: 'Price Below',
        rsi_overbought: 'RSI Overbought',
        rsi_oversold: 'RSI Oversold',
        ma_cross: 'MA Cross',
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>{'<'} {t('close')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('menu_alerts')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('NewAlert', {})}>
                    <Text style={styles.addText}>+ {t('add')}</Text>
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {['all', 'active', 'triggered'].map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f === 'all' ? t('all') : f === 'active' ? t('active') : t('triggered')}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Alert List */}
            <ScrollView
                style={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {alerts.length === 0 ? (
                    <Text style={styles.emptyText}>{t('no_alerts')}</Text>
                ) : (
                    alerts.map(alert => (
                        <TouchableOpacity
                            key={alert._id}
                            style={styles.alertCard}
                            onLongPress={() => handleDelete(alert._id)}
                        >
                            <View style={styles.alertLeft}>
                                <View style={[styles.alertIcon, {
                                    backgroundColor: alert.isTriggered ? '#fef3c7' : alert.isActive ? '#d1fae5' : '#374151'
                                }]}>
                                    <Text style={{ fontSize: 20 }}>
                                        {alert.isTriggered ? '!' : alert.isActive ? '~' : '-'}
                                    </Text>
                                </View>
                                <View>
                                    <Text style={styles.alertSymbol}>{alert.displaySymbol || alert.symbol}</Text>
                                    <Text style={styles.alertType}>{alertTypeLabels[alert.alertType] || alert.alertType}</Text>
                                </View>
                            </View>
                            <View style={styles.alertRight}>
                                {alert.targetPrice && (
                                    <Text style={styles.alertTarget}>{alert.targetPrice.toFixed(5)}</Text>
                                )}
                                <Text style={[styles.alertStatus, {
                                    color: alert.isTriggered ? '#f59e0b' : alert.isActive ? '#4ade80' : '#6b7280'
                                }]}>
                                    {alert.isTriggered ? t('triggered') : alert.isActive ? t('active') : t('inactive')}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))
                )}
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
    backText: { color: '#60a5fa', fontSize: 16 },
    headerTitle: { color: '#f9fafb', fontSize: 18, fontWeight: 'bold' },
    addText: { color: '#4ade80', fontSize: 16, fontWeight: '600' },
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1f2937' },
    filterTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 6, marginHorizontal: 4 },
    filterTabActive: { backgroundColor: '#2563eb' },
    filterText: { color: '#6b7280', fontSize: 14 },
    filterTextActive: { color: '#fff', fontWeight: '600' },
    list: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
    emptyText: { color: '#6b7280', textAlign: 'center', paddingVertical: 40, fontSize: 16 },
    alertCard: {
        backgroundColor: '#374151', borderRadius: 10, padding: 16, marginBottom: 10,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    },
    alertLeft: { flexDirection: 'row', alignItems: 'center' },
    alertIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    alertSymbol: { color: '#f9fafb', fontSize: 16, fontWeight: 'bold' },
    alertType: { color: '#9ca3af', fontSize: 12 },
    alertRight: { alignItems: 'flex-end' },
    alertTarget: { color: '#f9fafb', fontSize: 16, fontWeight: '600' },
    alertStatus: { fontSize: 12, marginTop: 4 },
});

export default AlertsScreen;
