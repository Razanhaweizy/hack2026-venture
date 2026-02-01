import { createRoot } from 'react-dom/client'
import './index.css'
import GraphsPage from './components/GraphsPage.jsx'

createRoot(document.getElementById('noderoot')).render(
  <>
    <GraphsPage />
  </>
)
