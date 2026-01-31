// frontend/src/components/Settings.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../translations/translations';
import './Settings.css';

const Settings = ({ onClose }) => {
  const { darkMode, language, toggleDarkMode, changeLanguage, user, logout } = useAuth();
  const t = useTranslation(language);
  
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'हिंदी (Hindi)', flag: '🇮🇳' },
    { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
    { code: 'fr', name: 'Français (French)', flag: '🇫🇷' }
  ];

  const handleLanguageChange = async (langCode) => {
    setSelectedLanguage(langCode);
    await changeLanguage(langCode);
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ {t('settings')}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          {/* User Info */}
          <div className="settings-section">
            <h3>👤 User</h3>
            <p><strong>Username:</strong> {user?.username}</p>
            <p><strong>Email:</strong> {user?.email}</p>
          </div>

          {/* Dark Mode Toggle */}
          <div className="settings-section">
            <h3>🌙 {t('darkMode')}</h3>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={toggleDarkMode}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          {/* Language Selection */}
          <div className="settings-section">
            <h3>🌍 {t('language')}</h3>
            <div className="language-grid">
              {languages.map((lang) => (
                <div
                  key={lang.code}
                  className={`language-card ${selectedLanguage === lang.code ? 'selected' : ''}`}
                  onClick={() => handleLanguageChange(lang.code)}
                >
                  <span className="flag">{lang.flag}</span>
                  <span className="lang-name">{lang.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Logout Button */}
          <div className="settings-section">
            <button className="logout-button" onClick={logout}>
               {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;