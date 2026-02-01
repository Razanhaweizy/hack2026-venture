import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GraphsPage from '/src/components/GraphsPage'
import PMFForm from '/src/components/PMFForm'
import ChallengesPage from '/src/components/ChallengesPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PMFForm />} />
        <Route path="/graph" element={<GraphsPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
