import { ProbahoError } from './errors.js';

// Describe a token for error messages: [bangla, english]
function describe(tok) {
  if (tok.type === 'EOF') return ['ফাইলের শেষ', 'end of file'];
  if (tok.type === 'NEWLINE') return ['নতুন লাইন', 'end of line'];
  return [`'${tok.value}'`, `'${tok.value}'`];
}

export function parse(tokens) {
  let p = 0;

  const peek = () => tokens[p];
  const next = () => tokens[p++];
  const check = (type) => peek().type === type;
  const match = (...types) => (types.includes(peek().type) ? next() : null);
  const skipNewlines = () => { while (check('NEWLINE')) p++; };
  const node = (type, tok, props = {}) => ({ type, ...props, line: tok.line, col: tok.col });

  function fail(bn, en, tok = peek()) {
    throw new ProbahoError(bn, en, tok.line, tok.col);
  }

  // expect(type, what in Bangla, what in English)
  function expect(type, bn, en) {
    if (check(type)) return next();
    const [fbn, fen] = describe(peek());
    fail(`${bn} চাই, কিন্তু ${fbn} পাওয়া গেছে`, `expected ${en}, found ${fen}`);
  }

  function endStatement() {
    if (match('NEWLINE')) return;
    if (check('}') || check('EOF')) return;
    const [fbn, fen] = describe(peek());
    fail(`এখানে ${fbn} আশা করা হয়নি`, `unexpected ${fen}`);
  }

  // ---------- statements ----------

  function program() {
    const first = peek();
    const body = [];
    skipNewlines();
    while (!check('EOF')) {
      body.push(statement());
      skipNewlines();
    }
    return node('Program', first, { body });
  }

  function block() {
    const open = expect('{', "'{'", "'{'");
    const body = [];
    skipNewlines();
    while (!check('}') && !check('EOF')) {
      body.push(statement());
      skipNewlines();
    }
    expect('}', "'}'", "'}'");
    return node('Block', open, { body });
  }

  function statement() {
    const t = peek();
    switch (t.type) {
      case 'LET': {
        next();
        const name = expect('IDENT', 'ভেরিয়েবলের নাম', 'a variable name');
        expect('=', "'='", "'='");
        const value = expression();
        endStatement();
        return node('Let', t, { name: name.value, value });
      }
      case 'IF': return ifStatement();
      case 'WHILE': {
        next();
        const test = expression();
        const body = block();
        return node('While', t, { test, body });
      }
      case 'FN': {
        next();
        const name = expect('IDENT', 'ফাংশনের নাম', 'a function name');
        expect('(', "'('", "'('");
        const params = [];
        if (!check(')')) {
          do {
            params.push(expect('IDENT', 'প্যারামিটারের নাম', 'a parameter name').value);
          } while (match(','));
        }
        expect(')', "')'", "')'");
        const body = block();
        return node('Function', t, { name: name.value, params, body });
      }
      case 'RETURN': {
        next();
        let value = null;
        if (!check('NEWLINE') && !check('}') && !check('EOF')) value = expression();
        endStatement();
        return node('Return', t, { value });
      }
      case 'PRINT': {
        next();
        const args = [expression()];
        while (match(',')) args.push(expression());
        endStatement();
        return node('Print', t, { args });
      }
      case 'BREAK': next(); endStatement(); return node('Break', t);
      case 'CONTINUE': next(); endStatement(); return node('Continue', t);
      default: return expressionOrAssignment();
    }
  }

  function ifStatement() {
    const t = expect('IF', 'যদি', 'if');
    const test = expression();
    const then = block();
    let otherwise = null;
    // 'নাহলে' may sit on the next line after the closing brace
    const save = p;
    skipNewlines();
    if (match('ELSE')) {
      otherwise = check('IF') ? ifStatement() : block();
    } else {
      p = save;
    }
    return node('If', t, { test, then, otherwise });
  }

  function expressionOrAssignment() {
    const start = peek();
    const expr = expression();
    if (match('=')) {
      if (expr.type !== 'Identifier' && expr.type !== 'Index') {
        fail('এখানে মান বসানো যায় না, বাম পাশে ভেরিয়েবল বা তালিকার ঘর দিন',
             'cannot assign to this, the left side must be a variable or list item', start);
      }
      const value = expression();
      endStatement();
      return node('Assign', start, { target: expr, value });
    }
    endStatement();
    return node('ExprStmt', start, { expr });
  }

  // ---------- expressions (lowest to highest precedence) ----------

  function expression() { return or(); }

  function or() {
    let left = and();
    while (check('OR')) {
      const op = next();
      left = node('Logical', op, { op: 'or', left, right: and() });
    }
    return left;
  }

  function and() {
    let left = equality();
    while (check('AND')) {
      const op = next();
      left = node('Logical', op, { op: 'and', left, right: equality() });
    }
    return left;
  }

  function binaryLevel(sub, ops) {
    return () => {
      let left = sub();
      while (ops.includes(peek().type)) {
        const op = next();
        left = node('Binary', op, { op: op.type, left, right: sub() });
      }
      return left;
    };
  }

  const equality = () => binaryLevel(comparison, ['==', '!='])();
  const comparison = () => binaryLevel(term, ['<', '>', '<=', '>='])();
  const term = () => binaryLevel(factor, ['+', '-'])();
  const factor = () => binaryLevel(unary, ['*', '/', '%'])();

  function unary() {
    if (check('NOT') || check('-')) {
      const op = next();
      return node('Unary', op, { op: op.type === 'NOT' ? 'not' : '-', arg: unary() });
    }
    return call();
  }

  function argList(close) {
    const args = [];
    skipNewlines();
    while (!check(close)) {
      args.push(expression());
      skipNewlines();
      if (!match(',')) break;
      skipNewlines();
    }
    expect(close, `'${close}'`, `'${close}'`);
    return args;
  }

  function call() {
    let expr = primary();
    while (true) {
      if (check('(')) {
        const open = next();
        expr = node('Call', open, { callee: expr, args: argList(')') });
      } else if (check('[')) {
        const open = next();
        const index = expression();
        expect(']', "']'", "']'");
        expr = node('Index', open, { object: expr, index });
      } else {
        break;
      }
    }
    return expr;
  }

  function primary() {
    const t = peek();
    switch (t.type) {
      case 'NUMBER': next(); return node('Number', t, { value: t.value });
      case 'STRING': next(); return node('String', t, { value: t.value });
      case 'TRUE': next(); return node('Bool', t, { value: true });
      case 'FALSE': next(); return node('Bool', t, { value: false });
      case 'IDENT': next(); return node('Identifier', t, { name: t.value });
      case '(': {
        next();
        const inner = expression();
        expect(')', "')'", "')'");
        return inner;
      }
      case '[': {
        next();
        return node('List', t, { elements: argList(']') });
      }
      default: {
        const [fbn, fen] = describe(t);
        fail(`এখানে একটি মান চাই, কিন্তু ${fbn} পাওয়া গেছে`, `expected a value, found ${fen}`);
      }
    }
  }

  return program();
}
