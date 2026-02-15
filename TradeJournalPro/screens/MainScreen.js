import React, { useContext, useEffect, useState } from 'react';
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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { AppContext } from '../context/AppContext';
import { useSocket } from '../context/SocketContext';


const { width: SCREEN_W } = Dimensions.get('window');
const IS_WIDE = SCREEN_W >= 900;

// Key pairs to watch on dashboard
const WATCH_SYMBOLS = [
  { symbol: 'OANDA:XAU_USD', display: 'XAU/USD', decimals: 2 },
  { symbol: 'OANDA:EUR_USD', display: 'EUR/USD', decimals: 5 },
  { symbol: 'OANDA:GBP_USD', display: 'GBP/USD', decimals: 5 },
  { symbol: 'OANDA:USD_JPY', display: 'USD/JPY', decimals: 3 },
];

const MainScreen = () => {
  const { state, navigateTo, toggleTheme, logout, user, t } = useContext(AppContext);
  const { livePrices, subscribePair, unsubscribePair } = useSocket();
  const dark = state.currentTheme !== 'light';
  const [now, setNow] = useState(new Date());

  const c = {
    bg: dark ? '#0a0e1a' : '#f0f2f5',
    card: dark ? '#151b2e' : '#ffffff',
    border: dark ? '#1e2a45' : '#e2e8f0',
    text: dark ? '#e8ecf4' : '#0f172a',
    sub: dark ? '#7a8baa' : '#64748b',
    muted: dark ? '#3d4e6e' : '#cbd5e1',
    accent: '#3b82f6',
  };

  // Subscribe to watch pairs
  useEffect(() => {
    WATCH_SYMBOLS.forEach(p => subscribePair(p.symbol));
    return () => WATCH_SYMBOLS.forEach(p => unsubscribePair(p.symbol));
  }, []);

  // Clock update every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { screen: 'LivePrices', label: t('menu_live_prices'), desc: 'Forex & XAU/USD', accent: '#f59e0b', iconName: 'trending-up', iconLib: 'Ionicons' },
    { screen: 'Analysis', label: t('menu_analysis'), desc: 'Technical & Candlestick Chart', accent: '#10b981', iconName: 'chart-line', iconLib: 'MCI' },
    { screen: 'AiAnalysis', params: { symbol: 'OANDA:XAU_USD', displaySymbol: 'XAU/USD', resolution: '60' }, label: t('menu_ai_analysis'), desc: 'SMC/ICT AI', accent: '#7c3aed', iconName: 'robot', iconLib: 'MCI' },
    { screen: 'Alerts', label: t('menu_alerts'), desc: 'Price Alerts', accent: '#ef4444', iconName: 'notifications', iconLib: 'Ionicons' },
    { screen: 'KnowledgeBase', label: t('menu_knowledge'), desc: 'SMC/ICT Guide', accent: '#06b6d4', iconName: 'book', iconLib: 'Ionicons' },
  ];

  const renderMenuIcon = (item) => {
    const size = 20;
    if (item.iconLib === 'MCI') return <MaterialCommunityIcons name={item.iconName} size={size} color="#fff" />;
    return <Ionicons name={item.iconName} size={size} color="#fff" />;
  };

  const handleLogout = () => {
    Alert.alert(t('logout'), t('confirm_logout') || 'Are you sure?', [
      { text: t('close'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const userInitial = (user?.username || 'T')[0].toUpperCase();

  // Market status
  const dayOfWeek = now.getUTCDay();
  const hour = now.getUTCHours();
  const isMarketOpen = dayOfWeek > 0 && dayOfWeek < 6;
  const sessionName = hour >= 0 && hour < 8 ? 'Asian Session' : hour >= 8 && hour < 16 ? 'London Session' : 'New York Session';

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={[styles.scroll, IS_WIDE && styles.scrollWide]}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
            <View>
              <Text style={[styles.sub, { color: c.sub }]}>Forex Analysis Tool</Text>
              <Text style={[styles.name, { color: c.text }]}>{user?.username || 'Analyst'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={toggleTheme} style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name={dark ? 'sunny' : 'moon'} size={18} color={dark ? '#fbbf24' : '#6366f1'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Market Status Bar */}
        <View style={[styles.marketBar, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.marketLeft}>
            <View style={[styles.statusDot, { backgroundColor: isMarketOpen ? '#22c55e' : '#ef4444' }]} />
            <Text style={[styles.marketStatus, { color: isMarketOpen ? '#22c55e' : '#ef4444' }]}>
              {isMarketOpen ? 'Market Open' : 'Market Closed'}
            </Text>
            <Text style={[styles.marketSession, { color: c.sub }]}>{isMarketOpen ? sessionName : 'Weekend'}</Text>
          </View>
          <Text style={[styles.marketTime, { color: c.text }]}>
            {now.toLocaleTimeString()} UTC+{-now.getTimezoneOffset() / 60}
          </Text>
        </View>

        {/* Live Price Cards */}
        <Text style={[styles.section, { color: c.text }]}>
          <Ionicons name="pulse" size={16} color={c.accent} />{'  '}Live Market
        </Text>
        <View style={styles.priceGrid}>
          {WATCH_SYMBOLS.map((pair) => {
            const lp = livePrices[pair.symbol];
            const price = lp?.price;
            const change = lp?.changePercent;
            const isUp = change >= 0;
            return (
              <TouchableOpacity
                key={pair.symbol}
                style={[styles.priceCard, { backgroundColor: c.card, borderColor: c.border }]}
                onPress={() => navigateTo('PairDetail', { symbol: pair.symbol, displaySymbol: pair.display })}
                activeOpacity={0.7}
              >
                <View style={styles.priceCardHead}>
                  <Text style={[styles.priceCardPair, { color: c.text }]}>{pair.display}</Text>
                  {change !== undefined && (
                    <View style={[styles.changeBadge, { backgroundColor: isUp ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                      <Ionicons name={isUp ? 'caret-up' : 'caret-down'} size={10} color={isUp ? '#22c55e' : '#ef4444'} />
                      <Text style={{ color: isUp ? '#22c55e' : '#ef4444', fontSize: 11, fontWeight: '700' }}>
                        {isUp ? '+' : ''}{change.toFixed(2)}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.priceCardValue, { color: price ? c.text : c.muted }]}>
                  {price ? price.toFixed(pair.decimals) : '---'}
                </Text>
                {lp && (
                  <View style={styles.priceCardBidAsk}>
                    <Text style={[styles.bidAskText, { color: '#22c55e' }]}>B: {lp.bid?.toFixed(pair.decimals)}</Text>
                    <Text style={[styles.bidAskText, { color: '#ef4444' }]}>A: {lp.ask?.toFixed(pair.decimals)}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Analysis Button */}
        <TouchableOpacity
          onPress={() => navigateTo('Analysis')}
          style={styles.analyzeBtn}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="chart-line" size={22} color="#fff" />
          <Text style={styles.analyzeBtnText}>
            {state.currentLanguage === 'th' ? 'เปิดวิเคราะห์ทางเทคนิค' : 'Open Technical Analysis'}
          </Text>
        </TouchableOpacity>

        {/* Menu Grid */}
        <Text style={[styles.section, { color: c.text }]}>
          <Ionicons name="grid" size={16} color={c.accent} />{'  '}
          {state.currentLanguage === 'th' ? 'เครื่องมือวิเคราะห์' : 'Analysis Tools'}
        </Text>
        <View style={styles.menuGrid}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => navigateTo(item.screen, item.params)}
              style={[styles.menuItem, { backgroundColor: c.card, borderColor: c.border }]}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconWrap, { backgroundColor: item.accent }]}>
                {renderMenuIcon(item)}
              </View>
              <View style={styles.menuText}>
                <Text style={[styles.menuLabel, { color: c.text }]} numberOfLines={1}>{item.label}</Text>
                <Text style={[styles.menuDesc, { color: c.sub }]} numberOfLines={1}>{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 44 : 24,
    maxWidth: 700,
    alignSelf: 'center',
    width: '100%',
  },
  scrollWide: { maxWidth: 1200 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#3b82f6',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 12, letterSpacing: 0.3 },
  name: { fontSize: 22, fontWeight: '700', marginTop: 1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center',
  },

  // Market Status
  marketBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20,
  },
  marketLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  marketStatus: { fontSize: 13, fontWeight: '700' },
  marketSession: { fontSize: 12 },
  marketTime: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },

  // Section
  section: { fontSize: 16, fontWeight: '700', marginBottom: 14 },

  // Price Cards
  priceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  priceCard: {
    flex: 1, minWidth: 150, borderRadius: 14, borderWidth: 1, padding: 14,
  },
  priceCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priceCardPair: { fontSize: 14, fontWeight: '700' },
  changeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  priceCardValue: { fontSize: 20, fontWeight: '800', marginBottom: 6, fontVariant: ['tabular-nums'] },
  priceCardBidAsk: { flexDirection: 'row', justifyContent: 'space-between' },
  bidAskText: { fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'] },

  // Analyze Button
  analyzeBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginBottom: 24,
    flexDirection: 'row', justifyContent: 'center', gap: 10,
    ...Platform.select({
      ios: { shadowColor: '#10b981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
      android: { elevation: 6 },
      web: {},
    }),
  },
  analyzeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Menu
  menuGrid: { gap: 8, marginBottom: 24 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1, gap: 14,
  },
  menuIconWrap: {
    width: 42, height: 42, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600' },
  menuDesc: { fontSize: 12, marginTop: 2, opacity: 0.7 },
});

export default MainScreen;
