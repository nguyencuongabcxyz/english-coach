// Lenient matching of vocabulary phrases inside what the speech recogniser heard.
// "close knit" matches "close-knit", "went on picnic" matches "go on a picnic",
// "help my mum with chores" matches "help with chores".

const IRREGULAR: Record<string, string> = {
  went: "go", gone: "go", goes: "go",
  got: "get", gotten: "get",
  did: "do", done: "do", does: "do",
  took: "take", taken: "take",
  had: "have", has: "have",
  made: "make", spent: "spend",
  was: "be", were: "be", is: "be", are: "be", am: "be", been: "be",
  ate: "eat", eaten: "eat", gave: "give", given: "give", came: "come",
  saw: "see", seen: "see", bought: "buy", brought: "bring", taught: "teach",
  thought: "think", kept: "keep", felt: "feel", left: "leave", met: "meet",
  told: "tell", said: "say", wrote: "write", written: "write", ran: "run",
  grew: "grow", grown: "grow", knew: "know", known: "know", drove: "drive",
  driven: "drive", chose: "choose", chosen: "choose", began: "begin", begun: "begin",
  built: "build", sent: "send", found: "find", held: "hold", lost: "lose",
  paid: "pay", sold: "sell", stood: "stand", understood: "understand", won: "win",
  wore: "wear", worn: "wear", spoke: "speak", spoken: "speak", fell: "fall",
  children: "child", men: "man", women: "woman", people: "person", mum: "mom",
};

/** Words that never have to be said: articles and "sb / sth" placeholders. */
const SKIP = new Set(["a", "an", "the", "sb", "sth", "someone", "something", "somebody", "smb", "smth"]);

function stem(word: string): string {
  let w = word.replace(/'s$/, "");
  if (IRREGULAR[w]) w = IRREGULAR[w];
  if (w.length > 4 && /ie[sd]$/.test(w)) w = w.slice(0, -3) + "y";
  else if (w.length > 4 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  // getting -> gett -> get, shopped -> shopp -> shop
  if (w.length > 3 && /([^aeiouls])\1$/.test(w)) w = w.slice(0, -1);
  if (w.length > 2 && w.endsWith("e")) w = w.slice(0, -1);
  return w;
}

const clean = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\([^)]*\)/g, " ") // "responsibility (n)"
    .replace(/[^a-z0-9'\s]+/g, " ");

export type Token = { raw: string; stem: string };

/** Splits text into words, keeping the original words so matches can be highlighted. */
export function tokenize(text: string): Token[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const c = clean(raw).trim().split(/\s+/).filter(Boolean);
      const s = c.filter((w) => !SKIP.has(w)).map(stem).join(" ");
      return { raw, stem: s };
    });
}

/** Stems of a vocabulary phrase, plus a joined form for hyphenated words ("close-knit" → "closeknit"). */
export function phraseStems(phrase: string): string[][] {
  const words = clean(phrase.replace(/-/g, " ")).split(/\s+/).filter((w) => w && !SKIP.has(w));
  const forms = [words.map(stem)];
  if (phrase.includes("-")) {
    const joined = clean(phrase.replace(/-/g, "")).split(/\s+/).filter((w) => w && !SKIP.has(w));
    forms.push(joined.map(stem));
  }
  return forms.filter((f) => f.length > 0);
}

const MAX_GAP = 2;

/**
 * Finds a phrase in the tokens. Its words must appear in order, with at most two extra
 * words between them ("help my mum with chores"). Returns [first, last] token index or null.
 */
export function findPhrase(phrase: string, tokens: Token[]): [number, number] | null {
  // Tokens may hold several stems ("close-knit" said as one word), so flatten them.
  const flat: { stem: string; at: number }[] = [];
  tokens.forEach((t, i) => t.stem.split(" ").forEach((s) => s && flat.push({ stem: s, at: i })));

  for (const form of phraseStems(phrase)) {
    for (let start = 0; start < flat.length; start++) {
      if (flat[start].stem !== form[0]) continue;
      let pos = start;
      let ok = true;
      for (let k = 1; k < form.length; k++) {
        let next = -1;
        for (let j = pos + 1; j <= Math.min(flat.length - 1, pos + 1 + MAX_GAP); j++) {
          if (flat[j].stem === form[k]) {
            next = j;
            break;
          }
        }
        if (next < 0) {
          ok = false;
          break;
        }
        pos = next;
      }
      if (ok) return [flat[start].at, flat[pos].at];
    }
  }
  return null;
}

export const saidPhrase = (phrase: string, text: string) => findPhrase(phrase, tokenize(text)) !== null;

export const wordCount = (text: string) => text.split(/\s+/).filter((w) => /[a-z]/i.test(w)).length;

/** A short hint for a hidden word: "2 từ" or "9 chữ cái". */
export function hintFor(phrase: string): string {
  const words = phrase.trim().split(/\s+/);
  return words.length > 1 ? `${words.length} từ` : `${phrase.replace(/[^a-z]/gi, "").length} chữ cái`;
}

export function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
