import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, Dimensions,
  Animated, StatusBar, SafeAreaView, ScrollView, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { API_BASE } from '../utils/api.js';

const { width } = Dimensions.get('window');

// ─── Item icon (small version) ────────────────────────────────────────────────
function MiniIcon({ id, size = 20, color = '#fff' }) {
  switch (id) {
    case 'gift_rose':      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 3c1 2 3 3 3 5a3 3 0 01-6 0c0-2 2-3 3-5z" fill={color}/><Path d="M12 8v12" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none"/></Svg>;
    case 'gift_star':      return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2l2.5 7.5H22l-6.5 4.7 2.5 7.5L12 17.3 6 21.7l2.5-7.5L2 9.5h7.5z" fill={color}/></Svg>;
    case 'gift_diamond':   return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 22L2 9l3-5h14l3 5z" fill={color} fillOpacity="0.85"/></Svg>;
    case 'badge_flame':    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 2c0 4.5-5 5.5-5 10a5 5 0 0010 0c0-2.5-1.5-3.5-1.5-3.5s-.5 2.5-2 2.5c-1 0-2-1-2-2.5 0-2.5 3.5-4.5 3.5-8z" fill={color}/></Svg>;
    case 'badge_crown':    return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M3 18h18M3 18L5 8l4.5 4.5L12 3l2.5 9.5L19 8l2 10H3z" fill={color}/></Svg>;
    default:               return <Svg width={size} height={size} viewBox="0 0 24 24"><Path d="M12 21s-7-4.5-9-9.5C1.5 7.5 4 4 7.5 4c2 0 3.5 1 4.5 2.5C13 5 14.5 4 16.5 4 20 4 22.5 7.5 21 11.5c-2 5-9 9.5-9 9.5z" fill={color}/></Svg>;
  }
}

// ─── Partner balance card ─────────────────────────────────────────────────────
function WalletCard({ name, balance, role, isMe, wins, losses }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.04, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
  }, []);

  const accent = isMe ? '#ff4d6d' : '#7c3aed';

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: isMe ? pulse : 1 }] }}>
      <LinearGradient colors={isMe
          ? ['rgba(255,77,109,0.2)', 'rgba(255,77,109,0.06)', 'rgba(10,10,20,0.97)']
          : ['rgba(124,58,237,0.2)', 'rgba(124,58,237,0.06)', 'rgba(10,10,20,0.97)']}
        style={[hp.walletCard, { borderColor: isMe ? 'rgba(255,77,109,0.35)' : 'rgba(124,58,237,0.35)' }]}>

        {/* Avatar */}
        <View style={[hp.walletAvatar, { backgroundColor: `${accent}22`, borderColor: `${accent}44` }]}>
          <Text style={hp.walletInitial}>{(name || '?')[0].toUpperCase()}</Text>
        </View>

        <Text style={hp.walletName} numberOfLines={1}>{name || (isMe ? 'you' : 'partner')}</Text>
        <View style={[hp.walletRolePill, { backgroundColor: `${accent}18`, borderColor: `${accent}40` }]}>
          <Text style={[hp.walletRole, { color: accent }]}>{role}</Text>
        </View>

        {/* FC balance */}
        <View style={hp.walletFcRow}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="9" fill="none" stroke="#fbbf24" strokeWidth="1.5"/>
            <Path d="M12 8v8M9 11h6M9 13h6" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round"/>
          </Svg>
          <Text style={hp.walletFc}>{balance.toLocaleString()}</Text>
        </View>
        <Text style={hp.walletFcLabel}>fantasy cash</Text>

        {/* Game record */}
        <View style={hp.walletRecord}>
          <Text style={[hp.walletStat, { color: '#22c55e' }]}>{wins}W</Text>
          <Text style={hp.walletStatDot}>·</Text>
          <Text style={[hp.walletStat, { color: '#ef4444' }]}>{losses}L</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

