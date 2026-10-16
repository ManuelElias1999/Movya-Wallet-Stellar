import { TextInput } from '@/i18n/primitives';
import { type TextInputProps } from 'react-native';

// Secure edits use the iOS adapter patch installed at npm install.
// Never clear, restore, or reconstruct a password in JavaScript on focus.
export function PasswordInput(props: TextInputProps) {
  return <TextInput {...props} clearTextOnFocus={false} selectTextOnFocus={false} />;
}
