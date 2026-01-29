// backend/server.js - Enhanced with True Multilingual + Auto-Save
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { franc } = require('franc-min');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  preferredLanguage: { type: String, default: 'en' },
  darkMode: { type: Boolean, default: false },
  lastActiveStoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' }
});

const User = mongoose.model('User', userSchema);

// Enhanced Story Schema with Auto-Save Support
const storySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  mode: { type: String, required: true },
  scenes: [{ 
    text: String, 
    timestamp: { type: Date, default: Date.now },
    fromChoice: String,
    language: String  // Language of each scene
  }],
  detectedLanguage: { type: String, default: 'en' },  // Auto-detected story language
  currentDraft: { 
    text: String,
    lastSaved: Date
  },
  status: { 
    type: String, 
    enum: ['draft', 'in-progress', 'completed'],
    default: 'draft'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastAccessedAt: { type: Date, default: Date.now }
});

// Auto-update timestamps
storySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Story = mongoose.model('Story', storySchema);

// Language code mapping (franc codes to full names)
const languageMap = {
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
  'urd': 'Urdu',
  'vie': 'Vietnamese',
  'tha': 'Thai',
  'pol': 'Polish',
  'ukr': 'Ukrainian',
  'nld': 'Dutch',
  'swe': 'Swedish'
};

