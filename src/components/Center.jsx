import { Link } from 'react-router-dom'
import greenCircle from '../assets/green.png'

export default function Center() {
  return (
    <div className="center-page">
      <nav className="center-nav">
        <Link to="/form" className="center-link">
          Add startup
        </Link>
        <Link to="/graph" aria-label="View your startup nodes">
          <img src={greenCircle} alt="View nodes" className="center-circle" />
        </Link>
      </nav>
      <p className="center-hint">Click the circle to view your startup nodes</p>
    </div>
  )
}