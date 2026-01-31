import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getSubmissions, getEdges } from '../lib/storage'
import { getSimilarityEdges } from '../lib/similarity'
import { computeRandomLayout, NODE_SIZE } from '../lib/randomLayout'
import { PMF_PATH_LABELS } from '../constants/pmfPaths'
import { VIEW_FILTERS, VIEW_FILTER_LABELS, NODE_TYPE_LABELS, nodeMatchesView } from '../constants/nodeTypes'
import NodeDetail from './NodeDetail'

const GRAPH_HEIGHT = 420
const NODE_RADIUS = NODE_SIZE / 2
const PADDING = NODE_RADIUS + 20
const MAX_SPEED = 0.8
const VELOCITY_SMOOTHING = 0.98
const DRIFT_STRENGTH = 0.04
const MIN_NODE_DISTANCE = NODE_SIZE + 16
const NEIGHBOR_RADIUS = 100
const STABLE_DRIFT_SCALE = 0.25
const UNSTABLE_DRIFT_SCALE = 1
const REPEL_STRENGTH = 0.12
const SEPARATION_ITERATIONS = 4

function clampPosition(x, y, width, height) {
  return {
    x: Math.max(PADDING, Math.min(width - PADDING, x)),
    y: Math.max(PADDING, Math.min(height - PADDING, y)),
  }
}

function clampSpeed(vx, vy, maxSpeed) {
  const mag = Math.hypot(vx, vy) || 1
  if (mag <= maxSpeed) return { vx, vy }
  return {
    vx: (vx / mag) * maxSpeed,
    vy: (vy / mag) * maxSpeed,
  }
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1)
}

function countNeighbors(nodeId, positions, submissions) {
  const pos = positions[nodeId]
  if (!pos) return 0
  let count = 0
  for (const s of submissions) {
    if (s.id === nodeId) continue
    const other = positions[s.id]
    if (!other) continue
    if (distance(pos.x, pos.y, other.x, other.y) <= NEIGHBOR_RADIUS) count += 1
  }
  return count
}

function neighborCentroid(nodeId, positions, submissions) {
  const pos = positions[nodeId]
  if (!pos) return null
  let cx = 0
  let cy = 0
  let n = 0
  for (const s of submissions) {
    if (s.id === nodeId) continue
    const other = positions[s.id]
    if (!other) continue
    if (distance(pos.x, pos.y, other.x, other.y) <= NEIGHBOR_RADIUS) {
      cx += other.x
      cy += other.y
      n += 1
    }
  }
  if (n === 0) return null
  return { x: cx / n, y: cy / n }
}

function initialVelocity() {
  const angle = Math.random() * 2 * Math.PI
  const speed = MAX_SPEED * (0.3 + Math.random() * 0.7)
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  }
}

function separateOverlaps(next, ids, width, height) {
  for (let iter = 0; iter < SEPARATION_ITERATIONS; iter++) {
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = next[ids[i]]
        const b = next[ids[j]]
        if (!a || !b) continue
        const dist = distance(a.x, a.y, b.x, b.y)
        if (dist < MIN_NODE_DISTANCE && dist > 0.001) {
          const overlap = MIN_NODE_DISTANCE - dist
          const ux = (a.x - b.x) / dist
          const uy = (a.y - b.y) / dist
          const half = overlap / 2
          next[ids[i]] = { x: a.x + half * ux, y: a.y + half * uy }
          next[ids[j]] = { x: b.x - half * ux, y: b.y - half * uy }
        }
      }
    }
  }
  for (const id of ids) {
    const p = next[id]
    if (p) next[id] = clampPosition(p.x, p.y, width, height)
  }
}

