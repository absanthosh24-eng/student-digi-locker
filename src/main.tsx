import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import AppRouter from './router'
import { AppProviders } from './store'
import ToastContainer from './components/common/ToastContainer'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <AppRouter />
      <ToastContainer />
    </AppProviders>
  </React.StrictMode>
)
