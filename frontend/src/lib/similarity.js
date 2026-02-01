const WORD_REGEX = /[a-z0-9]+/gi

function tokenize(text) {
  if (!text || typeof text !== 'string') return []
  return text.toLowerCase().match(WORD_REGEX) ?? []
}

function toWordCounts(words) {
  const counts = Object.create(null)
  for (const w of words) {
    counts[w] = (counts[w] ?? 0) + 1
  }
  return counts
}

export function submissionToVector(submission) {
  const parts = [
    submission.startupName,
    submission.problem,
    submission.pmfPath,
    submission.customerRelation,
    submission.differentiatedApproach,
    submission.operatingPriority,
  ].filter(Boolean)
  const text = parts.join(' ')
  return toWordCounts(tokenize(text))
}

function getVocabulary(countsA, countsB) {
  const vocab = new Set([...Object.keys(countsA), ...Object.keys(countsB)])
  return Array.from(vocab)
}

function vectorFromCounts(counts, vocab) {
  return vocab.map((w) => counts[w] ?? 0)
}

function dot(a, b) {
  let sum = 0
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i]
  return sum
}

function norm(vec) {
  return Math.sqrt(vec.reduce((s, x) => s + x * x, 0))
}

export function cosineSimilarity(subA, subB) {
  const countsA = submissionToVector(subA)
  const countsB = submissionToVector(subB)
  const vocab = getVocabulary(countsA, countsB)
  if (vocab.length === 0) return 0
  const vecA = vectorFromCounts(countsA, vocab)
  const vecB = vectorFromCounts(countsB, vocab)
  const nA = norm(vecA)
  const nB = norm(vecB)
  if (nA === 0 || nB === 0) return 0
  return dot(vecA, vecB) / (nA * nB)
}

const SIMILARITY_THRESHOLD = 0.15

export function getSimilarityEdges(submissions) {
  const edges = []
  for (let i = 0; i < submissions.length; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const sim = cosineSimilarity(submissions[i], submissions[j])
      if (sim >= SIMILARITY_THRESHOLD) {
        edges.push({
          fromId: submissions[i].id,
          toId: submissions[j].id,
          similarity: sim,
        })
      }
    }
  }
  return edges
}
