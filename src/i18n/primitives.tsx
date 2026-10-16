import { Children, forwardRef, type ReactNode } from 'react';
import { Alert as NativeAlert, Pressable as NativePressable, Share as NativeShare, Text as NativeText, TextInput as NativeTextInput, type PressableProps, type TextInputProps, type TextProps } from 'react-native';
import { translate, useLanguage } from './Language';
export function Text({ children, translate: localize = true, ...props }: TextProps & { translate?: boolean }) {
  const { t } = useLanguage();
  const content = (value: ReactNode): ReactNode => typeof value === 'string' ? t(value) : Array.isArray(value) ? Children.map(value, content) : value;
  return <NativeText {...props} accessibilityLabel={props.accessibilityLabel ? t(props.accessibilityLabel) : undefined}>{localize ? content(children) : children}</NativeText>;
}
export type TextInput = NativeTextInput;
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function LocalizedInput(props, ref) {
  const { t } = useLanguage();
  return <NativeTextInput {...props} ref={ref} placeholder={props.placeholder ? t(props.placeholder) : undefined} accessibilityLabel={props.accessibilityLabel ? t(props.accessibilityLabel) : undefined} />;
});
export const Pressable = forwardRef<React.ComponentRef<typeof NativePressable>, PressableProps>(function LocalizedPressable(props, ref) {
  const { t } = useLanguage();
  return <NativePressable {...props} ref={ref} accessibilityLabel={props.accessibilityLabel ? t(props.accessibilityLabel) : undefined} accessibilityHint={props.accessibilityHint ? t(props.accessibilityHint) : undefined} />;
});
export const Alert = {
  alert: (...args: Parameters<typeof NativeAlert.alert>) => NativeAlert.alert(translate(args[0]), args[1] ? translate(args[1]) : undefined, args[2]?.map(button => ({ ...button, text: button.text ? translate(button.text) : undefined })), args[3]),
};
export const Share = {
  share: (content: Parameters<typeof NativeShare.share>[0], options?: Parameters<typeof NativeShare.share>[1]) => NativeShare.share({ ...content, ...('message' in content && content.message ? { message: translate(content.message) } : {}), ...(content.title ? { title: translate(content.title) } : {}) }, options),
};
