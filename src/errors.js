import { bn } from './values.js';

export class ProbahoError extends Error {
  constructor(messageBn, messageEn, line, col) {
    super(messageEn);
    this.name = 'ProbahoError';
    this.messageBn = messageBn;
    this.messageEn = messageEn;
    this.line = line;
    this.col = col;
  }

  // Pretty, two-language error with a caret under the problem.
  format(source) {
    const text = source.split('\n')[this.line - 1] ?? '';
    const pointer = ' '.repeat(Math.max(this.col - 1, 0)) + '^';
    return [
      `ত্রুটি (লাইন ${bn(this.line)}): ${this.messageBn}`,
      `Error (line ${this.line}): ${this.messageEn}`,
      `    ${text}`,
      `    ${pointer}`,
    ].join('\n');
  }
}
