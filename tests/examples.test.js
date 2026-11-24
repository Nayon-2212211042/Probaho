import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { runProgram } from '../src/index.js';

const dir = new URL('../examples/', import.meta.url);

// Every examples/NAME.pb must print exactly what examples/NAME.expected says.
for (const file of readdirSync(dir).filter((f) => f.endsWith('.pb'))) {
  test(`example: ${file}`, () => {
    const source = readFileSync(new URL(file, dir), 'utf8');
    const expected = readFileSync(new URL(file.replace('.pb', '.expected'), dir), 'utf8');
    const result = runProgram(source);
    assert.equal(result.error, null, result.error ?? '');
    assert.equal(result.output.join('\n'), expected.trimEnd());
  });
}
