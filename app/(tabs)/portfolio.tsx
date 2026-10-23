import { Text } from '@/i18n/primitives';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AssetDetail, AssetDetailSheet } from '@/components/AssetDetailSheet';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { PageHeader } from '@/components/PageHeader';
import { PressableScale } from '@/components/PressableScale';
import { TokenIcon } from '@/components/TokenIcon';
import { demoAssets } from '@/data/demo';
import { useStellarAccount } from '@/hooks/useStellarAccount';
import { useMarketPrices } from '@/hooks/useMarketPrices';
import { assetUsdValue, formatMarketChange, formatUnitPrice, formatUsd, portfolioUsdTotal } from '@/services/marketPrices';
import { formatAssetBalance } from '@/services/presentation';
import { colors } from '@/theme/tokens';
import { useLanguage } from '@/i18n/Language';

export default function PortfolioScreen() {
  const { locale } = useLanguage();
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const account = useStellarAccount();
  const market = useMarketPrices();
  const assets = account.isDemo ? demoAssets : account.data?.balances.map((balance) => ({
    code: balance.assetCode,
    name: balance.assetCode === 'XLM' ? 'Stellar' : balance.assetCode === 'USDC' ? 'USD Coin' : balance.assetCode,
    amount: formatAssetBalance(balance.balance, locale),
    detailAmount: balance.balance,
    value: formatUsd(assetUsdValue(balance.assetCode, balance.balance, market.data), locale),
    unitPrice: formatUnitPrice(balance.assetCode === 'XLM' ? market.data?.XLM ?? null : balance.assetCode === 'USDC' ? market.data?.USDC ?? null : null, locale),
    change: formatMarketChange(balance.assetCode === 'XLM' ? market.data?.xlmChange24h ?? null : balance.assetCode === 'USDC' ? market.data?.usdcChange24h ?? null : null),
    color: balance.assetCode === 'XLM' ? colors.navy : colors.brand,
  })) ?? [];
  const totalUsd = portfolioUsdTotal(account.data?.balances, market.data);

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader subtitle="Todos tus activos en Stellar" title="Portafolio" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summary}>
          <View>
            <Text style={styles.summaryLabel}>Valor total estimado en USD</Text>
            <Text style={styles.summaryValue}>{account.isDemo ? '$1,629.24' : account.loading && !account.data ? 'Cargando…' : market.loading && !market.data ? 'Cotizando…' : formatUsd(totalUsd, locale)}</Text>
          </View>
          <View style={styles.assetCount}><Text style={styles.assetCountText}>{assets.length} activos</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Tus tokens</Text>
        <View style={styles.list}>
          {assets.map((asset, index) => (
            <PressableScale key={`${asset.code}-${index}`} onPress={() => setSelectedAsset(asset)} style={[styles.assetRow, index > 0 && styles.divider]}>
              <TokenIcon code={asset.code} color={asset.color} size={44} />
              <View style={styles.assetCopy}>
                <Text style={styles.assetName}>{asset.name}</Text>
                <Text style={styles.assetCode}>{asset.code} · Stellar</Text>
              </View>
              <View style={styles.amountCopy}>
                <Text style={styles.amount}>{asset.amount}</Text>
                <Text style={styles.value}>{asset.value}</Text>
              </View>
              <Ionicons color="#91A0B3" name="chevron-forward" size={17} />
            </PressableScale>
          ))}
        </View>
        {account.loading || account.error || market.error ? <Text style={styles.hint}>{account.loading ? 'Actualizando balances…' : account.error || market.error}</Text> : null}
        <Text style={styles.hint}>Valores estimados con precio de mercado. Toca un token para ver su balance completo.</Text>
      </ScrollView>
      <AssetDetailSheet asset={selectedAsset} onClose={() => setSelectedAsset(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E9EFF5' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 44 },
  summary: { minHeight: 104, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.84)', borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#24486D', shadowOpacity: 0.11, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  summaryLabel: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  summaryValue: { color: colors.ink, fontSize: 28, fontWeight: '900', letterSpacing: -0.7, marginTop: 5 },
  assetCount: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999, backgroundColor: '#E5EDF6' },
  assetCountText: { color: '#31577E', fontSize: 10, fontWeight: '800' },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 28, marginBottom: 12 },
  list: { overflow: 'hidden', paddingHorizontal: 15, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.9)', borderWidth: 1, borderColor: '#FFFFFF', shadowColor: '#24486D', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  assetRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center' },
  divider: { borderTopWidth: 1, borderTopColor: '#DFE7F0' },
  assetIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  assetInitial: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  assetCopy: { flex: 1, marginLeft: 11 },
  assetName: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  assetCode: { color: colors.muted, fontSize: 9, marginTop: 4 },
  amountCopy: { alignItems: 'flex-end', marginRight: 8 },
  amount: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  value: { color: colors.muted, fontSize: 10, marginTop: 4 },
  hint: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 16 },
});
