import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Dimensions, // For chart responsiveness
} from 'react-native';
import { AppContext } from '../context/AppContext'; // Adjust path as needed
// For Charting: In a real app, you'd install and import:
// import { LineChart } from 'react-native-chart-kit';
// import { AbstractChart } from 'react-native-chart-kit/dist/AbstractChart'; // For chart config types

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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f9fafb', marginBottom: 12, marginTop: 20 },
  listItem: {
    backgroundColor: '#4b5563', // gray-600 for list items in detail view
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
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
  actionButton: { // For edit account button
    backgroundColor: '#2563eb', // blue-600
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
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
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 12, marginTop: 20 },
  listItem: {
    backgroundColor: '#f9fafb', // gray-50 for list items in detail view
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d1d5db', // gray-300
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
  actionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
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
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16, // Tailwind gap-4
    marginBottom: 32,
  },
  tradeDirectionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tradeOutcomeBadge: {
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
  tradeDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
});


const AccountDetailScreen = () => {
    const { state, navigateTo, goBackToPreviousPage, t } = useContext(AppContext);
    const isLightMode = state.currentTheme === 'light';
    const currentStyles = isLightMode ? lightStyles : darkStyles;
    const accountId = state.currentTrade.accountId; // Get accountId from navigation params
    const account = state.accounts.find(a => a.id === accountId);

    if (!account) {
        return (
            <View style={currentStyles.page}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
                        <Text style={currentStyles.iconText}>⬅️</Text>
                    </TouchableOpacity>
                    <Text style={currentStyles.headerTitle}>{t('account_detail')}</Text>
                    <View style={{ width: 30 }} />{/* Spacer */}
                </View>
                <Text style={currentStyles.placeholderText}>{t('account_not_found')}</Text>
            </View>
        );
    }

    // Calculate account statistics
    const trades = state.trades.filter(t => t.accountId === accountId).sort((a, b) => new Date(a.date) - new Date(b.date));
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const currentBalance = account.balance + totalPnl;
    const averagePnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

    // Data for the Equity Curve Chart (Placeholder for now)
    const chartLabels = ['Start', ...trades.map((t, i) => `T${i+1}`)];
    let runningBalance = account.balance;
    const chartData = [account.balance, ...trades.map(t => {
        runningBalance += t.pnl;
        return runningBalance;
    })];

    // Chart configuration (for react-native-chart-kit, if used)
    const chartConfig = {
      backgroundColor: currentStyles.card.backgroundColor,
      backgroundGradientFrom: currentStyles.card.backgroundColor,
      backgroundGradientTo: currentStyles.card.backgroundColor,
      decimalPlaces: 2, // optional, defaults to 2dp
      color: (opacity = 1) => (isLightMode ? `rgba(31, 41, 55, ${opacity})` : `rgba(249, 250, 251, ${opacity})`), // Text color
      labelColor: (opacity = 1) => (isLightMode ? `rgba(75, 85, 99, ${opacity})` : `rgba(156, 163, 175, ${opacity})`), // Label color
      propsForDots: {
        r: "3",
        strokeWidth: "2",
        stroke: "#38bdf8" // blue-400
      },
      fillShadowGradient: "#38bdf8", // blue-400
      fillShadowGradientOpacity: 0.1,
      style: {
        borderRadius: 8
      },
      barPercentage: 0.5,
      useShadowColorFromDataset: false // optional
    };


    return (
        <View style={currentStyles.page}>
            {/* Header Section */}
            <View style={styles.header}>
                <TouchableOpacity onPress={goBackToPreviousPage} style={styles.iconButton}>
                    <Text style={currentStyles.iconText}>⬅️</Text>
                </TouchableOpacity>
                <Text style={currentStyles.headerTitle}>{account.name}</Text>
                <TouchableOpacity onPress={() => navigateTo('NewAccount', { accountId: account.id })} style={currentStyles.actionButton}>
                  <Text style={currentStyles.actionButtonText}>{t('edit_account')}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.contentPadding}>
                {/* Account Summary Grid */}
                <View style={styles.gridContainer}>
                    <View style={currentStyles.cardGridItem}>
                        <Text style={currentStyles.cardTitle}>{t('account_balance')}</Text>
                        <Text style={currentStyles.cardValueGreen}>${currentBalance.toFixed(2)}</Text>
                    </View>
                    <View style={currentStyles.cardGridItem}>
                        <Text style={currentStyles.cardTitle}>{t('net_pnl')}</Text>
                        <Text style={[currentStyles.cardValue, totalPnl >= 0 ? currentStyles.cardValueGreen : currentStyles.cardValueRed]}>
                            ${totalPnl.toFixed(2)}
                        </Text>
                    </View>
                    <View style={currentStyles.cardGridItem}>
                        <Text style={currentStyles.cardTitle}>{t('win_rate')}</Text>
                        <Text style={currentStyles.cardValue}>{winRate.toFixed(2)}%</Text>
                        <Text style={currentStyles.listItemSubText}>{winningTrades}W - {losingTrades}L</Text>
                    </View>
                    <View style={currentStyles.cardGridItem}>
                        <Text style={currentStyles.cardTitle}>{t('avg_pnl')}</Text>
                        <Text style={[currentStyles.cardValue, averagePnl >= 0 ? currentStyles.cardValueGreen : currentStyles.cardValueRed]}>
                            ${averagePnl.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* P&L Over Time Chart (Placeholder) */}
                <View style={currentStyles.card}>
                    <Text style={currentStyles.sectionTitle}>{t('pnl_over_time')}</Text>
                    {/* In a real app, you'd render LineChart here */}
                    {/* Example if using react-native-chart-kit: */}
                    {/* <LineChart
                        data={{
                            labels: chartLabels,
                            datasets: [{ data: chartData }]
                        }}
                        width={Dimensions.get('window').width - 32 - 32} // screen width - horizontal padding - card padding
                        height={220}
                        chartConfig={chartConfig}
                        bezier // for smooth curve
                        style={{ marginVertical: 8, borderRadius: 8 }}
                    /> */}
                    <Text style={currentStyles.placeholderText}>
                        [กราฟ P&L Over Time จะแสดงที่นี่]
                    </Text>
                </View>

                {/* Trade History for this Account */}
                <View style={styles.header}>
                    <Text style={currentStyles.sectionTitle}>{t('trade_history')}</Text>
                </View>
                {totalTrades === 0 ? (
                    <Text style={currentStyles.placeholderText}>{t('no_trades_in_account')}</Text>
                ) : (
                    [...trades].reverse().map(trade => { // Reverse to show newest first
                        const isWin = trade.pnl >= 0;
                        return (
                            <TouchableOpacity
                                key={trade.id}
                                onPress={() => navigateTo('TradeDetail', { tradeId: trade.id })}
                                style={currentStyles.listItem}
                            >
                                <View>
                                    <Text style={currentStyles.listItemText}>{trade.pair}</Text>
                                    <Text style={currentStyles.listItemSubText}>
                                        {trade.direction} - {new Date(trade.date).toLocaleDateString(state.currentLanguage)}
                                    </Text>
                                </View>
                                <Text style={[currentStyles.listItemText, { color: isWin ? '#4ade80' : '#f87171' }]}>
                                    ${trade.pnl.toFixed(2)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })
                )}
            </ScrollView>
        </View>
    );
};

export default AccountDetailScreen;