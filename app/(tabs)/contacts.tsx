import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageHeader } from '@/components/PageHeader';
import { InternalScreenBackground } from '@/components/InternalScreenBackground';
import { MovyaContextHelp } from '@/components/MovyaContextHelp';
import { PressableScale } from '@/components/PressableScale';
import { useContacts } from '@/context/ContactsContext';
import { contactDestination, type Contact } from '@/services/backend/contacts';
import { KeyboardSheet } from '@/components/KeyboardSheet';
import { colors, radius } from '@/theme/tokens';

export default function ContactsScreen() {
  const router = useRouter();
  const saved = useContacts();
  const { contacts } = saved;
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editName, setEditName] = useState('');
  const [newName, setNewName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [identifierType, setIdentifierType] = useState<'email' | 'address'>('email');
  const ordered = useMemo(() => contacts.filter(c => `${c.name} ${c.handle}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(b.favorite) - Number(a.favorite)), [contacts, search]);

  const openContact = (contact: Contact) => {
    setSelected(contact);
    setEditName(contact.name);
    setEditing(false);
  };

  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      if (!saved.persistent) throw new Error('Ingresa con tu correo para guardar tus contactos.');
      await action();
    } catch (e) { Alert.alert('Revisa los datos', e instanceof Error ? e.message : 'No se pudo guardar el contacto.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const toggleFavorite = () => { if (selected) void run(async () => setSelected(await saved.update(selected.id, { favorite: !selected.favorite }))); };
  const saveContact = () => {
    if (!selected || !editName.trim()) return;
    void run(async () => { setSelected(await saved.update(selected.id, { name: editName.trim() })); setEditing(false); });
  };
  const deleteContact = () => {
    if (!selected) return;
    Alert.alert('Eliminar contacto', `¿Quieres eliminar a ${selected.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => void run(async () => { await saved.remove(selected.id); setSelected(null); }) },
    ]);
  };
  const addContact = () => void run(async () => {
    Keyboard.dismiss();
    await saved.add({ name: newName, identifier, type: identifierType });
    setAdding(false); setNewName(''); setIdentifier('');
  });
  const sendContact = () => {
    if (!selected || lock.current) return;
    if (!saved.persistent) {
      const contactId = selected.id; setSelected(null);
      router.push({ pathname: '/send', params: { contactId } }); return;
    }
    lock.current = true; setBusy(true);
    void contactDestination(selected).then(address => {
      const contactId = selected.id; setSelected(null);
      router.push({ pathname: '/send', params: { contactId, address } });
    }).catch(e => Alert.alert('No se pudo preparar el envío', e.message))
      .finally(() => { lock.current = false; setBusy(false); });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <InternalScreenBackground />
      <PageHeader backTo="/(tabs)" subtitle="Envía dinero sin copiar direcciones" title="Contactos" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.search}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} value={search} onChangeText={setSearch} placeholder="Buscar personas" placeholderTextColor={colors.muted} style={styles.input} />
        </View>
        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Tus contactos</Text><PressableScale accessibilityLabel="Agregar contacto" onPress={() => setAdding(true)} pressedScale={0.9} style={styles.add}><Ionicons name="person-add-outline" size={18} color={colors.brand} /></PressableScale></View>
        {saved.loading ? <Text style={styles.handle}>Cargando tus contactos…</Text> : null}
        {saved.error ? <Pressable onPress={() => void saved.refresh()}><Text style={styles.handle}>{saved.error} · Reintentar</Text></Pressable> : null}
        {!saved.persistent ? <Text style={styles.addDescription}>Estos contactos son de demostración. Ingresa con tu correo para guardar personas.</Text> : null}
        <View style={styles.card}>
          {!ordered.length && !saved.loading ? <Text style={[styles.handle, { padding: 20 }]}>Todavía no hay contactos. Agrega tu primera persona.</Text> : null}
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
        <View style={styles.contextHelp}>
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
        </View>
      </ScrollView>

      <KeyboardSheet onClose={() => setSelected(null)} visible={Boolean(selected)}>
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          {selected ? editing ? (
            <View>
              <Text style={styles.sheetTitle}>Editar contacto</Text>
              <Text style={styles.editLabel}>Nombre</Text>
              <TextInput returnKeyType="done" onSubmitEditing={Keyboard.dismiss} onChangeText={setEditName} style={styles.editInput} value={editName} />
              <Text style={styles.editLabel}>Correo o dirección vinculada</Text>
              <Text selectable style={styles.sheetHandle}>{selected.handle}</Text>
              <Pressable disabled={busy} onPress={saveContact} style={styles.sendButton}><Text style={styles.sendText}>Guardar cambios</Text></Pressable>
              <Pressable onPress={() => setEditing(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
            </View>
          ) : (
            <View>
              <Pressable disabled={busy} onPress={toggleFavorite} style={styles.favorite}><Ionicons name={selected.favorite ? 'star' : 'star-outline'} size={23} color={selected.favorite ? '#F5A623' : colors.muted} /></Pressable>
              <View style={[styles.largeAvatar, { backgroundColor: selected.color }]}><Text style={styles.largeInitials}>{selected.initials}</Text></View>
              <Text style={styles.sheetTitle}>{selected.name}</Text>
              <Text style={styles.sheetHandle}>{selected.handle}</Text>
              <PressableScale disabled={busy} onPress={sendContact} style={styles.sendButton}>
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
      </KeyboardSheet>

      <KeyboardSheet onClose={() => setAdding(false)} visible={adding}>
        <View style={styles.sheet}>
          <View style={styles.handleBar} />
          <Text style={styles.sheetTitle}>Nuevo contacto</Text>
          <Text style={styles.addDescription}>Guarda a alguien por su cuenta Movya o por una wallet externa.</Text>
          <View style={styles.segmented}>
            <Pressable onPress={() => { setIdentifierType('email'); setIdentifier(''); }} style={[styles.segment, identifierType === 'email' && styles.segmentActive]}><Ionicons name="mail-outline" size={17} color={identifierType === 'email' ? colors.brand : colors.muted} /><Text style={[styles.segmentText, identifierType === 'email' && styles.segmentTextActive]}>Correo Movya</Text></Pressable>
            <Pressable onPress={() => { setIdentifierType('address'); setIdentifier(''); }} style={[styles.segment, identifierType === 'address' && styles.segmentActive]}><Ionicons name="wallet-outline" size={17} color={identifierType === 'address' ? colors.brand : colors.muted} /><Text style={[styles.segmentText, identifierType === 'address' && styles.segmentTextActive]}>Dirección</Text></Pressable>
          </View>
          <Text style={styles.editLabel}>Nombre</Text>
          <TextInput returnKeyType="done" submitBehavior="blurAndSubmit" onSubmitEditing={Keyboard.dismiss} onChangeText={setNewName} placeholder="Ej. Andrea López" placeholderTextColor={colors.muted} style={styles.editInput} value={newName} />
          <Text style={styles.editLabel}>{identifierType === 'email' ? 'Correo electrónico' : 'Dirección Stellar'}</Text>
          <TextInput autoCorrect={false} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} autoCapitalize={identifierType === 'email' ? 'none' : 'characters'} keyboardType={identifierType === 'email' ? 'email-address' : 'default'} onChangeText={setIdentifier} placeholder={identifierType === 'email' ? 'andrea@correo.com' : 'G...'} placeholderTextColor={colors.muted} style={styles.editInput} value={identifier} />
          <View style={styles.lookupInfo}><Ionicons name={identifierType === 'email' ? 'link-outline' : 'shield-checkmark-outline'} size={18} color={colors.brand} /><Text style={styles.lookupText}>{identifierType === 'email' ? 'Si ya usa Movya, vincularemos la dirección asociada a ese correo.' : 'Las wallets externas se guardan directamente por su dirección pública.'}</Text></View>
          <Pressable disabled={busy} onPress={addContact} style={styles.sendButton}><Text style={styles.sendText}>Agregar contacto</Text></Pressable>
          <Pressable onPress={() => setAdding(false)} style={styles.cancelButton}><Text style={styles.cancelText}>Cancelar</Text></Pressable>
        </View>
      </KeyboardSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#D8E1EB' }, content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 125 },
  search: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D9D1E7', borderRadius: radius.md, backgroundColor: '#FFFDFB', paddingHorizontal: 15, height: 54, marginTop: 18, shadowColor: colors.navy, shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 }, input: { flex: 1, marginLeft: 10, color: colors.ink, fontSize: 14 },
  contextHelp: { marginTop: 22 },
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
