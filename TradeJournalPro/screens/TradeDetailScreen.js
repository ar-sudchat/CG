import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert, // For delete confirmation
} from 'react-native';
import { AppContext } from '../context/AppContext'; // Adjust path as needed

// --- Stylesheets for Dark and Light Modes (Copied for consistency, centralize in a real app) ---
const darkStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#1f2937', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f9fafb' },
  iconText: { color: '#9ca3af', fontSize: 24 },
  placeholderText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#374151', // gray-700
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 14, color: '#9ca3af', marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb' },
  cardValueGreen: { fontSize: 18, fontWeight: 'bold', color: '#4ade80' },
  cardValueRed: { fontSize: 18, fontWeight: 'bold', color: '#f87171' },
  cardGridItem: {
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
    flex: 1,
  },
  listItemSubText: { // For checklist items
    color: '#9ca3af',
    fontSize: 12,
  },
  actionButtonRed: {
    backgroundColor: '#ef4444', // red-600
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  imagePlaceholderText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 50,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    marginTop: 10,
  },
});

const lightStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  iconText: { color: '#4b5563', fontSize: 24 },
  placeholderText: {
    color: '#4b5563',
    textAlign: 'center',
    paddingVertical: 40,
  },
  card: {
    backgroundColor: '#ffffff', // white
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb', // gray-200
  },
  cardTitle: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  cardValue: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  cardValueGreen: { fontSize: 18, fontWeight: 'bold', color: '#4ade80' },
  cardValueRed: { fontSize: 18, fontWeight: 'bold', color: '#f87171' },
  cardGridItem: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  listItemSubText: {
    color: '#4b5563',
    fontSize: 12,
  },
  actionButtonRed: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  imagePlaceholderText: {
    color: '#4b5563',
    textAlign: 'center',
    paddingVertical: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 10,
  },
});

// --- Global styles (common to both themes or structural) ---
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 0,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  iconButton: {
    padding: 4,
  },
  contentPadding: {
    paddingBottom: 20,
  },
  tradeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tradeDetailPair: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tradeDetailDate: {
    fontSize: 14,
  },
  tradeDirectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  tradeDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  // For checklist items in detail view
  checklistSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});


