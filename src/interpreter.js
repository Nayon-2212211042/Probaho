import { ProbahoError } from './errors.js';
import { Environment } from './environment.js';
import { builtins } from './builtins.js';
import { format, isTruthy, equals, typeName, bn, graphemes } from './values.js';

class BreakSignal {}
class ContinueSignal {}
class ReturnSignal {
  constructor(value) { this.value = value; }
}

const MAX_CALL_DEPTH = 1000;

function fail(node, messageBn, messageEn) {
  throw new ProbahoError(messageBn, messageEn, node.line, node.col);
}

const isCallable = (v) =>
  v !== null && typeof v === 'object' && !Array.isArray(v) &&
  (v.kind === 'function' || v.kind === 'builtin');

export class Interpreter {
  constructor({ print = console.log, maxSteps = 1_000_000, banglaDigits = false } = {}) {
    this.print = print;
    this.banglaDigits = banglaDigits;
    this.maxSteps = maxSteps;
    this.steps = 0;
    this.callDepth = 0;
    this.loopDepth = 0;
    this.funcDepth = 0;

    // builtins live in a read-only outer scope, so user code can shadow them
    this.root = new Environment(null, { readonly: true });
    for (const [name, fn] of Object.entries(builtins)) this.root.define(name, fn);
    this.globals = new Environment(this.root);
  }

  run(program) {
    try {
      for (const stmt of program.body) this.exec(stmt, this.globals);
    } catch (e) {
      if (e instanceof RangeError) {
        throw new ProbahoError('রিকার্শন অনেক গভীর হয়ে গেছে', 'recursion went too deep', 1, 1);
      }
      throw e;
    }
  }

  // guards against infinite loops freezing the playground
  tick(node) {
    if (++this.steps > this.maxSteps) {
      fail(node, 'প্রোগ্রাম অনেক বেশি সময় নিচ্ছে, অসীম লুপ নয় তো?',
           'program ran too long, is there an infinite loop?');
    }
  }

  // ---------- statements ----------

  execBlock(block, env) {
    const scope = new Environment(env);
    for (const stmt of block.body) this.exec(stmt, scope);
  }

  declare(node, env, name, value) {
    if (env.has(name)) {
      fail(node, `'${name}' নামটি এই জায়গায় আগেই ব্যবহার করা হয়েছে`,
           `'${name}' is already defined in this scope`);
    }
    env.define(name, value);
  }

  exec(node, env) {
    switch (node.type) {
      case 'ExprStmt':
        this.eval(node.expr, env);
        return;

      case 'Let':
        this.declare(node, env, node.name, this.eval(node.value, env));
        return;

      case 'Assign': {
        const value = this.eval(node.value, env);
        const target = node.target;
        if (target.type === 'Identifier') {
          const owner = env.lookup(target.name);
          if (!owner) this.undefinedVariable(target);
          if (owner.readonly) {
            fail(target, `'${target.name}' বিল্ট-ইন ফাংশন, এটি বদলানো যায় না`,
                 `'${target.name}' is a built-in function and cannot be changed`);
          }
          owner.set(target.name, value);
        } else {
          const container = this.eval(target.object, env);
          const index = this.eval(target.index, env);
          if (typeof container === 'string') {
            fail(target, 'লেখার ভেতরের অক্ষর বদলানো যায় না', 'strings cannot be changed in place');
          }
          this.checkIndex(target, container, index);
          container[index] = value;
        }
        return;
      }

      case 'Print':
        this.print(node.args.map((a) => format(this.eval(a, env), false, this.banglaDigits)).join(' '));
        return;

      case 'If':
        if (isTruthy(this.eval(node.test, env))) this.execBlock(node.then, env);
        else if (node.otherwise) {
          if (node.otherwise.type === 'If') this.exec(node.otherwise, env);
          else this.execBlock(node.otherwise, env);
        }
        return;

      case 'While':
        this.loopDepth++;
        try {
          while (isTruthy(this.eval(node.test, env))) {
            this.tick(node);
            try {
              this.execBlock(node.body, env);
            } catch (signal) {
              if (signal instanceof BreakSignal) break;
              if (signal instanceof ContinueSignal) continue;
              throw signal;
            }
          }
        } finally {
          this.loopDepth--;
        }
        return;

      case 'Function':
        this.declare(node, env, node.name, {
          kind: 'function', name: node.name, params: node.params, body: node.body, closure: env,
        });
        return;

      case 'Return':
        if (this.funcDepth === 0) {
          fail(node, "'ফেরত' শুধু ফাংশনের ভেতরে ব্যবহার করা যায়", "'return' can only be used inside a function");
        }
        throw new ReturnSignal(node.value ? this.eval(node.value, env) : null);

      case 'Break':
        if (this.loopDepth === 0) {
          fail(node, "'থামো' শুধু লুপের ভেতরে ব্যবহার করা যায়", "'break' can only be used inside a loop");
        }
        throw new BreakSignal();

      case 'Continue':
        if (this.loopDepth === 0) {
          fail(node, "'পরেরটা' শুধু লুপের ভেতরে ব্যবহার করা যায়", "'continue' can only be used inside a loop");
        }
        throw new ContinueSignal();

      case 'Block':
        this.execBlock(node, env);
        return;

      default:
        fail(node, `অজানা স্টেটমেন্ট ${node.type}`, `unknown statement ${node.type}`);
    }
  }

