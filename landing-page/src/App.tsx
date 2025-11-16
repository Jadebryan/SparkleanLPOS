import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './components/LandingPage'

function App() {
  try {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </Router>
    )
  } catch (error) {
    console.error('Error in App component:', error)
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Error Loading App</h1>
        <p>{error instanceof Error ? error.message : 'Unknown error'}</p>
        <pre>{error instanceof Error ? error.stack : String(error)}</pre>
      </div>
    )
  }
}

export default App

