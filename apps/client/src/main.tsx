import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Remove the inline HTML loader before React takes over
const loader = document.getElementById('app-loader');
if (loader) loader.remove();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
