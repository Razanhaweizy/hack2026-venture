import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { saveSubmission } from '../lib/storage'
import {
  PMF_PATHS,
  PMF_PATH_LABELS,
  PMF_PATH_DESCRIPTIONS,
} from '../constants/pmfPaths'
import { NODE_TYPES, NODE_TYPE_LABELS } from '../constants/nodeTypes'

const INITIAL_STATE = {
  startupName: '',
  problem: '',
  pmfPath: '',
  nodeType: NODE_TYPES.SOLUTION,
  customerRelation: '',
  differentiatedApproach: '',
  operatingPriority: '',
}

export default function PMFForm() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_STATE)
  const [touched, setTouched] = useState({})

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const submission = saveSubmission(form)
    setForm(INITIAL_STATE)
    navigate(`/graph?highlight=${submission.id}`, { state: { newId: submission.id } })
  }

  const pathOptions = Object.values(PMF_PATHS)

  return (
    <div className="pmf-form-wrapper">
      <nav className="pmf-form-nav">
        <Link to="/graph" className="pmf-view-nodes">View my nodes</Link>
      </nav>
      <div className="pmf-form-card">
        <header className="pmf-form-header">
          <h1>Ideograph – Add node</h1>
          <p className="pmf-form-intro">
            Based on the{' '}
            <a
              href="https://sequoiacap.com/article/pmf-framework/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Sequoia Arc Product-Market Fit Framework
            </a>
            . Describe your startup and how it fits one of three archetypes.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="pmf-form">
        <section className="pmf-form-section">
          <label htmlFor="startupName">Startup / product name</label>
          <input
            id="startupName"
            type="text"
            value={form.startupName}
            onChange={(e) => update('startupName', e.target.value)}
            placeholder="e.g. Acme SaaS"
            required
            aria-invalid={touched.startupName && !form.startupName}
          />
        </section>

        <section className="pmf-form-section">
          <label htmlFor="nodeType">Node type</label>
          <select
            id="nodeType"
            value={form.nodeType}
            onChange={(e) => update('nodeType', e.target.value)}
            aria-describedby="nodeType-desc"
          >
            {Object.values(NODE_TYPES).map((t) => (
              <option key={t} value={t}>{NODE_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <span id="nodeType-desc" className="pmf-field-desc">Ideograph node type for the graph</span>
        </section>

        <section className="pmf-form-section">
          <label htmlFor="problem">Problem you are solving</label>
          <textarea
            id="problem"
            value={form.problem}
            onChange={(e) => update('problem', e.target.value)}
            placeholder="Describe the pain point or opportunity your product addresses."
            rows={3}
            required
            aria-invalid={touched.problem && !form.problem}
          />
        </section>

        <section className="pmf-form-section">
          <fieldset>
            <legend>PMF path (how customers relate to this problem)</legend>
            {pathOptions.map((path) => (
              <label key={path} className="pmf-radio-label">
                <input
                  type="radio"
                  name="pmfPath"
                  value={path}
                  checked={form.pmfPath === path}
                  onChange={(e) => update('pmfPath', e.target.value)}
                  required
                />
                <span className="pmf-radio-title">{PMF_PATH_LABELS[path]}</span>
                <span className="pmf-radio-desc">{PMF_PATH_DESCRIPTIONS[path]}</span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="pmf-form-section">
          <label htmlFor="customerRelation">How do customers currently relate to this problem?</label>
          <textarea
            id="customerRelation"
            value={form.customerRelation}
            onChange={(e) => update('customerRelation', e.target.value)}
            placeholder="e.g. Actively comparing solutions / Resigned to living with it / Oblivious or think it's impossible"
            rows={2}
          />
        </section>

        <section className="pmf-form-section">
          <label htmlFor="differentiatedApproach">Your differentiated approach</label>
          <textarea
            id="differentiatedApproach"
            value={form.differentiatedApproach}
            onChange={(e) => update('differentiatedApproach', e.target.value)}
            placeholder="What makes your solution different or novel? How do you stand out or change the paradigm?"
            rows={3}
          />
        </section>

        <section className="pmf-form-section">
          <label htmlFor="operatingPriority">Operating priority</label>
          <textarea
            id="operatingPriority"
            value={form.operatingPriority}
            onChange={(e) => update('operatingPriority', e.target.value)}
            placeholder="e.g. Velocity and scale / Educate market and capture opportunity / Find pit stops with commercial traction"
            rows={2}
          />
        </section>

        <div className="pmf-form-actions">
          <button type="submit" className="pmf-submit">
            Save as node
          </button>
          <button
            type="button"
            className="pmf-cancel"
            onClick={() => navigate('/graph')}
          >
            Cancel
          </button>
        </div>
        </form>
      </div>
    </div>
  )
}
