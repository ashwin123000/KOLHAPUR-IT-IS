import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("main.jsx: #root element not found!");
} else {
  console.log("main.jsx: #root found, mounting...");
  createRoot(rootElement).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  )
}
