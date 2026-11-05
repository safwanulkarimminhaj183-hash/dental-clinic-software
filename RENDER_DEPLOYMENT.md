# Render Deployment Instructions for Dental Backend

## Prerequisites
- A Render.com account (free tier available)
- GitHub account with the repository linked to Render

## Step 1: Deploy Backend to Render

### Option A: Manual Deployment via Render Dashboard

1. **Create a New Web Service on Render**
   - Go to https://dashboard.render.com/
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `safwanulkarimminhaj183-hash/dental-clinic-software`

2. **Configure the Web Service**
   - **Name**: dental-backend
   - **Region**: Choose nearest region (e.g., Oregon)
   - **Branch**: main
   - **Root Directory**: server
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`

3. **Add Environment Variables**
   Add these in the Environment section:
   - `MONGO_URI` = `mongodb+srv://admin:Admin12345@cluster0.jnscr4y.mongodb.net/dentist_db`
   - `JWT_SECRET` = `dentocare_jwt_secret_key_2026`
   - `PORT` = `5000`
   - `CLIENT_URL` = `https://dental-software-three.vercel.app`
   - `NODE_VERSION` = `18`

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete (usually 2-5 minutes)
   - Render will provide a URL like: `https://dental-backend.onrender.com`

### Option B: Using render.yaml (Blueprint)

1. Create a `render.yaml` file in the root of your repository
2. Commit and push to GitHub
3. Go to Render Dashboard → New → Blueprint
4. Select your repository and the render.yaml file

## Step 2: Update Vercel Environment Variables

Once Render provides the backend URL (e.g., `https://dental-backend.onrender.com`):

1. Update Vercel environment variable:
   ```bash
   vercel env rm VITE_API_BASE_URL production
   vercel env add VITE_API_BASE_URL production --value "https://dental-backend.onrender.com/api" --yes
   ```

2. Or update via Vercel Dashboard:
   - Go to https://vercel.com/minhajdev/dental-software/settings/environment-variables
   - Find `VITE_API_BASE_URL`
   - Update value to: `https://dental-backend.onrender.com/api`

## Step 3: Redeploy Vercel Frontend

```bash
vercel --prod
```

## Step 4: Verify Connection

Test the backend health:
```bash
curl https://dental-backend.onrender.com/api
```

Expected response:
```json
{
  "message": "DentoCare API running",
  "status": "ok"
}
```

Test frontend-backend connection by visiting:
https://dental-software-three.vercel.app

## Troubleshooting

### Backend fails to start on Render
- Check Render logs for errors
- Ensure all environment variables are set
- Verify MongoDB URI is accessible from Render (IP whitelist may be needed in MongoDB Atlas)

### CORS errors
- Ensure `CLIENT_URL` on Render matches your Vercel frontend URL
- Check CORS configuration in `server/index.js`

### Connection timeout
- Render free tier has a 15-second timeout for cold starts
- MongoDB connection may need optimization for cold starts
- Consider upgrading to Render Starter plan ($7/mo) for better performance

## Important Notes

- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds (cold start)
- MongoDB Atlas IP whitelist may need to allow Render's IP ranges
- Socket.io will not work on Render free tier (requires web service upgrade)
