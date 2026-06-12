const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { google } = require('googleapis');
const router = express.Router();

// Setup multer
const uploadsDir = process.env.UPLOAD_DIR || './uploads';
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    cb(null, `${timestamp}-${randomStr}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Process and merge CSV files
router.post('/process', upload.array('files'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    console.log(`Processing ${req.files.length} files...`);

    // Read and parse all CSV files
    const allData = [];
    const columns = new Set();

    for (const file of req.files) {
      const data = await parseCSV(file.path);
      
      // Track columns
      if (data.length > 0) {
        Object.keys(data[0]).forEach(col => columns.add(col));
        allData.push(...data);
      }
    }

    // Convert columns set to array
    const columnArray = Array.from(columns);

    // Deduplicate rows (keep first occurrence)
    const deduplicatedData = deduplicateRows(allData, columnArray);

    console.log(`Merged: ${allData.length} rows, Deduplicated: ${deduplicatedData.length} rows`);

    // Clean up uploaded files
    for (const file of req.files) {
      try {
        fs.unlinkSync(file.path);
      } catch (err) {
        console.error(`Failed to delete ${file.path}:`, err);
      }
    }

    res.json({
      success: true,
      data: deduplicatedData,
      columns: columnArray,
      originalRowCount: allData.length,
      deduplicatedRowCount: deduplicatedData.length,
      duplicatesRemoved: allData.length - deduplicatedData.length
    });
  } catch (error) {
    console.error('Merge error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export to Google Sheets
router.post('/export-sheets', async (req, res) => {
  try {
    const { data, columns, mergeTimestamp } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }

    const accessToken = authHeader.substring(7);

    // Create OAuth2 client with user token
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: accessToken
    });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Create new spreadsheet
    const sheetName = `Merged Sheet - ${new Date().toLocaleString()}`;
    
    const spreadsheetRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: sheetName
        }
      }
    });

    const spreadsheetId = spreadsheetRes.data.spreadsheetId;
    console.log(`Created spreadsheet: ${spreadsheetId}`);

    // Prepare data for Google Sheets
    const headers = columns;
    const rows = data.map(row => {
      return headers.map(col => row[col] || '');
    });

    // Add metadata row
    const values = [
      ['Sheet Merger - Deduplicated Data', '', ''],
      [`Merge Date: ${new Date().toLocaleString()}`, '', ''],
      [`Original Rows: ${data.length}`, `Duplicates Removed: ${data.length}`, ''],
      [],
      headers,
      ...rows
    ];

    // Append data to sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'RAW',
      requestBody: { values }
    });

    // Make spreadsheet public (optional - comment out for private)
    // await drive.permissions.create({
    //   fileId: spreadsheetId,
    //   requestBody: {
    //     role: 'reader',
    //     type: 'anyone'
    //   }
    // });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    res.json({
      success: true,
      sheetId: spreadsheetId,
      sheetName: sheetName,
      sheetUrl: sheetUrl,
      rowCount: data.length,
      columnCount: columns.length
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message || 'Failed to export to Google Sheets' });
  }
});

// Helper: Parse CSV file
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        data.push(row);
      })
      .on('end', () => {
        resolve(data);
      })
      .on('error', reject);
  });
}

// Helper: Deduplicate rows (keep first occurrence)
function deduplicateRows(data, columns) {
  const seen = new Set();
  const deduped = [];

  for (const row of data) {
    // Create a hash of the row based on all columns
    const rowHash = columns
      .map(col => String(row[col] || '').trim())
      .join('|');

    if (!seen.has(rowHash)) {
      seen.add(rowHash);
      deduped.push(row);
    }
  }

  return deduped;
}

module.exports = router;
