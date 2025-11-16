// Temporary test component - replace App.tsx content with this to test
import React from 'react'

function App() {
  return (
    <div style={{ 
      padding: '2rem', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      color: 'white',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🧺 Sparklean Laundry Shop</h1>
      <p style={{ fontSize: '1.5rem' }}>React is working! ✅</p>
      <p style={{ marginTop: '2rem', opacity: 0.9 }}>
        If you see this message, React is rendering correctly.
        <br />
        Check the browser console (F12) for any errors.
      </p>
    </div>
  )
}

export default App

