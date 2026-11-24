import { tokenize } from './src/lexer.js';
import { parse } from './src/parser.js';
import { ProbahoError } from './src/errors.js';

const source = `ধরি x = ১ + ২ * ৩
যদি x > ৫ { ছাপো "বড়" } নাহলে { ছাপো "ছোট" }`;

try {
  const tree = parse(tokenize(source));
  // hide line/col so the tree is easy to read
  console.log(JSON.stringify(tree, (k, v) => (k === 'line' || k === 'col' ? undefined : v), 2));
} catch (e) {
  if (e instanceof ProbahoError) console.log(e.format(source));
  else throw e;
}
