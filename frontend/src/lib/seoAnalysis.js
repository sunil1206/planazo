// Client-side on-page SEO + readability analysis — the Yoast/RankMath
// "traffic light" checklist. Runs entirely in the browser (no network call)
// so the editor gets instant feedback while someone is typing, exactly like
// the real plugins do.
//
// This is a deliberate, documented duplicate of app/seo/analysis.py's rules
// (same thresholds, same check ids) rather than a network call to
// POST /api/seo/analyze on every keystroke — that endpoint still exists for
// API consumers/tests, but round-tripping to the server for every character
// typed would make the panel feel laggy. If you change a threshold here,
// change it there too.

function wordCount(text) {
  return (text.match(/[A-Za-z0-9']+/g) || []).length
}

function sentences(text) {
  return (text || '').trim().split(/(?<=[.!?])\s+/).filter(s => s.trim())
}

function countOccurrences(haystack, needle) {
  if (!needle) return 0
  const escaped = needle.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return ((haystack || '').toLowerCase().match(new RegExp(escaped, 'g')) || []).length
}

function syllablesInWord(word) {
  word = word.toLowerCase().replace(/^[.,!?;:'"]+|[.,!?;:'"]+$/g, '')
  if (!word) return 0
  word = word.replace(/e$/, '')
  const groups = word.match(/[aeiouy]+/g) || []
  return Math.max(1, groups.length)
}

export function fleschReadingEase(text) {
  const words = text.match(/[A-Za-z']+/g) || []
  const sents = sentences(text)
  if (!words.length || !sents.length) return 0
  const syllables = words.reduce((sum, w) => sum + syllablesInWord(w), 0)
  const wordsPerSentence = words.length / sents.length
  const syllablesPerWord = syllables / words.length
  const score = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord)
  return Math.max(0, Math.min(100, score))
}

function slugifyKeyword(keyword) {
  return keyword.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

const SCORE_WEIGHT = { good: 100, ok: 55, bad: 0 }

function ratingForScore(score) {
  if (score >= 80) return 'good'
  if (score >= 50) return 'ok'
  return 'bad'
}

/**
 * @param {{title?: string, metaDescription?: string, slug?: string, content?: string, focusKeyword?: string}} input
 * @returns {{seoScore: number, readabilityScore: number, seoRating: string, readabilityRating: string, checks: Array<{id: string, category: string, status: string, message: string}>}}
 */
export function analyzeSeo({ title = '', metaDescription = '', slug = '', content = '', focusKeyword = '' }) {
  focusKeyword = (focusKeyword || '').trim()
  const seoChecks = []
  const readabilityChecks = []

  // ── Title ──────────────────────────────────────────────────────────────
  const tlen = title.length
  if (tlen === 0) {
    seoChecks.push({ id: 'title_length', category: 'seo', status: 'bad', message: 'No title set yet.' })
  } else if (tlen >= 40 && tlen <= 60) {
    seoChecks.push({ id: 'title_length', category: 'seo', status: 'good', message: `Title is ${tlen} characters — a good length for Google's results.` })
  } else if (tlen >= 20 && tlen <= 70) {
    seoChecks.push({ id: 'title_length', category: 'seo', status: 'ok', message: `Title is ${tlen} characters — aim for 40-60.` })
  } else {
    seoChecks.push({ id: 'title_length', category: 'seo', status: 'bad', message: `Title is ${tlen} characters — ${tlen < 20 ? 'too short' : 'likely to be truncated'} in search results.` })
  }

  // ── Meta description ──────────────────────────────────────────────────
  const dlen = metaDescription.length
  if (dlen === 0) {
    seoChecks.push({ id: 'meta_length', category: 'seo', status: 'bad', message: 'No meta description set — Google will pick its own snippet.' })
  } else if (dlen >= 120 && dlen <= 156) {
    seoChecks.push({ id: 'meta_length', category: 'seo', status: 'good', message: `Meta description is ${dlen} characters — a good length.` })
  } else {
    seoChecks.push({ id: 'meta_length', category: 'seo', status: 'ok', message: `Meta description is ${dlen} characters — aim for 120-156.` })
  }

  // ── Focus keyword checks ───────────────────────────────────────────────
  if (!focusKeyword) {
    seoChecks.push({ id: 'focus_keyword', category: 'seo', status: 'ok', message: 'Set a focus keyword to unlock the full checklist.' })
  } else {
    const kw = focusKeyword.toLowerCase()
    seoChecks.push(title.toLowerCase().includes(kw)
      ? { id: 'keyword_in_title', category: 'seo', status: 'good', message: 'Focus keyword appears in the title.' }
      : { id: 'keyword_in_title', category: 'seo', status: 'bad', message: 'Focus keyword is missing from the title.' })

    seoChecks.push(metaDescription.toLowerCase().includes(kw)
      ? { id: 'keyword_in_meta', category: 'seo', status: 'good', message: 'Focus keyword appears in the meta description.' }
      : { id: 'keyword_in_meta', category: 'seo', status: 'bad', message: 'Focus keyword is missing from the meta description.' })

    const slugKw = slugifyKeyword(focusKeyword)
    if (slug) {
      seoChecks.push(slugKw && slug.toLowerCase().includes(slugKw)
        ? { id: 'keyword_in_slug', category: 'seo', status: 'good', message: 'Focus keyword appears in the URL slug.' }
        : { id: 'keyword_in_slug', category: 'seo', status: 'ok', message: "Focus keyword isn't in the URL slug." })
    }

    const words = wordCount(content)
    const occurrences = countOccurrences(content, focusKeyword)
    const density = words ? (occurrences / words * 100) : 0
    if (words === 0) {
      seoChecks.push({ id: 'keyword_density', category: 'seo', status: 'bad', message: 'No content yet to check keyword usage in.' })
    } else if (occurrences === 0) {
      seoChecks.push({ id: 'keyword_density', category: 'seo', status: 'bad', message: "Focus keyword doesn't appear in the content at all." })
    } else if (density >= 0.5 && density <= 2.5) {
      seoChecks.push({ id: 'keyword_density', category: 'seo', status: 'good', message: `Keyword density is ${density.toFixed(1)}% — natural usage.` })
    } else if (density > 2.5) {
      seoChecks.push({ id: 'keyword_density', category: 'seo', status: 'bad', message: `Keyword density is ${density.toFixed(1)}% — this reads as keyword stuffing.` })
    } else {
      seoChecks.push({ id: 'keyword_density', category: 'seo', status: 'ok', message: `Keyword density is ${density.toFixed(1)}% — a little low, aim for 0.5-2.5%.` })
    }

    const firstChunk = content.slice(0, Math.max(150, Math.floor(content.length / 10)))
    if (words > 0) {
      seoChecks.push(firstChunk.toLowerCase().includes(kw)
        ? { id: 'keyword_in_intro', category: 'seo', status: 'good', message: 'Focus keyword appears early in the content.' }
        : { id: 'keyword_in_intro', category: 'seo', status: 'ok', message: "Focus keyword doesn't appear in the opening lines." })
    }
  }

  // ── Content length ──────────────────────────────────────────────────────
  const words = wordCount(content)
  if (words >= 300) {
    seoChecks.push({ id: 'content_length', category: 'seo', status: 'good', message: `Content is ${words} words.` })
  } else if (words >= 200) {
    seoChecks.push({ id: 'content_length', category: 'seo', status: 'ok', message: `Content is ${words} words — 300+ is a stronger target.` })
  } else {
    seoChecks.push({ id: 'content_length', category: 'seo', status: 'bad', message: `Content is only ${words} words — likely too thin to rank.` })
  }

  // ── Readability ─────────────────────────────────────────────────────────
  const sents = sentences(content)
  if (sents.length) {
    const avgLen = words / sents.length
    if (avgLen <= 20) {
      readabilityChecks.push({ id: 'sentence_length', category: 'readability', status: 'good', message: `Average sentence length is ${avgLen.toFixed(0)} words.` })
    } else if (avgLen <= 25) {
      readabilityChecks.push({ id: 'sentence_length', category: 'readability', status: 'ok', message: `Average sentence length is ${avgLen.toFixed(0)} words — a bit long.` })
    } else {
      readabilityChecks.push({ id: 'sentence_length', category: 'readability', status: 'bad', message: `Average sentence length is ${avgLen.toFixed(0)} words — hard to follow.` })
    }

    const ease = fleschReadingEase(content)
    if (ease >= 60) {
      readabilityChecks.push({ id: 'flesch_reading_ease', category: 'readability', status: 'good', message: `Reading ease score is ${ease.toFixed(0)} — easy to read.` })
    } else if (ease >= 30) {
      readabilityChecks.push({ id: 'flesch_reading_ease', category: 'readability', status: 'ok', message: `Reading ease score is ${ease.toFixed(0)} — fairly difficult.` })
    } else {
      readabilityChecks.push({ id: 'flesch_reading_ease', category: 'readability', status: 'bad', message: `Reading ease score is ${ease.toFixed(0)} — hard to read.` })
    }
  } else {
    readabilityChecks.push({ id: 'sentence_length', category: 'readability', status: 'bad', message: 'No content yet to analyze.' })
  }

  const score = (checks) => {
    const scorable = checks.filter(c => c.id !== 'focus_keyword')
    if (!scorable.length) return 0
    return Math.round(scorable.reduce((sum, c) => sum + SCORE_WEIGHT[c.status], 0) / scorable.length)
  }

  const seoScore = score(seoChecks)
  const readabilityScore = score(readabilityChecks)

  return {
    seoScore,
    readabilityScore,
    seoRating: ratingForScore(seoScore),
    readabilityRating: ratingForScore(readabilityScore),
    checks: [...seoChecks, ...readabilityChecks],
  }
}
