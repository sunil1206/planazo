"""SEO module — on-page content analysis (the Yoast/RankMath "traffic light"
checklist: SEO analysis + readability analysis against a focus keyword).

Pure functions, no DB access — this is text analysis only, so it's exposed
both here (POST /api/seo/analyze, see app/seo/router.py) for API consumers
and testing, and reimplemented in plain JS at
frontend/src/lib/seoAnalysis.js for instant, no-network-round-trip feedback
while someone is actually typing in the editor. The two are intentionally
kept in lockstep (same thresholds, same check ids) — if you change a
threshold here, change it there too.

Thresholds chosen (documented so they're not "magic numbers"):
  - Title: 40-60 characters is Google's typical no-truncation window.
  - Meta description: 120-156 characters, same reasoning.
  - Keyword density: 0.5%-2.5% is the commonly cited "natural, not stuffed"
    range (Yoast uses a similar band).
  - Content length: 300+ words is Yoast's own "cornerstone content" floor;
    below 200 is flagged as too thin to rank for anything.
  - Flesch Reading Ease: >=60 easy (good), 30-59 fairly hard (ok), <30 hard (bad).
"""
from __future__ import annotations
import re
from typing import List

from app.seo.schemas import SeoCheck, SeoAnalysisResult

_SCORE_WEIGHT = {"good": 100, "ok": 55, "bad": 0}


def _rating_for_score(score: int) -> str:
    if score >= 80:
        return "good"
    if score >= 50:
        return "ok"
    return "bad"


def _word_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9']+", text or ""))