  // ---------- expressions ----------

  undefinedVariable(node) {
    fail(node, `'${node.name}' নামে কোনো ভেরিয়েবল পাওয়া যায়নি`,
         `variable '${node.name}' is not defined`);
  }

  eval(node, env) {
    switch (node.type) {
      case 'Number':
      case 'String':
      case 'Bool':
        return node.value;

      case 'Identifier': {
        const owner = env.lookup(node.name);
        if (!owner) this.undefinedVariable(node);
        return owner.vars.get(node.name);
      }

      case 'List':
        return node.elements.map((e) => this.eval(e, env));

      case 'Unary': {
        const v = this.eval(node.arg, env);
        if (node.op === 'not') return !isTruthy(v);
        if (typeof v !== 'number') {
          const [tb, te] = typeName(v);
          fail(node, `${tb} এর আগে '-' বসানো যায় না`, `cannot negate a ${te}`);
        }
        return -v;
      }

      case 'Logical': {
        const left = this.eval(node.left, env);
        if (node.op === 'or') return isTruthy(left) ? left : this.eval(node.right, env);
        return !isTruthy(left) ? left : this.eval(node.right, env);
      }

      case 'Binary':
        return this.binary(node, this.eval(node.left, env), this.eval(node.right, env));

      case 'Index': {
        const container = this.eval(node.object, env);
        const index = this.eval(node.index, env);
        this.checkIndex(node, container, index);
        return typeof container === 'string' ? graphemes(container)[index] : container[index];
      }

      case 'Call': {
        const callee = this.eval(node.callee, env);
        if (!isCallable(callee)) {
          const [tb, te] = typeName(callee);
          fail(node, `${tb} কে ফাংশনের মতো ডাকা যায় না`, `a ${te} is not a function`);
        }
        const args = node.args.map((a) => this.eval(a, env));
        return this.callFunction(callee, args, node);
      }

      default:
        fail(node, `অজানা এক্সপ্রেশন ${node.type}`, `unknown expression ${node.type}`);
    }
  }

  checkIndex(node, container, index) {
    if (!Array.isArray(container) && typeof container !== 'string') {
      const [tb, te] = typeName(container);
      fail(node, `${tb} এর ঘর ধরা যায় না, শুধু তালিকা বা লেখায় যায়`, `cannot index a ${te}`);
    }
    if (typeof index !== 'number' || !Number.isInteger(index)) {
      fail(node, 'ঘরের নম্বর পূর্ণসংখ্যা হতে হবে', 'the index must be a whole number');
    }
    const length = typeof container === 'string' ? graphemes(container).length : container.length;
    if (index < 0 || index >= length) {
      fail(node, `ঘর নম্বর ${bn(index)} নেই, এখানে ${bn(length)}টি ঘর আছে (০ থেকে শুরু)`,
           `index ${index} is out of range, there are ${length} items (starting at 0)`);
    }
  }

