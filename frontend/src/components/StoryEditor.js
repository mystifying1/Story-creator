// frontend/src/components/StoryEditor.js - Enhanced Version
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../translations/translations';
import './StoryEditor.css';
import { jsPDF } from 'jspdf';

const API_URL = 'http://localhost:5000/api';

const StoryEditor = ({ 
  mode, 
  outputFormat, 
  initialStory = null,
  onReset 
}) => {
  const { language: uiLanguage } = useAuth();
  const t = useTranslation(uiLanguage);
  
  const [storyId, setStoryId] = useState(initialStory?._id || null);
  const [story, setStory] = useState(initialStory?.scenes || []);
  const [storyTitle, setStoryTitle] = useState(initialStory?.title || 'Untitled Story');
  const [currentScene, setCurrentScene] = useState(initialStory?.currentDraft?.text || '');
  const [inputText, setInputText] = useState(initialStory?.currentDraft?.text || '');
  const [languageName, setLanguageName] = useState('English');
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [choices, setChoices] = useState(null);
  const [showChoices, setShowChoices] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [lastSaved, setLastSaved] = useState(initialStory?.currentDraft?.lastSaved || null);
  
  const autoSaveTimer = useRef(null);
  const hasUnsavedChanges = useRef(false);
  const initialDraftText = useRef(initialStory?.currentDraft?.text || '');

  // Language code to name mapping
  const languageNames = {
    'eng': 'English',
    'spa': 'Spanish',
    'fra': 'French',
    'deu': 'German',
    'ita': 'Italian',
    'por': 'Portuguese',
    'rus': 'Russian',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'cmn': 'Chinese',
    'hin': 'Hindi',
    'arb': 'Arabic',
    'ben': 'Bengali',
    'tel': 'Telugu',
    'tam': 'Tamil',
    'mar': 'Marathi',
    'urd': 'Urdu'
  };

  // Create story on mount if new
  useEffect(() => {
    const createNewStory = async () => {
      try {
        const response = await axios.post(`${API_URL}/stories`, {
          title: storyTitle,
          mode: mode,
          initialText: inputText
        });
        setStoryId(response.data.story._id);
      } catch (error) {
        console.error('Create story error:', error);
      }
    };

    if (!storyId) {
      createNewStory();
    }
  }, [storyId, storyTitle, mode, inputText]);

  // Auto-save draft while typing
  useEffect(() => {
    if (!storyId) return;

    // Clear existing timer
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    // Set new timer (save after 2 seconds of inactivity)
    if (inputText && inputText !== initialDraftText.current) {
      hasUnsavedChanges.current = true;
      setAutoSaveStatus('⏳ Saving...');
      
      autoSaveTimer.current = setTimeout(async () => {
        if (!storyId || !inputText.trim()) return;

        try {
          await axios.put(`${API_URL}/stories/${storyId}/draft`, {
            draftText: inputText
          });
          
          hasUnsavedChanges.current = false;
          setLastSaved(new Date());
          setAutoSaveStatus('✅ Saved');
          
          setTimeout(() => setAutoSaveStatus(''), 2000);
        } catch (error) {
          console.error('Auto-save error:', error);
          setAutoSaveStatus('❌ Save failed');
        }
      }, 2000);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [inputText, storyId]);

  // Detect language when user types
  useEffect(() => {
    const detectLanguageFromText = async (text) => {
      try {
        const response = await axios.post(`${API_URL}/detect-language`, { text });
        setLanguageName(response.data.languageName);
      } catch (error) {
        console.error('Language detection error:', error);
      }
    };

    if (inputText.trim().length > 50) {
      detectLanguageFromText(inputText);
    }
  }, [inputText]);

  // Save before unmount
  useEffect(() => {
    const saveDraftOnUnmount = async () => {
      if (!storyId || !inputText) return;

      try {
        await axios.put(`${API_URL}/stories/${storyId}/draft`, {
          draftText: inputText
        });
      } catch (error) {
        console.error('Save on unmount error:', error);
      }
    };

    return () => {
      if (hasUnsavedChanges.current && storyId && inputText) {
        saveDraftOnUnmount();
      }
    };
  }, [storyId, inputText]);







  const handleGrammarCheck = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/grammar-check`, {
        text: inputText,
        mode: mode,
        storyId: storyId
      });
      setSuggestions(response.data);
      
      // Update detected language from response
      if (response.data.detectedLanguage) {
        setLanguageName(response.data.detectedLanguage);
      }
    } catch (error) {
      console.error('Error checking grammar:', error);
      alert('Failed to check grammar. Make sure backend is running!');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (suggestions && suggestions.improvedVersion) {
      setInputText(suggestions.improvedVersion);
      setSuggestions(null);
      hasUnsavedChanges.current = true;
    }
  };

  const handleAddToStory = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      // Add scene to story
      const response = await axios.post(`${API_URL}/stories/${storyId}/scenes`, {
        text: inputText,
        fromChoice: null
      });

      setStory(response.data.story.scenes);
      setCurrentScene(inputText);
      setInputText('');
      setSuggestions(null);
      hasUnsavedChanges.current = false;
      setAutoSaveStatus('');
    } catch (error) {
      console.error('Add scene error:', error);
      alert('Failed to add scene');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateChoices = async () => {
    if (story.length === 0) {
      alert('Please add at least one scene first!');
      return;
    }

    setLoading(true);
    setShowChoices(true);
    try {
      const storyContext = story.map(s => s.text).join('\n\n');
      const response = await axios.post(`${API_URL}/generate-choices`, {
        storyContext,
        mode,
        currentScene,
        storyId
      });
      setChoices(response.data.choices);
      
      // Update language from response
      if (response.data.detectedLanguage) {
        setLanguageName(response.data.detectedLanguage);
      }
    } catch (error) {
      console.error('Error generating choices:', error);
      alert('Failed to generate choices. Make sure backend is running!');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChoice = async (choice) => {
    setLoading(true);
    try {
      const storyContext = story.map(s => s.text).join('\n\n');
      const response = await axios.post(`${API_URL}/continue-scene`, {
        storyContext,
        mode,
        selectedChoice: choice.description,
        storyId
      });

      // Add the generated scene
      const addResponse = await axios.post(`${API_URL}/stories/${storyId}/scenes`, {
        text: response.data.continuation,
        fromChoice: choice.title
      });

      setStory(addResponse.data.story.scenes);
      setCurrentScene(response.data.continuation);
      setShowChoices(false);
      setChoices(null);
      
      // Update language
      if (response.data.detectedLanguage) {
        setLanguageName(response.data.detectedLanguage);
      }
    } catch (error) {
      console.error('Error continuing scene:', error);
      alert('Failed to continue scene. Make sure backend is running!');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTitle = async (newTitle) => {
    setStoryTitle(newTitle);
    
    if (storyId && newTitle.trim()) {
      try {
        await axios.put(`${API_URL}/stories/${storyId}`, {
          title: newTitle,
          scenes: story,
          status: story.length > 0 ? 'in-progress' : 'draft'
        });
      } catch (error) {
        console.error('Update title error:', error);
      }
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.text(storyTitle, margin, y);
    y += 10;
    
    // Language and mode info
    doc.setFontSize(10);
    doc.text(`Mode: ${mode} | Language: ${languageName}`, margin, y);
    y += 15;

    // Story content
    doc.setFontSize(12);
    story.forEach((scene, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(14);
      doc.text(`Scene ${index + 1}`, margin, y);
      y += 10;

      doc.setFontSize(11);
      const lines = doc.splitTextToSize(scene.text, maxWidth);
      lines.forEach(line => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 7;
      });
      y += 10;
    });

    doc.save(`${storyTitle.replace(/[^a-z0-9]/gi, '_')}.pdf`);
  };

  const formatLastSaved = () => {
    if (!lastSaved) return '';
    const date = new Date(lastSaved);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="story-editor">
      <div className="editor-header">
        <div className="header-left">
          <input
            type="text"
            value={storyTitle}
            onChange={(e) => handleUpdateTitle(e.target.value)}
            className="story-title-input"
            placeholder="Story Title"
          />
          <div className="story-meta">
            <span className="mode-badge">✍️ {mode}</span>
            <span className="language-badge">🌍 {languageName}</span>
            {autoSaveStatus && <span className="auto-save-status">{autoSaveStatus}</span>}
            {lastSaved && !autoSaveStatus && (
              <span className="last-saved">Last saved {formatLastSaved()}</span>
            )}
          </div>
        </div>
        <button onClick={onReset} className="reset-button">← {t('backToMenu')}</button>
      </div>

      <div className="editor-layout">
        {/* Left: Story Draft */}
        <div className="story-draft">
          <h3>📚 {t('yourStory')}</h3>
          <div className="story-content">
            {story.length === 0 ? (
              <p className="empty-state">{t('emptyStory')}</p>
            ) : (
              story.map((scene, index) => (
                <div key={scene._id || index} className="scene">
                  <div className="scene-header">
                    <span className="scene-number">Scene {index + 1}</span>
                    {scene.fromChoice && <span className="scene-choice">→ {scene.fromChoice}</span>}
                    {scene.language && (
                      <span className="scene-language">🌍 {languageNames[scene.language] || scene.language}</span>
                    )}
                  </div>
                  <p>{scene.text}</p>
                </div>
              ))
            )}
          </div>
          
          {story.length > 0 && (
            <div className="story-actions">
              <button onClick={handleDownloadPDF} className="download-button">
                📥 {t('downloadPDF')}
              </button>
              <button onClick={handleGenerateChoices} className="choices-button" disabled={loading}>
                {loading ? t('generating') : `🎲 ${t('generateChoices')}`}
              </button>
            </div>
          )}
        </div>

        {/* Right: Input & Suggestions */}
        <div className="editor-panel">
          {!showChoices ? (
            <>
              <div className="editor-panel-header">
                <h3>✏️ {t('writeScene')}</h3>
                <div className="language-info">
                  <span className="detected-lang-label">Writing in:</span>
                  <span className="detected-lang-value">{languageName}</span>
                  <span className="lang-hint">
                    {languageName !== 'English' && '✨ AI will respond in the same language'}
                  </span>
                </div>
              </div>
              
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={t('storyStartPlaceholder')}
                className="scene-input"
                rows="10"
              />

              <div className="editor-actions">
                <button 
                  onClick={handleGrammarCheck} 
                  disabled={loading || !inputText.trim()}
                  className="check-button"
                >
                  {loading ? t('checking') : `🔍 ${t('checkImprove')}`}
                </button>
                <button 
                  onClick={handleAddToStory}
                  disabled={!inputText.trim()}
                  className="add-button"
                >
                  ✅ {t('addToStory')}
                </button>
              </div>

              {suggestions && (
                <div className="suggestions-panel">
                  <h4>💡 {t('aiSuggestions')}</h4>
                  {suggestions.hasIssues ? (
                    <>
                      <div className="improved-text">
                        <h5>{t('improvedVersion')}</h5>
                        <p>{suggestions.improvedVersion}</p>
                      </div>
                      {suggestions.suggestions.length > 0 && (
                        <div className="suggestion-list">
                          <h5>{t('specificChanges')}</h5>
                          {suggestions.suggestions.map((sug, idx) => (
                            <div key={idx} className="suggestion-item">
                              <p><strong>Original:</strong> {sug.original}</p>
                              <p><strong>Suggested:</strong> {sug.suggested}</p>
                              <p className="reason"><em>{sug.reason}</em></p>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="suggestion-actions">
                        <button onClick={handleAcceptSuggestion} className="accept-button">
                          ✅ {t('acceptImprovements')}
                        </button>
                        <button onClick={() => setSuggestions(null)} className="dismiss-button">
                          ❌ {t('keepOriginal')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="no-issues">✨ {t('looksGreat')}</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="choices-panel">
              <h3>🎲 {t('chooseYourPath')}</h3>
              {loading ? (
                <p className="loading">{t('generating')}</p>
              ) : choices ? (
                <>
                  <div className="choices-list">
                    {choices.map((choice) => (
                      <div key={choice.id} className="choice-card" onClick={() => handleSelectChoice(choice)}>
                        <h4>Option {choice.id}: {choice.title}</h4>
                        <p>{choice.description}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setShowChoices(false)} className="back-button">
                    ← {t('backToEditor')}
                  </button>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryEditor;