#!/usr/bin/env node

/**
 * Script to automatically organize markdown files into the docs folder structure
 * This script moves .md files from their current location to the appropriate docs subfolder
 */

const fs = require('fs');
const path = require('path');

const DOCS_FOLDER = path.join(__dirname, '..', 'docs');
const CATEGORIES = {
  'server': 'server',
  'LaundryPOS(STAFF)': 'staff-app',
  'LaundryPos(ADMIN)': 'admin-app',
  'landing-page': 'landing-page',
  'root': 'project-wide'
};

/**
 * Recursively find all markdown files in a directory, excluding node_modules and docs
 */
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip node_modules, .git, and docs folders
    if (file === 'node_modules' || file === '.git' || file === 'docs' || file === 'backups' || file === 'logs') {
      return;
    }

    if (stat.isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Determine the category based on file path
 * Returns the key from CATEGORIES object
 */
function getCategory(filePath) {
  const relativePath = path.relative(path.join(__dirname, '..'), filePath);
  const pathParts = relativePath.split(path.sep);

  // Check if file is in server folder
  if (pathParts[0] === 'server' || relativePath.startsWith('server' + path.sep)) {
    return 'server';
  }

  // Check if file is in LaundryPOS(STAFF) folder
  if (pathParts[0] === 'LaundryPOS(STAFF)' || relativePath.startsWith('LaundryPOS(STAFF)' + path.sep)) {
    return 'LaundryPOS(STAFF)';
  }

  // Check if file is in LaundryPos(ADMIN) folder
  if (pathParts[0] === 'LaundryPos(ADMIN)' || relativePath.startsWith('LaundryPos(ADMIN)' + path.sep)) {
    return 'LaundryPos(ADMIN)';
  }

  // Check if file is in landing-page folder
  if (pathParts[0] === 'landing-page' || relativePath.startsWith('landing-page' + path.sep)) {
    return 'landing-page';
  }

  // Default to root for root level files
  return 'root';
}

/**
 * Move markdown file to appropriate docs folder
 */
function organizeMarkdownFile(filePath) {
  const categoryKey = getCategory(filePath);
  const categoryFolder = CATEGORIES[categoryKey];
  
  if (!categoryFolder) {
    console.error(`Unknown category: ${categoryKey} for file: ${filePath}`);
    return { moved: false, reason: `unknown category: ${categoryKey}` };
  }
  
  const targetFolder = path.join(DOCS_FOLDER, categoryFolder);
  const fileName = path.basename(filePath);
  const targetPath = path.join(targetFolder, fileName);

  // Skip if file is already in docs folder
  if (filePath.includes(DOCS_FOLDER)) {
    return { moved: false, reason: 'already in docs folder' };
  }

  // Create target folder if it doesn't exist
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  // Check if target file already exists
  if (fs.existsSync(targetPath)) {
    // If source is newer, replace it
    const sourceStats = fs.statSync(filePath);
    const targetStats = fs.statSync(targetPath);
    
    if (sourceStats.mtime > targetStats.mtime) {
      fs.copyFileSync(filePath, targetPath);
      fs.unlinkSync(filePath);
      return { moved: true, category: categoryFolder, fileName, reason: 'replaced older version' };
    } else {
      // Keep the newer version, delete the source
      fs.unlinkSync(filePath);
      return { moved: true, category: categoryFolder, fileName, reason: 'kept existing newer version' };
    }
  }

  // Move the file
  try {
    fs.copyFileSync(filePath, targetPath);
    fs.unlinkSync(filePath);
    return { moved: true, category: categoryFolder, fileName };
  } catch (error) {
    console.error(`Error moving ${filePath}:`, error.message);
    return { moved: false, reason: error.message };
  }
}

/**
 * Main function
 */
function main() {
  const projectRoot = path.join(__dirname, '..');
  const markdownFiles = findMarkdownFiles(projectRoot);

  if (markdownFiles.length === 0) {
    console.log('✅ No markdown files found outside docs folder');
    return;
  }

  console.log(`📝 Found ${markdownFiles.length} markdown file(s) to organize...\n`);

  const results = {
    moved: [],
    skipped: []
  };

  markdownFiles.forEach(filePath => {
    const result = organizeMarkdownFile(filePath);
    if (result.moved) {
      results.moved.push(result);
      console.log(`✅ Moved: ${result.fileName} → docs/${result.category}/`);
    } else {
      results.skipped.push({ file: path.basename(filePath), reason: result.reason });
      console.log(`⏭️  Skipped: ${path.basename(filePath)} (${result.reason})`);
    }
  });

  console.log(`\n📊 Summary: ${results.moved.length} moved, ${results.skipped.length} skipped`);
  
  if (results.moved.length > 0) {
    console.log('\n💡 Tip: Run this script before committing to keep documentation organized!');
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { organizeMarkdownFile, getCategory };

