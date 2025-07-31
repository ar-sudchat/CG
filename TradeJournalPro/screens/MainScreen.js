import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform, // For platform-specific styles like paddingTop
  Dimensions, // For responsive grid item sizing
  Alert, // For language modal placeholder
} from 'react-native';
import { AppContext } from '../context/AppContext'; // Adjust path if your AppContext is in a different location

// --- Stylesheets for Dark and Light Modes (Copied from App.js for consistency) ---
// These styles are duplicated here for clarity and self-containment of the MainScreen example.
// In a larger app, you might centralize these styles or use a styling library.
const darkStyles = StyleSheet.create({
  appContainer: { backgroundColor: '#111827' }, // Deeper gray-900 for body
  page: { flex: 1, backgroundColor: '#1f2937', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, }, // gray-800 for page background
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#f9fafb' }, // white
  mainSubtitle: { fontSize: 14, color: '#9ca3af' }, // gray-400
  newTradeButton: {
    backgroundColor: '#2563eb', // blue-600
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    marginBottom: 32,
  },
  newTradeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gridItem: {
    backgroundColor: '#374151', // gray-700
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: Dimensions.get('window').width / 3 - 24, // Approx 3 items per row with gaps
  },
  gridItemIcon: { fontSize: 32, marginBottom: 8, },
  gridItemTitle: { fontWeight: 'bold', color: '#f9fafb', fontSize: 14, textAlign: 'center' },
  gridItemCount: { fontSize: 12, color: '#9ca3af' },
  latestTradesSection: { marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb', marginBottom: 12 },
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#f9fafb', marginBottom: 10, marginTop: 20 },
  noTradesText: { color: '#6b7280', textAlign: 'center', paddingVertical: 20 },
  tradeCard: {
    backgroundColor: '#374151', // gray-700
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tradeCardPair: { fontWeight: 'bold', color: '#f9fafb', fontSize: 16 },
  tradeCardAccount: { fontSize: 12, color: '#9ca3af' },
  tradeCardPnl: { fontWeight: 'bold', fontSize: 18 },
  tradeCardSetup: { fontSize: 12, color: '#6b7280', textAlign: 'right' },

  iconText: { color: '#9ca3af', fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#f9fafb' },

  listItem: {
    backgroundColor: '#374151',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemText: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listItemSubText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  placeholderText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 40,
  },
  label: { fontSize: 14, fontWeight: '500', color: '#9ca3af', marginBottom: 4, marginTop: 16 },
  input: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#f9fafb',
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#f9fafb',
    fontSize: 16,
    marginBottom: 12,
    height: 100,
    textAlignVertical: 'top',
  },
  picker: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 6,
    color: '#f9fafb', // Text color for selected item
    marginBottom: 12,
    height: 50, // Standard height for Picker
  },
  pickerItem: {
    color: '#f9fafb', // Text color for picker items
    fontSize: 16,
  },
  pickerUnit: {
    backgroundColor: '#374151',
    borderColor: '#4b5563',
    borderWidth: 1,
    borderRadius: 6,
    color: '#f9fafb',
    height: 50,
    width: 80,
  },
  actionButton: {
    backgroundColor: '#4b5563',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionButtonGreen: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionButtonRed: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actionButtonSmall: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonTextSmall: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  card: {
    backgroundColor: '#374151',
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
  imagePlaceholderText: {
    color: '#9ca3af',
    textAlign: 'center',
    paddingVertical: 50,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 8,
    marginTop: 10,
  },
  statusYellow: { color: '#fbbf24', fontSize: 14 },
  statusGreen: { color: '#4ade80', fontSize: 14 },

  checklistInput: {
    backgroundColor: '#4b5563',
    borderColor: '#6b7280',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#f9fafb',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  addChecklistButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addChecklistButtonText: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: '500',
  },
  checklistCheckbox: {
    fontSize: 20,
    marginRight: 10,
  },
  checklistText: {
    color: '#f9fafb',
    fontSize: 16,
    flex: 1,
  },
});

const lightStyles = StyleSheet.create({
  appContainer: { backgroundColor: '#fcfcfc' }, // Very light gray for body
  page: { flex: 1, backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? 30 : 0, }, // gray-100 for page background
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' }, // gray-800
  mainSubtitle: { fontSize: 14, color: '#6b7280' }, // gray-500
  newTradeButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginBottom: 32,
  },
  newTradeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  gridItem: {
    backgroundColor: '#ffffff', // white
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: Dimensions.get('window').width / 3 - 24,
    borderWidth: 1,
    borderColor: '#e5e7eb', // gray-200
  },
  gridItemIcon: { fontSize: 32, marginBottom: 8, },
  gridItemTitle: { fontWeight: 'bold', color: '#1f2937', fontSize: 14, textAlign: 'center' },
  gridItemCount: { fontSize: 12, color: '#6b7280' },
  latestTradesSection: { marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12 },
  sectionTitleSmall: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 10, marginTop: 20 },
  noTradesText: { color: '#4b5563', textAlign: 'center', paddingVertical: 20 },
  tradeCard: {
    backgroundColor: '#ffffff', // white
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tradeCardPair: { fontWeight: 'bold', color: '#1f2937', fontSize: 16 },
  tradeCardAccount: { fontSize: 12, color: '#6b7280' },
  tradeCardPnl: { fontWeight: 'bold', fontSize: 18 },
  tradeCardSetup: { fontSize: 12, color: '#4b5563', textAlign: 'right' },

  iconText: { color: '#4b5563', fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },

  listItem: {
    backgroundColor: '#ffffff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listItemSubText: {
    color: '#4b5563',
    fontSize: 12,
  },
  placeholderText: {
    color: '#4b5563',
    textAlign: 'center',
    paddingVertical: 40,
  },
  label: { fontSize: 14, fontWeight: '500', color: '#4b5563', marginBottom: 4, marginTop: 16 },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#1f2937',
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    color: '#1f2937',
    fontSize: 16,
    marginBottom: 12,
    height: 100,
    textAlignVertical: 'top',
  },
  picker: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    color: '#1f2937',
    marginBottom: 12,
    height: 50,
  },
  pickerItem: {
    color: '#1f2937',
    fontSize: 16,
  },
  pickerUnit: {
    backgroundColor: '#ffffff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    color: '#1f2937',
    height: 50,
    width: 80,
  },
  actionButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionButtonGreen: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionButtonRed: {
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actionButtonSmall: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonTextSmall: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  card: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  imagePlaceholderText: {
    color: '#4b5563',
    textAlign: 'center',
    paddingVertical: 50,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginTop: 10,
  },
  statusYellow: { color: '#fbbf24', fontSize: 14 },
  statusGreen: { color: '#4ade80', fontSize: 14 },

  checklistInput: {
    backgroundColor: '#f9fafb', // gray-50
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#1f2937',
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  addChecklistButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addChecklistButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '500',
  },
  checklistCheckbox: {
    fontSize: 20,
    marginRight: 10,
  },
  checklistText: {
    color: '#1f2937',
    fontSize: 16,
    flex: 1,
  },
});


// --- Global styles (common to both themes or structural) ---
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
    backgroundColor: darkStyles.page.backgroundColor, // Default to dark header background
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 32,
  },
  contentPadding: {
    padding: 16,
  },
  pageNotFoundText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 100,
    color: '#f87171',
  },
  tradeCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tradeDirectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tradeCardRight: {
    alignItems: 'flex-end',
  },
  tradeHistoryCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: darkStyles.tradeCard.backgroundColor,
  },
  tradeHistoryCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tradeHistoryPair: { fontWeight: 'bold', fontSize: 20, color: darkStyles.tradeCardPair.color, marginTop: 4 },
  tradeHistoryAccount: { fontSize: 12, color: darkStyles.tradeCardAccount.color },
  tradeHistoryPnlSection: { alignItems: 'flex-end' },
  tradeHistoryPnl: { fontWeight: 'bold', fontSize: 24, },
  tradeHistoryDate: { fontSize: 12, color: darkStyles.tradeCardAccount.color },
  tradeHistoryCardBottom: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tradeHistorySetup: { fontSize: 14, color: darkStyles.listItemSubText.color },
  boldText: { fontWeight: 'bold' },
  tradeOutcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  inputWithUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteChecklistButton: {
    padding: 8,
  },
  deleteChecklistText: {
    fontSize: 18,
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
    color: darkStyles.mainTitle.color,
  },
  tradeDetailDate: {
    fontSize: 14,
    color: darkStyles.mainSubtitle.color,
  },
  tradeDetailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  checklistRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkStyles.card.backgroundColor,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePreviewContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 150,
    backgroundColor: darkStyles.input.backgroundColor,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: darkStyles.input.borderColor,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

