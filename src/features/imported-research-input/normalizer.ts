import type { ResearchBrief, IdeaDraft } from '../../shared/types'

// ─── Heuristic import normalizer ──────────────────────────────────────────────
//
// Converts free-form pasted research text into a normalized ResearchBrief.
//
// Strategy:
//   1. Try labeled-section extraction (## Heading, # Heading, **Heading:**, Heading:)
//   2. For each field not found via labels, fall back to keyword-based paragraph matching
//   3. Extract list items from matched sections
//   4. Fill remaining blanks with derived fallbacks or empty defaults
//
// This is deterministic text processing — no AI, no magic.

// ─── Section heading aliases ──────────────────────────────────────────────────

const SECTION_ALIASES: Record<keyof SectionMap, string[]> = {
  problem: ['problem', 'the problem', 'issue', 'pain point', 'pain points', 'challenge', 'why'],
  targetUsers: [
    'target user', 'target users', 'target audience', 'audience', 'users', 'customers',
    'who', 'who is this for', 'customer', 'persona', 'user profile',
  ],
  valueHypothesis: [
    'value', 'value proposition', 'value hypothesis', 'solution', 'the solution',
    'benefit', 'benefits', 'why this works', 'differentiation',
  ],
  competitorNotes: [
    'competitor', 'competitors', 'competition', 'market', 'alternatives',
    'landscape', 'comparison', 'vs', 'existing solutions', 'existing tools',
  ],
  risks: [
    'risk', 'risks', 'challenges', 'concerns', 'blockers', 'downsides', 'weaknesses',
    'potential issues', 'watch out',
  ],
  opportunities: [
    'opportunity', 'opportunities', 'upside', 'potential', 'market opportunity',
    'market size', 'growth', 'tailwind', 'advantage',
  ],
  recommendedMVP: [
    'mvp', 'scope', 'recommended mvp', 'recommended scope', 'build', 'first version',
    'v1', 'phase 1', 'minimum viable', 'what to build', 'minimum feature',
  ],
  openQuestions: [
    'open question', 'open questions', 'questions', 'unknowns', 'unclear', 'tbd',
    'to be determined', 'needs research', 'investigate',
  ],
}

// ─── Internal section map ─────────────────────────────────────────────────────

type SectionMap = {
  problem: string
  targetUsers: string
  valueHypothesis: string
  competitorNotes: string
  risks: string
  opportunities: string
  recommendedMVP: string
  openQuestions: string
}

// ─── Utility: strip markdown formatting from a line ───────────────────────────

function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s*/, '')        // heading markers
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1')     // italic
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .replace(/^[-*•+]\s+/, '')         // leading bullets
    .trim()
}

// ─── Utility: check if a line is a section heading ───────────────────────────

function isHeading(line: string): boolean {
  // ## Heading, # Heading
  if (/^#{1,4}\s/.test(line)) return true
  // **Heading:** or **Heading**
  if (/^\*\*[^*]+(\*\*:?|:\*\*)$/.test(line.trim())) return true
  // HEADING: (all caps + colon at line start, at least 3 chars)
  if (/^[A-Z][A-Z\s]{2,}:\s*$/.test(line.trim())) return true
  // Heading: (title case + colon at line end, short line = likely label)
  if (/^[A-Z][a-zA-Z\s]{2,30}:\s*$/.test(line.trim())) return true
  return false
}

// ─── Utility: normalize a heading to plain lowercase label ───────────────────

function normalizeHeading(line: string): string {
  return stripMarkdown(line)
    .replace(/:$/, '')
    .trim()
    .toLowerCase()
}

// ─── Utility: match a heading text to a section alias ────────────────────────

function matchHeadingToField(heading: string): keyof SectionMap | null {
  for (const [field, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.some((alias) => heading.includes(alias) || alias.includes(heading))) {
      return field as keyof SectionMap
    }
  }
  return null
}

// ─── Utility: extract list items from a text block ───────────────────────────

function extractListItems(text: string): string[] {
  const lines = text.split('\n')
  const bulletLines = lines.filter((l) =>
    /^[-*•+]\s+.{3,}/.test(l.trim()) || /^\d+[.)]\s+.{3,}/.test(l.trim())
  )

  if (bulletLines.length > 0) {
    return bulletLines
      .map((l) => l.trim().replace(/^[-*•+\d.)\s]+/, '').trim())
      .filter(Boolean)
  }

  // No bullets — fall back to sentence splitting
  return text
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10)
    .slice(0, 6)
}

// ─── Step 1: labeled section extraction ──────────────────────────────────────

function extractLabeledSections(text: string): Partial<SectionMap> {
  const lines = text.split('\n')
  const sections: Partial<SectionMap> = {}

  let currentField: keyof SectionMap | null = null
  let buffer: string[] = []

  function flushBuffer() {
    if (currentField && buffer.length > 0) {
      const content = buffer.join('\n').trim()
      if (content) sections[currentField] = content
    }
  }

  for (const line of lines) {
    if (isHeading(line)) {
      flushBuffer()
      buffer = []
      currentField = matchHeadingToField(normalizeHeading(line))
    } else if (currentField) {
      buffer.push(line)
    }
  }
  flushBuffer()

  return sections
}

// ─── Step 2: keyword-based paragraph fallback ────────────────────────────────

