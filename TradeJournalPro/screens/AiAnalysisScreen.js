import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AppContext';
import { useAppData } from '../context/AppDataContext';
import { getAiAnalysis } from '../api/analysis';

const AiAnalysisScreen = ({ navigation, route }) => {
    const { symbol, displaySymbol, resolution = '60' } = route.params || {};
    const { token } = useAuth();
    const { t } = useAppData();

    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await getAiAnalysis(token, symbol, resolution);
            setAnalysis(result);
        } catch (err) {
            setError(String(err));
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backText}>{'<'} {t('close')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>AI {t('ai_analyze')}</Text>
                <View style={{ width: 60 }} />
            </View>

            <ScrollView style={styles.content}>
                {/* Symbol Info */}
                <View style={styles.symbolCard}>
                    <Text style={styles.symbolName}>{displaySymbol || symbol}</Text>
                    <Text style={styles.symbolResolution}>Timeframe: {resolution === 'D' ? 'Daily' : `${resolution}m`}</Text>
                    {analysis?.currentPrice && (
                        <Text style={styles.symbolPrice}>
                            {t('current_price')}: {analysis.currentPrice.toFixed(5)}
                        </Text>
                    )}
                </View>

                {/* SMC Pattern Summary */}
                {analysis?.smcPatterns && (
                    <View style={styles.smcCard}>
                        <Text style={styles.cardTitle}>SMC/ICT Patterns</Text>
                        <View style={styles.smcRow}>
                            <SmcItem label="OB" count={analysis.smcPatterns.orderBlocks} />
                            <SmcItem label="FVG" count={analysis.smcPatterns.fvg} />
                            <SmcItem label="BOS" count={analysis.smcPatterns.bos} />
                            <SmcItem label="CHoCH" count={analysis.smcPatterns.choch} />
                            <SmcItem label="Liq." count={analysis.smcPatterns.liquiditySweeps} />
                            <SmcItem label="OTE" count={analysis.smcPatterns.oteZones} />
                        </View>
                    </View>
                )}

                {/* Indicators Summary */}
                {analysis?.indicators && (
                    <View style={styles.indicatorCard}>
                        <Text style={styles.cardTitle}>Key Indicators</Text>
                        {analysis.indicators.rsi !== null && (
                            <View style={styles.indicRow}>
                                <Text style={styles.indicLabel}>RSI(14)</Text>
                                <Text style={[styles.indicValue, {
                                    color: analysis.indicators.rsi > 70 ? '#ef4444' : analysis.indicators.rsi < 30 ? '#4ade80' : '#f9fafb'
                                }]}>
                                    {analysis.indicators.rsi?.toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* AI Analysis Result */}
                {analysis?.analysis && (
                    <View style={styles.analysisCard}>
                        <Text style={styles.cardTitle}>AI Analysis (SMC/ICT)</Text>
                        <Text style={styles.analysisText}>{analysis.analysis}</Text>
                        <Text style={styles.timestamp}>
                            {new Date(analysis.timestamp).toLocaleString('th-TH')}
                        </Text>
                    </View>
                )}

                {/* Error */}
                {error && (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                )}

                {/* Analyze Button */}
                <TouchableOpacity
                    style={[styles.analyzeButton, loading && styles.buttonDisabled]}
                    onPress={handleAnalyze}
                    disabled={loading}
                >
                    {loading ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color="#fff" size="small" />
                            <Text style={styles.analyzeButtonText}> {t('analyzing')}...</Text>
                        </View>
                    ) : (
                        <Text style={styles.analyzeButtonText}>
                            {analysis ? t('analyze_again') : t('start_analysis')}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Note */}
                <Text style={styles.noteText}>
                    {t('ai_note')}
                </Text>
            </ScrollView>
        </View>
    );
};

const SmcItem = ({ label, count }) => (
    <View style={styles.smcItem}>
        <Text style={styles.smcCount}>{count || 0}</Text>
        <Text style={styles.smcLabel}>{label}</Text>
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
    symbolCard: {
        backgroundColor: '#1f2937', borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16,
        borderWidth: 1, borderColor: '#7c3aed',
    },
    symbolName: { color: '#f9fafb', fontSize: 28, fontWeight: 'bold' },
    symbolResolution: { color: '#9ca3af', fontSize: 14, marginTop: 4 },
    symbolPrice: { color: '#60a5fa', fontSize: 16, marginTop: 8 },
    smcCard: { backgroundColor: '#374151', borderRadius: 10, padding: 16, marginBottom: 12 },
    cardTitle: { color: '#f9fafb', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    smcRow: { flexDirection: 'row', justifyContent: 'space-between' },
    smcItem: { alignItems: 'center' },
    smcCount: { color: '#60a5fa', fontSize: 20, fontWeight: 'bold' },
    smcLabel: { color: '#6b7280', fontSize: 11, marginTop: 2 },
    indicatorCard: { backgroundColor: '#374151', borderRadius: 10, padding: 16, marginBottom: 12 },
    indicRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    indicLabel: { color: '#9ca3af', fontSize: 14 },
    indicValue: { fontSize: 16, fontWeight: '600' },
    analysisCard: {
        backgroundColor: '#1f2937', borderRadius: 10, padding: 16, marginBottom: 12,
        borderLeftWidth: 4, borderLeftColor: '#7c3aed',
    },
    analysisText: { color: '#d1d5db', fontSize: 15, lineHeight: 24 },
    timestamp: { color: '#6b7280', fontSize: 12, marginTop: 12, textAlign: 'right' },
    errorCard: { backgroundColor: '#7f1d1d', borderRadius: 10, padding: 16, marginBottom: 12 },
    errorText: { color: '#fca5a5', fontSize: 14 },
    analyzeButton: {
        backgroundColor: '#7c3aed', paddingVertical: 18, borderRadius: 12, alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    analyzeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    loadingRow: { flexDirection: 'row', alignItems: 'center' },
    noteText: { color: '#6b7280', fontSize: 12, textAlign: 'center', marginTop: 16, marginBottom: 40, lineHeight: 18 },
});

export default AiAnalysisScreen;
