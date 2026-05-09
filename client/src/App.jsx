import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import ChatApp from './ChatApp';
import { getAuthToken } from './api';

function SplashLoader() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 z-50">
      {/* Logo */}
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
            <span className="text-4xl">📚</span>
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping" />
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Document Q&A</h1>
          <p className="text-blue-300 text-sm mt-1">Powered by AI</p>
        </div>

        {/* Animated bar loader */}
        <div className="flex items-end gap-1.5 h-8">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-1.5 bg-blue-400 rounded-full animate-bounce"
              style={{
                animationDelay: `${i * 0.12}s`,
                animationDuration: '0.8s',
                height: `${[60, 90, 100, 90, 60][i]}%`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) setIsAuthenticated(true);
    const min = new Promise(r => setTimeout(r, 1200));
    min.then(() => setIsLoading(false));
  }, []);

  if (isLoading) return <SplashLoader />;

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return <ChatApp />;
}
