import { tokenize } from './src/lexer.js';
import { ProbahoError } from './src/errors.js';

const source = `ধরি ফল = ১২
ছাপো ফল + ৩`;

try {
  console.table(tokenize(source));
} catch (e) {
  if (e instanceof ProbahoError) console.log(e.format(source));
  else throw e;
}