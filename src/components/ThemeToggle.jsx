import React, { useEffect, useState } from 'react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <button 
      className="theme-toggle-btn" 
      onClick={toggleTheme}
      aria-label="Toggle Dark Mode"
    >
      {theme === 'light' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-moon">
            <defs>
                <linearGradient id="moon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
            </defs>
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="url(#moon-grad)" stroke="none"></path>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-sun">
            <defs>
                <linearGradient id="sun-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
            </defs>
            <circle cx="12" cy="12" r="5" fill="url(#sun-grad)" stroke="none" />
            <line x1="12" y1="1" x2="12" y2="3" stroke="#fbbf24" />
            <line x1="12" y1="21" x2="12" y2="23" stroke="#fbbf24" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="#fbbf24" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="#fbbf24" />
            <line x1="1" y1="12" x2="3" y2="12" stroke="#fbbf24" />
            <line x1="21" y1="12" x2="23" y2="12" stroke="#fbbf24" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="#fbbf24" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="#fbbf24" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
