import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlightHtml } from '../src/highlight.js';

test('keywords, numbers, comments and strings get classes', () => {
  const h = highlightHtml('যদি x < ১ { ছাপো "a<b" } # নোট');
  assert.match(h, /<span class="k">যদি<\/span>/);
  assert.match(h, /<span class="n">১<\/span>/);
  assert.match(h, /<span class="s">"a&lt;b"<\/span>/);
  assert.match(h, /<span class="c"># নোট<\/span>/);
});

test('HTML in source is escaped', () => {
  assert.equal(highlightHtml('<b>&'), '&lt;b&gt;&amp;');
});

test('built-ins and function calls are marked, plain names are not', () => {
  const h = highlightHtml('দৈর্ঘ্য(xs) + f(১) + নাম');
  assert.match(h, /<span class="b">দৈর্ঘ্য<\/span>/);
  assert.match(h, /<span class="f">f<\/span>/);
  assert.ok(h.includes(' + নাম'));
});

test('a word that starts with a keyword is not split', () => {
  assert.equal(highlightHtml('নাম'), 'নাম');
});

test('output text is unchanged once the tags are removed', () => {
  const src = 'ধরি ফল = [১, "কি"]\n# শেষ';
  assert.equal(highlightHtml(src).replace(/<[^>]+>/g, ''), src);
});
