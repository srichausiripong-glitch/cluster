import '@fontsource-variable/anuphan'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { clearPassedWaits, dropStaleAreas } from './store/actions'

// A report kept from before the 50 districts would be refused by the server forever: drop it first.
dropStaleAreas()
// A four-week wait whose week has come is no longer needed, and would say what was reported.
clearPassedWaits()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
