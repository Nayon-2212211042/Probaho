import { test } from 'node:test';
import assert from 'node:assert/strict';
import { run, runProgram, ProbahoError } from '../src/index.js';

const out = (src, options) => {
  const r = runProgram(src, options);
  assert.equal(r.error, null, r.error ?? '');
  return r.output.join('\n');
};
const fails = (src, options) => {
  assert.throws(() => run(src, { print: () => {}, ...options }), ProbahoError);
};
const errorOf = (src) => {
  try { run(src, { print: () => {} }); } catch (e) { return e; }
  assert.fail('expected an error');
};

test('arithmetic and precedence', () => {
  assert.equal(out('ছাপো ১ + ২ * ৩'), '7');
  assert.equal(out('ছাপো (১ + ২) * ৩'), '9');
  assert.equal(out('ছাপো ১০ % ৩'), '1');
  assert.equal(out('ছাপো ৭ / ২'), '3.5');
});

test('floating point noise is hidden', () => {
  assert.equal(out('ছাপো ০.১ + ০.২'), '0.3');
});

test('strings and concatenation', () => {
  assert.equal(out('ছাপো "আমি " + "ভালো"'), 'আমি ভালো');
});

test('print several values and booleans', () => {
  assert.equal(out('ছাপো "a", ১, সত্য, মিথ্যা'), 'a 1 সত্য মিথ্যা');
});

test('English keywords behave the same', () => {
  assert.equal(out('let x = 2\nprint x * 4'), '8');
});

test('variables and assignment', () => {
  assert.equal(out('ধরি x = ১\nx = x + ৪\nছাপো x'), '5');
});

test('undefined variable error has the right line', () => {
  const e = errorOf('ধরি a = ১\nছাপো ফল + ১');
  assert.equal(e.line, 2);
  assert.match(e.messageEn, /not defined/);
});

test('assigning to an undefined variable is an error', () => {
  fails('x = ১');
});

test('redeclaring in the same scope is an error, shadowing in an inner scope is fine', () => {
  fails('ধরি a = ১\nধরি a = ২');
  assert.equal(out('ধরি a = ১\nযদি সত্য {\n ধরি a = ২\n ছাপো a\n}\nছাপো a'), '2\n1');
});

test('if / else if / else', () => {
  const src = (n) => `ধরি n = ${n}
যদি n < ০ { ছাপো "ঋণাত্মক" }
নাহলে যদি n == ০ { ছাপো "শূন্য" }
নাহলে { ছাপো "ধনাত্মক" }`;
  assert.equal(out(src(-5)), 'ঋণাত্মক');
  assert.equal(out(src(0)), 'শূন্য');
  assert.equal(out(src(7)), 'ধনাত্মক');
});

test('while loop', () => {
  assert.equal(out('ধরি s = ০\nধরি i = ১\nযতক্ষণ i <= ১০ {\n s = s + i\n i = i + ১\n}\nছাপো s'), '55');
});

test('break and continue', () => {
  const src = `ধরি i = ০
যতক্ষণ সত্য {
  i = i + ১
  যদি i == ২ { পরেরটা }
  যদি i > ৪ { থামো }
  ছাপো i
}`;
  assert.equal(out(src), '1\n3\n4');
});

test('break outside a loop and return outside a function are errors', () => {
  fails('থামো');
  fails('ফেরত ১');
});

test('functions, parameters and return values', () => {
  assert.equal(out('ফাংশন যোগফল(a, b) { ফেরত a + b }\nছাপো যোগফল(২, ৩)'), '5');
});

test('function without return gives nothing', () => {
  assert.equal(out('ফাংশন f() { ধরি x = ১ }\nছাপো f()'), 'শূন্য');
});

test('recursion: factorial and fibonacci', () => {
  assert.equal(out('ফাংশন f(n) { যদি n <= ১ { ফেরত ১ }\n ফেরত n * f(n - ১) }\nছাপো f(৫)'), '120');
  assert.equal(out('ফাংশন fib(n) { যদি n < ২ { ফেরত n }\n ফেরত fib(n - ১) + fib(n - ২) }\nছাপো fib(১০)'), '55');
});

test('closures keep their own variables', () => {
  const src = `ফাংশন বানাও() {
  ধরি c = ০
  ফাংশন বাড়াও() {
    c = c + ১
    ফেরত c
  }
  ফেরত বাড়াও
}
ধরি গণক = বানাও()
ছাপো গণক(), গণক(), গণক()`;
  assert.equal(out(src), '1 2 3');
});

test('break inside a function called from a loop is not allowed', () => {
  fails('ফাংশন f() { থামো }\nযতক্ষণ সত্য { f() }');
});

test('wrong number of arguments', () => {
  fails('ফাংশন f(a) { ফেরত a }\nf(১, ২)');
  fails('দৈর্ঘ্য()');
});

