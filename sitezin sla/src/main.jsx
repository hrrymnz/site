import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

// Ponto de entrada do frontend: monta a shell React no elemento root.
createRoot(document.getElementById('root')).render(<App />);
