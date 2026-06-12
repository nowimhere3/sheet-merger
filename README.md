# 📊 Sheet Merger

A web application that merges multiple CSV and Google Sheets files into a single deduplicated master sheet.

## Features

✨ **Key Capabilities:**
- 📁 **Drag-and-drop upload** for multiple CSV files
- 🔀 **Intelligent merging** of data from multiple sources
- 🗑️ **Automatic deduplication** (keeps first occurrence)
- 📗 **Direct export** to Google Sheets
- 🔄 **Automatic cleanup** of temporary files after 24 hours
- 📱 **Responsive design** for mobile and desktop
- 🔒 **Secure Google OAuth authentication**

## Getting Started

### Prerequisites

- Node.js 14+ 
- npm or yarn
- Google Cloud Project with credentials

### Setup Google OAuth Credentials

1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable these APIs:
     - Google Sheets API
     - Google Drive API

2. **Create OAuth 2.0 Credentials:**
   - Go to "Credentials" in the left menu
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback` (for development)
     - `https://yourdomain.com/api/auth/callback` (for production)
   - Copy your **Client ID** and **Client Secret**

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your credentials:
   ```
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback
   PORT=3000
   NODE_ENV=development
   ```

### Installation

```bash
# Clone the repository
git clone https://github.com/nowimhere3/sheet-merger.git
cd sheet-merger

# Install dependencies
npm install

# Start the server
npm start
```

The application will be available at `http://localhost:3000`

For development with auto-reload:
```bash
npm run dev
```

## How to Use

1. **Open the app** at `http://localhost:3000`
2. **Select files:**
   - Click the upload area or drag and drop CSV files
   - Select multiple files at once
3. **Merge and export:**
   - Click "Merge & Export to Google Sheets"
   - Authenticate with your Google account (first time only)
   - Wait for processing to complete
4. **Access your sheet:**
   - Click the provided link to open the merged sheet in Google Sheets
   - The sheet is now yours to use, modify, or share

## How It Works

### File Merging Process

1. **Parse CSV Files:** Reads all uploaded CSV files
2. **Combine Data:** Merges all rows from all files
3. **Detect Columns:** Identifies unique columns across all files
4. **Deduplicate:** Removes duplicate rows (entire row comparison) keeping the first occurrence
5. **Export:** Creates a new Google Sheet with:
   - Metadata header (merge date, row counts)
   - All unique merged data
   - Properly formatted columns

### Automatic Cleanup

- All temporary uploaded files are stored with a 24-hour expiration timer
- A cleanup scheduler runs every 24 hours to delete expired files
- Old files are automatically removed without manual intervention
- No database required - cleanup is file-system based

## API Endpoints

### Authentication
- `GET /api/auth/login-url` - Get Google login URL
- `GET /api/auth/callback` - OAuth callback endpoint
- `GET /api/auth/status` - Check authentication status
- `POST /api/auth/logout` - Logout and clear session

### File Operations
- `POST /api/upload/files` - Upload CSV files
- `GET /api/upload/history` - Get upload history

### Merge & Export
- `POST /api/merge/process` - Process and merge uploaded files
- `POST /api/merge/export-sheets` - Export merged data to Google Sheets

### Health
- `GET /health` - Server health check

## Project Structure

```
sheet-merger/
├── public/
│   ├── index.html          # Frontend HTML
│   └── app.js              # Frontend JavaScript
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── upload.js           # File upload routes
│   └── merge.js            # Merge & export routes
├── services/
│   └── cleanup.js          # Auto-cleanup service
├── server.js               # Express server
├── package.json            # Dependencies
├── .env.example            # Environment template
└── README.md               # This file
```

## Configuration

### Environment Variables

```
GOOGLE_CLIENT_ID          # Google OAuth Client ID
GOOGLE_CLIENT_SECRET      # Google OAuth Client Secret
GOOGLE_REDIRECT_URI       # OAuth redirect URL
PORT                      # Server port (default: 3000)
NODE_ENV                  # development or production
UPLOAD_DIR                # Directory for temporary uploads (default: ./uploads)
CLEANUP_INTERVAL          # Cleanup interval in ms (default: 24 hours)
DB_PATH                   # Database path (optional)
```

## Development

### Debug Mode

Enable debug logging:
```bash
DEBUG=sheet-merger:* npm start
```

### Testing

```bash
# Run cleanup immediately
curl http://localhost:3000/api/cleanup/trigger

# Get cleanup stats
curl http://localhost:3000/api/cleanup/stats
```

## Deployment

### Using Heroku

1. Create a Heroku app
2. Set environment variables:
   ```bash
   heroku config:set GOOGLE_CLIENT_ID=your_id
   heroku config:set GOOGLE_CLIENT_SECRET=your_secret
   heroku config:set GOOGLE_REDIRECT_URI=https://yourapp.herokuapp.com/api/auth/callback
   ```
3. Deploy:
   ```bash
   git push heroku main
   ```

### Using Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Limitations

- Maximum file upload size: 50MB per file
- Maximum 10 files per upload session
- Google Sheets output is created in user's Google Drive
- Deduplication is row-based (entire row must be identical)
- Temporary files are deleted after 24 hours

## Troubleshooting

### Authentication Issues
- Clear browser cookies and try again
- Verify OAuth credentials are correct
- Check redirect URI matches in Google Cloud Console

### File Merge Issues
- Ensure CSV files have headers in first row
- Check column names don't have special characters
- Verify files aren't corrupted

### Google Sheets Export Fails
- Verify Google account has write access to Google Drive
- Check API quotas in Google Cloud Console
- Ensure token hasn't expired

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.

---

**Made with ❤️ for data merging enthusiasts**
