const fs = require('fs');
const path = require('path');

const uploadsDir = process.env.UPLOAD_DIR || './uploads';
const dataDir = './data';
const CLEANUP_INTERVAL = process.env.CLEANUP_INTERVAL || 24 * 60 * 60 * 1000; // 24 hours
const FILE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Start the cleanup scheduler
 * Runs every CLEANUP_INTERVAL to delete old files
 */
function startCleanupScheduler() {
  // Run immediately on startup
  cleanupOldFiles();

  // Schedule recurring cleanup
  setInterval(cleanupOldFiles, CLEANUP_INTERVAL);

  console.log(`✅ Cleanup scheduler started - will clean every ${CLEANUP_INTERVAL / 1000 / 60 / 60} hours`);
}

/**
 * Clean up old files from uploads directory
 */
function cleanupOldFiles() {
  try {
    const now = Date.now();
    let deletedCount = 0;

    if (!fs.existsSync(uploadsDir)) {
      console.log('📁 Uploads directory does not exist');
      return;
    }

    const files = fs.readdirSync(uploadsDir);

    files.forEach(filename => {
      const filepath = path.join(uploadsDir, filename);

      try {
        const stat = fs.statSync(filepath);
        const fileAge = now - stat.mtimeMs; // Use modification time

        // Delete if older than 24 hours
        if (fileAge > FILE_EXPIRY_TIME) {
          fs.unlinkSync(filepath);
          console.log(`🗑️  Deleted old file: ${filename} (age: ${Math.round(fileAge / 1000 / 60 / 60)} hours)`);
          deletedCount++;
        }
      } catch (err) {
        console.error(`❌ Error processing file ${filename}:`, err.message);
      }
    });

    if (deletedCount > 0) {
      console.log(`✅ Cleanup complete - deleted ${deletedCount} file(s)`);
    } else {
      console.log('✅ Cleanup complete - no files to delete');
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
}

/**
 * Manually trigger cleanup
 */
function triggerCleanup() {
  console.log('🔄 Manual cleanup triggered...');
  cleanupOldFiles();
}

/**
 * Get cleanup statistics
 */
function getCleanupStats() {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return {
        totalFiles: 0,
        totalSize: 0,
        files: []
      };
    }

    const files = fs.readdirSync(uploadsDir);
    let totalSize = 0;
    const fileStats = [];

    const now = Date.now();

    files.forEach(filename => {
      const filepath = path.join(uploadsDir, filename);
      const stat = fs.statSync(filepath);
      const fileAge = now - stat.mtimeMs;
      const expiresIn = Math.max(0, FILE_EXPIRY_TIME - fileAge);

      totalSize += stat.size;
      fileStats.push({
        filename,
        size: stat.size,
        createdAt: new Date(stat.mtimeMs),
        expiresAt: new Date(stat.mtimeMs + FILE_EXPIRY_TIME),
        expiresInMs: expiresIn,
        expiresInHours: Math.round(expiresIn / 1000 / 60 / 60)
      });
    });

    return {
      totalFiles: files.length,
      totalSize: totalSize,
      files: fileStats.sort((a, b) => b.createdAt - a.createdAt)
    };
  } catch (error) {
    console.error('Error getting cleanup stats:', error);
    return { totalFiles: 0, totalSize: 0, files: [] };
  }
}

module.exports = {
  startCleanupScheduler,
  triggerCleanup,
  getCleanupStats,
  cleanupOldFiles
};