  binary(node, l, r) {
    const op = node.op;
    const bothNumbers = typeof l === 'number' && typeof r === 'number';
    const bothStrings = typeof l === 'string' && typeof r === 'string';

    const typeError = () => {
      const [lb, le] = typeName(l);
      const [rb, re] = typeName(r);
      let hintBn = '';
      let hintEn = '';
      if (op === '+' && (bothStrings === false) && (typeof l === 'string' || typeof r === 'string')) {
        hintBn = ' (লেখা() দিয়ে বদলে নিন)';
        hintEn = ' (use লেখা(x) to convert to a string)';
      }
      fail(node, `${lb} আর ${rb} এর মধ্যে '${op}' চলে না${hintBn}`,
           `cannot use '${op}' on a ${le} and a ${re}${hintEn}`);
    };

    switch (op) {
      case '+':
        if (bothNumbers) return l + r;
        if (bothStrings) return l + r;
        if (Array.isArray(l) && Array.isArray(r)) return [...l, ...r];
        return typeError();
      case '-': return bothNumbers ? l - r : typeError();
      case '*': return bothNumbers ? l * r : typeError();
      case '/':
        if (!bothNumbers) return typeError();
        if (r === 0) fail(node, 'শূন্য দিয়ে ভাগ করা যায় না', 'division by zero');
        return l / r;
      case '%':
        if (!bothNumbers) return typeError();
        if (r === 0) fail(node, 'শূন্য দিয়ে ভাগ করা যায় না', 'division by zero');
        return l % r;
      case '==': return equals(l, r);
      case '!=': return !equals(l, r);
      case '<': return bothNumbers || bothStrings ? l < r : typeError();
      case '>': return bothNumbers || bothStrings ? l > r : typeError();
      case '<=': return bothNumbers || bothStrings ? l <= r : typeError();
      case '>=': return bothNumbers || bothStrings ? l >= r : typeError();
      default: return fail(node, `অজানা অপারেটর ${op}`, `unknown operator ${op}`);
    }
  }

  callFunction(fn, args, node) {
    this.tick(node);

    if (args.length !== fn.arity && fn.kind === 'builtin') {
      fail(node, `'${fn.name}' ${bn(fn.arity)}টি মান চায়, কিন্তু ${bn(args.length)}টি দেওয়া হয়েছে`,
           `'${fn.name}' takes ${fn.arity} argument(s), but ${args.length} given`);
    }
    if (fn.kind === 'builtin') {
      return fn.call(args, (messageBn, messageEn) => fail(node, messageBn, messageEn));
    }

    if (args.length !== fn.params.length) {
      fail(node, `'${fn.name}' ${bn(fn.params.length)}টি মান চায়, কিন্তু ${bn(args.length)}টি দেওয়া হয়েছে`,
           `'${fn.name}' takes ${fn.params.length} argument(s), but ${args.length} given`);
    }
    if (this.callDepth >= MAX_CALL_DEPTH) {
      fail(node, `ফাংশন কল অনেক গভীর হয়ে গেছে (সীমা ${bn(MAX_CALL_DEPTH)}), রিকার্শন থামছে না?`,
           `calls nested too deeply (limit ${MAX_CALL_DEPTH}), does the recursion ever stop?`);
    }

    const scope = new Environment(fn.closure);
    fn.params.forEach((p, i) => scope.define(p, args[i]));

    const savedLoopDepth = this.loopDepth;
    this.loopDepth = 0;
    this.funcDepth++;
    this.callDepth++;
    try {
      for (const stmt of fn.body.body) this.exec(stmt, scope);
      return null;
    } catch (signal) {
      if (signal instanceof ReturnSignal) return signal.value;
      throw signal;
    } finally {
      this.callDepth--;
      this.funcDepth--;
      this.loopDepth = savedLoopDepth;
    }
  }
}
