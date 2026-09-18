import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { BottomNavigation } from '@/components/BottomNavigation';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { MovyaContextHelp } from '@/components/MovyaContextHelp';
import { PoweredByStellarFooter } from '@/components/PoweredByStellarFooter';
import { PressableScale } from '@/components/PressableScale';
import { demoContacts } from '@/data/demo';
import { colors, radius } from '@/theme/tokens';

type Contact = {
  id: string;
  name: string;
  handle: string;
  initials: string;
  color: string;
  favorite: boolean;
  email?: string;
  address?: string;
};

export default function ContactsScreen() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>(demoContacts.map((contact, index) => ({ ...contact, favorite: index === 0 })));
  const [selected, setSelected] = useState<Contact | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [newName, setNewName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'address'>('email');
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

  const addContact = () => {
    const cleanName = newName.trim();
    const cleanIdentifier = identifier.trim();
    const validEmail = identifierType === 'email' && /^\S+@\S+\.\S+$/.test(cleanIdentifier);
    const validAddress = identifierType === 'address' && cleanIdentifier.toUpperCase().startsWith('G') && cleanIdentifier.length >= 20;

    if (!cleanName || (!validEmail && !validAddress)) {
      Alert.alert('Revisa los datos', identifierType === 'email' ? 'Ingresa un nombre y un correo válido.' : 'Ingresa un nombre y una dirección Stellar válida.');
      return;
    }

    const initials = cleanName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    const shortAddress = `${cleanIdentifier.slice(0, 5)}…${cleanIdentifier.slice(-4)}`;
    const next: Contact = {
      id: String(Date.now()),
      name: cleanName,
      handle: identifierType === 'email' ? cleanIdentifier : `Wallet externa · ${shortAddress}`,
      initials,
      color: identifierType === 'email' ? '#E4F3FF' : '#F0EBFF',
      favorite: false,
      ...(identifierType === 'email' ? { email: cleanIdentifier } : { address: cleanIdentifier }),
    };

    setContacts((current) => [...current, next]);
    setAdding(false);
    setNewName('');
    setIdentifier('');
    Alert.alert('Contacto agregado', identifierType === 'email' ? 'Cuando el correo tenga una cuenta Movya, usaremos automáticamente su dirección asociada.' : 'La wallet externa quedó guardada.');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader subtitle="Envía dinero sin copiar direcciones" title="Contactos" />
      <ScrollView contentContainerStyle={styles.content}>
        <MovyaContextHelp
          actionPrompt="Ayúdame a agregar un contacto nuevo"
          explanationSteps={[
            'Puedes guardar a una persona usando el correo con el que creó su cuenta Movya.',
            'Si el correo existe en Movya, vincularemos automáticamente su dirección Stellar.',
            'Para una wallet externa, pega directamente su dirección pública, que empieza con G.',
            'Luego podrás elegir ese contacto al enviar dinero sin volver a copiar la dirección.',
          ]}
          explanationTitle="Cómo agregar un contacto"
          question="¿Necesitas ayuda para agregar un contacto?"
        />
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput placeholder="Buscar personas" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Tus contactos</Text><PressableScale onPress={() => setAdding(true)} pressedScale={0.9} style={styles.add}><Ionicons name="person-add-outline" size={18} color={colors.brand} /></PressableScale></View>
        <View style={styles.card}>
          {ordered.map((contact, index) => (
            <PressableScale key={contact.id} onPress={() => openContact(contact)} style={[styles.contact, index > 0 && styles.divider]}>
              <View style={[styles.avatar, { backgroundColor: contact.color }]}><Text style={styles.avatarText}>{contact.initials}</Text></View>
              <View style={styles.contactCopy}>
                <View style={styles.nameRow}><Text style={styles.name}>{contact.name}</Text>{contact.favorite ? <Ionicons name="star" size={14} color="#F5A623" /> : null}</View>
                <Text style={styles.handle}>{contact.handle}</Text>
              </View>
              <Ionicons name="chevron-forward" color={colors.muted} size={18} />
            </PressableScale>
          ))}
        </View>
        <PoweredByStellarFooter />
      </ScrollView>
      <BottomNavigation active="contacts" />

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
              <PressableScale onPress={() => { const name = selected.name; setSelected(null); router.push({ pathname: '/send', params: { contact: name } }); }} style={styles.sendButton}>
                <Ionicons name="paper-plane-outline" size={19} color="#FFFFFF" /><Text style={styles.sendText}>Enviar dinero</Text>
              </PressableScale>
              <View style={styles.secondaryActions}>
                <PressableScale onPress={() => setEditing(true)} style={styles.secondaryButton}><Ionicons name="create-outline" size={20} color={colors.ink} /><Text style={styles.secondaryText}>Editar</Text></PressableScale>
                <PressableScale onPress={deleteContact} style={styles.secondaryButton}><Ionicons name="trash-outline" size={20} color="#D04444" /><Text style={styles.deleteText}>Eliminar</Text></PressableScale>
              </View>
              <Text style={styles.favoriteHint}>{selected.favorite ? 'Aparece primero en tu lista' : 'Toca la estrella para fijarlo arriba'}</Text>
            </View>
          ) : null}
        </View>
      </Modal>

      <Modal animationType="slide" onRequestClose={() => setAdding(false)} transparent visible={adding}>
        <Pressable onPress={() => setAdding(false)} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          <Text style={styles.sheetTitle}>Nuevo contacto</Text>
          <Text style={styles.addDescription}>Guarda a alguien por su cuenta Movya o por una wallet externa.</Text>
          <View style={styles.segmented}>
            <Pressable onPress={() => { setIdentifierType('email'); setIdentifier(''); }} style={[styles.segment, identifierType === 'email' && styles.segmentActive]}><Ionicons name="mail-outline" size={17} color={identifierType === 'email' ? colors.brand : colors.muted} /><Text style={[styles.segmentText, identifierType === 'email' && styles.segmentTextActive]}>Correo Movya</Text></Pressable>
            <Pressable onPress={() => { setIdentifierType('address'); setIdentifier(''); }} style={[styles.segment, identifierType === 'address' && styles.segmentActive]}><Ionicons name="wallet-outline" size={17} color={identifierType === 'address' ? colors.brand : colors.muted} /><Text style={[styles.segmentText, identifierType === 'address' && styles.segmentTextActive]}>Dirección</Text></Pressable>
          </View>
          <Text style={styles.editLabel}>Nombre</Text>
          <TextInput onChangeText={setNewName} placeholder="Ej. Andrea López" placeholderTextColor={colors.muted} style={styles.editInput} value={newName} />
          <Text style={styles.editLabel}>{identifierType === 'email' ? 'Correo electrónico' : 'Dirección Stellar'}</Text>
          <TextInput autoCapitalize={identifierType === 'email' ? 'none' : 'characters'} keyboardType={identifierType === 'email' ? 'email-address' : 'default'} onChangeText={setIdentifier} placeholder={identifierType === 'email' ? 'andrea@correo.com' : 'G...'} placeholderTextColor={colors.muted} style={styles.editInput} value={identifier} />
          <View style={styles.lookupInfo}><Ionicons name={identifierType === 'email' ? 'link-outline' : 'shield-checkmark-outline'} size={18} color={colors.brand} /><Text style={styles.lookupText}>{identifierType === 'email' ? 'Si ya usa Movya, vincularemos la dirección asociada a ese correo.' : 'Las wallets externas se guardan directamente por su dirección pública.'}</Text></View>
          <Pressable onPress={addContact} style={styles.sendButton}><Text style={styles.sendText}>Agregar contacto</Text></Pressable>
          <Pressable onPress={() => setAdding(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#E8F1FF' }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 125 },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D9D1E7', borderRadius: radius.md, backgroundColor: '#FFFDFB', paddingHorizontal: 15, height: 54, marginTop: 18, shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, input: { flex: 1, marginLeft: 10, color: colors.ink, fontSize: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 11 }, sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '800' }, add: { width: 38, height: 38, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#EEF5FF', borderRadius: radius.md, borderWidth: 1.5, borderColor: '#C7D9F1', paddingHorizontal: 15, shadowColor: colors.navy, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 }, contact: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }, divider: { borderTopWidth: 1, borderTopColor: '#D8E4F4' },
  avatar: { width: 46, height: 46, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.ink, fontSize: 13, fontWeight: '800' }, contactCopy: { flex: 1, marginLeft: 12 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, name: { color: colors.ink, fontSize: 15, fontWeight: '700' }, handle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  backdrop: { flex: 1, backgroundColor: 'rgba(5,16,35,0.38)' }, sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 22, paddingBottom: 30 }, handleBar: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D4DBE6', alignSelf: 'center', marginBottom: 18 },
  favorite: { position: 'absolute', right: 0, top: 0, width: 44, height: 44, borderRadius: 16, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }, largeAvatar: { width: 74, height: 74, borderRadius: 26, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, largeInitials: { color: colors.ink, fontSize: 21, fontWeight: '800' }, sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 13 }, sheetHandle: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 4 },
  sendButton: { height: 54, borderRadius: 18, backgroundColor: colors.brand, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 }, sendText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginLeft: 7 },
  secondaryActions: { flexDirection: 'row', gap: 10, marginTop: 11 }, secondaryButton: { flex: 1, height: 50, borderRadius: 16, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, secondaryText: { color: colors.ink, fontSize: 13, fontWeight: '700', marginLeft: 7 }, deleteText: { color: '#D04444', fontSize: 13, fontWeight: '700', marginLeft: 7 }, favoriteHint: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 15 },
  editLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 15, marginBottom: 7 }, editInput: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 14, color: colors.ink }, cancelButton: { height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, cancelText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  addDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
  segmented: { flexDirection: 'row', gap: 8, backgroundColor: colors.background, borderRadius: 17, padding: 5, marginTop: 20 },
  segment: { flex: 1, height: 43, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 13 },
  segmentActive: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brandIce },
  segmentText: { color: colors.muted, fontSize: 11, fontWeight: '700' }, segmentTextActive: { color: colors.brand },
  lookupInfo: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.brandSoft, borderRadius: 15, padding: 12, marginTop: 14 },
  lookupText: { flex: 1, color: colors.brandDark, fontSize: 10, lineHeight: 15, marginLeft: 8 },
});