def _sentences(text: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+", (text or "").strip())
    return [p for p in parts if p.strip()]


def _count_occurrences(haystack: str, needle: str) -> int:
    if not needle:
        return 0
    return len(re.findall(re.escape(needle.lower()), (haystack or "").lower()))


def _syllables_in_word(word: str) -> int:
    word = word.lower().strip(".,!?;:'\"")
    if not word:
        return 0
    word = re.sub(r"e$", "", word)  # silent trailing e
    groups = re.findall(r"[aeiouy]+", word)
    return max(1, len(groups))


def flesch_reading_ease(text: str) -> float:
    words = re.findall(r"[A-Za-z']+", text or "")
    sentences = _sentences(text)
    if not words or not sentences:
        return 0.0
    syllables = sum(_syllables_in_word(w) for w in words)
    words_per_sentence = len(words) / len(sentences)
    syllables_per_word = syllables / len(words)
    score = 206.835 - (1.015 * words_per_sentence) - (84.6 * syllables_per_word)
    return max(0.0, min(100.0, score))


def _slugify_keyword(keyword: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", keyword.lower()).strip("-")


def analyze_seo(
    *,
    title: str = "",
    meta_description: str = "",
    slug: str = "",
    content: str = "",
    focus_keyword: str = "",
) -> SeoAnalysisResult:
    title = title or ""
    meta_description = meta_description or ""
    slug = slug or ""
    content = content or ""
    focus_keyword = (focus_keyword or "").strip()

    seo_checks: List[SeoCheck] = []
    readability_checks: List[SeoCheck] = []

    # ── Title ───────────────────────────────────────────────────────────────
    tlen = len(title)
    if tlen == 0:
        seo_checks.append(SeoCheck(id="title_length", category="seo", status="bad",
                                    message="No title set yet."))
    elif 40 <= tlen <= 60:
        seo_checks.append(SeoCheck(id="title_length", category="seo", status="good",
                                    message=f"Title is {tlen} characters — a good length for Google's results."))
    elif 20 <= tlen <= 70:
        seo_checks.append(SeoCheck(id="title_length", category="seo", status="ok",
                                    message=f"Title is {tlen} characters — aim for 40-60."))
    else:
        seo_checks.append(SeoCheck(id="title_length", category="seo", status="bad",
                                    message=f"Title is {tlen} characters — {'too short' if tlen < 20 else 'likely to be truncated'} in search results."))

    # ── Meta description ───────────────────────────────────────────────────
    dlen = len(meta_description)
    if dlen == 0:
        seo_checks.append(SeoCheck(id="meta_length", category="seo", status="bad",
                                    message="No meta description set — Google will pick its own snippet."))
    elif 120 <= dlen <= 156:
        seo_checks.append(SeoCheck(id="meta_length", category="seo", status="good",
                                    message=f"Meta description is {dlen} characters — a good length."))
    else:
        seo_checks.append(SeoCheck(id="meta_length", category="seo", status="ok",
                                    message=f"Meta description is {dlen} characters — aim for 120-156."))

    # ── Focus keyword checks (skipped gracefully if none set) ─────────────
    if not focus_keyword:
        seo_checks.append(SeoCheck(id="focus_keyword", category="seo", status="ok",
                                    message="Set a focus keyword to unlock the full checklist."))
    else:
        if focus_keyword.lower() in title.lower():
            seo_checks.append(SeoCheck(id="keyword_in_title", category="seo", status="good",
                                        message="Focus keyword appears in the title."))
        else:
            seo_checks.append(SeoCheck(id="keyword_in_title", category="seo", status="bad",
                                        message="Focus keyword is missing from the title."))

        if focus_keyword.lower() in meta_description.lower():
            seo_checks.append(SeoCheck(id="keyword_in_meta", category="seo", status="good",
                                        message="Focus keyword appears in the meta description."))
        else:
            seo_checks.append(SeoCheck(id="keyword_in_meta", category="seo", status="bad",
                                        message="Focus keyword is missing from the meta description."))

        slug_kw = _slugify_keyword(focus_keyword)
        if slug and slug_kw and slug_kw in slug.lower():
            seo_checks.append(SeoCheck(id="keyword_in_slug", category="seo", status="good",
                                        message="Focus keyword appears in the URL slug."))
        elif slug:
            seo_checks.append(SeoCheck(id="keyword_in_slug", category="seo", status="ok",
                                        message="Focus keyword isn't in the URL slug."))

        words = _word_count(content)
        occurrences = _count_occurrences(content, focus_keyword)
        density = (occurrences / words * 100) if words else 0.0
        if words == 0:
            seo_checks.append(SeoCheck(id="keyword_density", category="seo", status="bad",
                                        message="No content yet to check keyword usage in."))
        elif occurrences == 0:
            seo_checks.append(SeoCheck(id="keyword_density", category="seo", status="bad",
                                        message="Focus keyword doesn't appear in the content at all."))
        elif 0.5 <= density <= 2.5:
            seo_checks.append(SeoCheck(id="keyword_density", category="seo", status="good",
                                        message=f"Keyword density is {density:.1f}% — natural usage."))
        elif density > 2.5:
            seo_checks.append(SeoCheck(id="keyword_density", category="seo", status="bad",
                                        message=f"Keyword density is {density:.1f}% — this reads as keyword stuffing."))
        else:
            seo_checks.append(SeoCheck(id="keyword_density", category="seo", status="ok",
                                        message=f"Keyword density is {density:.1f}% — a little low, aim for 0.5-2.5%."))

        first_chunk = content[: max(150, len(content) // 10)]
        if words > 0 and focus_keyword.lower() in first_chunk.lower():
            seo_checks.append(SeoCheck(id="keyword_in_intro", category="seo", status="good",
                                        message="Focus keyword appears early in the content."))
        elif words > 0:
            seo_checks.append(SeoCheck(id="keyword_in_intro", category="seo", status="ok",
                                        message="Focus keyword doesn't appear in the opening lines."))

    # ── Content length ──────────────────────────────────────────────────────
    words = _word_count(content)
    if words >= 300:
        seo_checks.append(SeoCheck(id="content_length", category="seo", status="good",
                                    message=f"Content is {words} words."))
    elif words >= 200:
        seo_checks.append(SeoCheck(id="content_length", category="seo", status="ok",
                                    message=f"Content is {words} words — 300+ is a stronger target."))
    else:
        seo_checks.append(SeoCheck(id="content_length", category="seo", status="bad",
                                    message=f"Content is only {words} words — likely too thin to rank."))

    # ── Readability ─────────────────────────────────────────────────────────
    sentences = _sentences(content)
    if sentences:
        avg_len = words / len(sentences)
        if avg_len <= 20:
            readability_checks.append(SeoCheck(id="sentence_length", category="readability", status="good",
                                                message=f"Average sentence length is {avg_len:.0f} words."))
        elif avg_len <= 25:
            readability_checks.append(SeoCheck(id="sentence_length", category="readability", status="ok",
                                                message=f"Average sentence length is {avg_len:.0f} words — a bit long."))
        else:
            readability_checks.append(SeoCheck(id="sentence_length", category="readability", status="bad",
                                                message=f"Average sentence length is {avg_len:.0f} words — hard to follow."))

        ease = flesch_reading_ease(content)
        if ease >= 60:
            readability_checks.append(SeoCheck(id="flesch_reading_ease", category="readability", status="good",
                                                message=f"Reading ease score is {ease:.0f} — easy to read."))
        elif ease >= 30:
            readability_checks.append(SeoCheck(id="flesch_reading_ease", category="readability", status="ok",
                                                message=f"Reading ease score is {ease:.0f} — fairly difficult."))
        else:
            readability_checks.append(SeoCheck(id="flesch_reading_ease", category="readability", status="bad",
                                                message=f"Reading ease score is {ease:.0f} — hard to read."))
    else:
        readability_checks.append(SeoCheck(id="sentence_length", category="readability", status="bad",
                                            message="No content yet to analyze."))

    def _score(checks: List[SeoCheck]) -> int:
        scorable = [c for c in checks if c.id != "focus_keyword"]
        if not scorable:
            return 0
        return round(sum(_SCORE_WEIGHT[c.status] for c in scorable) / len(scorable))

    seo_score = _score(seo_checks)
    readability_score = _score(readability_checks)

    return SeoAnalysisResult(
        seo_score=seo_score,
        readability_score=readability_score,
        seo_rating=_rating_for_score(seo_score),
        readability_rating=_rating_for_score(readability_score),
        checks=seo_checks + readability_checks,
    )
