# Production Readiness Checklist for Render Deployment

## ✅ Critical Security Fixes (DONE)

- [x] **JWT_SECRET** - Now reads from environment variable (was hardcoded)
- [x] **Email credentials** - Already using environment variables
- [x] **Database** - SQLite file (will be created on Render)

## 🔧 Required Environment Variables on Render

You **MUST** set these in Render Dashboard → Your Service → Environment:

### Required Variables:
```env
JWT_SECRET=your-very-secure-random-string-here-min-32-chars
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
BASE_URL=https://your-app-name.onrender.com
REPLY_TO_EMAIL=peerreview@csmr.org
```

### How to Set on Render:
1. Go to Render Dashboard
2. Click on your service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Add each variable above

## ⚠️ Critical: BASE_URL Configuration

**This is CRITICAL for email links to work!**

Your Render app URL will be something like:
- `https://csmr-platform.onrender.com`
- Or whatever you named your service

**Set BASE_URL to your exact Render URL** (with https://)

## 🔐 Generate Secure JWT_SECRET

Run this command to generate a secure secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use an online generator: https://randomkeygen.com/

**Minimum 32 characters recommended**

## ✅ Pre-Deployment Checklist

### 1. Environment Variables
- [ ] `JWT_SECRET` - Secure random string (32+ chars)
- [ ] `EMAIL_USER` - Your Gmail address
- [ ] `EMAIL_PASS` - Gmail App Password (16 chars, no spaces)
- [ ] `BASE_URL` - Your Render URL (https://your-app.onrender.com)
- [ ] `REPLY_TO_EMAIL` - Contact email (optional, defaults to peerreview@csmr.org)
- [ ] `PORT` - Usually auto-set by Render (optional)

### 2. Database
- [x] SQLite will auto-create on first run
- [x] Database file (`users.db`) will persist on Render's filesystem
- [ ] **Note:** For production scale, consider PostgreSQL later

### 3. Email Configuration
- [ ] Gmail 2FA enabled
- [ ] App Password generated
- [ ] Email credentials in Render environment variables
- [ ] Test email sending after deployment

### 4. Code Security
- [x] JWT_SECRET uses environment variable
- [x] No hardcoded credentials
- [x] `.env` file in `.gitignore` (won't be committed)

### 5. Deployment Configuration
- [x] `Procfile` exists: `web: node server.js`
- [x] `package.json` has start script
- [ ] Node.js version specified (optional, but recommended)

## 🚀 Deployment Steps on Render

### If Not Already Deployed:

1. **Connect GitHub Repository**
   - Go to Render Dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub repo
   - Select the repository

2. **Configure Service**
   - **Name:** `csmr-platform` (or your choice)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free tier is fine to start

3. **Set Environment Variables**
   - Add all variables from checklist above
   - **CRITICAL:** Set `BASE_URL` to your Render URL

4. **Deploy**
   - Click "Create Web Service"
   - Wait for build to complete
   - Check logs for errors

### If Already Deployed:

1. **Update Environment Variables**
   - Go to your service → Environment tab
   - Add/update variables
   - **CRITICAL:** Update `BASE_URL` if changed
   - **CRITICAL:** Add `JWT_SECRET` if missing

2. **Redeploy**
   - Click "Manual Deploy" → "Deploy latest commit"
   - Or push to GitHub (auto-deploys if enabled)

## 🧪 Post-Deployment Testing

### 1. Basic Functionality
- [ ] Homepage loads: `https://your-app.onrender.com`
- [ ] Registration works: `/register.html`
- [ ] Login works: `/login.html`
- [ ] Admin panel loads: `/admin.html`

### 2. Email Functionality (CRITICAL)
- [ ] Add a reviewer from admin panel
- [ ] Check email is received
- [ ] Click approval link in email
- [ ] Verify link works (should redirect to success page)
- [ ] Check that `BASE_URL` is correct in email links

### 3. Database Operations
- [ ] Create a user account
- [ ] Login with created account
- [ ] Submit a manuscript (if applicable)
- [ ] Assign reviewer (if applicable)

## 🔍 Common Issues & Fixes

### Issue: "JWT_SECRET not set"
**Fix:** Add `JWT_SECRET` environment variable in Render

### Issue: "Email not sending"
**Fix:** 
- Check `EMAIL_USER` and `EMAIL_PASS` are set
- Verify Gmail App Password is correct (no spaces)
- Check Render logs for email errors

### Issue: "Email links point to localhost"
**Fix:** Set `BASE_URL` environment variable to your Render URL

### Issue: "Database errors"
**Fix:** 
- SQLite should auto-create
- Check Render logs for database errors
- Ensure write permissions (should work by default)

### Issue: "App crashes on startup"
**Fix:**
- Check Render logs
- Verify all environment variables are set
- Check Node.js version compatibility

## 📊 Monitoring

### Check Render Logs:
1. Go to your service → "Logs" tab
2. Look for:
   - ✅ "Server running on port..."
   - ✅ "Connected to SQLite database"
   - ✅ "Email transporter is ready"
   - ❌ Any error messages

### Check Application:
- Visit your Render URL
- Test all major features
- Check email functionality

## 🎯 Current Status

### ✅ Fixed:
- JWT_SECRET now uses environment variable
- All other code is production-ready

### ⚠️ Action Required:
1. **Set JWT_SECRET in Render** (generate secure value)
2. **Set BASE_URL in Render** (your Render URL)
3. **Verify EMAIL_USER and EMAIL_PASS are set**
4. **Test email functionality after deployment**

## 📝 Quick Reference

**Render Environment Variables Needed:**
```env
JWT_SECRET=<generate-secure-32-char-string>
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
BASE_URL=https://your-app-name.onrender.com
REPLY_TO_EMAIL=peerreview@csmr.org
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Test Email After Deployment:**
1. Go to admin panel
2. Add a reviewer
3. Check email inbox
4. Verify links work

---

## ✅ Ready for Production?

**YES, after you:**
1. Set `JWT_SECRET` in Render (critical!)
2. Set `BASE_URL` in Render (critical for emails!)
3. Verify email credentials are set
4. Test after deployment

**The code is now production-ready!** 🚀