const PARAGRAPH_KEYWORDS: Record<keyof SectionMap, string[]> = {
  problem: ['problem', 'pain', 'struggle', 'difficult', 'frustrating', 'broken', 'fail', 'challenge'],
  targetUsers: ['user', 'customer', 'developer', 'founder', 'team', 'people', 'audience', 'solo', 'small'],
  valueHypothesis: ['value', 'benefit', 'save', 'reduce', 'improve', 'faster', 'better', 'solution', 'enables'],
  competitorNotes: ['linear', 'notion', 'jira', 'trello', 'asana', 'slack', 'competitor', 'alternative', 'existing', 'market'],
  risks: ['risk', 'concern', 'blocker', 'difficult', 'hard', 'complex', 'unknown', 'uncertain', 'might not'],
  opportunities: ['opportunity', 'market', 'potential', 'grow', 'scale', 'demand', 'trend', 'niche', 'gap'],
  recommendedMVP: ['mvp', 'minimum', 'v1', 'first', 'launch', 'scope', 'build', 'phase', 'priority', 'start with'],
  openQuestions: ['?', 'unclear', 'unknown', 'tbd', 'need to', 'how do we', 'should we', 'what about'],
}

function scoreParagraphForField(para: string, field: keyof SectionMap): number {
  const lower = para.toLowerCase()
  return PARAGRAPH_KEYWORDS[field].filter((kw) => lower.includes(kw)).length
}

function extractByKeywords(text: string, alreadyFound: Set<keyof SectionMap>): Partial<SectionMap> {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)

  const result: Partial<SectionMap> = {}
  const fields = (Object.keys(SECTION_ALIASES) as (keyof SectionMap)[]).filter(
    (f) => !alreadyFound.has(f)
  )

  for (const field of fields) {
    let bestScore = 0
    let bestPara = ''

    for (const para of paragraphs) {
      const score = scoreParagraphForField(para, field)
      if (score > bestScore) {
        bestScore = score
        bestPara = para
      }
    }

    if (bestScore > 0 && bestPara) {
      result[field] = bestPara
    }
  }

  // If nothing matched for problem/value, use first two paragraphs as fallback
  if (!result.problem && !alreadyFound.has('problem') && paragraphs[0]) {
    result.problem = paragraphs[0]
  }
  if (!result.valueHypothesis && !alreadyFound.has('valueHypothesis') && paragraphs[1]) {
    result.valueHypothesis = paragraphs[1]
  }

  return result
}

// ─── Main normalizer function ─────────────────────────────────────────────────

export interface NormalizationResult {
  brief: ResearchBrief
  extractedSectionCount: number
  usedFallback: boolean
  warnings: string[]
}

export function normalizeResearchText(
  raw: string,
  artifactId: string,
  artifactTitle: string,
  ideaDraft?: Pick<IdeaDraft, 'rawIdea' | 'targetUser' | 'problem'> | null
): NormalizationResult {
  const warnings: string[] = []

  // Step 1: labeled sections
  const labeled = extractLabeledSections(raw)
  const foundFields = new Set(Object.keys(labeled) as (keyof SectionMap)[])

  // Step 2: keyword fallback for anything not yet found
  const fallback = extractByKeywords(raw, foundFields)
  const usedFallback = Object.keys(fallback).length > 0

  const merged: Partial<SectionMap> = { ...fallback, ...labeled }

  // Track how many distinct sections we actually extracted
  const extractedSectionCount = Object.values(merged).filter(Boolean).length

  // Warn if we couldn't extract much
  if (extractedSectionCount < 2) {
    warnings.push(
      'Very little structured content was found in the pasted text. The brief may need manual editing.'
    )
  }
  if (extractedSectionCount < 4) {
    warnings.push(
      'Some sections could not be extracted. You can edit the brief below to fill in missing details.'
    )
  }

  // ─── Build the normalized brief ───────────────────────────────────────────

  // Scalar fields: use extracted text or fallback to idea context or placeholder
  const problemSummary =
    merged.problem?.trim() ||
    ideaDraft?.problem?.trim() ||
    ideaDraft?.rawIdea?.trim() ||
    'No problem summary found — please edit this section.'

  const valueHypothesis =
    merged.valueHypothesis?.trim() ||
    'No value proposition found — please edit this section.'

  const competitorNotes =
    merged.competitorNotes?.trim() ||
    'No competitor notes found in the imported research.'

  const recommendedMVP =
    merged.recommendedMVP?.trim() ||
    'No MVP scope found — please edit this section.'

  // Array fields: extract list items from matched sections
  const targetUsers =
    merged.targetUsers
      ? extractListItems(merged.targetUsers)
      : ideaDraft?.targetUser
      ? [ideaDraft.targetUser]
      : ['Not specified — please edit this section.']

  const risks = merged.risks
    ? extractListItems(merged.risks)
    : []

  const opportunities = merged.opportunities
    ? extractListItems(merged.opportunities)
    : []

  const openQuestions = merged.openQuestions
    ? extractListItems(merged.openQuestions)
    : []

  const brief: ResearchBrief = {
    problemSummary,
    targetUsers,
    valueHypothesis,
    competitorNotes,
    risks,
    opportunities,
    recommendedMVP,
    openQuestions,
    sourcesNote: `Normalized from imported artifact: "${artifactTitle}". ${extractedSectionCount} section(s) extracted from source text.`,
    sourceIds: [artifactId],
    briefSource: 'imported',
  }

  return { brief, extractedSectionCount, usedFallback, warnings }
}
