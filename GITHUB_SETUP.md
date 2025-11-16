# GitHub Setup Instructions

Follow these steps to connect your local repository to GitHub.

## Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **"+"** icon in the top right corner
3. Select **"New repository"**
4. Fill in the repository details:
   - **Repository name**: `airflow-project` (or your preferred name)
   - **Description**: "Airflow project with Cricket Statistics React UI"
   - **Visibility**: Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click **"Create repository"**

## Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use one of these methods:

### Option A: Using HTTPS (Recommended)

```bash
cd /Users/grahamjenkinson/airflow_project
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

Replace:
- `YOUR_USERNAME` with your GitHub username
- `YOUR_REPO_NAME` with your repository name

### Option B: Using SSH

If you have SSH keys set up with GitHub:

```bash
cd /Users/grahamjenkinson/airflow_project
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## Step 3: Push Your Code

After adding the remote:

```bash
git push -u origin main
```

You may be prompted for credentials:
- **HTTPS**: Use a GitHub Personal Access Token (not your password)
- **SSH**: Should work automatically if keys are configured

## Step 4: Verify

1. Go to your repository on GitHub
2. You should see all your files
3. The commit message should appear in the commit history

## Future Updates

After making changes to your code:

```bash
# Stage your changes
git add .

# Commit with a message
git commit -m "Description of your changes"

# Push to GitHub
git push
```

## GitHub Actions (Optional)

You can set up GitHub Actions for CI/CD. Example workflow files:

### Build Cricket UI

Create `.github/workflows/build-ui.yml`:

```yaml
name: Build Cricket UI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: cricket-ui/package-lock.json
    
    - name: Install dependencies
      working-directory: ./cricket-ui
      run: npm ci
    
    - name: Build
      working-directory: ./cricket-ui
      run: npm run build
```

## Troubleshooting

### Authentication Issues

If you get authentication errors:

**For HTTPS:**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `repo` permissions
3. Use the token as your password when pushing

**For SSH:**
1. Check if SSH keys are set up: `ssh -T git@github.com`
2. If not, follow: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### Remote Already Exists

If you get "remote origin already exists":

```bash
git remote -v  # Check existing remotes
git remote remove origin  # Remove if needed
git remote add origin YOUR_GITHUB_URL  # Add again
```

### Push Rejected

If push is rejected:

```bash
git pull origin main --rebase  # Pull and rebase
git push -u origin main        # Push again
```

## Repository Settings

Consider enabling:
- **Branch protection**: Settings → Branches → Add rule
- **Issues**: Settings → General → Features → Enable Issues
- **Wiki**: Settings → General → Features → Enable Wiki (if needed)
- **Pages**: For hosting the cricket-ui (Settings → Pages)

## Next Steps

1. ✅ Repository created and connected
2. ✅ Initial code pushed
3. 🔲 Set up branch protection (optional)
4. 🔲 Configure GitHub Actions (optional)
5. 🔲 Add collaborators (if needed)
6. 🔲 Set up GitHub Pages for cricket-ui (optional)

## GitHub Pages Deployment (Optional)

To host your cricket-ui on GitHub Pages:

1. Go to Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` / `gh-pages`
4. Folder: `/cricket-ui/dist`
5. Save

Or use GitHub Actions to auto-deploy on push.

---

**Need help?** Check GitHub documentation: https://docs.github.com

