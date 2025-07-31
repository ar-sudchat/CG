import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
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
  tradeHistoryCard: {
    backgroundColor: '#374151', // gray-700
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  tradeHistoryPair: { fontWeight: 'bold', fontSize: 20, color: '#f9fafb', marginTop: 4 },
  tradeHistoryAccount: { fontSize: 12, color: '#9ca3af' },
  tradeHistoryPnl: { fontWeight: 'bold', fontSize: 24, },
  tradeHistoryDate: { fontSize: 12, color: '#9ca3af' },
  tradeHistorySetup: { fontSize: 14, color: '#9ca3af' },
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
  tradeHistoryCard: {
    backgroundColor: '#ffffff', // white
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb', // gray-200
  },
  tradeHistoryPair: { fontWeight: 'bold', fontSize: 20, color: '#1f2937', marginTop: 4 },
  tradeHistoryAccount: { fontSize: 12, color: '#6b7280' },
  tradeHistoryPnl: { fontWeight: 'bold', fontSize: 24, },
  tradeHistoryDate: { fontSize: 12, color: '#6b7280' },
  tradeHistorySetup: { fontSize: 14, color: '#4b5563' },
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
  tradeDirectionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999, // full rounded
    alignSelf: 'flex-start', // To make it wrap content
  },
  tradeHistoryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tradeHistoryPnlSection: { alignItems: 'flex-end' },
  tradeHistoryCardBottom: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#4b5563', // gray-600
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boldText: { fontWeight: 'bold' },
  tradeOutcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
});


const HistoryScreen = () => {
  const { state, navigateTo, goBackToPreviousPage, t } = useContext(AppContext);
  const isLightMode = state.currentTheme === 'light';
  const currentStyles = isLightMode ? lightStyles : darkStyles;

  // Sort trades by date, newest first
  const sortedTrades = [...state.trades].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <View style={currentStyles.page}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
          <Text style={currentStyles.iconText}>⬅️</Text>
        </TouchableOpacity>
        <Text style={currentStyles.headerTitle}>{t('menu_history')}</Text>
        <View style={{ width: 30 }} />{/* Spacer for alignment */}
      </View>

      <ScrollView contentContainerStyle={styles.contentPadding}>
        {sortedTrades.length === 0 ? (
          <Text style={currentStyles.placeholderText}>{t('no_trades_yet')}</Text>
        ) : (
          sortedTrades.map(trade => {
            const isWin = trade.pnl >= 0;
            const account = state.accounts.find(a => a.id === trade.accountId);
            return (
              <TouchableOpacity
                key={trade.id}
                onPress={() => navigateTo('TradeDetail', { tradeId: trade.id })}
                style={currentStyles.tradeHistoryCard}
              >
                <View style={styles.tradeHistoryCardTop}>
                  <View>
                    {/* Direction Badge */}
                    <View style={[styles.tradeDirectionBadge, { backgroundColor: trade.direction === 'Buy' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)' }]}>
                      <Text style={{ color: trade.direction === 'Buy' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                        {trade.direction}
                      </Text>
                    </View>
                    <Text style={currentStyles.tradeHistoryPair}>{trade.pair}</Text>
                    <Text style={currentStyles.tradeHistoryAccount}>{account ? account.name : 'N/A'}</Text>
                  </View>
                  <View style={styles.tradeHistoryPnlSection}>
                    <Text style={[currentStyles.tradeHistoryPnl, { color: isWin ? '#4ade80' : '#f87171' }]}>
                      {trade.pnl.toFixed(2)}$
                    </Text>
                    <Text style={currentStyles.tradeHistoryDate}>
                      {new Date(trade.date).toLocaleDateString(state.currentLanguage)}
                    </Text>
                  </View>
                </View>
                <View style={styles.tradeHistoryCardBottom}>
                  <Text style={currentStyles.tradeHistorySetup}>
                    {t('setup')}: <Text style={styles.boldText}>{trade.setupName}</Text>
                  </Text>
                  {/* Outcome Badge */}
                  <View style={[styles.tradeOutcomeBadge, {
                    backgroundColor: trade.outcome === 'TP' ? 'rgba(74,222,128,0.3)' :
                                     trade.outcome === 'SL' ? 'rgba(248,113,113,0.3)' :
                                     trade.outcome === 'BE' ? 'rgba(251,191,36,0.3)' : 'rgba(107,114,128,0.3)'
                  }]}>
                    <Text style={{
                        color: trade.outcome === 'TP' ? '#4ade80' :
                               trade.outcome === 'SL' ? '#f87171' :
                               trade.outcome === 'BE' ? '#facc15' : '#9ca3af',
                        fontWeight: 'bold',
                        fontSize: 12,
                    }}>
                        {t(trade.outcome.toLowerCase()) || trade.outcome}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

export default HistoryScreen;
