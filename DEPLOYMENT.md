# Document Chatbot - Deployment Guide

## Deploying to Render

This guide will help you deploy the Document Chatbot to Render.

### Prerequisites

- GitHub account with the repository pushed
- MongoDB Atlas account (free tier available)
- Render account (https://render.com)
- Google OAuth credentials

### Step 1: Set Up MongoDB Atlas

1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free tier cluster
3. Create a database user with a strong password
4. Get your connection string (MONGODB_URI)
   - Click "Connect" → "Drivers" → Copy the connection string
   - Replace <password> with your user password

### Step 2: Get Google OAuth Credentials

1. Go to https://console.cloud.google.com
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (OAuth consent screen → Create credentials)
5. Add authorized redirect URIs:
   - https://your-service-name.onrender.com/api/auth/google
   - http://localhost:5173 (for local development)
6. Copy your Client ID (GOOGLE_CLIENT_ID)

### Step 3: Deploy on Render

1. Push your code to GitHub
2. Go to https://dashboard.render.com
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure the service:
   - **Name**: document-chatbot
   - **Runtime**: Node
   - **Root Directory**: (leave empty - Render will detect)
   - **Build Command**: \
pm run build:all\
   - **Start Command**: \
pm start\
   - **Plan**: Free (or upgraded for better performance)

6. Add Environment Variables:
   - \MONGODB_URI\: Your MongoDB connection string
   - \JWT_SECRET\: Generate using \openssl rand -base64 32\
   - \GROQ_API_KEY\: Get from https://console.groq.com
   - \OPENROUTER_API_KEY\: Get from https://openrouter.ai/keys
   - \GOOGLE_CLIENT_ID\: From Google Cloud Console
   - \CLIENT_URL\: https://your-service-name.onrender.com
   - \VITE_API_URL\: https://your-service-name.onrender.com
   - \NODE_ENV\: production

7. Click "Create Web Service"

### Step 4: Verify Deployment

After deployment completes:
1. Visit your Render service URL
2. Sign up with a test account
3. Upload a test PDF
4. Test the chat functionality

### Troubleshooting

**Build failures**:
- Check build logs in Render dashboard
- Ensure all environment variables are set
- Verify Node version is compatible

**Runtime errors**:
- Check service logs in Render dashboard
- Verify MongoDB connection string
- Check API keys are valid

**Frontend not loading**:
- Ensure CLIENT_URL and VITE_API_URL are correctly set
- Clear browser cache
- Check CORS configuration in server

### Local Development

To run locally:
\\\ash
npm install:all
npm run dev
\\\

### Production Checklist

- [ ] MongoDB Atlas cluster created and connection string saved
- [ ] Google OAuth credentials obtained
- [ ] Groq API key obtained
- [ ] OpenRouter API key obtained (optional)
- [ ] JWT_SECRET generated
- [ ] All environment variables configured in Render
- [ ] Code pushed to GitHub
- [ ] Service deployed and tested
- [ ] Custom domain configured (optional)
