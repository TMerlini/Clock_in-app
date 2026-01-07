# Vercel Deployment Guide

This guide will help you deploy the Clock In App to Vercel with automatic deployments on every Git push.

## Prerequisites

- GitHub account (✓ Done)
- Code pushed to GitHub (✓ Done)
- Vercel account (free tier works perfectly)

## Step-by-Step Deployment

### 1. Create a Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click "Sign Up"
3. Choose "Continue with GitHub"
4. Authorize Vercel to access your GitHub account

### 2. Import Your Repository

1. Once logged in, click "Add New..." → "Project"
2. You'll see a list of your GitHub repositories
3. Find "Clock_in-app" and click "Import"

### 3. Configure Project Settings

Vercel will auto-detect that this is a Vite project. The default settings should work:

- **Framework Preset**: Vite
- **Root Directory**: `./` (leave as default)
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `dist` (auto-detected)
- **Install Command**: `npm install` (auto-detected)

### 4. Add Environment Variables

**CRITICAL STEP** - You need to add your Firebase and Google Calendar credentials:

1. Expand the "Environment Variables" section
2. Add each variable one by one:

```
VITE_FIREBASE_API_KEY = AIzaSyBCd9Y1JB1_sMURbn3kklCUALTfo2g0O1c
VITE_FIREBASE_AUTH_DOMAIN = clock-in-app-e6bfc.firebaseapp.com
VITE_FIREBASE_PROJECT_ID = clock-in-app-e6bfc
VITE_FIREBASE_STORAGE_BUCKET = clock-in-app-e6bfc.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID = 927299214790
VITE_FIREBASE_APP_ID = 1:927299214790:web:081278c6d5ee632167a6c7
VITE_FIREBASE_MEASUREMENT_ID = G-D7GT0RVY7H
```

For Google Calendar (add these when you have your credentials):
```
VITE_GOOGLE_CLIENT_ID = your_google_client_id_here
VITE_GOOGLE_API_KEY = your_google_api_key_here
```

**Note**: Make sure all variables are set to "Production", "Preview", and "Development" environments.

### 5. Deploy!

1. Click "Deploy"
2. Wait 1-2 minutes while Vercel builds and deploys your app
3. You'll get a URL like: `https://clock-in-app-xxx.vercel.app`

### 6. Configure Firebase for Production

Your app is now live, but you need to update Firebase settings:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project "clock-in-app-e6bfc"
3. Go to "Authentication" → "Settings" → "Authorized domains"
4. Add your Vercel URL: `clock-in-app-xxx.vercel.app`
5. Click "Add domain"

### 7. Configure Google Calendar (When Ready)

When you set up Google Calendar API:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Credentials"
4. Edit your OAuth 2.0 Client ID
5. Add to "Authorized JavaScript origins":
   - `https://your-vercel-url.vercel.app`
6. Add to "Authorized redirect URIs":
   - `https://your-vercel-url.vercel.app`
7. Save

Then add your Google credentials to Vercel:
1. Go to your Vercel project → "Settings" → "Environment Variables"
2. Add `VITE_GOOGLE_CLIENT_ID` and `VITE_GOOGLE_API_KEY`
3. Redeploy (Vercel → "Deployments" → "..." → "Redeploy")

## Automatic Deployments 🚀

**Great news!** Automatic deployments are already set up. Here's how it works:

- **Every push to `main` branch** → Automatic production deployment
- **Every push to other branches** → Preview deployment
- **Every pull request** → Preview deployment with unique URL

To trigger a deployment:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically:
1. Detect the push
2. Build your app
3. Deploy to production
4. Update your live URL
5. Send you a notification (if enabled)

## Managing Your Deployment

### View Your App
- Production URL: Check your Vercel dashboard
- Custom domain: You can add one in Project Settings → Domains

### View Build Logs
1. Go to Vercel dashboard
2. Click on your project
3. Click on any deployment
4. View real-time build logs

### Environment Variables
To add/update environment variables:
1. Vercel dashboard → Your project
2. Settings → Environment Variables
3. Add/Edit variables
4. Redeploy for changes to take effect

### Rollback
If something breaks:
1. Go to "Deployments"
2. Find a previous working deployment
3. Click "..." → "Promote to Production"

## Testing Cross-Device

Now that your app is deployed:

1. **On your computer**: Visit your Vercel URL and log in
2. **On your phone**: Visit the same URL and log in with the same Google account
3. **Test settings sync**:
   - Change settings on computer → Check phone (should match)
   - Change settings on phone → Check computer (should match)
4. **Test sessions**:
   - Clock in/out on one device
   - View the session on another device

## Custom Domain (Optional)

Want a custom domain like `clockin.yourdomain.com`?

1. Vercel dashboard → Your project → Settings → Domains
2. Add your domain
3. Follow the DNS instructions
4. Vercel will automatically provision SSL certificate

## Troubleshooting

### Build Fails
- Check build logs in Vercel
- Verify all environment variables are set
- Make sure all npm packages are in package.json

### Firebase Auth Not Working
- Verify Vercel URL is in Firebase authorized domains
- Check environment variables are correct
- Clear browser cache

### Google Calendar Not Working
- Verify Vercel URL is in OAuth authorized origins/redirects
- Check Google credentials in environment variables
- Make sure app is in Google Cloud testing mode with your email added

## Performance Tips

Vercel automatically handles:
- ✓ Global CDN
- ✓ Automatic HTTPS
- ✓ Edge caching
- ✓ Compression
- ✓ HTTP/2

Your app will be fast worldwide!

## Monitoring

Vercel provides:
- Real-time analytics (Project → Analytics)
- Error tracking
- Performance insights
- Bandwidth usage

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Firebase Docs: https://firebase.google.com/docs
- Check logs in Vercel dashboard
