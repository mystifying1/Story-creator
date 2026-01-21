// frontend/src/App.js
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTranslation } from './translations/translations';
import './App.css';
import Auth from './components/Auth';
import ModeSelector from './components/ModeSelector';
import StoryEditor from './components/StoryEditor';
import Settings from './components/Settings';

function AppContent() {
  const { isAuthenticated, language, darkMode, user } = useAuth();
  const t = useTranslation(language);
  
  const [mode, setMode] = useState(null);
  const [outputFormat, setOutputFormat] = useState('text');
  const [story, setStory] = useState([]);
  const [currentScene, setCurrentScene] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const handleStart = (selectedMode, selectedFormat) => {
    setMode(selectedMode);
    setOutputFormat(selectedFormat);
  };

  const handleReset = () => {
    setMode(null);
    setOutputFormat('text');
    setStory([]);
    setCurrentScene('');
  };

  if (!isAuthenticated) {
    return (
      <div className="App">
        <header className="App-header">
          <h1> {t('appTitle')}</h1>
          <p>{t('appSubtitle')}</p>
        </header>
        <Auth />
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>📖 {t('appTitle')}</h1>
        <p>{t('appSubtitle')}</p>
        <div className="header-actions">
          <span className="user-welcome">
            👋 {user?.username}
          </span>
          <button 
            className="settings-icon-button" 
            onClick={() => setShowSettings(true)}
          >
            ⚙️ {t('settings')}
          </button>
        </div>
      </header>

      {!mode ? (
        <ModeSelector onStart={handleStart} />
      ) : (
        <StoryEditor
          mode={mode}
          outputFormat={outputFormat}
          story={story}
          setStory={setStory}
          currentScene={currentScene}
          setCurrentScene={setCurrentScene}
          onReset={handleReset}
        />
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;