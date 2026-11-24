// Helpers for working with Probaho runtime values.
// Numbers, strings and booleans are plain JS values, lists are JS arrays,
// "nothing" is null, and functions are objects with kind 'function' or 'builtin'.

const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
export const bn = (n) => String(n).replace(/\d/g, (d) => BN_DIGITS[d]);

// Split a string into user-visible characters, so "কি" counts as 1, not 2.
const segmenter = new Intl.Segmenter('bn', { granularity: 'grapheme' });
export const graphemes = (s) => Array.from(segmenter.segment(s), (x) => x.segment);

export function formatNumber(n, bnDigits = false) {
  // toPrecision hides 0.1 + 0.2 = 0.30000000000000004
  const text = Number.isInteger(n) ? String(n) : String(Number(n.toPrecision(12)));
  return bnDigits ? bn(text) : text;
}

// bnDigits: show numbers with Bangla digits (১২৩ instead of 123)
export function format(v, nested = false, bnDigits = false) {
  if (v === null) return 'শূন্য';
  if (typeof v === 'number') return formatNumber(v, bnDigits);
  if (typeof v === 'boolean') return v ? 'সত্য' : 'মিথ্যা';
  if (typeof v === 'string') return nested ? `"${v}"` : v;
  if (Array.isArray(v)) return '[' + v.map((x) => format(x, true, bnDigits)).join(', ') + ']';
  if (v && (v.kind === 'function' || v.kind === 'builtin')) return `<ফাংশন ${v.name}>`;
  return String(v);
}

// Only false, nothing and 0 count as false.
export const isTruthy = (v) => !(v === false || v === null || v === 0);

export function equals(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => equals(x, b[i]));
  }
  return a === b;
}

// [bangla, english] name of a value's type, for error messages
export function typeName(v) {
  if (v === null) return ['শূন্য', 'nothing'];
  if (typeof v === 'number') return ['সংখ্যা', 'number'];
  if (typeof v === 'string') return ['লেখা', 'string'];
  if (typeof v === 'boolean') return ['সত্য/মিথ্যা', 'boolean'];
  if (Array.isArray(v)) return ['তালিকা', 'list'];
  return ['ফাংশন', 'function'];
}
