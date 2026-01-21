// backend/server.js - Updated with Mistral AI, Auth, and Database
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Failed');
    console.error(err.message);
  });

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  preferredLanguage: { type: String, default: 'en' },
  darkMode: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

// Story Schema
const storySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  mode: { type: String, required: true },
  scenes: [{ 
    text: String, 
    timestamp: Date,
    fromChoice: String 
  }],
  language: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Story = mongoose.model('Story', storySchema);

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

// Mistral AI Helper Function
async function callMistralAPI(prompt, systemPrompt = '') {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`
    },
    body: JSON.stringify({
      model: 'mistral-small-latest', // Using Mistral Small (cost-effective)
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
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

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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

// ============= STORY ROUTES =============

// Save Story
app.post('/api/stories', verifyToken, async (req, res) => {
  try {
    const { title, mode, scenes, language } = req.body;

    const story = new Story({
      userId: req.userId,
      title,
      mode,
      scenes,
      language
    });

    await story.save();
    res.json({ story });
  } catch (error) {
    console.error('Save story error:', error);
    res.status(500).json({ error: 'Failed to save story' });
  }
});

// Get User Stories
app.get('/api/stories', verifyToken, async (req, res) => {
  try {
    const stories = await Story.find({ userId: req.userId })
      .sort({ updatedAt: -1 });
    res.json({ stories });
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Update Story
app.put('/api/stories/:id', verifyToken, async (req, res) => {
  try {
    const { scenes } = req.body;
    
    const story = await Story.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { scenes, updatedAt: Date.now() },
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

// ============= AI ROUTES (with Mistral) =============

// Grammar check endpoint
app.post('/api/grammar-check', verifyToken, async (req, res) => {
  try {
    const { text, mode, language } = req.body;

    const languageInstruction = language !== 'en' 
      ? `Respond in ${language} language.` 
      : '';

    const prompt = `You are a creative writing assistant for a ${mode} story. ${languageInstruction}

Check the following text for grammar, spelling, and suggest improvements for tone and wording that fit the ${mode} genre.

Text: "${text}"

Respond in JSON format:
{
  "hasIssues": boolean,
  "suggestions": [
    {
      "original": "text with issue",
      "suggested": "improved text",
      "reason": "why this is better"
    }
  ],
  "improvedVersion": "full improved text"
}`;

    const response = await callMistralAPI(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { 
      hasIssues: false, 
      suggestions: [], 
      improvedVersion: text 
    };

    res.json(result);
  } catch (error) {
    console.error('Grammar check error:', error);
    res.status(500).json({ error: 'Failed to check grammar' });
  }
});

// Generate plot choices endpoint
app.post('/api/generate-choices', verifyToken, async (req, res) => {
  try {
    const { storyContext, mode, currentScene, language } = req.body;

    const languageInstruction = language !== 'en' 
      ? `Respond in ${language} language.` 
      : '';

    const prompt = `You are creating plot choices for a ${mode} story. ${languageInstruction}

Story so far:
${storyContext}

Current scene:
${currentScene}

Generate 3 compelling plot direction choices for what happens next. Each should be 50-100 words.

Respond in JSON format:
{
  "choices": [
    {
      "id": 1,
      "title": "Brief title",
      "description": "What happens in this choice"
    },
    {
      "id": 2,
      "title": "Brief title",
      "description": "What happens in this choice"
    },
    {
      "id": 3,
      "title": "Brief title",
      "description": "What happens in this choice"
    }
  ]
}`;

    const response = await callMistralAPI(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { choices: [] };

    res.json(result);
  } catch (error) {
    console.error('Generate choices error:', error);
    res.status(500).json({ error: 'Failed to generate choices' });
  }
});

// Continue scene endpoint
app.post('/api/continue-scene', verifyToken, async (req, res) => {
  try {
    const { storyContext, mode, selectedChoice, language } = req.body;

    const languageInstruction = language !== 'en' 
      ? `Write in ${language} language.` 
      : '';

    const systemPrompt = `You are a creative writer specializing in ${mode} stories. ${languageInstruction}`;

    const prompt = `Continue the story based on the chosen plot direction.

Story so far:
${storyContext}

Chosen direction:
${selectedChoice}

Write the next scene (200-300 words) that follows this choice. Make it engaging and appropriate for the ${mode} genre.

Respond with just the story text, no JSON formatting.`;

    const continuation = await callMistralAPI(prompt, systemPrompt);

    res.json({ continuation });
  } catch (error) {
    console.error('Continue scene error:', error);
    res.status(500).json({ error: 'Failed to continue scene' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Story Creator API is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});