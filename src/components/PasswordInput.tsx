import { useLayoutEffect, useRef, useState } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

type Props = Omit<TextInputProps, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
};

export function PasswordInput({ value, onChangeText, onFocus, secureTextEntry, ...props }: Props) {
  const input = useRef<TextInput>(null);
  const [refreshing, setRefreshing] = useState(false);
  const restoreCursor = useRef(false);

  // Reassign secure text AFTER UIKit begins editing, clearing its replace-on-first-
  // key state. Two layout commits force RN to send both native text assignments.
  // The parent password never changes, and secureTextEntry never toggles here.
  // No timers, key guesses, or delayed writes can overwrite a later user edit.
  useLayoutEffect(() => {
    if (refreshing) {
      restoreCursor.current = true;
      setRefreshing(false);
    } else if (restoreCursor.current) {
      restoreCursor.current = false;
      input.current?.setSelection(value.length, value.length);
    }
  }, [refreshing, value]);

  return <TextInput
    {...props}
    ref={input}
    value={refreshing ? '' : value}
    secureTextEntry={secureTextEntry}
    clearTextOnFocus={false}
    selectTextOnFocus={false}
    onFocus={event => {
      if (Platform.OS === 'ios' && secureTextEntry && value) setRefreshing(true);
      onFocus?.(event);
    }}
    onChangeText={onChangeText}
  />;
}
