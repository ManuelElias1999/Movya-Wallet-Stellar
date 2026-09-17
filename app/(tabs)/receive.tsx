import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { MovyaContextHelp } from '@/components/MovyaContextHelp';
import { StellarNetworkBadge } from '@/components/StellarNetworkBadge';
import { colors, radius } from '@/theme/tokens';

const demoAddress = 'GAJIBAJ3YTJLXHVROCHO374P3LM4YLQFGT6WLWS2NOWO2PLHH3CWMDDQ';

export default function ReceiveScreen() {
  const [copied, setCopied] = useState(false);
  const copyAddress = async () => {
    await Clipboard.setStringAsync(demoAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const shareAddress = async () => {
    await Share.share({
      message: `Recibe dinero en mi cuenta Movya:\n${demoAddress}`,
      title: 'Mi cuenta Movya',
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <PageHeader subtitle="Tu cuenta personal" title="Recibir dinero" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.helper}>
          <MovyaContextHelp
            actionPrompt="Ayúdame a compartir mis datos para recibir dinero"
            explanationSteps={[
              'Confirma que la otra persona enviará el dinero por la red Stellar.',
              'Puede escanear tu código QR o copiar tu dirección, que empieza con la letra G.',
              'Pulsa Compartir para enviarla por WhatsApp, Instagram u otra aplicación.',
              'El activo recibido aparecerá en tu balance cuando la operación se confirme.',
            ]}
            explanationTitle="Cómo recibir dinero"
            question="¿Necesitas ayuda para recibir dinero?"
          />
        </View>
        <StellarNetworkBadge label="Recibe únicamente por la red Stellar" />
        <Text style={styles.title}>Tu código para recibir</Text>
        <Text style={styles.subtitle}>La otra persona puede escanearlo o copiar tu dirección.</Text>
        <View style={styles.qrCard}>
          <View style={styles.qrWrap}><QRCode backgroundColor="#FFFFFF" color={colors.navy} size={216} value={demoAddress} /></View>
          <View style={styles.badge}><View style={styles.dot} /><Text style={styles.badgeText}>Cuenta disponible</Text></View>
        </View>
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Tu dirección</Text>
          <Text numberOfLines={2} style={styles.address}>{demoAddress}</Text>
          <View style={styles.actions}>
            <Pressable onPress={copyAddress} style={styles.actionButton}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.brand} />
              <Text style={styles.actionText}>{copied ? 'Copiada' : 'Copiar'}</Text>
            </Pressable>
            <Pressable onPress={shareAddress} style={[styles.actionButton, styles.shareButton]}>
              <Ionicons name="share-social-outline" size={19} color="#FFFFFF" />
              <Text style={styles.shareText}>Compartir</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.info}>
          <Ionicons name="information-circle-outline" size={21} color={colors.brand} />
          <Text style={styles.infoText}>Este QR corresponde a una dirección de Stellar de demostración. Cuando conectemos tu cuenta real, se generará automáticamente con tu dirección.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40, alignItems: 'center' },
  helper: { width: '100%', marginBottom: 12 },
  title: { color: colors.ink, fontSize: 23, fontWeight: '800', marginTop: 10, textAlign: 'center' }, subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7, paddingHorizontal: 20 },
  qrCard: { width: '100%', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 28, borderWidth: 1, borderColor: colors.border, padding: 24, marginTop: 24 },
  qrWrap: { padding: 14, borderRadius: 22, backgroundColor: '#FFFFFF' }, badge: { flexDirection: 'row', alignItems: 'center', marginTop: 17, backgroundColor: colors.positiveSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.positive, marginRight: 6 }, badgeText: { color: colors.positive, fontSize: 11, fontWeight: '700' },
  addressCard: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 17, marginTop: 16 }, addressLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' }, address: { color: colors.ink, fontSize: 13, lineHeight: 19, fontWeight: '600', marginTop: 8 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  actionButton: { flex: 1, height: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft, borderRadius: 15 },
  actionText: { color: colors.brand, fontSize: 13, fontWeight: '800', marginLeft: 7 },
  shareButton: { backgroundColor: colors.brand },
  shareText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', marginLeft: 7 },
  info: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', padding: 15, marginTop: 18 }, infoText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 17, marginLeft: 9 },
});
