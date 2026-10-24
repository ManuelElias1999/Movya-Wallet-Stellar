import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Pressable, Text } from '@/i18n/primitives';
import type { ChatReceiptHistoryMessage } from '@/services/chatHistory';
import { colors } from '@/theme/tokens';

export function ChatHistoryReceiptCard({ receipt }: { receipt: ChatReceiptHistoryMessage }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={styles.card} accessibilityLiveRegion="polite">
    <View style={styles.header}>
      <View style={styles.icon}><Ionicons name="checkmark" size={20} color="#FFFFFF" /></View>
      <View style={styles.copy}><Text style={styles.title}>{receipt.title}</Text><Text translate={false} style={styles.summary}>{receipt.summary}</Text></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} style={styles.detailsButton}>
      <Text style={styles.detailsButtonText}>{expanded ? 'Ocultar detalles' : 'Ver detalles'}</Text><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.brand} />
    </Pressable>
    {expanded ? <View style={styles.details}>
      {receipt.details.map((detail, index) => <View key={`${detail.label}-${index}`}><Text style={styles.label}>{detail.label}</Text><Text translate={false} selectable style={styles.value}>{detail.value}</Text></View>)}
      {receipt.explorerUrl ? <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(receipt.explorerUrl!)} style={styles.link}><Text>Ver comprobante en Stellar Expert</Text></Pressable> : null}
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 22, padding: 13, marginBottom: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: '#BBD6FF' },
  header: { flexDirection: 'row', alignItems: 'center' }, icon: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.positive, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, marginLeft: 11 }, title: { color: colors.positive, fontSize: 15, fontWeight: '900' }, summary: { color: colors.ink, fontSize: 12, lineHeight: 17, marginTop: 2, fontWeight: '700' },
  detailsButton: { minHeight: 38, marginTop: 9, borderRadius: 12, backgroundColor: colors.brandSoft, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailsButtonText: { color: colors.brand, fontSize: 12, fontWeight: '800' },
  details: { borderTopWidth: 1, borderTopColor: '#D3E2F2', marginTop: 12, paddingTop: 2 }, label: { color: colors.muted, fontSize: 11, marginTop: 12 }, value: { color: colors.ink, fontSize: 11, lineHeight: 17, marginTop: 4 },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center', padding: 10, borderRadius: 14, backgroundColor: colors.brandSoft, marginTop: 12 },
});
