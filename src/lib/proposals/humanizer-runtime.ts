// Humanizer runtime. Non-negotiable post-processing on every AI-authored
// paragraph before it reaches a proposal document.

const AI_VOCAB_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bleverage\b/gi, 'use'],
  [/\bleveraging\b/gi, 'using'],
  [/\butilize\b/gi, 'use'],
  [/\butilizing\b/gi, 'using'],
  [/\butilization\b/gi, 'use'],
  [/\brobust\b/gi, 'strong'],
  [/\bseamless\b/gi, 'smooth'],
  [/\bseamlessly\b/gi, 'smoothly'],
  [/\bcutting[- ]edge\b/gi, 'current'],
  [/\bstate[- ]of[- ]the[- ]art\b/gi, 'current'],
  [/\bgroundbreaking\b/gi, 'new'],
  [/\brevolutionary\b/gi, 'new'],
  [/\bpivotal\b/gi, 'important'],
  [/\bcrucial\b/gi, 'important'],
  [/\bkey\b(?= )/gi, ''],
  [/\bvital\b/gi, 'important'],
  [/\bvibrant\b/gi, 'active'],
  [/\bdelve into\b/gi, 'look at'],
  [/\bdelve\b/gi, 'look at'],
  [/\bgarner\b/gi, 'earn'],
  [/\bfostering\b/gi, 'building'],
  [/\bfoster\b/gi, 'build'],
  [/\btapestry\b/gi, 'set'],
  [/\bintricate\b/gi, 'complex'],
  [/\bintricacies\b/gi, 'details'],
  [/\benduring\b/gi, 'lasting'],
  [/\btestament to\b/gi, 'evidence of'],
  [/\bunderscores\b/gi, 'shows'],
  [/\bunderscore\b/gi, 'show'],
  [/\bemphasizes\b/gi, 'shows'],
  [/\bemphasize\b/gi, 'show'],
  [/\bshowcases\b/gi, 'shows'],
  [/\bshowcase\b/gi, 'show'],
  [/\binterplay\b/gi, 'relationship'],
  [/\blandscape\b/gi, 'field'],
  [/\bnestled\b/gi, 'located'],
  [/\bin the heart of\b/gi, 'in'],
  [/\bbreathtaking\b/gi, 'striking'],
  [/\bstunning\b/gi, 'striking'],
  [/\brenowned\b/gi, 'known'],
  [/\bboasts\b/gi, 'has'],
  [/\bboast\b/gi, 'have'],
  [/\bAdditionally,\s+/g, ''],
  [/\bFurthermore,\s+/g, ''],
  [/\bMoreover,\s+/g, ''],
]

const COPULA_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bserves as\b/gi, 'is'],
  [/\bstands as\b/gi, 'is'],
  [/\bfunctions as\b/gi, 'is'],
  [/\brepresents\b(?= [aA] )/g, 'is'],
  [/\bmarks\b(?= [aA] )/g, 'is'],
]

const FILLER_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bin order to\b/gi, 'to'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bin the event that\b/gi, 'if'],
  [/\bhas the ability to\b/gi, 'can'],
  [/\bhave the ability to\b/gi, 'can'],
  [/\bit is important to note that\b/gi, ''],
  [/\bit should be noted that\b/gi, ''],
  [/\bcould potentially possibly\b/gi, 'may'],
  [/\bcould potentially\b/gi, 'may'],
  [/\bmight potentially\b/gi, 'may'],
]

const CHATBOT_ARTIFACTS: RegExp[] = [
  /^\s*(Great question!?|Certainly!?|Of course!?|Absolutely!?|You'?re absolutely right!?)\s*/im,
  /\bI hope this helps!?\b/gi,
  /\bLet me know if you'?d like\b[^.]*/gi,
  /\bHere is (?:a |an |the )?(?:overview|summary|breakdown)\b[^.]*\./gi,
  /\bWould you like me to\b[^?]*\?/gi,
  /^\s*(Here'?s what you need to know\b[^.]*\.)/im,
  /\b(Let'?s dive in|Let'?s explore|Let'?s break this down|Without further ado)\b[,.]?\s*/gi,
]

const HEDGE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bkind of\b/gi, ''],
  [/\bsort of\b/gi, ''],
  [/\bjust (?=want|wanted)\b/gi, ''],
]

const SYCOPHANT_PATTERNS: RegExp[] = [
  /^\s*(Great|Excellent|Perfect|Amazing) (point|question|observation)[.!]?\s*/im,
  /\bThat'?s an excellent point\b[^.]*\./gi,
]

const CUTOFF_PATTERNS: RegExp[] = [
  /\b(As of my last training update|Up to my last training update|based on available information),?\s*/gi,
  /\bWhile specific details (are|remain) (limited|scarce)[^.]*\.\s*/gi,
]

const NEG_PARALLEL_PATTERNS: Array<[RegExp, string]> = [
  [/\bIt'?s not just about ([^,.]+)[,;]\s*it'?s ([^.]+)\./gi, 'It is $2 as well as $1.'],
  [/\bNot only ([^,]+), but ([^.]+)\./gi, 'It is $1 and $2.'],
]

const AUTHORITY_PATTERNS: Array<[RegExp, string]> = [
  [/\bThe real question is\b/gi, 'The question is'],
  [/\bAt its core,?\s*/gi, ''],
  [/\bIn reality,?\s*/gi, ''],
  [/\bWhat really matters is\b/gi, 'What matters is'],
  [/\bFundamentally,?\s*/gi, ''],
  [/\bThe heart of the matter (is|lies)\b/gi, 'The question $1'],
]

function straightenPunctuation(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, '-')
    .replace(/\u2014/g, ', ')
    .replace(/\u2026/g, '...')
}

