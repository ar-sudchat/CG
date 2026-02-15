import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert } from 'react-native';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { useSocket } from '../context/SocketContext';
import { createAlert } from '../api/alerts';
import { getSupportedPairs } from '../api/prices';

const ALERT_TYPES = [
    { value: 'price_above', label: 'Price Above' },
    { value: 'price_below', label: 'Price Below' },
    { value: 'rsi_overbought', label: 'RSI Overbought' },
    { value: 'rsi_oversold', label: 'RSI Oversold' },
    { value: 'ma_cross', label: 'MA Cross' },
];

const NewAlertScreen = ({ navigation, route }) => {
    const { symbol: initialSymbol, displaySymbol: initialDisplay } = route.params || {};
    const { token } = useAuth();
    const { t } = useAppData();
    const { livePrices } = useSocket();

    const [pairs, setPairs] = useState([]);
    const [selectedPair, setSelectedPair] = useState(initialSymbol || '');
    const [selectedDisplay, setSelectedDisplay] = useState(initialDisplay || '');
    const [alertType, setAlertType] = useState('price_above');
    const [targetPrice, setTargetPrice] = useState('');
    const [rsiThreshold, setRsiThreshold] = useState('70');
    const [maPeriodFast, setMaPeriodFast] = useState('20');
    const [maPeriodSlow, setMaPeriodSlow] = useState('50');
    const [maType, setMaType] = useState('SMA');
    const [crossDirection, setCrossDirection] = useState('golden');

    useEffect(() => {
        loadPairs();
    }, []);

    const loadPairs = async () => {
        try {
            const data = await getSupportedPairs(token);
            setPairs(data);
            if (!selectedPair && data.length > 0) {
                setSelectedPair(data[0].symbol);
                setSelectedDisplay(data[0].display);
            }
        } catch (error) {
            console.error('Failed to load pairs:', error);
        }
    };

    const handleSave = async () => {
        try {
            const alertData = {
                symbol: selectedPair,
                displaySymbol: selectedDisplay,
                alertType,
            };

            if (alertType === 'price_above' || alertType === 'price_below') {
                if (!targetPrice) return Alert.alert('Error', t('please_fill_all_fields'));
                alertData.targetPrice = parseFloat(targetPrice);
            } else if (alertType === 'rsi_overbought' || alertType === 'rsi_oversold') {
                alertData.rsiThreshold = parseFloat(rsiThreshold);
            } else if (alertType === 'ma_cross') {
                alertData.maType = maType;
                alertData.maPeriodFast = parseInt(maPeriodFast);
                alertData.maPeriodSlow = parseInt(maPeriodSlow);
                alertData.crossDirection = crossDirection;
            }

            await createAlert(token, alertData);
            Alert.alert('Success', t('alert_saved'));
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', String(error));
        }
    };

    const currentPrice = livePrices[selectedPair]?.price;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>{'<'} {t('close')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('set_alert')}</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.form}>
                {/* Pair Selector */}
                <Text style={styles.label}>{t('pair')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pairScroll}>
                    {pairs.map(p => (
                        <TouchableOpacity
                            key={p.symbol}
                            style={[styles.pairChip, selectedPair === p.symbol && styles.pairChipActive]}
                            onPress={() => { setSelectedPair(p.symbol); setSelectedDisplay(p.display); }}
                        >
                            <Text style={[styles.pairChipText, selectedPair === p.symbol && styles.pairChipTextActive]}>
                                {p.display}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {currentPrice && (
                    <Text style={styles.currentPrice}>
                        {t('current_price')}: {currentPrice.toFixed(5)}
                    </Text>
                )}

                {/* Alert Type */}
                <Text style={styles.label}>{t('alert_type')}</Text>
                <View style={styles.typeGrid}>
                    {ALERT_TYPES.map(at => (
                        <TouchableOpacity
                            key={at.value}
                            style={[styles.typeChip, alertType === at.value && styles.typeChipActive]}
                            onPress={() => setAlertType(at.value)}
                        >
                            <Text style={[styles.typeChipText, alertType === at.value && styles.typeChipTextActive]}>
                                {at.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Conditional Fields */}
                {(alertType === 'price_above' || alertType === 'price_below') && (
                    <>
                        <Text style={styles.label}>{t('target_price')}</Text>
                        <TextInput
                            style={styles.input}
                            value={targetPrice}
                            onChangeText={setTargetPrice}
                            keyboardType="decimal-pad"
                            placeholder="1.12345"
                            placeholderTextColor="#6b7280"
                        />
                    </>
                )}

                {(alertType === 'rsi_overbought' || alertType === 'rsi_oversold') && (
                    <>
                        <Text style={styles.label}>RSI Threshold</Text>
                        <TextInput
                            style={styles.input}
                            value={rsiThreshold}
                            onChangeText={setRsiThreshold}
                            keyboardType="decimal-pad"
                            placeholder={alertType === 'rsi_overbought' ? '70' : '30'}
                            placeholderTextColor="#6b7280"
                        />
                    </>
                )}

                {alertType === 'ma_cross' && (
                    <>
                        <Text style={styles.label}>MA Type</Text>
                        <View style={styles.rowButtons}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, maType === 'SMA' && styles.toggleBtnActive]}
                                onPress={() => setMaType('SMA')}
                            >
                                <Text style={[styles.toggleBtnText, maType === 'SMA' && { color: '#fff' }]}>SMA</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, maType === 'EMA' && styles.toggleBtnActive]}
                                onPress={() => setMaType('EMA')}
                            >
                                <Text style={[styles.toggleBtnText, maType === 'EMA' && { color: '#fff' }]}>EMA</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.halfCol}>
                                <Text style={styles.label}>Fast Period</Text>
                                <TextInput style={styles.input} value={maPeriodFast} onChangeText={setMaPeriodFast} keyboardType="number-pad" placeholderTextColor="#6b7280" />
                            </View>
                            <View style={styles.halfCol}>
                                <Text style={styles.label}>Slow Period</Text>
                                <TextInput style={styles.input} value={maPeriodSlow} onChangeText={setMaPeriodSlow} keyboardType="number-pad" placeholderTextColor="#6b7280" />
                            </View>
                        </View>

                        <Text style={styles.label}>Cross Direction</Text>
                        <View style={styles.rowButtons}>
                            <TouchableOpacity
                                style={[styles.toggleBtn, crossDirection === 'golden' && { backgroundColor: '#4ade80' }]}
                                onPress={() => setCrossDirection('golden')}
                            >
                                <Text style={styles.toggleBtnText}>Golden Cross</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.toggleBtn, crossDirection === 'death' && { backgroundColor: '#ef4444' }]}
                                onPress={() => setCrossDirection('death')}
                            >
                                <Text style={styles.toggleBtnText}>Death Cross</Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}

                {/* Save Button */}
                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                    <Text style={styles.saveButtonText}>{t('save_alert')}</Text>
                </TouchableOpacity>
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
    form: { flex: 1, padding: 16 },
    label: { color: '#9ca3af', fontSize: 14, fontWeight: '500', marginBottom: 8, marginTop: 16 },
    input: {
        backgroundColor: '#374151', borderColor: '#4b5563', borderWidth: 1, borderRadius: 8,
        paddingVertical: 12, paddingHorizontal: 14, color: '#f9fafb', fontSize: 16,
    },
    pairScroll: { flexDirection: 'row' },
    pairChip: {
        backgroundColor: '#374151', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8,
        marginRight: 8, borderWidth: 1, borderColor: '#4b5563',
    },
    pairChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    pairChipText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
    pairChipTextActive: { color: '#fff' },
    currentPrice: { color: '#60a5fa', fontSize: 14, marginTop: 8 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    typeChip: {
        backgroundColor: '#374151', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8,
        borderWidth: 1, borderColor: '#4b5563',
    },
    typeChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
    typeChipText: { color: '#9ca3af', fontSize: 13 },
    typeChipTextActive: { color: '#fff', fontWeight: '600' },
    row: { flexDirection: 'row', gap: 12 },
    halfCol: { flex: 1 },
    rowButtons: { flexDirection: 'row', gap: 8 },
    toggleBtn: {
        flex: 1, backgroundColor: '#374151', paddingVertical: 10, borderRadius: 8, alignItems: 'center',
        borderWidth: 1, borderColor: '#4b5563',
    },
    toggleBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    toggleBtnText: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
    saveButton: {
        backgroundColor: '#2563eb', paddingVertical: 16, borderRadius: 10, alignItems: 'center',
        marginTop: 32, marginBottom: 40,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default NewAlertScreen;
