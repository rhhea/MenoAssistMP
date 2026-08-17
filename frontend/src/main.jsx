import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MenocareApp from './MenocareApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MenocareApp />
  </StrictMode>,
)