test('calling something that is not a function', () => {
  fails('ধরি x = ৫\nx()');
});

test('lists: literal, index, assign, append, length', () => {
  const src = `ধরি xs = [১, ২, ৩]
xs[০] = ১০
যোগ(xs, ৪)
ছাপো xs
ছাপো xs[০], দৈর্ঘ্য(xs)`;
  assert.equal(out(src), '[10, 2, 3, 4]\n10 4');
});

test('list index out of range', () => {
  const e = errorOf('ধরি xs = [১]\nছাপো xs[৫]');
  assert.equal(e.line, 2);
});

test('lists inside lists, strings inside lists are quoted when printed', () => {
  assert.equal(out('ছাপো [১, "a", [২]]'), '[1, "a", [2]]');
});

test('list concatenation and equality', () => {
  assert.equal(out('ছাপো [১] + [২]'), '[1, 2]');
  assert.equal(out('ছাপো [১, ২] == [১, ২]'), 'সত্য');
  assert.equal(out('ছাপো [১, ২] != [১, ৩]'), 'সত্য');
});

test('string length counts Bangla characters correctly', () => {
  assert.equal(out('ছাপো দৈর্ঘ্য("কি")'), '1');
  assert.equal(out('ছাপো দৈর্ঘ্য("বাংলা")'), '2'); // বাং + লা
  assert.equal(out('ছাপো "বাংলা"[০]'), 'বাং');
});

test('conversions', () => {
  assert.equal(out('ছাপো সংখ্যা("১২") + ১'), '13');
  assert.equal(out('ছাপো "মান: " + লেখা(৫)'), 'মান: 5');
  fails('ছাপো সংখ্যা("abc")');
});

test('mixing string and number gives a helpful error', () => {
  const e = errorOf('ছাপো "a" + ১');
  assert.match(e.messageEn, /লেখা/);
});

test('division by zero', () => {
  fails('ছাপো ১ / ০');
  fails('ছাপো ১ % ০');
});

test('comparison of different types is an error', () => {
  fails('ছাপো ১ < "a"');
  assert.equal(out('ছাপো "a" < "b"'), 'সত্য');
});

test('and / or / not and short-circuit', () => {
  assert.equal(out('ছাপো সত্য এবং মিথ্যা, সত্য অথবা মিথ্যা, না সত্য'), 'মিথ্যা সত্য মিথ্যা');
  // the right side must not run: it would divide by zero
  assert.equal(out('ছাপো মিথ্যা এবং (১ / ০)'), 'মিথ্যা');
  assert.equal(out('ছাপো সত্য অথবা (১ / ০)'), 'সত্য');
});

test('user code can shadow a built-in name but not overwrite it in place', () => {
  assert.equal(out('ধরি যোগ = ৫\nছাপো যোগ'), '5');
  fails('দৈর্ঘ্য = ১');
});

test('infinite loops are stopped', () => {
  fails('যতক্ষণ সত্য { }', { maxSteps: 1000 });
});

test('runaway recursion gives an error instead of crashing', () => {
  fails('ফাংশন f(n) { ফেরত f(n + ১) }\nf(১)');
});

test('reasonably deep recursion works', () => {
  assert.equal(out('ফাংশন s(n) { যদি n == ০ { ফেরত ০ }\n ফেরত n + s(n - ১) }\nছাপো s(৫০০)'), '125250');
});

test('spec example: fizzbuzz', () => {
  const src = `ধরি i = ১
যতক্ষণ i <= ১৫ {
  যদি i % ১৫ == ০ { ছাপো "FizzBuzz" }
  নাহলে যদি i % ৩ == ০ { ছাপো "Fizz" }
  নাহলে যদি i % ৫ == ০ { ছাপো "Buzz" }
  নাহলে { ছাপো i }
  i = i + ১
}`;
  assert.equal(out(src), '1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz');
});

test('spec example: fibonacci list', () => {
  const src = `ধরি ফল = [০, ১]
ধরি i = ২
যতক্ষণ i < ১০ {
  যোগ(ফল, ফল[i - ১] + ফল[i - ২])
  i = i + ১
}
ছাপো ফল`;
  assert.equal(out(src), '[0, 1, 1, 2, 3, 5, 8, 13, 21, 34]');
});

test('runProgram returns formatted errors and keeps earlier output', () => {
  const r = runProgram('ছাপো ১\nছাপো ফল');
  assert.deepEqual(r.output, ['1']);
  assert.match(r.error, /লাইন ২/);
});

test('banglaDigits option prints numbers with Bangla digits', () => {
  assert.equal(out('ছাপো ১২ + ৩, [১, ২.৫], "a1"', { banglaDigits: true }), '১৫ [১, ২.৫] a1');
});
