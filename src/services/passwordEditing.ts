type Selection = { start: number; end: number };

// UIKit can replace the whole secure field on the first key after refocusing.
// Recover only that signature, using the actual key and intended selection.
// Paste/autofill (no key event) and intentional select-all replacement pass through.
export function recoverResumedPasswordEdit(previous: string, next: string, key: string, selection: Selection) {
  const start = Math.max(0, Math.min(selection.start, previous.length));
  const end = Math.max(start, Math.min(selection.end, previous.length));
  if (key === 'Enter' || (key !== 'Backspace' && key.length !== 1)) return null;
  const from = key === 'Backspace' && start === end ? Math.max(0, start - 1) : start;
  const inserted = key === 'Backspace' ? '' : key;
  const expected = previous.slice(0, from) + inserted + previous.slice(end);
  if (!previous || next !== inserted || next === expected) return null;
  return { value: expected, cursor: from + inserted.length };
}
