#!/usr/bin/env node

/**
 * Script to set up git hooks for automatic markdown organization
 */

const fs = require('fs');
const path = require('path');

const GIT_HOOKS_DIR = path.join(__dirname, '..', '.git', 'hooks');
const PRE_COMMIT_HOOK = path.join(GIT_HOOKS_DIR, 'pre-commit');
const ORGANIZE_SCRIPT = path.join(__dirname, 'organize-markdown.js');

function setupGitHook() {
  // Check if .git directory exists
  const gitDir = path.join(__dirname, '..', '.git');
  if (!fs.existsSync(gitDir)) {
    console.log('⚠️  .git directory not found. This project may not be a git repository.');
    console.log('   Run "git init" first, then run this script again.');
    return false;
  }

  // Create hooks directory if it doesn't exist
  if (!fs.existsSync(GIT_HOOKS_DIR)) {
    fs.mkdirSync(GIT_HOOKS_DIR, { recursive: true });
  }

  // Create pre-commit hook
  // Use relative path from .git/hooks to scripts folder
  const relativeScriptPath = path.relative(GIT_HOOKS_DIR, ORGANIZE_SCRIPT).replace(/\\/g, '/');
  
  const hookContent = `#!/bin/sh
# Auto-generated hook to organize markdown files
# This hook runs before each commit to ensure markdown files are organized

# Get the project root directory (parent of .git)
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
cd "$PROJECT_ROOT"

# Run the organize script
node "${relativeScriptPath}"

# Stage the organized files if any were moved
git add docs/ 2>/dev/null || true
`;

  try {
    fs.writeFileSync(PRE_COMMIT_HOOK, hookContent);
    
    // Make the hook executable (Unix/Linux/Mac)
    if (process.platform !== 'win32') {
      fs.chmodSync(PRE_COMMIT_HOOK, '755');
    }
    
    console.log('✅ Git pre-commit hook installed successfully!');
    console.log('📝 Markdown files will now be automatically organized before each commit.');
    return true;
  } catch (error) {
    console.error('❌ Error setting up git hook:', error.message);
    return false;
  }
}

// Run setup
if (require.main === module) {
  setupGitHook();
}

module.exports = { setupGitHook };

