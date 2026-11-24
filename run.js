// Usage: node run.js examples/hello.pb
import { readFileSync } from 'node:fs';
import { run, ProbahoError } from './src/index.js';

const file = process.argv[2];
if (!file) {
  console.log('ব্যবহার / Usage: node run.js <file.pb>');
  process.exit(1);
}

const source = readFileSync(file, 'utf8');
try {
  run(source);
} catch (e) {
  if (e instanceof ProbahoError) {
    console.error(e.format(source));
    process.exit(1);
  }
  throw e;
}