export default function GraphsPage() {
  const [submissions, setSubmissions] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [nodePositions, setNodePositions] = useState({})
  const [containerSize, setContainerSize] = useState({ width: 0, height: GRAPH_HEIGHT })
  const [viewFilter, setViewFilter] = useState(VIEW_FILTERS.ALL)
  const [explicitEdges, setExplicitEdges] = useState([])
  const containerRef = useRef(null)
  const velocitiesRef = useRef({})

  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')

  useEffect(() => {
    setSubmissions(getSubmissions())
    setExplicitEdges(getEdges())
  }, [])

  useEffect(() => {
    if (highlightId) setSelectedId(highlightId)
  }, [highlightId])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || submissions.length === 0) return
    const rect = container.getBoundingClientRect()
    const width = rect.width
    const height = GRAPH_HEIGHT
    if (width <= 0) return
    const ids = submissions.map((s) => s.id)
    const layout = computeRandomLayout(ids, width, height)
    const vel = velocitiesRef.current
    for (const id of ids) {
      if (!vel[id]) vel[id] = initialVelocity()
    }
    setNodePositions(layout)
    setContainerSize({ width, height })
  }, [submissions])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect()
      const width = rect.width
      if (width <= 0) return
      setContainerSize((prev) => ({ ...prev, width }))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (submissions.length === 0 || containerSize.width <= 0) return
    const width = containerSize.width
    const height = containerSize.height
    const vel = velocitiesRef.current

    let frameId = 0
    const tick = () => {
      setNodePositions((prev) => {
        const next = {}
        for (const s of submissions) {
          const p = prev[s.id]
          if (!p) continue
          let { vx, vy } = vel[s.id] || initialVelocity()
          vel[s.id] = { vx, vy }

          vx = vx * VELOCITY_SMOOTHING + (Math.random() - 0.5) * 2 * DRIFT_STRENGTH
          vy = vy * VELOCITY_SMOOTHING + (Math.random() - 0.5) * 2 * DRIFT_STRENGTH

          const neighbors = countNeighbors(s.id, prev, submissions)
          const stable = neighbors >= 2 && neighbors <= 3
          const scale = stable ? STABLE_DRIFT_SCALE : UNSTABLE_DRIFT_SCALE
          vx *= scale
          vy *= scale

          if (neighbors > 3) {
            const centroid = neighborCentroid(s.id, prev, submissions)
            if (centroid) {
              const ax = p.x - centroid.x
              const ay = p.y - centroid.y
              const mag = Math.hypot(ax, ay) || 1
              vx += (ax / mag) * REPEL_STRENGTH
              vy += (ay / mag) * REPEL_STRENGTH
            }
          }

          const { vx: vxClamped, vy: vyClamped } = clampSpeed(vx, vy, MAX_SPEED)
          vel[s.id] = { vx: vxClamped, vy: vyClamped }

          let nx = p.x + vxClamped
          let ny = p.y + vyClamped

          if (nx - NODE_RADIUS <= PADDING) {
            nx = PADDING + NODE_RADIUS
            vel[s.id].vx = Math.abs(vel[s.id].vx)
          }
          if (nx + NODE_RADIUS >= width - PADDING) {
            nx = width - PADDING - NODE_RADIUS
            vel[s.id].vx = -Math.abs(vel[s.id].vx)
          }
          if (ny - NODE_RADIUS <= PADDING) {
            ny = PADDING + NODE_RADIUS
            vel[s.id].vy = Math.abs(vel[s.id].vy)
          }
          if (ny + NODE_RADIUS >= height - PADDING) {
            ny = height - PADDING - NODE_RADIUS
            vel[s.id].vy = -Math.abs(vel[s.id].vy)
          }

          next[s.id] = clampPosition(nx, ny, width, height)
        }
        const ids = submissions.map((s) => s.id)
        separateOverlaps(next, ids, width, height)
        return next
      })
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [submissions, containerSize.width, containerSize.height])

  const filteredSubmissions = submissions.filter((s) => nodeMatchesView(s.nodeType, viewFilter))
  const similarityEdges = filteredSubmissions.length >= 2 ? getSimilarityEdges(filteredSubmissions) : []
  const selectedSubmission = submissions.find((s) => s.id === selectedId)

  const refreshExplicitEdges = () => setExplicitEdges(getEdges())

  return (
    <div className="graphs-page">
      <header className="graphs-header">
        <Link to="/" className="back">
          Back to form
        </Link>
        <div className="graphs-header-right">
          <label htmlFor="view-filter" className="graphs-view-label">View</label>
          <select
            id="view-filter"
            className="graphs-view-select"
            value={viewFilter}
            onChange={(e) => setViewFilter(e.target.value)}
          >
            {Object.values(VIEW_FILTERS).map((v) => (
              <option key={v} value={v}>{VIEW_FILTER_LABELS[v]}</option>
            ))}
          </select>
          <Link to="/challenges" className="graphs-challenges-link">Challenges</Link>
          <Link to="/" className="add-node">
            Add startup
          </Link>
        </div>
      </header>

      <main className="graphs-main">
        <h1>Ideograph – Your graph</h1>
        <p className="graphs-intro">
          Click a node to view your submitted PMF framework answers. Lines connect startups with similar descriptions (cosine similarity). Nodes drift like Conway's Game of Life: stable with 2–3 neighbors, more active otherwise.
        </p>

        {submissions.length === 0 ? (
          <div className="graphs-empty">
            <p>No nodes yet.</p>
            <Link to="/" className="add-node-cta">
              Add your first node
            </Link>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="graphs-empty">
            <p>No nodes in this view. Try another view or add nodes of the selected type.</p>
            <Link to="/" className="add-node-cta">Add node</Link>
          </div>
        ) : (
          <div
            className="node-graph-wrapper"
            ref={containerRef}
            style={{ height: GRAPH_HEIGHT }}
          >
            {containerSize.width > 0 && containerSize.height > 0 && (
              <>
                <svg
                  className="node-graph-edges"
                  width={containerSize.width}
                  height={containerSize.height}
                  aria-hidden="true"
                >
                  {similarityEdges.map((edge, idx) => {
                    const from = nodePositions[edge.fromId]
                    const to = nodePositions[edge.toId]
                    if (!from || !to) return null
                    const opacity = 0.3 + 0.5 * edge.similarity
                    const strokeWidth = 1 + 1.5 * edge.similarity
                    return (
                      <line
                        key={`sim-${edge.fromId}-${edge.toId}-${idx}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="#0d7377"
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                        strokeLinecap="round"
                      />
                    )
                  })}
                  {explicitEdges
                    .filter((e) => filteredSubmissions.some((s) => s.id === e.fromId) && filteredSubmissions.some((s) => s.id === e.toId))
                    .map((edge) => {
                      const from = nodePositions[edge.fromId]
                      const to = nodePositions[edge.toId]
                      if (!from || !to) return null
                      return (
                        <line
                          key={edge.id}
                          x1={from.x}
                          y1={from.y}
                          x2={to.x}
                          y2={to.y}
                          stroke="#1a1a2e"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                          opacity={0.8}
                          strokeLinecap="round"
                        />
                      )
                    })}
                </svg>
                <ul className="node-list node-list-absolute" role="list">
                {filteredSubmissions.map((s) => {
                  const pos = nodePositions[s.id]
                  if (!pos) return null
                  return (
                    <li
                      key={s.id}
                      className="node-list-item"
                      style={{ left: pos.x, top: pos.y }}
                    >
                      <button
                        type="button"
                        className={`node-card ${selectedId === s.id ? 'node-card-selected' : ''}`}
                        onClick={() => setSelectedId(s.id)}
                        aria-pressed={selectedId === s.id}
                        aria-expanded={selectedId === s.id}
                      >
                        <span className="node-card-name">{s.startupName || 'Untitled'}</span>
                        <span className="node-card-path">
                          {NODE_TYPE_LABELS[s.nodeType] ?? s.nodeType ?? '—'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              </>
            )}
          </div>
        )}
      </main>

      {selectedSubmission && (
        <NodeDetail
          submission={selectedSubmission}
          allSubmissions={submissions}
          onClose={() => setSelectedId(null)}
          onEdgeAdded={refreshExplicitEdges}
        />
      )}
    </div>
  )
}
