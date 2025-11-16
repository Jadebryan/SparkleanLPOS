# Troubleshooting Blank Screen Issue

If you're seeing a blank screen, follow these steps:

## 1. Install Dependencies
```bash
cd landing-page
npm install
```

## 2. Check Browser Console
Open your browser's developer tools (F12) and check the Console tab for any errors.

## 3. Start Dev Server
```bash
npm run dev
```

The server should start on `http://localhost:3001`

## 4. Common Issues

### Issue: "Cannot find module" errors
**Solution:** Delete `node_modules` and `package-lock.json`, then reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 3001 already in use
**Solution:** Change the port in `vite.config.ts` or kill the process using port 3001

### Issue: TypeScript errors
**Solution:** Make sure all TypeScript dependencies are installed:
```bash
npm install --save-dev typescript @types/react @types/react-dom
```

### Issue: Blank screen with no errors
**Solution:** Check if the root element exists in `index.html`:
- Make sure `<div id="root"></div>` is present
- Check browser console for React errors

## 5. Test with Simple Component

If still having issues, temporarily replace `LandingPage` with `SimpleTest` in `App.tsx` to verify React is working.

## 6. Check Network Tab
In browser DevTools, check the Network tab to see if all files are loading correctly.

