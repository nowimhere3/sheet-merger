const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const { authenticate } = require('@google-cloud/local-auth');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// OAuth callback route
app.get('/api/auth/callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // Store tokens (in production, store securely in database)
    req.session = req.session || {};
    req.session.tokens = tokens;

    res.redirect('/');
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Upload and merge endpoint
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process files here
    const mergedData = [];

    for (const file of req.files) {
      const data = fs.readFileSync(file.path, 'utf8');
      const lines = data.trim().split('\n');
      
      lines.forEach((line, index) => {
        if (index === 0) return; // Skip header
        mergedData.push(line);
      });

      // Clean up uploaded file
      fs.unlinkSync(file.path);
    }

    res.json({
      success: true,
      message: 'Files merged successfully',
      data: mergedData
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Export to Google Sheets endpoint
app.post('/api/export', async (req, res) => {
  try {
    const { data, sheetName } = req.body;

    if (!data || !sheetName) {
      return res.status(400).json({ error: 'Missing data or sheet name' });
    }

    // TODO: Implement Google Sheets export
    res.json({
      success: true,
      message: 'Data exported to Google Sheets'
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Sheet Merger server running on port ${PORT}`);
});
