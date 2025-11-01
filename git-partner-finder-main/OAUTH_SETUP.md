# GitHub OAuth Setup Guide

The GitHub OAuth login button currently shows a 404 error because it requires setting up a GitHub OAuth application. Here's how to fix it:

## Option 1: Quick Fix - Use Personal Access Token (Recommended)

The app is already configured to work with Personal Access Tokens, which is the simplest approach:

1. **Start the development server**
2. **Click "Continue with Personal Access Token"** instead of the GitHub OAuth button
3. **Generate a token** at https://github.com/settings/tokens/new
4. **Required scopes:** `read:user` and `user:email`
5. **Paste the token** in the app

## Option 2: Set Up GitHub OAuth App

If you want to enable the GitHub OAuth button:

### Step 1: Create OAuth App
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Click "New OAuth App"
3. Fill in the details:
   - **Application name:** DevPartner (or any name you prefer)
   - **Homepage URL:** `http://localhost:5173` (or your app's URL)
   - **Authorization callback URL:** `http://localhost:5173/auth/callback`
4. Click "Register application"

### Step 2: Update Code
1. Copy the **Client ID** from your new OAuth app
2. Open `src/contexts/AuthContext.tsx`
3. Replace the empty `CLIENT_ID` with your actual client ID:
   ```typescript
   const CLIENT_ID = 'your_actual_client_id_here';
   ```
4. Set `OAUTH_ENABLED` to `true`:
   ```typescript
   const OAUTH_ENABLED = true;
   ```

### Step 3: Remove Disabled State
1. Open `src/components/LoginPage.tsx`
2. Change the OAuth button from `disabled={true}` to `disabled={isLoading}`
3. Change `variant="outline"` back to default styling

## Production Deployment

For production deployment:
- Update the OAuth app URLs to your production domain
- Use environment variables for the Client ID
- Consider implementing a backend service to handle the OAuth token exchange securely

## Current Status

✅ **Personal Access Token login** - Fully working
❌ **GitHub OAuth login** - Requires setup (404 error without OAuth app)
✅ **All other features** - Working (favorites, filters, user search, etc.)