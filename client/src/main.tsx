import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import './i18n';
import App from './App';
import './index.css';
import { authConfig } from './auth/authConfig';
import { ThemeProvider } from './contexts/ThemeContext';

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <AuthProvider {...authConfig}>
      <App />
    </AuthProvider>
  </ThemeProvider>,
);
