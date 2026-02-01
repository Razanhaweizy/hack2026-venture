import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSubmissions, getEdges } from '../lib/storage'
import { NODE_TYPES, NODE_TYPE_LABELS } from '../constants/nodeTypes'

const CHALLENGE_TYPES = {
  STRESS_TEST: 'stress_test',
  VALIDATION: 'validation',
  RESEARCH: 'research',
  REFLECTION: 'reflection',
  CONNECTION: 'connection',
}

const CHALLENGE_TYPE_LABELS = {
  [CHALLENGE_TYPES.STRESS_TEST]: 'Stress Test',
  [CHALLENGE_TYPES.VALIDATION]: 'Validation',
  [CHALLENGE_TYPES.RESEARCH]: 'Research',
  [CHALLENGE_TYPES.REFLECTION]: 'Reflection',
  [CHALLENGE_TYPES.CONNECTION]: 'Connection',
}

function useChallenges() {
  const [submissions, setSubmissions] = useState([])
  const [edges, setEdges] = useState([])

  useEffect(() => {
    setSubmissions(getSubmissions())
    setEdges(getEdges())
  }, [])

  const nodeIds = new Set(submissions.map((s) => s.id))
  const edgesFrom = new Map()
  const edgesTo = new Map()
  for (const e of edges) {
    if (!edgesFrom.has(e.fromId)) edgesFrom.set(e.fromId, [])
    edgesFrom.get(e.fromId).push(e)
    if (!edgesTo.has(e.toId)) edgesTo.set(e.toId, [])
    edgesTo.get(e.toId).push(e)
  }

  const challenges = []

  const orphanNodes = submissions.filter((s) => {
    const out = (edgesFrom.get(s.id) || []).length
    const in_ = (edgesTo.get(s.id) || []).length
    return out + in_ < 2
  })
  if (orphanNodes.length > 0) {
    challenges.push({
      id: 'orphans',
      type: CHALLENGE_TYPES.CONNECTION,
      title: 'Unconnected nodes',
      prompt: `You have ${orphanNodes.length} node(s) with fewer than 2 links. How does "${orphanNodes[0]?.startupName || 'one of them'}" relate to another node? Add a link from the graph (open a node and use "Link to another node").`,
      graphEffect: 'Creates explicit edges',
    })
  }

  const assumptionNodes = submissions.filter((s) => s.nodeType === NODE_TYPES.ASSUMPTION)
  if (assumptionNodes.length > 0) {
    const withEvidence = edges.filter((e) => e.type === 'validates').map((e) => e.toId)
    const unvalidated = assumptionNodes.filter((s) => !withEvidence.includes(s.id))
    if (unvalidated.length > 0) {
      challenges.push({
        id: 'evidence',
        type: CHALLENGE_TYPES.VALIDATION,
        title: 'Assumptions without evidence',
        prompt: `You have ${unvalidated.length} assumption(s) without validating evidence. Find 3 people in your target segment and ask about the problem. Add an Evidence node and link it with "Validates" to the assumption.`,
        graphEffect: 'Creates Evidence nodes',
      })
    }
  }

  if (submissions.length >= 2 && edges.length === 0) {
    challenges.push({
      id: 'first-link',
      type: CHALLENGE_TYPES.CONNECTION,
      title: 'Connect your ideas',
      prompt: 'You have multiple nodes but no explicit links. Open a node, then use "Link to another node" to add a relationship (e.g. Depends on, Serves, Validates).',
      graphEffect: 'Creates explicit edges',
    })
  }

  challenges.push({
    id: 'reflection',
    type: CHALLENGE_TYPES.REFLECTION,
    title: 'Reflect on gaps',
    prompt: 'Review your graph. Which node type do you have the fewest of? Add a node of that type from the form (choose the node type dropdown).',
    graphEffect: 'Surfaces gaps',
  })

  challenges.push({
    id: 'stress',
    type: CHALLENGE_TYPES.STRESS_TEST,
    title: 'Stress test',
    prompt: 'Your biggest competitor just raised $50M. What is your response? Add an Assumption or Solution node that captures your response.',
    graphEffect: 'Creates Assumption nodes, exposes dependencies',
  })

  return { challenges, submissions }
}

export default function ChallengesPage() {
  const { challenges, submissions } = useChallenges()

  return (
    <div className="challenges-page">
      <header className="challenges-header">
        <Link to="/graph" className="back">Back to graph</Link>
        <Link to="/" className="add-node">Add startup</Link>
      </header>

      <main className="challenges-main">
        <h1>Challenges</h1>
        <p className="challenges-intro">
          Challenges help you validate or stress-test your idea. Each challenge is suggested from your graph structure. Completing them adds nodes or edges to your graph.
        </p>

        {submissions.length === 0 ? (
          <div className="challenges-empty">
            <p>Add at least one node from the form to see challenges.</p>
            <Link to="/" className="add-node-cta">Add your first node</Link>
          </div>
        ) : (
          <ul className="challenges-list" role="list">
            {challenges.map((c) => (
              <li key={c.id} className="challenge-card">
                <span className="challenge-type">{CHALLENGE_TYPE_LABELS[c.type]}</span>
                <h2 className="challenge-title">{c.title}</h2>
                <p className="challenge-prompt">{c.prompt}</p>
                <p className="challenge-effect">Graph effect: {c.graphEffect}</p>
                <Link to="/graph" className="challenge-cta">Go to graph</Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
