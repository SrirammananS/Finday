import React from 'react';
import ReactDOM from 'react-dom/client';
import { storage } from './services/storage';
import App from './App';
import './index.css';

// Run legacy Finday→LAKSH migration at startup
storage.migrate();
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
