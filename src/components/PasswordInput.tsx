import { TextInput } from '@/i18n/primitives';
import { type TextInputProps } from 'react-native';

// Keep the stock secure input. The native iOS editing fix is deferred.
// Never clear, restore, or reconstruct a password in JavaScript on focus.
export function PasswordInput(props: TextInputProps) {
  return <TextInput {...props} clearTextOnFocus={false} selectTextOnFocus={false} />;
}