const HYPHEN_STRIPS: Array<[RegExp, string]> = [
  [/\bthird-party\b/gi, 'third party'],
  [/\bcross-functional\b/gi, 'cross functional'],
  [/\bclient-facing\b/gi, 'client facing'],
  [/\bdata-driven\b/gi, 'data driven'],
  [/\bdecision-making\b/gi, 'decision making'],
  [/\bwell-known\b/gi, 'known'],
  [/\bhigh-quality\b/gi, 'high quality'],
  [/\breal-time\b/gi, 'real time'],
  [/\blong-term\b/gi, 'long term'],
  [/\bend-to-end\b/gi, 'end to end'],
]

const GENERIC_CONCLUSIONS: RegExp[] = [
  /\b(The future looks bright|Exciting times lie ahead|Represents a major step in the right direction)\b[^.]*\.\s*/gi,
]

const DANGLING_ING_PATTERNS: Array<[RegExp, string]> = [
  [/,?\s*highlighting [^,.]+(?=[,.])/gi, ''],
  [/,?\s*underscoring [^,.]+(?=[,.])/gi, ''],
  [/,?\s*emphasizing [^,.]+(?=[,.])/gi, ''],
  [/,?\s*symbolizing [^,.]+(?=[,.])/gi, ''],
  [/,?\s*reflecting [^,.]+(?=[,.])/gi, ''],
  [/,?\s*contributing to [^,.]+(?=[,.])/gi, ''],
]

function applyPairs(s: string, pairs: Array<[RegExp, string]>): string {
  return pairs.reduce((acc, [re, sub]) => acc.replace(re, sub), s)
}

function applyRegexRemovals(s: string, patterns: RegExp[]): string {
  return patterns.reduce((acc, re) => acc.replace(re, ''), s)
}

function tidy(s: string): string {
  return s
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/ +\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function humanizeDeterministic(text: string): string {
  if (!text) return text
  let out = text
  out = straightenPunctuation(out)
  out = applyPairs(out, AI_VOCAB_REPLACEMENTS)
  out = applyPairs(out, COPULA_REPLACEMENTS)
  out = applyPairs(out, FILLER_REPLACEMENTS)
  out = applyPairs(out, HEDGE_REPLACEMENTS)
  out = applyPairs(out, NEG_PARALLEL_PATTERNS)
  out = applyPairs(out, AUTHORITY_PATTERNS)
  out = applyPairs(out, HYPHEN_STRIPS)
  out = applyPairs(out, DANGLING_ING_PATTERNS)
  out = applyRegexRemovals(out, CHATBOT_ARTIFACTS)
  out = applyRegexRemovals(out, SYCOPHANT_PATTERNS)
  out = applyRegexRemovals(out, CUTOFF_PATTERNS)
  out = applyRegexRemovals(out, GENERIC_CONCLUSIONS)
  out = tidy(out)
  return out
}

export function detectAiTells(text: string): Array<{ pattern: string; match: string; severity: 'minor' | 'major' }> {
  const findings: Array<{ pattern: string; match: string; severity: 'minor' | 'major' }> = []
  const stillAiVocab = /\b(leverage|utilize|robust|seamless|pivotal|crucial|vibrant|delve|tapestry|underscore|foster|groundbreaking)\b/gi
  let m: RegExpExecArray | null
  while ((m = stillAiVocab.exec(text)) !== null) {
    findings.push({ pattern: 'ai_vocabulary', match: m[0], severity: 'major' })
  }
  const emDashCount = (text.match(/\u2014/g) || []).length
  if (emDashCount > 2) findings.push({ pattern: 'em_dash_overuse', match: String(emDashCount), severity: 'minor' })
  const ruleOfThreeCount = (text.match(/,\s+\w+,\s+and\s+\w+/g) || []).length
  if (ruleOfThreeCount > 3) findings.push({ pattern: 'rule_of_three_overuse', match: String(ruleOfThreeCount), severity: 'minor' })
  const boldHeaders = (text.match(/\*\*[A-Z][^*]+:\*\*/g) || []).length
  if (boldHeaders > 2) findings.push({ pattern: 'inline_bold_headers', match: String(boldHeaders), severity: 'minor' })
  const curlyQuote = /[\u2018\u2019\u201C\u201D]/
  if (curlyQuote.test(text)) findings.push({ pattern: 'curly_quotes', match: 'present', severity: 'minor' })
  const sycoOpeners = /^\s*(Great|Excellent|Perfect|Amazing) (point|question|observation)/im
  if (sycoOpeners.test(text)) findings.push({ pattern: 'sycophant_opener', match: 'present', severity: 'major' })
  return findings
}
