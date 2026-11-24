import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { Interpreter } from './interpreter.js';
import { ProbahoError } from './errors.js';

// Runs a program, printing with options.print (default console.log).
// Throws ProbahoError on any error.
export function run(source, options = {}) {
  const ast = parse(tokenize(source));
  new Interpreter(options).run(ast);
}

// Runs a program and captures everything. Never throws a ProbahoError:
// returns { output: string[], error: string | null } (handy for the playground).
export function runProgram(source, options = {}) {
  const output = [];
  try {
    run(source, { ...options, print: (line) => output.push(line) });
    return { output, error: null };
  } catch (e) {
    if (e instanceof ProbahoError) return { output, error: e.format(source) };
    throw e;
  }
}

export { ProbahoError };
