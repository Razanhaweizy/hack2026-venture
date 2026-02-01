import { useState } from 'react'
import { PMF_PATH_LABELS } from '../constants/pmfPaths'
import { NODE_TYPE_LABELS } from '../constants/nodeTypes'
import { EDGE_TYPES, EDGE_TYPE_LABELS } from '../constants/nodeTypes'
import { addEdge } from '../lib/storage'

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: 'medium',
    })
  } catch {
    return iso
  }
}

export default function NodeDetail({ submission, allSubmissions = [], onClose, onEdgeAdded }) {
  const [linkTargetId, setLinkTargetId] = useState('')
  const [linkType, setLinkType] = useState(EDGE_TYPES.DEPENDS_ON)

  if (!submission) return null

  const pathLabel = PMF_PATH_LABELS[submission.pmfPath] ?? submission.pmfPath
  const nodeTypeLabel = NODE_TYPE_LABELS[submission.nodeType] ?? submission.nodeType
  const otherNodes = allSubmissions.filter((s) => s.id !== submission.id)

  const handleAddEdge = (e) => {
    e.preventDefault()
    if (!linkTargetId) return
    addEdge(submission.id, linkTargetId, linkType)
    setLinkTargetId('')
    onEdgeAdded?.()
  }

  return (
    <div className="node-detail-overlay" role="dialog" aria-modal="true" aria-labelledby="node-detail-title">
      <div className="node-detail-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="node-detail-panel">
        <div className="node-detail-header">
          <h2 id="node-detail-title">{submission.startupName || 'Untitled'}</h2>
          <button
            type="button"
            className="node-detail-close"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <div className="node-detail-body">
          <dl className="node-detail-dl">
            <dt>Node type</dt>
            <dd>{nodeTypeLabel}</dd>

            <dt>Submitted</dt>
            <dd>{formatDate(submission.createdAt)}</dd>

            <dt>PMF path</dt>
            <dd>{pathLabel}</dd>

            <dt>Problem you are solving</dt>
            <dd>{submission.problem || '—'}</dd>

            <dt>How customers relate to this problem</dt>
            <dd>{submission.customerRelation || '—'}</dd>

            <dt>Differentiated approach</dt>
            <dd>{submission.differentiatedApproach || '—'}</dd>

            <dt>Operating priority</dt>
            <dd>{submission.operatingPriority || '—'}</dd>
          </dl>

          {otherNodes.length > 0 && (
            <form className="node-detail-link-form" onSubmit={handleAddEdge}>
              <h3 className="node-detail-link-title">Link to another node</h3>
              <div className="node-detail-link-fields">
                <label htmlFor="link-target">Target node</label>
                <select
                  id="link-target"
                  value={linkTargetId}
                  onChange={(e) => setLinkTargetId(e.target.value)}
                >
                  <option value="">Select node</option>
                  {otherNodes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.startupName || 'Untitled'} ({NODE_TYPE_LABELS[s.nodeType] ?? s.nodeType})
                    </option>
                  ))}
                </select>
                <label htmlFor="link-type">Relationship</label>
                <select
                  id="link-type"
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                >
                  {Object.values(EDGE_TYPES).map((t) => (
                    <option key={t} value={t}>{EDGE_TYPE_LABELS[t]}</option>
                  ))}
                </select>
                <button type="submit" className="node-detail-link-btn" disabled={!linkTargetId}>
                  Add link
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