// Language Detection Function
function detectLanguage(text) {
  if (!text || text.trim().length < 10) {
    return { code: 'eng', name: 'English' };
  }
  
  try {
    const langCode = franc(text);
    const langName = languageMap[langCode] || 'English';
    return { code: langCode, name: langName };
  } catch (error) {
    console.error('Language detection error:', error);
    return { code: 'eng', name: 'English' };
  }
}

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Mistral AI Helper Function with Language Preservation
async function callMistralAPI(prompt, systemPrompt = '', userLanguage = 'English') {
  // Enhanced system prompt to maintain language consistency
  const enhancedSystemPrompt = systemPrompt 
    ? `${systemPrompt}\n\nIMPORTANT: The user is writing in ${userLanguage}. You MUST respond ONLY in ${userLanguage}. Do not translate or use any other language.`
    : `You are a creative writing assistant. The user is writing in ${userLanguage}. You MUST respond ONLY in ${userLanguage}. Maintain the exact language and cultural context.`;

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages: [
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    })
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ============= AUTH ROUTES =============

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        darkMode: user.darkMode
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        darkMode: user.darkMode,
        lastActiveStoryId: user.lastActiveStoryId
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Update User Settings
app.put('/api/auth/settings', verifyToken, async (req, res) => {
  try {
    const { preferredLanguage, darkMode } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.userId,
      { preferredLanguage, darkMode },
      { new: true }
    );

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
        darkMode: user.darkMode
      }
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============= STORY ROUTES WITH AUTO-SAVE =============

// Create New Story
app.post('/api/stories', verifyToken, async (req, res) => {
  try {
    const { title, mode, initialText } = req.body;

    // Detect language from initial text
    const detected = initialText ? detectLanguage(initialText) : { code: 'eng', name: 'English' };

    const story = new Story({
      userId: req.userId,
      title: title || 'Untitled Story',
      mode,
      detectedLanguage: detected.code,
      status: 'draft'
    });

    await story.save();

    // Update user's last active story
    await User.findByIdAndUpdate(req.userId, { lastActiveStoryId: story._id });

    res.json({ story });
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// Auto-Save Draft (called frequently while user types)
app.put('/api/stories/:id/draft', verifyToken, async (req, res) => {
  try {
    const { draftText } = req.body;
    
    const story = await Story.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        currentDraft: {
          text: draftText,
          lastSaved: Date.now()
        },
        lastAccessedAt: Date.now()
      },
      { new: true }
    );

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ 
      success: true, 
      lastSaved: story.currentDraft.lastSaved 
    });
  } catch (error) {
    console.error('Auto-save draft error:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// Add Scene to Story (when user commits a scene)
app.post('/api/stories/:id/scenes', verifyToken, async (req, res) => {
  try {
    const { text, fromChoice } = req.body;

    // Detect language of this specific scene
    const detected = detectLanguage(text);

    const story = await Story.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Add scene
    story.scenes.push({
      text,
      fromChoice,
      language: detected.code,
      timestamp: Date.now()
    });

    // Update story language if this is the first scene
    if (story.scenes.length === 1) {
      story.detectedLanguage = detected.code;
    }

    // Clear draft and update status
    story.currentDraft = { text: '', lastSaved: Date.now() };
    story.status = 'in-progress';
    story.lastAccessedAt = Date.now();

    await story.save();

    res.json({ story });
  } catch (error) {
    console.error('Add scene error:', error);
    res.status(500).json({ error: 'Failed to add scene' });
  }
});

// Get User Stories
app.get('/api/stories', verifyToken, async (req, res) => {
  try {
    const stories = await Story.find({ userId: req.userId })
      .sort({ lastAccessedAt: -1 });
    res.json({ stories });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Get Single Story (for resuming)
app.get('/api/stories/:id', verifyToken, async (req, res) => {
  try {
    const story = await Story.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    // Update last accessed time
    story.lastAccessedAt = Date.now();
    await story.save();

    // Update user's last active story
    await User.findByIdAndUpdate(req.userId, { lastActiveStoryId: story._id });

    res.json({ story });
  } catch (error) {
    console.error('Get story error:', error);
    res.status(500).json({ error: 'Failed to fetch story' });
  }
});

// Get Last Active Story (for auto-resume)
app.get('/api/stories/last-active/resume', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user.lastActiveStoryId) {
      return res.json({ story: null });
    }

    const story = await Story.findById(user.lastActiveStoryId);
    
    if (!story) {
      return res.json({ story: null });
    }

    story.lastAccessedAt = Date.now();
    await story.save();

    res.json({ story });
  } catch (error) {
    console.error('Resume story error:', error);
    res.status(500).json({ error: 'Failed to resume story' });
  }
});

// Update Story
app.put('/api/stories/:id', verifyToken, async (req, res) => {
  try {
    const { title, scenes, status } = req.body;
    
    const story = await Story.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { 
        title,
        scenes, 
        status,
        lastAccessedAt: Date.now()
      },
      { new: true }
    );

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ story });
  } catch (error) {
    console.error('Update story error:', error);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

// Delete Story
app.delete('/api/stories/:id', verifyToken, async (req, res) => {
  try {
    const story = await Story.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!story) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({ message: 'Story deleted' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

// ============= AI ROUTES WITH LANGUAGE PRESERVATION =============

// Detect Language Endpoint
app.post('/api/detect-language', verifyToken, async (req, res) => {
  try {
    const { text } = req.body;
    const detected = detectLanguage(text);
    res.json({ 
      languageCode: detected.code,
      languageName: detected.name
    });
  } catch (error) {
    console.error('Language detection error:', error);
    res.status(500).json({ error: 'Failed to detect language' });
  }
});

// Grammar check endpoint - maintains original language
app.post('/api/grammar-check', verifyToken, async (req, res) => {
  try {
    const { text, mode, storyId } = req.body;

    // Detect language from user's text
    const detected = detectLanguage(text);
    const userLanguage = detected.name;

    const prompt = `You are a creative writing assistant for a ${mode} story.

The user is writing in ${userLanguage}. You MUST respond ONLY in ${userLanguage}.

Check the following text for grammar, spelling, and suggest improvements for tone and wording that fit the ${mode} genre.

Text: "${text}"

Respond in JSON format (but keep all text content in ${userLanguage}):
{
  "hasIssues": boolean,
  "suggestions": [
    {
      "original": "text with issue (in ${userLanguage})",
      "suggested": "improved text (in ${userLanguage})",
      "reason": "why this is better (in ${userLanguage})"
    }
  ],
  "improvedVersion": "full improved text (in ${userLanguage})"
}`;

    const response = await callMistralAPI(prompt, '', userLanguage);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { 
      hasIssues: false, 
      suggestions: [], 
      improvedVersion: text 
    };

    // Add detected language to response
    result.detectedLanguage = userLanguage;

    res.json(result);
  } catch (error) {
    console.error('Grammar check error:', error);
    res.status(500).json({ error: 'Failed to check grammar' });
  }
});

// Generate plot choices endpoint - maintains story language
app.post('/api/generate-choices', verifyToken, async (req, res) => {
  try {
    const { storyContext, mode, currentScene, storyId } = req.body;

    // Detect language from story context
    const detected = detectLanguage(storyContext + ' ' + currentScene);
    const userLanguage = detected.name;

    const prompt = `You are creating plot choices for a ${mode} story.

The story is written in ${userLanguage}. You MUST respond ONLY in ${userLanguage}.

Story so far:
${storyContext}

Current scene:
${currentScene}

Generate 3 compelling plot direction choices for what happens next. Each should be 50-100 words in ${userLanguage}.

Respond in JSON format (but keep all text content in ${userLanguage}):
{
  "choices": [
    {
      "id": 1,
      "title": "Brief title (in ${userLanguage})",
      "description": "What happens in this choice (in ${userLanguage})"
    },
    {
      "id": 2,
      "title": "Brief title (in ${userLanguage})",
      "description": "What happens in this choice (in ${userLanguage})"
    },
    {
      "id": 3,
      "title": "Brief title (in ${userLanguage})",
      "description": "What happens in this choice (in ${userLanguage})"
    }
  ]
}`;

    const response = await callMistralAPI(prompt, '', userLanguage);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { choices: [] };

    // Add detected language to response
    result.detectedLanguage = userLanguage;

    res.json(result);
  } catch (error) {
    console.error('Generate choices error:', error);
    res.status(500).json({ error: 'Failed to generate choices' });
  }
});

// Continue scene endpoint - maintains story language
app.post('/api/continue-scene', verifyToken, async (req, res) => {
  try {
    const { storyContext, mode, selectedChoice, storyId } = req.body;

    // Detect language from story context
    const detected = detectLanguage(storyContext);
    const userLanguage = detected.name;

    const systemPrompt = `You are a creative writer specializing in ${mode} stories. The story is written in ${userLanguage}. You MUST write ONLY in ${userLanguage}.`;

    const prompt = `Continue the story based on the chosen plot direction. Write in ${userLanguage}.

Story so far (in ${userLanguage}):
${storyContext}

Chosen direction (in ${userLanguage}):
${selectedChoice}

Write the next scene (200-300 words) that follows this choice in ${userLanguage}. Make it engaging and appropriate for the ${mode} genre.

Respond with just the story text in ${userLanguage}, no JSON formatting.`;

    const continuation = await callMistralAPI(prompt, systemPrompt, userLanguage);

    res.json({ 
      continuation,
      detectedLanguage: userLanguage
    });
  } catch (error) {
    console.error('Continue scene error:', error);
    res.status(500).json({ error: 'Failed to continue scene' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Story Creator API with True Multilingual Support!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🌍 True multilingual support enabled`);
  console.log(`💾 Auto-save system active`);
});