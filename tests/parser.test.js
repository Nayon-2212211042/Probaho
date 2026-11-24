import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../src/lexer.js';
import { parse } from '../src/parser.js';
import { ProbahoError } from '../src/errors.js';

const ast = (src) => parse(tokenize(src));
const first = (src) => ast(src).body[0];

test('let statement', () => {
  const s = first('ধরি x = ৫');
  assert.equal(s.type, 'Let');
  assert.equal(s.name, 'x');
  assert.equal(s.value.value, 5);
});

test('print with several arguments', () => {
  const s = first('ছাপো "a", ১, সত্য');
  assert.equal(s.type, 'Print');
  assert.equal(s.args.length, 3);
});

test('multiplication binds tighter than addition', () => {
  const e = first('১ + ২ * ৩').expr;
  assert.equal(e.op, '+');
  assert.equal(e.right.op, '*');
});

test('parentheses change grouping', () => {
  const e = first('(১ + ২) * ৩').expr;
  assert.equal(e.op, '*');
  assert.equal(e.left.op, '+');
});

test('subtraction is left associative', () => {
  const e = first('১০ - ৪ - ৩').expr;
  assert.equal(e.op, '-');
  assert.equal(e.left.op, '-');
  assert.equal(e.right.value, 3);
});

test('and / or / not precedence', () => {
  const e = first('না a অথবা b এবং c').expr;
  assert.equal(e.type, 'Logical');
  assert.equal(e.op, 'or');
  assert.equal(e.left.type, 'Unary');
  assert.equal(e.right.op, 'and');
});

test('if / else if / else chain', () => {
  const s = first('যদি a { ছাপো ১ } নাহলে যদি b { ছাপো ২ } নাহলে { ছাপো ৩ }');
  assert.equal(s.type, 'If');
  assert.equal(s.otherwise.type, 'If');
  assert.equal(s.otherwise.otherwise.type, 'Block');
});

test('else on the next line still attaches to the if', () => {
  const s = first('যদি a {\n ছাপো ১\n}\nনাহলে {\n ছাপো ২\n}');
  assert.equal(s.otherwise.type, 'Block');
});

test('while loop with break and continue', () => {
  const s = first('যতক্ষণ সত্য { থামো\n পরেরটা }');
  assert.equal(s.type, 'While');
  assert.deepEqual(s.body.body.map((x) => x.type), ['Break', 'Continue']);
});

test('function declaration and return', () => {
  const s = first('ফাংশন যোগফল(a, b) { ফেরত a + b }');
  assert.equal(s.type, 'Function');
  assert.deepEqual(s.params, ['a', 'b']);
  assert.equal(s.body.body[0].type, 'Return');
});

test('bare return has no value', () => {
  const s = first('ফাংশন f() { ফেরত }');
  assert.equal(s.body.body[0].value, null);
});

test('calls, lists and indexing', () => {
  const e = first('f(১, [২, ৩])[০]').expr;
  assert.equal(e.type, 'Index');
  assert.equal(e.object.type, 'Call');
  assert.equal(e.object.args[1].type, 'List');
});

test('assignment to variable and to list item', () => {
  assert.equal(first('x = ১').target.type, 'Identifier');
  assert.equal(first('xs[০] = ১').target.type, 'Index');
});

test('list literal can span several lines', () => {
  const e = first('ধরি xs = [\n ১,\n ২,\n]').value;
  assert.equal(e.elements.length, 2);
});

test('spec example: factorial', () => {
  const src = `ফাংশন ফ্যাক্টোরিয়াল(ন) {
  যদি ন <= ১ { ফেরত ১ }
  ফেরত ন * ফ্যাক্টোরিয়াল(ন - ১)
}
ছাপো ফ্যাক্টোরিয়াল(৫)`;
  assert.deepEqual(ast(src).body.map((s) => s.type), ['Function', 'Print']);
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
  assert.deepEqual(ast(src).body.map((s) => s.type), ['Let', 'While']);
});

test('spec example: fibonacci with list', () => {
  const src = `ধরি ফল = [০, ১]
ধরি i = ২
যতক্ষণ i < ১০ {
  যোগ(ফল, ফল[i - ১] + ফল[i - ২])
  i = i + ১
}
ছাপো ফল`;
  assert.equal(ast(src).body.length, 4);
});

test('missing closing brace reports an error', () => {
  assert.throws(() => ast('যদি সত্য { ছাপো ১'), ProbahoError);
});

test('missing value after = reports the right line', () => {
  assert.throws(() => ast('ধরি a = ১\nধরি b ='), (e) => e instanceof ProbahoError && e.line === 2);
});

test('invalid assignment target is rejected', () => {
  assert.throws(() => ast('১ + ২ = ৩'), ProbahoError);
});

test('two statements on one line need a separator', () => {
  assert.throws(() => ast('ধরি a = ১ ধরি b = ২'), ProbahoError);
  assert.equal(ast('ধরি a = ১; ধরি b = ২').body.length, 2);
});
