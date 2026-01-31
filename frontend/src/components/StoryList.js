// frontend/src/components/StoryList.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../translations/translations';
import './StoryList.css';

const API_URL = 'http://localhost:5000/api';

const StoryList = ({ onLoadStory, onClose }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { language } = useAuth();
  const t = useTranslation(language);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const response = await axios.get(`${API_URL}/stories`);
      setStories(response.data.stories);
    } catch (error) {
      console.error('Load stories error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Are you sure you want to delete this story?')) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/stories/${storyId}`);
      setStories(stories.filter(s => s._id !== storyId));
    } catch (error) {
      console.error('Delete story error:', error);
      alert('Failed to delete story');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="story-list-overlay" onClick={onClose}>
      <div className="story-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="story-list-header">
          <h2>📚 {t('myStories')}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="story-list-content">
          {loading ? (
            <p className="loading-text">{t('loading')}</p>
          ) : stories.length === 0 ? (
            <p className="no-stories">{t('noStories')}</p>
          ) : (
            <div className="stories-grid">
              {stories.map((story) => (
                <div key={story._id} className="story-card">
                  <div className="story-card-header">
                    <h3>{story.title}</h3>
                    <span className="story-mode-badge">{story.mode}</span>
                  </div>
                  
                  <div className="story-card-info">
                    <p className="story-scenes">
                      📝 {story.scenes.length} scene{story.scenes.length !== 1 ? 's' : ''}
                    </p>
                    <p className="story-date">
                      🕒 {formatDate(story.updatedAt)}
                    </p>
                    {story.detectedLanguage && story.detectedLanguage !== 'eng' && (
                      <p className="story-language">
                        🌍 {story.detectedLanguage.toUpperCase()}
                      </p>
                    )}
                  </div>

                  {story.scenes.length > 0 && (
                    <div className="story-preview">
                      {story.scenes[0]?.text.substring(0, 150)}...
                    </div>
                  )}

                  <div className="story-card-actions">
                    <button 
                      className="load-button"
                      onClick={() => {
                        onLoadStory(story);
                        onClose();
                      }}
                    >
                      📖 {t('loadStory')}
                    </button>
                    <button 
                      className="delete-button"
                      onClick={() => handleDeleteStory(story._id)}
                    >
                      🗑️ {t('deleteStory')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryList;