import { useLayoutEffect, useRef } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';
import { recoverResumedPasswordEdit } from '@/services/passwordEditing';

type Props = Omit<TextInputProps, 'value' | 'onChangeText' | 'onKeyPress' | 'onSelectionChange'> & {
  value: string;
  onChangeText: (value: string) => void;
};

export function PasswordInput({ value, onChangeText, onFocus, onBlur, secureTextEntry, ...props }: Props) {
  const input = useRef<TextInput>(null);
  const resumed = useRef(false);
  const selection = useRef({ start: value.length, end: value.length });
  const edit = useRef<{ previous: string; key: string; selection: { start: number; end: number } } | null>(null);
  const cursor = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (cursor.current !== null) {
      input.current?.setSelection(cursor.current, cursor.current);
      cursor.current = null;
    }
  }, [value]);

  return <TextInput
    {...props}
    ref={input}
    value={value}
    secureTextEntry={secureTextEntry}
    clearTextOnFocus={false}
    selectTextOnFocus={false}
    onFocus={event => {
      resumed.current = Platform.OS === 'ios' && Boolean(secureTextEntry) && value.length > 0;
      edit.current = null;
      if (resumed.current) {
        selection.current = { start: value.length, end: value.length };
        input.current?.setSelection(value.length, value.length);
      }
      onFocus?.(event);
    }}
    onBlur={event => { resumed.current = false; edit.current = null; onBlur?.(event); }}
    onSelectionChange={event => { selection.current = event.nativeEvent.selection; }}
    onKeyPress={event => {
      edit.current = resumed.current ? { previous: value, key: event.nativeEvent.key, selection: { ...selection.current } } : null;
    }}
    onChangeText={next => {
      const pending = edit.current;
      edit.current = null;
      resumed.current = false;
      const recovered = pending ? recoverResumedPasswordEdit(pending.previous, next, pending.key, pending.selection) : null;
      if (recovered) cursor.current = recovered.cursor;
      onChangeText(recovered?.value ?? next);
    }}
  />;
}
