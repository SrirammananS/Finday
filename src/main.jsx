import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { FinanceProvider } from './context/FinanceContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <ThemeProvider>
        <FeedbackProvider>
          <FinanceProvider>
            <App />
          </FinanceProvider>
        </FeedbackProvider>
      </ThemeProvider>
    </Router>
  </React.StrictMode>
);
