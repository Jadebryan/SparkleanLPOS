# Documentation Organization

This folder contains all project documentation organized by category.

## Folder Structure

- **`server/`** - Backend/server documentation (API docs, setup guides, etc.)
- **`staff-app/`** - Staff mobile app documentation
- **`admin-app/`** - Admin web app documentation
- **`landing-page/`** - Landing page documentation
- **`project-wide/`** - Project-wide documentation (deployment, security, features, etc.)

## Automatic Organization

Markdown files are automatically organized into the appropriate category folders:

1. **Git Pre-commit Hook**: Before each commit, the system automatically moves any `.md` files from their current location to the correct `docs/` subfolder based on their location:
   - Files in `server/` → `docs/server/`
   - Files in `LaundryPOS(STAFF)/` → `docs/staff-app/`
   - Files in `LaundryPos(ADMIN)/` → `docs/admin-app/`
   - Files in `landing-page/` → `docs/landing-page/`
   - Files in root → `docs/project-wide/`

2. **Manual Organization**: You can also run the organization script manually:
   ```bash
   npm run organize-docs
   ```

## Setup

To set up the automatic organization (if not already done):

```bash
npm run setup-git-hooks
```

This installs a git pre-commit hook that automatically organizes markdown files before each commit.

## How It Works

When you create a new markdown file anywhere in the project:

1. The file stays in its original location while you work on it
2. When you commit, the pre-commit hook automatically:
   - Detects the file's location
   - Moves it to the appropriate `docs/` subfolder
   - Stages the changes for commit

This ensures all documentation is consistently organized without manual effort!

