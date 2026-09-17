import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { demoContacts } from '@/data/demo';
import { colors, radius } from '@/theme/tokens';

type Contact = (typeof demoContacts)[number] & { favorite: boolean };

export default function ContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(demoContacts.map((contact, index) => ({ ...contact, favorite: index === 0 })));
  const [selected, setSelected] = useState<Contact | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const ordered = useMemo(() => [...contacts].sort((a, b) => Number(b.favorite) - Number(a.favorite)), [contacts]);

  const openContact = (contact: Contact) => {
    setSelected(contact);
    setEditName(contact.name);
    setEditHandle(contact.handle);
    setEditing(false);
  };

  const toggleFavorite = () => {
    if (!selected) return;
    const next = { ...selected, favorite: !selected.favorite };
    setSelected(next);
    setContacts((current) => current.map((contact) => contact.id === next.id ? next : contact));
  };

  const saveContact = () => {
    if (!selected || !editName.trim()) return;
    const initials = editName.trim().split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    const next = { ...selected, name: editName.trim(), handle: editHandle.trim(), initials };
    setSelected(next);
    setContacts((current) => current.map((contact) => contact.id === next.id ? next : contact));
    setEditing(false);
  };

  const deleteContact = () => {
    if (!selected) return;
    Alert.alert('Eliminar contacto', `¿Quieres eliminar a ${selected.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { setContacts((current) => current.filter((contact) => contact.id !== selected.id)); setSelected(null); } },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <PageHeader subtitle="Envía dinero sin copiar direcciones" title="Contactos" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput placeholder="Buscar personas" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Tus contactos</Text><Pressable style={styles.add}><Ionicons name="person-add-outline" size={18} color={colors.brand} /></Pressable></View>
        <View style={styles.card}>
          {ordered.map((contact, index) => (
            <Pressable key={contact.id} onPress={() => openContact(contact)} style={[styles.contact, index > 0 && styles.divider]}>
              <View style={[styles.avatar, { backgroundColor: contact.color }]}><Text style={styles.avatarText}>{contact.initials}</Text></View>
              <View style={styles.contactCopy}>
                <View style={styles.nameRow}><Text style={styles.name}>{contact.name}</Text>{contact.favorite ? <Ionicons name="star" size={14} color="#F5A623" /> : null}</View>
                <Text style={styles.handle}>{contact.handle}</Text>
              </View>
              <Ionicons name="chevron-forward" color={colors.muted} size={18} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal animationType="slide" onRequestClose={() => setSelected(null)} transparent visible={Boolean(selected)}>
        <Pressable onPress={() => setSelected(null)} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          {selected ? editing ? (
            <View>
              <Text style={styles.sheetTitle}>Editar contacto</Text>
              <Text style={styles.editLabel}>Nombre</Text>
              <TextInput onChangeText={setEditName} style={styles.editInput} value={editName} />
              <Text style={styles.editLabel}>Usuario</Text>
              <TextInput autoCapitalize="none" onChangeText={setEditHandle} style={styles.editInput} value={editHandle} />
              <Pressable onPress={saveContact} style={styles.sendButton}><Text style={styles.sendText}>Guardar cambios</Text></Pressable>
              <Pressable onPress={() => setEditing(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            </View>
          ) : (
            <View>
              <Pressable onPress={toggleFavorite} style={styles.favorite}><Ionicons name={selected.favorite ? 'star' : 'star-outline'} size={23} color={selected.favorite ? '#F5A623' : colors.muted} /></Pressable>
              <View style={[styles.largeAvatar, { backgroundColor: selected.color }]}><Text style={styles.largeInitials}>{selected.initials}</Text></View>
              <Text style={styles.sheetTitle}>{selected.name}</Text>
              <Text style={styles.sheetHandle}>{selected.handle}</Text>
              <Pressable onPress={() => { const name = selected.name; setSelected(null); router.push({ pathname: '/send', params: { contact: name } }); }} style={styles.sendButton}>
                <Ionicons name="paper-plane-outline" size={19} color="#FFFFFF" /><Text style={styles.sendText}>Enviar dinero</Text>
              </Pressable>
              <View style={styles.secondaryActions}>
                <Pressable onPress={() => setEditing(true)} style={styles.secondaryButton}><Ionicons name="create-outline" size={20} color={colors.ink} /><Text style={styles.secondaryText}>Editar</Text></Pressable>
                <Pressable onPress={deleteContact} style={styles.secondaryButton}><Ionicons name="trash-outline" size={20} color="#D04444" /><Text style={styles.deleteText}>Eliminar</Text></Pressable>
              </View>
              <Text style={styles.favoriteHint}>{selected.favorite ? 'Aparece primero en tu lista' : 'Toca la estrella para fijarlo arriba'}</Text>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background }, content: { padding: 20, paddingBottom: 40 },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 15, height: 52 }, input: { flex: 1, marginLeft: 10, color: colors.ink, fontSize: 15 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 11 }, sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, add: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 15 }, contact: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }, divider: { borderTopWidth: 1, borderTopColor: colors.border },
  avatar: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.ink, fontSize: 13, fontWeight: '800' }, contactCopy: { flex: 1, marginLeft: 12 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, name: { color: colors.ink, fontSize: 15, fontWeight: '700' }, handle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.38)' }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30 }, handleBar: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D4DBE6', alignSelf: 'center', marginBottom: 18 },
  favorite: { position: 'absolute', right: 0, top: 0, width: 44, height: 44, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }, largeAvatar: { width: 74, height: 74, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, largeInitials: { color: colors.ink, fontSize: 21, fontWeight: '800' }, sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 13 }, sheetHandle: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  sendButton: { height: 54, borderRadius: 18, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 }, sendText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginLeft: 7 },
  secondaryActions: { flexDirection: 'row', gap: 10, marginTop: 11 }, secondaryButton: { flex: 1, height: 50, borderRadius: 16, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: colors.ink, fontSize: 13, fontWeight: '700', marginLeft: 7 }, deleteText: { color: '#D04444', fontSize: 13, fontWeight: '700', marginLeft: 7 }, favoriteHint: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 15 },
  editLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 15, marginBottom: 7 }, editInput: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 14, color: colors.ink }, cancelButton: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, cancelText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
});
