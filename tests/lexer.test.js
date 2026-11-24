import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../src/lexer.js';
import { ProbahoError } from '../src/errors.js';

const types = (src) => tokenize(src).map((t) => t.type);

test('print with a string', () => {
  assert.deepEqual(types('ছাপো "হ্যালো"'), ['PRINT', 'STRING', 'NEWLINE', 'EOF']);
});

test('English alias gives the same token type', () => {
  assert.deepEqual(types('print "hi"'), types('ছাপো "hi"'));
});

test('Bangla digits and decimals become numbers', () => {
  const t = tokenize('ধরি x = ১২.৫');
  assert.equal(t[3].type, 'NUMBER');
  assert.equal(t[3].value, 12.5);
});

test('Bangla identifier with vowel signs', () => {
  const t = tokenize('ধরি ফল = ১');
  assert.equal(t[1].type, 'IDENT');
  assert.equal(t[1].value, 'ফল');
});

test('word starting with a keyword is still an identifier', () => {
  const t = tokenize('নাম');
  assert.equal(t[0].type, 'IDENT');
});

test('না alone is the NOT keyword', () => {
  assert.equal(tokenize('না সত্য')[0].type, 'NOT');
});

test('comments are ignored', () => {
  assert.deepEqual(types('# মন্তব্য\nছাপো ১'), ['PRINT', 'NUMBER', 'NEWLINE', 'EOF']);
});

test('two-character operators', () => {
  assert.deepEqual(types('১ <= ২ == ৩'), ['NUMBER', '<=', 'NUMBER', '==', 'NUMBER', 'NEWLINE', 'EOF']);
});

test('line numbers are tracked', () => {
  const t = tokenize('ধরি a = ১\nছাপো a');
  const printTok = t.find((x) => x.type === 'PRINT');
  assert.equal(printTok.line, 2);
});

test('string escapes', () => {
  assert.equal(tokenize('"a\\nb"')[0].value, 'a\nb');
});

test('unterminated string throws a ProbahoError with the line', () => {
  assert.throws(() => tokenize('ছাপো "abc'), (e) => e instanceof ProbahoError && e.line === 1);
});

test('unexpected character throws', () => {
  assert.throws(() => tokenize('ধরি x = @'), ProbahoError);
});
