import { StyleSheet, View } from 'react-native';
import { Text } from '@/i18n/primitives';
import { groupAddress, type RecipientRisk } from '@/services/security/recipientRisk';
import { colors } from '@/theme/tokens';

// Shown on payment reviews: new recipient badge, look-alike warning and the
// extra step for large payments to new addresses.
export function RecipientRiskNotice({ risk, destination }: { risk: RecipientRisk; destination: string }) {
  if (!risk.isNew && !risk.lookalike) return null;
  return <View style={[styles.box, risk.lookalike ? styles.danger : null]} accessibilityLiveRegion="polite">
    {risk.lookalike ? <>
      <Text style={styles.title}>{`Esta dirección se parece a la de ${risk.lookalike.label}, pero no es la misma`}</Text>
      <Text style={styles.copy}>Podría ser una dirección falsa enviada para confundirte. Compara cada grupo de caracteres:</Text>
      <Text style={styles.label}>Destino de este envío</Text>
      <Text translate={false} selectable style={styles.address}>{groupAddress(destination)}</Text>
      <Text style={styles.label}>{risk.lookalike.label}</Text>
      <Text translate={false} selectable style={styles.address}>{groupAddress(risk.lookalike.address)}</Text>
    </> : <>
      <Text style={styles.title}>Destinatario nuevo</Text>
      <Text style={styles.copy}>Nunca enviaste a esta dirección. Verifica la dirección completa con la persona por otro medio.</Text>
    </>}
    {risk.needsExtraConfirmation && !risk.lookalike ? <Text style={styles.copy}>Por el monto, te pediremos una confirmación adicional.</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  box: { marginTop: 16, padding: 14, borderRadius: 14, backgroundColor: colors.warningSoft, borderWidth: 1, borderColor: '#7F5E2E' },
  danger: { backgroundColor: colors.dangerSoft, borderColor: '#754052' },
  title: { color: colors.ink, fontSize: 13, fontWeight: '800' }, copy: { color: colors.text, fontSize: 12, lineHeight: 18, marginTop: 6 },
  label: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 10 }, address: { color: colors.ink, fontSize: 12, lineHeight: 18, marginTop: 3, fontVariant: ['tabular-nums'] },
});
