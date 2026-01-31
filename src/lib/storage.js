const STORAGE_KEY = 'pmf-submissions'
const EDGES_KEY = 'ideograph-edges'
const DEFAULT_NODE_TYPE = 'solution'

export function getSubmissions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return list.map((s) => ({ ...s, nodeType: s.nodeType || DEFAULT_NODE_TYPE }))
  } catch {
    return []
  }
}

export function saveSubmission(submission) {
  const list = getSubmissions()
  const withId = {
    ...submission,
    id: submission.id || crypto.randomUUID(),
    createdAt: submission.createdAt || new Date().toISOString(),
    nodeType: submission.nodeType || DEFAULT_NODE_TYPE,
  }
  const next = [...list.filter((s) => s.id !== withId.id), withId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return withId
}

export function getSubmissionById(id) {
  return getSubmissions().find((s) => s.id === id)
}

export function getEdges() {
  try {
    const raw = localStorage.getItem(EDGES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addEdge(fromId, toId, type) {
  const edges = getEdges()
  if (edges.some((e) => e.fromId === fromId && e.toId === toId && e.type === type)) return
  const next = [...edges, { fromId, toId, type, id: crypto.randomUUID() }]
  localStorage.setItem(EDGES_KEY, JSON.stringify(next))
}

export function removeEdge(edgeId) {
  const edges = getEdges().filter((e) => e.id !== edgeId)
  localStorage.setItem(EDGES_KEY, JSON.stringify(edges))
}
