const fs = require('node:fs');
const path = require('node:path');
const marker = '// Movya: apply secure edits through RN instead of UIKit replace-on-first-key.';
const before = '  if ([newText isEqualToString:string]) {\n    _textDidChangeIsComing = YES;\n    return YES;\n  }';
const after = `  ${marker}\n  if ([newText isEqualToString:string] && !textField.secureTextEntry) {\n    _textDidChangeIsComing = YES;\n    return YES;\n  }`;
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
  console.log('Movya iOS secure-input patch ready (requires rebuilding the native app; Expo Go is unchanged).');
}
module.exports = { patch, before, after };
