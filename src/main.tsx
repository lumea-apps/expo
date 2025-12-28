import React from 'react'
import { createRoot } from 'react-dom/client'

function App() {
  return <div style={{ padding: 50, fontSize: 24 }}>Hello from Vite!</div>
}

const root = createRoot(document.getElementById('root')!)
root.render(<App />)
