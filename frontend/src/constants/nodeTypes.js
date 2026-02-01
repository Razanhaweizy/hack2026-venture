export const NODE_TYPES = {
  PROBLEM: 'problem',
  ASSUMPTION: 'assumption',
  EVIDENCE: 'evidence',
  SEGMENT: 'segment',
  SOLUTION: 'solution',
  COMPETITOR: 'competitor',
  RESOURCE: 'resource',
  MILESTONE: 'milestone',
}

export const NODE_TYPE_LABELS = {
  [NODE_TYPES.PROBLEM]: 'Problem',
  [NODE_TYPES.ASSUMPTION]: 'Assumption',
  [NODE_TYPES.EVIDENCE]: 'Evidence',
  [NODE_TYPES.SEGMENT]: 'Segment',
  [NODE_TYPES.SOLUTION]: 'Solution',
  [NODE_TYPES.COMPETITOR]: 'Competitor',
  [NODE_TYPES.RESOURCE]: 'Resource',
  [NODE_TYPES.MILESTONE]: 'Milestone',
}

export const EDGE_TYPES = {
  VALIDATES: 'validates',
  CONTRADICTS: 'contradicts',
  DEPENDS_ON: 'depends_on',
  SERVES: 'serves',
  COMPETES_WITH: 'competes_with',
  REQUIRES: 'requires',
}

export const EDGE_TYPE_LABELS = {
  [EDGE_TYPES.VALIDATES]: 'Validates',
  [EDGE_TYPES.CONTRADICTS]: 'Contradicts',
  [EDGE_TYPES.DEPENDS_ON]: 'Depends on',
  [EDGE_TYPES.SERVES]: 'Serves',
  [EDGE_TYPES.COMPETES_WITH]: 'Competes with',
  [EDGE_TYPES.REQUIRES]: 'Requires',
}

export const VIEW_FILTERS = {
  ALL: 'all',
  PROBLEM_SPACE: 'problem_space',
  SOLUTION_SPACE: 'solution_space',
  RISK_MAP: 'risk_map',
}

export const VIEW_FILTER_LABELS = {
  [VIEW_FILTERS.ALL]: 'All nodes',
  [VIEW_FILTERS.PROBLEM_SPACE]: 'Problem Space',
  [VIEW_FILTERS.SOLUTION_SPACE]: 'Solution Space',
  [VIEW_FILTERS.RISK_MAP]: 'Risk Map',
}

const PROBLEM_SPACE_TYPES = [NODE_TYPES.PROBLEM, NODE_TYPES.SEGMENT, NODE_TYPES.EVIDENCE]
const SOLUTION_SPACE_TYPES = [NODE_TYPES.SOLUTION, NODE_TYPES.RESOURCE]
const RISK_MAP_TYPES = [NODE_TYPES.ASSUMPTION, NODE_TYPES.COMPETITOR]

export function getNodeTypesForView(view) {
  switch (view) {
    case VIEW_FILTERS.PROBLEM_SPACE:
      return PROBLEM_SPACE_TYPES
    case VIEW_FILTERS.SOLUTION_SPACE:
      return SOLUTION_SPACE_TYPES
    case VIEW_FILTERS.RISK_MAP:
      return [...new Set([NODE_TYPES.ASSUMPTION, NODE_TYPES.COMPETITOR])]
    default:
      return null
  }
}

export function nodeMatchesView(nodeType, view) {
  const types = getNodeTypesForView(view)
  if (!types) return true
  return types.includes(nodeType)
}