const MainScreen = () => {
  // Use useContext to access global state and functions
  const { state, navigateTo, toggleTheme, setLanguage, t } = useContext(AppContext);
  const isLightMode = state.currentTheme === 'light';
  const currentStyles = isLightMode ? lightStyles : darkStyles;

  // Calculate counts for display
  const setupsCount = state.setups.length;
  const tradesCount = state.trades.length;
  const accountsCount = state.accounts.length;

  // Get recent trades (last 5)
  const recentTrades = [...state.trades].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <ScrollView style={currentStyles.page} contentContainerStyle={styles.scrollViewContent}>
      {/* Header Section */}
      <View style={styles.header}>
        <View>
          <Text style={currentStyles.mainTitle}>{t('main_title')}</Text>
          <Text style={currentStyles.mainSubtitle}>{t('main_subtitle')}</Text>
        </View>
        <View style={styles.headerIcons}>
          {/* Theme Toggle Button */}
          <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
            {isLightMode ? (
              <Text style={currentStyles.iconText}>☀️</Text> // Sun icon
            ) : (
              <Text style={currentStyles.iconText}>🌙</Text> // Moon icon
            )}
          </TouchableOpacity>
          {/* Language Button (using Alert for simplicity) */}
          <TouchableOpacity onPress={() => Alert.alert(t('select_language'), 'English, Thai, etc.\n(Not fully implemented in this example)')} style={styles.iconButton}>
            <Text style={currentStyles.iconText}>🌐</Text> {/* Globe icon */}
          </TouchableOpacity>
        </View>
      </View>

      {/* New Trade Button */}
      <TouchableOpacity onPress={() => navigateTo('NewTrade')} style={currentStyles.newTradeButton}>
        <Text style={currentStyles.newTradeButtonText}>{t('new_trade_button')}</Text>
      </TouchableOpacity>

      {/* Grid of Navigation Items */}
      <View style={styles.gridContainer}>
        <TouchableOpacity onPress={() => navigateTo('Setups')} style={currentStyles.gridItem}>
          <Text style={[currentStyles.gridItemIcon, { color: '#60a5fa' }]}>📝</Text> {/* Blue icon */}
          <Text style={currentStyles.gridItemTitle}>{t('menu_setups')}</Text>
          <Text style={currentStyles.gridItemCount}>{setupsCount} {t('items')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigateTo('History')} style={currentStyles.gridItem}>
          <Text style={[currentStyles.gridItemIcon, { color: '#4ade80' }]}>📈</Text> {/* Green icon */}
          <Text style={currentStyles.gridItemTitle}>{t('menu_history')}</Text>
          <Text style={currentStyles.gridItemCount}>{tradesCount} {t('items')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigateTo('Accounts')} style={currentStyles.gridItem}>
          <Text style={[currentStyles.gridItemIcon, { color: '#a78bfa' }]}>💳</Text> {/* Purple icon */}
          <Text style={currentStyles.gridItemTitle}>{t('menu_accounts')}</Text>
          <Text style={currentStyles.gridItemCount}>{accountsCount} {t('items')}</Text>
        </TouchableOpacity>
      </View>

      {/* Latest Trades Section */}
      <View style={styles.latestTradesSection}>
        <Text style={currentStyles.sectionTitle}>{t('latest_trades')}</Text>
        {recentTrades.length === 0 ? (
          <Text style={currentStyles.noTradesText}>{t('no_trades_yet')}</Text>
        ) : (
          recentTrades.map(trade => {
            const isWin = trade.pnl >= 0;
            const account = state.accounts.find(a => a.id === trade.accountId);
            return (
              <TouchableOpacity
                key={trade.id}
                onPress={() => navigateTo('TradeDetail', { tradeId: trade.id })}
                style={currentStyles.tradeCard}
              >
                <View style={styles.tradeCardLeft}>
                  <View style={[styles.tradeDirectionBadge, { backgroundColor: trade.direction === 'Buy' ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)' }]}>
                    <Text style={{ color: trade.direction === 'Buy' ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                      {trade.direction === 'Buy' ? 'B' : 'S'}
                    </Text>
                  </View>
                  <View>
                    <Text style={currentStyles.tradeCardPair}>{trade.pair}</Text>
                    <Text style={currentStyles.tradeCardAccount}>{account ? account.name : 'N/A'}</Text>
                  </View>
                </View>
                <View style={styles.tradeCardRight}>
                  <Text style={[currentStyles.tradeCardPnl, { color: isWin ? '#4ade80' : '#f87171' }]}>
                    {trade.pnl.toFixed(2)}$
                  </Text>
                  <Text style={currentStyles.tradeCardSetup}>{trade.setupName}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

export default MainScreen;