const TradeDetailScreen = () => {
    const { state, navigateTo, goBackToPreviousPage, setState: setGlobalState, t } = useContext(AppContext);
    const isLightMode = state.currentTheme === 'light';
    const currentStyles = isLightMode ? lightStyles : darkStyles;

    // Get tradeId from navigation params
    const tradeId = state.currentTrade?.tradeId;
    const trade = state.trades.find(t => t.id === tradeId);

    if (!trade) {
        return (
            <View style={currentStyles.page}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
                        <Text style={currentStyles.iconText}>⬅️</Text>
                    </TouchableOpacity>
                    <Text style={currentStyles.headerTitle}>{t('trade_detail')}</Text>
                    <View style={{ width: 30 }} /> {/* Spacer */}
                </View>
                <Text style={currentStyles.placeholderText}>{t('trade_not_found')}</Text>
            </View>
        );
    }

    const isWin = trade.pnl >= 0;
    const account = state.accounts.find(a => a.id === trade.accountId);

    const handleDeleteTrade = () => {
      Alert.alert(
        t('delete_trade'),
        t('confirm_delete_trade'),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'OK',
            onPress: () => {
              setGlobalState(prevState => {
                const updatedTrades = prevState.trades.filter(t => t.id !== tradeId);
                // Revert account balance if trade is deleted
                const updatedAccounts = prevState.accounts.map(acc => {
                  if (acc.id === trade.accountId) {
                    return { ...acc, balance: acc.balance - trade.pnl };
                  }
                  return acc;
                });
                return { ...prevState, trades: updatedTrades, accounts: updatedAccounts };
              });
              Alert.alert(t('trade_deleted'));
              goBackToPreviousPage(); // Go back to history screen
            },
          },
        ]
      );
    };

    return (
        <View style={currentStyles.page}>
            {/* Header Section */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
                    <Text style={currentStyles.iconText}>⬅️</Text>
                </TouchableOpacity>
                <Text style={currentStyles.headerTitle}>{t('trade_detail')}</Text>
                <View style={{ width: 30 }} /> {/* Spacer */}
            </View>

            <ScrollView contentContainerStyle={styles.contentPadding}>
                {/* Trade Summary Card */}
                <View style={currentStyles.card}>
                    <View style={styles.tradeDetailHeader}>
                        <Text style={[currentStyles.cardValue, styles.tradeDetailPair]}>{trade.pair}</Text>
                        <View style={[styles.tradeDirectionBadge, { backgroundColor: trade.direction === 'Buy' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)' }]}>
                            <Text style={{ color: trade.direction === 'Buy' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                                {trade.direction}
                            </Text>
                        </View>
                    </View>
                    <Text style={[currentStyles.listItemSubText, styles.tradeDetailDate]}>
                        {new Date(trade.date).toLocaleString(state.currentLanguage, { dateStyle: 'long', timeStyle: 'short' })}
                    </Text>
                </View>

                {/* Key Metrics Grid */}
                <View style={styles.tradeDetailGrid}>
                    <View style={currentStyles.cardGridItem}>
                        <Text style={currentStyles.cardTitle}>{t('pnl')}</Text>
                        <Text style={[currentStyles.cardValue, { color: isWin ? '#4ade80' : '#f87171' }]}>
                            ${trade.pnl.toFixed(2)}
                        </Text>
                    </View>
                    <View style={currentStyles.cardGridItem}>
                        <Text style={currentStyles.cardTitle}>{t('trade_outcome')}</Text>
                        <Text style={currentStyles.cardValue}>{t(trade.outcome.toLowerCase())}</Text>
                    </View>
                    <View style={currentStyles.cardGridItem}>
                        <Text style={currentStyles.cardTitle}>{t('account')}</Text>
                        <Text style={currentStyles.cardValue}>{account ? account.name : 'N/A'}</Text>
                    </View>
                    <View style={currentStyles.cardGridItem}>
                        <Text style={currentStyles.cardTitle}>{t('risk')}</Text>
                        <Text style={currentStyles.cardValue}>{trade.riskValue} {trade.riskUnit === 'Amount' ? '$' : 'R'}</Text>
                    </View>
                </View>

                {/* Technical Checklist */}
                <View style={currentStyles.card}>
                    <Text style={[currentStyles.cardTitle, styles.checklistSectionTitle]}>{t('technical_checklist')}</Text>
                    {trade.checklist && trade.checklist.length > 0 ? (
                        trade.checklist.map((item, index) => (
                            <Text key={index} style={currentStyles.listItemSubText}>• {item}</Text>
                        ))
                    ) : (
                        <Text style={currentStyles.placeholderText}>{t('no_conditions')}</Text>
                    )}
                </View>

                {/* Psychology Checklist */}
                <View style={currentStyles.card}>
                    <Text style={[currentStyles.cardTitle, styles.checklistSectionTitle]}>{t('psychology_checklist')}</Text>
                    {trade.psychologyChecklist && trade.psychologyChecklist.length > 0 ? (
                        trade.psychologyChecklist.map((item, index) => (
                            <Text key={index} style={currentStyles.listItemSubText}>• {item}</Text>
                        ))
                    ) : (
                        <Text style={currentStyles.placeholderText}>{t('no_conditions')}</Text>
                    )}
                </View>

                {/* Image Display (Placeholders) */}
                <View style={currentStyles.card}>
                    <Text style={[currentStyles.cardTitle, styles.checklistSectionTitle]}>{t('entry_image')}</Text>
                    {trade.entryImageDataUrl ? (
                        // In a real app, you'd use <Image source={{ uri: trade.entryImageDataUrl }} style={styles.actualImage} />
                        <Text style={currentStyles.imagePlaceholderText}></Text>
                    ) : (
                        <Text style={currentStyles.placeholderText}>{t('no_image')}</Text>
                    )}
                </View>
                <View style={currentStyles.card}>
                    <Text style={[currentStyles.cardTitle, styles.checklistSectionTitle]}>{t('exit_image')}</Text>
                    {trade.exitImageDataUrl ? (
                        // In a real app, you'd use <Image source={{ uri: trade.exitImageDataUrl }} style={styles.actualImage} />
                        <Text style={currentStyles.imagePlaceholderText}></Text>
                    ) : (
                        <Text style={currentStyles.placeholderText}>{t('no_image')}</Text>
                    )}
                </View>

                {/* Notes */}
                <View style={currentStyles.card}>
                    <Text style={[currentStyles.cardTitle, styles.checklistSectionTitle]}>{t('notes')}</Text>
                    <Text style={currentStyles.cardValue}>{trade.notes || t('no_additional_notes')}</Text>
                </View>

                {/* Delete Button */}
                <TouchableOpacity onPress={handleDeleteTrade} style={currentStyles.actionButtonRed}>
                    <Text style={currentStyles.actionButtonText}>{t('delete_trade')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

export default TradeDetailScreen;
