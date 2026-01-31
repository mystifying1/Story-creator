// frontend/src/App.js - Enhanced with Auto-Resume
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useTranslation } from './translations/translations';
import './App.css';
import Auth from './components/Auth';
import ModeSelector from './components/ModeSelector';
import StoryEditor from './components/StoryEditor';
import Settings from './components/Settings';
import StoryList from './components/StoryList';

const API_URL = 'http://localhost:5000/api';

function AppContent() {
  const { isAuthenticated, language, user } = useAuth();
  const t = useTranslation(language);
  
  const [mode, setMode] = useState(null);
  const [outputFormat, setOutputFormat] = useState('text');
  const [currentStory, setCurrentStory] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showStoryList, setShowStoryList] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [lastActiveStory, setLastActiveStory] = useState(null);

  // Check for last active story on mount
  useEffect(() => {
    if (isAuthenticated) {
      checkForLastActiveStory();
    }
  }, [isAuthenticated]);

  const checkForLastActiveStory = async () => {
    try {
      const response = await axios.get(`${API_URL}/stories/last-active/resume`);
      if (response.data.story) {
        setLastActiveStory(response.data.story);
        setShowResumePrompt(true);
      }
    } catch (error) {
      console.error('Check last active story error:', error);
    }
  };

  const handleResumeStory = () => {
    if (lastActiveStory) {
      setMode(lastActiveStory.mode);
      setCurrentStory(lastActiveStory);
      setShowResumePrompt(false);
    }
  };

  const handleStartNew = () => {
    setShowResumePrompt(false);
  };

  const handleStart = (selectedMode, selectedFormat) => {
    setMode(selectedMode);
    setOutputFormat(selectedFormat);
    setCurrentStory(null); // New story
  };

  const handleReset = () => {
    setMode(null);
    setOutputFormat('text');
    setCurrentStory(null);
    
    // Check for active stories again
    checkForLastActiveStory();
  };

  const handleLoadStory = (story) => {
    setMode(story.mode);
    setCurrentStory(story);
    setShowStoryList(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="App">
        <header className="App-header">
          <h1>📖 {t('appTitle')}</h1>
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
          {!mode && (
            <button 
              className="story-list-button" 
              onClick={() => setShowStoryList(true)}
            >
              📚 {t('myStories')}
            </button>
          )}
          <button 
            className="settings-icon-button" 
            onClick={() => setShowSettings(true)}
          >
            ⚙️ {t('settings')}
          </button>
        </div>
      </header>

      {/* Resume Prompt Modal */}
      {showResumePrompt && lastActiveStory && !mode && (
        <div className="resume-prompt-overlay">
          <div className="resume-prompt-modal">
            <h2>📖 Continue Your Story?</h2>
            <div className="resume-story-info">
              <h3>{lastActiveStory.title}</h3>
              <p className="story-mode">Mode: {lastActiveStory.mode}</p>
              <p className="story-scenes">
                {lastActiveStory.scenes.length} scene{lastActiveStory.scenes.length !== 1 ? 's' : ''} written
              </p>
              {lastActiveStory.currentDraft?.text && (
                <p className="draft-info">
                  💾 You have an unsaved draft
                </p>
              )}
            </div>
            <div className="resume-actions">
              <button className="resume-button" onClick={handleResumeStory}>
                ✅ Continue Writing
              </button>
              <button className="new-story-button" onClick={handleStartNew}>
                ✨ Start New Story
              </button>
            </div>
          </div>
        </div>
      )}

      {!mode ? (
        <ModeSelector onStart={handleStart} />
      ) : (
        <StoryEditor
          mode={mode}
          outputFormat={outputFormat}
          initialStory={currentStory}
          onReset={handleReset}
        />
      )}

      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showStoryList && (
        <StoryList 
          onLoadStory={handleLoadStory} 
          onClose={() => setShowStoryList(false)} 
        />
      )}
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