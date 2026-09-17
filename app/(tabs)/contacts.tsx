import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { demoContacts } from '@/data/demo';
import { colors, radius } from '@/theme/tokens';

export default function ContactsScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SEND BY NAME</Text>
          <Text style={styles.title}>Contacts</Text>
        </View>
        <Pressable style={styles.addButton}><Ionicons name="add" size={22} color="#FFFFFF" /></Pressable>
      </View>
      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput placeholder="Search people" placeholderTextColor={colors.muted} style={styles.input} />
      </View>
      <Text style={styles.sectionTitle}>Favorites</Text>
      <View style={styles.card}>
        {demoContacts.map((contact, index) => (
          <Pressable key={contact.id} style={[styles.contact, index > 0 && styles.divider]}>
            <View style={[styles.avatar, { backgroundColor: contact.color }]}>
              <Text style={styles.avatarText}>{contact.initials}</Text>
            </View>
            <View style={styles.contactCopy}>
              <Text style={styles.name}>{contact.name}</Text>
              <Text style={styles.handle}>{contact.handle}</Text>
            </View>
            <Ionicons name="chevron-forward" color={colors.muted} size={18} />
          </Pressable>
        ))}
      </View>
      <View style={styles.info}>
        <Ionicons name="shield-checkmark-outline" color={colors.brand} size={20} />
        <Text style={styles.infoText}>Movya verifies every address before preparing a payment.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { color: colors.brand, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '800', letterSpacing: -1, marginTop: 3 },
  addButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 15, height: 52 },
  input: { flex: 1, marginLeft: 10, color: colors.ink, fontSize: 15 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '700', marginTop: 28, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15 },
  contact: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  contactCopy: { flex: 1, marginLeft: 12 },
  name: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  handle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  info: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.brandSoft, borderRadius: radius.md, padding: 16, marginTop: 24 },
  infoText: { flex: 1, color: colors.brandDark, fontSize: 12, lineHeight: 18, marginLeft: 10, fontWeight: '600' },
});