// ─── Inventory row ────────────────────────────────────────────────────────────
function InvRow({ item }) {
  const isGifted = item.source === 'gifted';
  return (
    <LinearGradient
      colors={isGifted
        ? ['rgba(255,107,138,0.12)', 'rgba(10,10,20,0.96)']
        : ['rgba(255,255,255,0.06)', 'rgba(10,10,20,0.96)']}
      style={[hp.invRow, { borderColor: isGifted ? 'rgba(255,107,138,0.3)' : 'rgba(255,255,255,0.08)' }]}>
      <View style={[hp.invIconWrap, { backgroundColor: isGifted ? 'rgba(255,77,109,0.15)' : 'rgba(255,255,255,0.07)' }]}>
        <MiniIcon id={item.itemid} size={20} color={isGifted ? '#ff9ec7' : 'rgba(255,255,255,0.6)'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={hp.invName}>{item.itemname}</Text>
        <Text style={[hp.invSource, { color: isGifted ? '#ff9ec7' : 'rgba(255,255,255,0.2)' }]}>
          {isGifted ? 'gifted by partner' : 'purchased'}
        </Text>
      </View>
      {isGifted && (
        <View style={hp.giftTag}>
          <Text style={hp.giftTagText}>gift</Text>
        </View>
      )}
    </LinearGradient>
  );
}

// ─── Activity item ────────────────────────────────────────────────────────────
function ActivityItem({ tx }) {
  const isEarn = tx.type === 'earn';
  return (
    <View style={hp.actRow}>
      <View style={[hp.actDot, { backgroundColor: isEarn ? '#22c55e' : '#ef4444' }]} />
      <Text style={hp.actDesc}>{tx.description}</Text>
      <Text style={[hp.actAmount, { color: isEarn ? '#22c55e' : '#ef4444' }]}>
        {isEarn ? '+' : '-'}{tx.amount} FC
      </Text>
    </View>
  );
}

// ─── Main profile screen ──────────────────────────────────────────────────────
export default function HomeProfileScreen({ onNavigate, params = {} }) {
  const { linkCode = '', role = 'creator', user = {} } = params;

  const [myWallet,      setMyWallet]      = useState({ balance: 0, transactions: [] });
  const [partnerWallet, setPartnerWallet] = useState({ balance: 0, name: '' });
  const [myInventory,   setMyInventory]   = useState([]);
  const [history,       setHistory]       = useState([]);
  const [tab,           setTab]           = useState('profile'); // 'profile' | 'items' | 'history'
  const [loaded,        setLoaded]        = useState(false);

  const partnerRole = role === 'creator' ? 'joiner' : 'creator';

  useEffect(() => {
    (async () => {
      try {
        const [myW, bothW, inv, hist] = await Promise.all([
          fetch(`${API_BASE}/api/wallet/${linkCode}/${role}`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/api/wallet/both/${linkCode}`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/api/shop/inventory/${linkCode}/${role}`).then(r => r.json()).catch(() => null),
          fetch(`${API_BASE}/api/games/history/${linkCode}`).then(r => r.json()).catch(() => null),
        ]);
        if (myW)   setMyWallet(myW);
        if (bothW) setPartnerWallet(bothW[partnerRole] || { balance: 0, name: '' });
        if (inv)   setMyInventory(inv.items || []);
        if (hist)  setHistory(hist.sessions || []);
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  // Compute game stats from history
  const myWins   = history.filter(s => (s.challengerrole === role && s.winner === 'challenger') || (s.challengerrole !== role && s.winner === 'opponent')).length;
  const myLosses = history.filter(s => (s.challengerrole === role && s.winner === 'opponent')   || (s.challengerrole !== role && s.winner === 'challenger')).length;
  const pWins    = history.length - myWins - history.filter(s => s.winner === 'tie').length;
  const pLosses  = myWins;

  const totalFcEarned = myWallet.transactions?.filter(t => t.type === 'earn').reduce((n, t) => n + t.amount, 0) || 0;
  const totalFcSpent  = myWallet.transactions?.filter(t => t.type === 'spend').reduce((n, t) => n + t.amount, 0) || 0;

  return (
    <SafeAreaView style={hp.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      {/* Header */}
      <View style={hp.header}>
        <TouchableOpacity onPress={() => onNavigate('castle', params)} style={hp.backBtn}>
          <Text style={hp.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={hp.headerTitle}>home profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={hp.tabs}>
        {[
          { key: 'profile', label: 'profile' },
          { key: 'items',   label: 'items' },
          { key: 'history', label: 'activity' },
        ].map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[hp.tab, tab === t.key && hp.tabActive]}>
            <Text style={[hp.tabText, tab === t.key && { color: '#ff4d6d' }]}>{t.label}</Text>
            {tab === t.key && <View style={hp.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={hp.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Profile tab ── */}
        {tab === 'profile' && (
          <>
            {/* Both wallets */}
            <Text style={hp.sectionLabel}>fantasy cash</Text>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%', marginBottom: 28 }}>
              <WalletCard
                name={user?.name} balance={myWallet.balance}
                role={role} isMe={true}
                wins={myWins} losses={myLosses}
              />
              <WalletCard
                name={partnerWallet.name || 'partner'} balance={partnerWallet.balance}
                role={partnerRole} isMe={false}
                wins={pWins} losses={pLosses}
              />
            </View>

            {/* My FC stats */}
            <Text style={hp.sectionLabel}>your fc stats</Text>
            <View style={hp.statsRow}>
              {[
                { label: 'total earned', value: `+${totalFcEarned}`, color: '#22c55e' },
                { label: 'total spent',  value: `-${totalFcSpent}`,  color: '#ef4444' },
                { label: 'games played', value: history.length,       color: '#fbbf24' },
              ].map(stat => (
                <LinearGradient key={stat.label} colors={[`${stat.color}12`, 'rgba(10,10,20,0.95)']}
                  style={[hp.statCard, { borderColor: `${stat.color}28` }]}>
                  <Text style={[hp.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={hp.statLabel}>{stat.label}</Text>
                </LinearGradient>
              ))}
            </View>

            {/* Home name + bond code */}
            <Text style={[hp.sectionLabel, { marginTop: 24 }]}>our home</Text>
            <LinearGradient colors={['rgba(255,77,109,0.12)', 'rgba(10,10,20,0.97)']}
              style={hp.homeCard}>
              <Text style={hp.homeName}>{params.homeName || 'our sanctuary'}</Text>
              <View style={hp.homeCodeRow}>
                <Text style={hp.homeCodeLabel}>bond code</Text>
                <Text style={hp.homeCode}>{linkCode || '---'}</Text>
              </View>
            </LinearGradient>
          </>
        )}

        {/* ── Items tab ── */}
        {tab === 'items' && (
          <View style={{ width: '100%' }}>
            {myInventory.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.22)', textTransform: 'lowercase' }}>no items yet</Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.14)', marginTop: 6, textTransform: 'lowercase', textAlign: 'center', maxWidth: 240 }}>
                  play games to earn FC then visit the gift shop
                </Text>
                <TouchableOpacity onPress={() => onNavigate('shop', params)} style={{ marginTop: 20, borderRadius: 14, overflow: 'hidden' }}>
                  <LinearGradient colors={['#ff6b8a','#ff4d6d']} style={{ paddingHorizontal: 24, paddingVertical: 12 }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', textTransform: 'lowercase' }}>go to shop  →</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10, paddingBottom: 40 }}>
                {myInventory.map((item, i) => <InvRow key={i} item={item} />)}
              </View>
            )}
          </View>
        )}

        {/* ── Activity tab ── */}
        {tab === 'history' && (
          <View style={{ width: '100%', paddingBottom: 40 }}>
            {(myWallet.transactions?.length || 0) === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 60 }}>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.22)', textTransform: 'lowercase' }}>no activity yet</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {[...(myWallet.transactions || [])].reverse().slice(0, 30).map((tx, i) => (
                  <ActivityItem key={i} tx={tx} />
                ))}
              </View>
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const hp = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#080810' },
  scroll: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 120 },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff', textTransform: 'lowercase' },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 17, color: 'rgba(255,255,255,0.6)' },

  tabs:     { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  tab:      { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabActive:{},
  tabText:  { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.3)', textTransform: 'lowercase', letterSpacing: 0.4 },
  tabLine:  { position: 'absolute', bottom: 0, left: 10, right: 10, height: 2, backgroundColor: '#ff4d6d', borderRadius: 1 },

  sectionLabel: { alignSelf: 'flex-start', fontSize: 10, color: 'rgba(255,255,255,0.28)', textTransform: 'lowercase', letterSpacing: 2, fontWeight: '700', marginBottom: 12 },

  walletCard:    { flex: 1, borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, padding: 18, alignItems: 'center', gap: 6 },
  walletAvatar:  { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginBottom: 4 },
  walletInitial: { fontSize: 22, fontWeight: '900', color: '#fff' },
  walletName:    { fontSize: 14, fontWeight: '800', color: '#fff', textTransform: 'lowercase', textAlign: 'center' },
  walletRolePill:{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
  walletRole:    { fontSize: 9, fontWeight: '800', textTransform: 'lowercase', letterSpacing: 1 },
  walletFcRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  walletFc:      { fontSize: 24, fontWeight: '900', color: '#fbbf24' },
  walletFcLabel: { fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'lowercase', letterSpacing: 1 },
  walletRecord:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  walletStat:    { fontSize: 13, fontWeight: '800' },
  walletStatDot: { color: 'rgba(255,255,255,0.2)', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1 },
  statValue:{ fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statLabel:{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'lowercase', letterSpacing: 0.8, textAlign: 'center' },

  homeCard:    { width: '100%', borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: 'rgba(255,77,109,0.22)', marginBottom: 8 },
  homeName:    { fontSize: 22, fontWeight: '900', color: '#fff', textTransform: 'lowercase', letterSpacing: -0.5, marginBottom: 12 },
  homeCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeCodeLabel:{ fontSize: 9, color: 'rgba(255,107,138,0.55)', textTransform: 'lowercase', letterSpacing: 1.5 },
  homeCode:    { fontSize: 16, fontWeight: '800', color: '#ff6b8a', letterSpacing: 1.5 },

  invRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5 },
  invIconWrap:{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  invName:   { fontSize: 14, fontWeight: '700', color: '#fff', textTransform: 'lowercase', marginBottom: 2 },
  invSource: { fontSize: 10, textTransform: 'lowercase', letterSpacing: 0.4 },
  giftTag:   { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100, backgroundColor: 'rgba(255,77,109,0.15)', borderWidth: 1, borderColor: 'rgba(255,77,109,0.35)' },
  giftTagText:{ fontSize: 8, color: '#ff9ec7', fontWeight: '800', textTransform: 'lowercase', letterSpacing: 1 },

  actRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  actDot:    { width: 7, height: 7, borderRadius: 4 },
  actDesc:   { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.5)', textTransform: 'lowercase' },
  actAmount: { fontSize: 13, fontWeight: '800' },
});
