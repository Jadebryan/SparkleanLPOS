# Automatic Markdown Organization

This document explains how the automatic markdown file organization system works.

## Overview

All markdown (`.md`) files in the project are automatically organized into the `docs/` folder structure based on their location. This happens automatically before each git commit.

## How It Works

### 1. Git Pre-commit Hook

A git pre-commit hook automatically runs the organization script before each commit. This ensures that:

- Any new markdown files you create are automatically moved to the correct `docs/` subfolder
- The organized files are automatically staged for commit
- Your documentation stays organized without manual effort

### 2. Organization Rules

Files are organized based on their location:

| File Location | Destination |
|--------------|-------------|
| `server/` | `docs/server/` |
| `LaundryPOS(STAFF)/` | `docs/staff-app/` |
| `LaundryPos(ADMIN)/` | `docs/admin-app/` |
| `landing-page/` | `docs/landing-page/` |
| Root level | `docs/project-wide/` |

### 3. Manual Organization

You can also run the organization script manually at any time:

```bash
npm run organize-docs
```

This is useful if you want to organize files without committing, or if you've created multiple files and want to organize them all at once.

## Setup

The git hook is automatically set up when you run:

```bash
npm run setup-git-hooks
```

This only needs to be done once per repository (or after cloning the repo).

## Workflow

1. **Create a markdown file** anywhere in the project (e.g., `server/NEW_FEATURE.md`)
2. **Work on it** in its original location
3. **Commit your changes** - the pre-commit hook automatically:
   - Moves the file to `docs/server/NEW_FEATURE.md`
   - Stages the changes
   - Proceeds with the commit

## Examples

### Example 1: Creating Server Documentation

```bash
# Create a new file
echo "# API Changes" > server/API_CHANGES.md

# Work on it, make changes...
# When you commit:
git add server/API_CHANGES.md
git commit -m "Add API changes documentation"
# File is automatically moved to docs/server/API_CHANGES.md
```

### Example 2: Creating Staff App Documentation

```bash
# Create a new file
echo "# New Feature" > LaundryPOS\(STAFF\)/NEW_FEATURE.md

# Commit
git add LaundryPOS\(STAFF\)/NEW_FEATURE.md
git commit -m "Add new feature docs"
# File is automatically moved to docs/staff-app/NEW_FEATURE.md
```

## Troubleshooting

### Hook Not Running

If the git hook doesn't seem to be running:

1. Check if the hook exists: `.git/hooks/pre-commit`
2. Re-run setup: `npm run setup-git-hooks`
3. Make sure the hook is executable (on Unix/Linux/Mac)

### Files Not Being Moved

If files aren't being moved:

1. Check that the file is actually a `.md` file
2. Verify the file is not already in the `docs/` folder
3. Run the script manually to see any error messages: `npm run organize-docs`

### Conflicts

If a file with the same name already exists in the target folder:

- The script keeps the newer version (based on modification time)
- The older version is deleted
- You'll see a message indicating which version was kept

## Script Details

The organization script (`scripts/organize-markdown.js`):

- Scans the entire project for `.md` files
- Excludes `node_modules/`, `.git/`, `docs/`, `backups/`, and `logs/` folders
- Determines the category based on file location
- Moves files to the appropriate `docs/` subfolder
- Handles file conflicts intelligently

## Benefits

✅ **Consistency**: All documentation in one place  
✅ **Automatic**: No manual organization needed  
✅ **Category-based**: Easy to find documentation by type  
✅ **Git-integrated**: Works seamlessly with your workflow  
✅ **Non-intrusive**: Files stay where you create them until commit

