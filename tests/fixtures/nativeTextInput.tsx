import { createElement, useImperativeHandle, useLayoutEffect } from 'react';

export const Platform = { OS: 'ios' };
export const commits: { value: string; secure: boolean }[] = [];
export const selections: number[][] = [];
export function Text(props: any) { return createElement('NativeText', props); }
export function Pressable(props: any) { return createElement('NativePressable', props); }
export const Alert = { alert() {} };
export const Share = { share: async () => ({ action: 'sharedAction' }) };

export function TextInput({ ref, ...props }: any) {
  useImperativeHandle(ref, () => ({ setSelection: (...range: number[]) => selections.push(range) }), []);
  // Observe the native assignments requested by each committed render, rather
  // than just the final JSX. UIKit itself still needs a physical-device check.
  useLayoutEffect(() => { commits.push({ value: props.value, secure: props.secureTextEntry }); }, [props.value, props.secureTextEntry]);
  return createElement('NativeTextInput', props);
}
