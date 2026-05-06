import 'bootstrap/dist/css/bootstrap.min.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { NotifProvider } from './context/NotifContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <NotifProvider>
      <App />
    </NotifProvider>
  </React.StrictMode>
)