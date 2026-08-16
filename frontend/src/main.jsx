import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/design-tokens.css'
import App from './App.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { WorkspaceProvider } from './context/WorkspaceContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <WorkspaceProvider>
        <App />
      </WorkspaceProvider>
    </ToastProvider>
  </StrictMode>,
)
