# How to Update Packages in LaundryPOS(STAFF)

This guide explains different methods to update packages in your Expo/React Native project.

## ⚠️ Important Notes

- **Expo SDK Compatibility**: Expo packages must be compatible with your Expo SDK version (currently ~54.0.9)
- **React Native Version**: Be careful when updating React Native as it may require Expo SDK updates
- **Breaking Changes**: Always check changelogs before major version updates
- **Test Thoroughly**: Test your app after updating packages

## Method 1: Check for Outdated Packages

First, see which packages are outdated:

```bash
cd "LaundryPOS(STAFF)"
npm outdated
```

This shows packages that have newer versions available.

## Method 2: Update All Packages (Recommended)

### Safe Update (within semver ranges)
Updates packages to the latest version within the version ranges specified in `package.json`:

```bash
npm update
```

### Update to Latest Versions (More Aggressive)
To update to the absolute latest versions (may include breaking changes):

```bash
# Install npm-check-updates globally (one time)
npm install -g npm-check-updates

# Check what would be updated
ncu

# Update package.json with latest versions
ncu -u

# Install the updated packages
npm install
```

## Method 3: Update Specific Packages

Update individual packages:

```bash
# Update a single package
npm install package-name@latest

# Update multiple packages
npm install package-name1@latest package-name2@latest

# Example: Update axios
npm install axios@latest
```

## Method 4: Update Expo Packages Safely

For Expo projects, use Expo's upgrade command:

```bash
# Check for Expo SDK updates
npx expo install --check

# Update Expo packages to compatible versions
npx expo install --fix

# Or update to a specific Expo SDK version
npx expo upgrade
```

## Method 5: Update React Native and Expo SDK

If you need to update React Native or Expo SDK:

```bash
# Update Expo CLI first
npm install -g expo-cli@latest

# Check current Expo SDK version
npx expo --version

# Update to latest Expo SDK (this updates all Expo packages)
npx expo upgrade

# Or update to a specific SDK version
npx expo upgrade 55  # Replace 55 with desired SDK version
```

## Recommended Update Workflow

1. **Backup your project** (commit to git first)

2. **Check outdated packages:**
   ```bash
   npm outdated
   ```

3. **Update Expo packages safely:**
   ```bash
   npx expo install --fix
   ```

4. **Update other packages carefully:**
   ```bash
   # Update non-Expo packages one by one or in groups
   npm install axios@latest
   npm install @react-native-async-storage/async-storage@latest
   # etc.
   ```

5. **Clean install:**
   ```bash
   # Remove node_modules and lock file
   rm -rf node_modules package-lock.json
   
   # Reinstall
   npm install
   ```

6. **Test your app:**
   ```bash
   npm start
   # Test on iOS, Android, and Web
   ```

## Common Issues and Solutions

### Issue: Expo SDK version conflicts
**Solution:** Use `npx expo install --fix` to ensure all Expo packages are compatible

### Issue: React Native version mismatch
**Solution:** Expo manages React Native version. Don't manually update it. Use `npx expo upgrade` instead.

### Issue: Native module compatibility
**Solution:** After updating packages with native code, you may need to:
```bash
# For iOS
cd ios && pod install && cd ..

# For Android
# Rebuild the app
```

### Issue: TypeScript errors after update
**Solution:** Update TypeScript types:
```bash
npm install --save-dev @types/react@latest @types/react-native@latest
```

## Quick Update Script

You can create a script to automate safe updates:

```bash
# Create update-packages.sh
cat > update-packages.sh << 'EOF'
#!/bin/bash
echo "Backing up package.json..."
cp package.json package.json.backup

echo "Updating Expo packages..."
npx expo install --fix

echo "Updating other packages..."
npm update

echo "Cleaning and reinstalling..."
rm -rf node_modules package-lock.json
npm install

echo "Done! Please test your app."
EOF

chmod +x update-packages.sh
./update-packages.sh
```

## Checking Package Versions

To see current versions:
```bash
npm list --depth=0
```

To see what's installed vs what's in package.json:
```bash
npm list
```

## Best Practices

1. ✅ **Update regularly** but not too frequently
2. ✅ **Read changelogs** before major updates
3. ✅ **Test thoroughly** after updates
4. ✅ **Update one package type at a time** (Expo packages, then others)
5. ✅ **Keep Expo SDK updated** for security and features
6. ✅ **Use version ranges** in package.json (^ or ~) for flexibility
7. ✅ **Commit before updating** so you can rollback if needed

## Current Project Info

- **Expo SDK**: ~54.0.9
- **React**: 19.1.0
- **React Native**: 0.81.4
- **Package Manager**: npm (package-lock.json present)

## Need Help?

If you encounter issues after updating:
1. Check the package's GitHub issues
2. Check Expo's compatibility docs
3. Rollback using git: `git checkout package.json package-lock.json`
4. Reinstall: `rm -rf node_modules && npm install`

