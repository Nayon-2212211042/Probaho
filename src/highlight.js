import { KEYWORDS } from './keywords.js';
import { builtins } from './builtins.js';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// comment | string | number | word | any other single character
const TOKEN =
  /(#[^\n]*)|("(?:\\.|[^"\\\n])*"?)|(\p{Nd}+(?:\.\p{Nd}+)?)|([\p{L}\p{M}_][\p{L}\p{M}\p{N}_\u200C\u200D]*)|([\s\S])/gu;

// Turns Probaho source into HTML with <span class="k|b|f|s|n|c"> around tokens.
// Words are never split, so Bangla conjuncts keep their shape.
export function highlightHtml(source) {
  let html = '';
  let m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(source))) {
    const [text, comment, string, number, word] = m;
    if (comment) html += `<span class="c">${esc(text)}</span>`;
    else if (string) html += `<span class="s">${esc(text)}</span>`;
    else if (number) html += `<span class="n">${text}</span>`;
    else if (word) {
      if (Object.hasOwn(KEYWORDS, word)) html += `<span class="k">${word}</span>`;
      else if (Object.hasOwn(builtins, word)) html += `<span class="b">${word}</span>`;
      else if (source[TOKEN.lastIndex] === '(') html += `<span class="f">${word}</span>`;
      else html += word;
    } else html += esc(text);
  }
  return html;
}
