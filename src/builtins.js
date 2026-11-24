import { format, typeName, graphemes } from './values.js';

const BN_TO_ASCII = (s) => s.replace(/[\u09E6-\u09EF]/g, (c) => String(c.charCodeAt(0) - 0x09e6));

export const builtins = {};

// call(args, fail): fail(bn, en) raises an error pointing at the call site
function define(names, arity, call) {
  for (const name of names) builtins[name] = { kind: 'builtin', name: names[0], arity, call };
}

define(['দৈর্ঘ্য', 'len'], 1, ([x], fail) => {
  if (typeof x === 'string') return graphemes(x).length;
  if (Array.isArray(x)) return x.length;
  const [tb, te] = typeName(x);
  fail(`${tb} এর দৈর্ঘ্য নেই, তালিকা বা লেখা দিন`, `a ${te} has no length, use a list or string`);
});

define(['যোগ', 'append'], 2, ([list, item], fail) => {
  if (!Array.isArray(list)) {
    fail('প্রথম মান একটি তালিকা হতে হবে', 'the first value must be a list');
  }
  list.push(item);
  return null;
});

define(['সংখ্যা', 'number'], 1, ([x], fail) => {
  if (typeof x === 'number') return x;
  if (typeof x === 'string') {
    const t = BN_TO_ASCII(x.trim());
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  }
  fail(`${format(x, true)} কে সংখ্যায় বদলানো যায় না`, `cannot convert ${format(x, true)} to a number`);
});

define(['লেখা', 'str'], 1, ([x]) => format(x));
