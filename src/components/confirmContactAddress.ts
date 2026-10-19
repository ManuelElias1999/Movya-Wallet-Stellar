import { Alert } from '@/i18n/primitives';
import { acceptContactAddress, contactDestination, type Contact } from '@/services/backend/contacts';
import { contactPinPrompt, type ContactPinPrompt } from '@/services/backend/contactPins';

function ask(prompt: ContactPinPrompt): Promise<boolean> {
  const title = prompt.kind === 'unverified' ? 'Confirma la dirección del contacto' : 'La dirección de este contacto cambió';
  const message = prompt.kind === 'unverified'
    ? `Es el primer envío a ${prompt.contactName} desde este dispositivo. Verifica la dirección completa con esa persona:\n\n${prompt.address}`
    : `Dirección guardada:\n${prompt.saved}\n\nDirección nueva:\n${prompt.current}\n\nNo enviaremos a la nueva dirección salvo que confirmes con ${prompt.contactName} que es correcta.`;
  return new Promise(resolve => Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
    { text: prompt.kind === 'unverified' ? 'Confirmar dirección' : 'Usar la nueva dirección', style: prompt.kind === 'changed' ? 'destructive' : 'default', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) }));
}

// Resolves a saved contact to its pinned address, asking the person when the
// address is new to this device or has changed. Nothing changes without a tap.
export async function resolveContactWithConfirmation(contact: Contact, onUpdated?: () => void, attempt = 0): Promise<string> {
  try {
    return await contactDestination(contact);
  } catch (error) {
    const prompt = contactPinPrompt(error);
    if (!prompt || attempt > 1) throw error;
    if (!await ask(prompt)) throw new Error('Envío cancelado. La dirección del contacto no cambió.');
    const approved = prompt.kind === 'unverified' ? prompt.address : prompt.current;
    const updated = await acceptContactAddress(contact, approved);
    onUpdated?.();
    // Run every check again against the approved address (for example, the
    // email directory may still disagree with a just-confirmed contact).
    return resolveContactWithConfirmation(updated, onUpdated, attempt + 1);
  }
}
