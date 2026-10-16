const fs = require('node:fs');
const path = require('node:path');
const marker = '// Movya: apply secure edits through RN instead of UIKit replace-on-first-key.';
const before = '  if ([newText isEqualToString:string]) {\n    _textDidChangeIsComing = YES;\n    return YES;\n  }';
const after = `  ${marker}\n  if ([newText isEqualToString:string] && !textField.secureTextEntry) {\n    _textDidChangeIsComing = YES;\n    return YES;\n  }`;
const fieldMarker = '// Movya: route secure UIKeyInput edits through the RN delegate.';
const fieldMethods = `${fieldMarker}
- (BOOL)_movyaApplySecureText:(NSString *)text backward:(BOOL)backward
{
  if (!self.secureTextEntry || !self.selectedTextRange ||
      ![self.delegate respondsToSelector:@selector(textField:shouldChangeCharactersInRange:replacementString:)]) {
    return NO;
  }
  NSInteger start = [self offsetFromPosition:self.beginningOfDocument toPosition:self.selectedTextRange.start];
  NSInteger end = [self offsetFromPosition:self.beginningOfDocument toPosition:self.selectedTextRange.end];
  if (start < 0 || end < start || end > (NSInteger)self.text.length) return NO;
  NSRange range = NSMakeRange(start, end - start);
  if (backward && range.length == 0) {
    if (start == 0) return YES;
    range = [self.text rangeOfComposedCharacterSequenceAtIndex:start - 1];
  }
  BOOL allow = [self.delegate textField:self shouldChangeCharactersInRange:range replacementString:text];
  return !allow;
}

- (void)insertText:(NSString *)text
{
  if (![self _movyaApplySecureText:text backward:NO]) [super insertText:text];
}

- (void)deleteBackward
{
  if (![self _movyaApplySecureText:@"" backward:YES]) [super deleteBackward];
}

`;
function patchField(source) {
  if (source.includes(fieldMethods)) return source;
  const anchor = '#pragma mark - Context Menu';
  if (source.includes(fieldMarker) || source.split(anchor).length !== 2) throw new Error('Unsupported RN secure field. Review the UIKeyInput patch.');
  return source.replace(anchor, fieldMethods + anchor);
}
function patch(source) {
  if (source.includes(marker) && source.includes(after)) return source;
  if (source.split(before).length !== 2) throw new Error('Unsupported React Native text-input adapter. Review the secure edit patch before building.');
  return source.replace(before, after);
}
if (require.main === module) {
  const root = path.dirname(require.resolve('react-native/package.json'));
  const file = path.join(root, 'Libraries/Text/TextInput/RCTBackedTextInputDelegateAdapter.mm');
  const original = fs.readFileSync(file, 'utf8');
  const updated = patch(original);
  if (updated !== original) fs.writeFileSync(file, updated);
  const field = path.join(root, 'Libraries/Text/TextInput/Singleline/RCTUITextField.mm');
  const oldField = fs.readFileSync(field, 'utf8');
  const newField = patchField(oldField);
  if (oldField !== newField) fs.writeFileSync(field, newField);
  console.log('Movya iOS secure-input patch ready (requires rebuilding the native app; Expo Go is unchanged).');
}
module.exports = { patch, before, after, patchField, fieldMethods, fieldMarker };
