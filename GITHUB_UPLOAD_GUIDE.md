# GitHub Upload Guide

## ✅ Pre-Upload Checklist

1. ✅ Removed `node_modules` from git tracking
2. ✅ Updated `.gitignore` to exclude sensitive files
3. ✅ Created `README.md` with project documentation

## 🚀 Steps to Upload to GitHub

### Step 1: Stage All Changes
```bash
git add .
```

### Step 2: Commit Your Changes
```bash
git commit -m "Initial commit: Laundry POS System with Admin and Staff apps"
```

### Step 3: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the details:
   - **Repository name**: `laundry-pos-system` (or your preferred name)
   - **Description**: "Comprehensive POS and Management System for Laundry Businesses"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

### Step 4: Add Remote and Push

After creating the repository, GitHub will show you commands. Use these:

```bash
# Add the remote repository (replace YOUR_USERNAME and REPO_NAME)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename main branch if needed (GitHub uses 'main' by default)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

### Alternative: If you already have a remote
```bash
# Check existing remotes
git remote -v

# If origin exists, update it
git remote set-url origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push to GitHub
git push -u origin main
```

## 🔒 Security Notes

### Files Already Ignored (via .gitignore):
- ✅ `node_modules/` - Dependencies
- ✅ `.env` files - Environment variables
- ✅ `.expo/` - Expo build files
- ✅ `dist/` and `build/` - Build outputs
- ✅ `.vscode/` - IDE settings
- ✅ Log files

### ⚠️ Important: Before Pushing

**Check for sensitive data:**
```bash
# Search for potential secrets in your code
git grep -i "password\|secret\|key\|token" -- "*.js" "*.ts" "*.tsx" "*.json"
```

**If you find any hardcoded secrets:**
1. Remove them from the code
2. Use environment variables instead
3. Add them to `.env` (which is already ignored)

## 📦 What Gets Uploaded

✅ **Included:**
- All source code
- Configuration files (package.json, tsconfig.json, etc.)
- Documentation files
- README.md

❌ **Excluded (via .gitignore):**
- node_modules/
- .env files
- Build outputs
- IDE settings
- Log files

## 🔄 Future Updates

After the initial push, you can update GitHub with:

```bash
# Stage changes
git add .

# Commit
git commit -m "Your commit message"

# Push
git push
```

## 🆘 Troubleshooting

### If you get "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
```

### If you get authentication errors
- Use GitHub Personal Access Token instead of password
- Or use SSH: `git@github.com:YOUR_USERNAME/REPO_NAME.git`

### If push is rejected
```bash
# Pull first, then push
git pull origin main --rebase
git push
```

## 📝 Next Steps After Upload

1. Add collaborators (if needed)
2. Set up GitHub Actions for CI/CD (optional)
3. Create issues for bugs/features
4. Set up branch protection rules (optional)

