# Email Setup for Reviewer Invitations

## Professional Email Template

The system now sends professional peer review invitation emails that match academic journal standards, including:
- Professional greeting with reviewer's name
- Manuscript title and abstract
- Two-step confirmation process (Agree/Decline links)
- Review deadline (14 days by default)
- Reviewer benefits information
- Contact information
- Full manuscript abstract at the bottom

## 📧 Complete Setup Guide

### Step 1: Enable 2-Factor Authentication on Gmail

1. **Go to Google Account Settings**
   - Visit: https://myaccount.google.com/
   - Sign in with your Gmail account

2. **Navigate to Security**
   - Click on "Security" in the left sidebar

3. **Enable 2-Step Verification**
   - Find "2-Step Verification" section
   - Click "Get started" or "Turn on"
   - Follow the prompts to set up 2FA (you can use your phone)

### Step 2: Generate App Password

1. **Go to App Passwords**
   - Still in Security settings: https://myaccount.google.com/apppasswords
   - Or go to: Google Account → Security → 2-Step Verification → App passwords

2. **Create App Password**
   - Select "Mail" as the app
   - Select "Other (Custom name)" as device
   - Enter name: "CSMR Platform" or "Node.js App"
   - Click "Generate"

3. **Copy the Password**
   - You'll see a 16-character password (like: `abcd efgh ijkl mnop`)
   - **Important:** Copy this password immediately - you won't see it again!
   - Remove spaces when using it: `abcdefghijklmnop`

### Step 3: Create .env File

1. **Create `.env` file in project root**
   - In your project folder: `/Users/talhanawaz/Desktop/CSMR FullStack/`
   - Create a new file named exactly: `.env` (with the dot at the beginning)

2. **Add your credentials**
   ```env
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_16_character_app_password
   REPLY_TO_EMAIL=peerreview@csmr.org
   BASE_URL=http://localhost:3000
   PORT=3000
   JWT_SECRET=your-secret-key-change-in-production
   ```

3. **Example `.env` file:**
   ```env
   EMAIL_USER=txlweb3@gmail.com
   EMAIL_PASS=jvje euix equx nfxp
   REPLY_TO_EMAIL=peerreview@csmr.org
   BASE_URL=http://localhost:3000
   PORT=3000
   JWT_SECRET=your-secret-key-change-in-production
   ```

   **Note:** Remove spaces from the app password if it has any.

### Step 4: Install Dependencies (if not done)

```bash
npm install
```

This installs:
- `nodemailer` - for sending emails
- `dotenv` - for loading .env file
- Other required packages

### Step 5: Start the Server

```bash
npm start
```

You should see:
```
🚀 Server running on http://localhost:3000
📊 Database: users.db
🔐 Authentication endpoints ready!
Email config: { user: 'your_email@gmail.com', pass: '***hidden***' }
```

### Step 6: Test Email Sending

1. **Open Admin Panel**
   - Go to: `http://localhost:3000/admin.html`
   - Login with admin credentials

2. **Navigate to Assign Reviewers**
   - Click on "Assign Reviewers" in the sidebar

3. **Select a Manuscript**
   - Choose a manuscript from the dropdown
   - Make sure it has title, authors, and abstract

4. **Invite a Reviewer**
   - Search for a reviewer or use existing ones
   - Click "Invite" button on any reviewer

5. **Check Email**
   - The reviewer should receive a professional invitation email
   - Check the reviewer's inbox (and spam folder if needed)

## 🔍 Troubleshooting

### Email Not Sending?

1. **Check .env file exists**
   ```bash
   ls -la .env
   ```

2. **Verify credentials in .env**
   - Make sure `EMAIL_USER` is your full Gmail address
   - Make sure `EMAIL_PASS` is the 16-character app password (no spaces)

3. **Check server logs**
   - Look for error messages in the terminal
   - Common errors:
     - `Invalid login`: Wrong app password
     - `Connection timeout`: Check internet/firewall
     - `Authentication failed`: 2FA not enabled

4. **Test App Password**
   - Try generating a new app password
   - Make sure 2FA is enabled

### Common Issues

**Issue:** "Invalid login: 534-5.7.9 Application-specific password required"
- **Solution:** Make sure you're using an App Password, not your regular Gmail password

**Issue:** "Connection timeout"
- **Solution:** Check firewall settings, try different network

**Issue:** "Email sent but not received"
- **Solution:** Check spam folder, verify recipient email is correct

## 📝 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `EMAIL_USER` | ✅ Yes | Your Gmail address | `your_email@gmail.com` |
| `EMAIL_PASS` | ✅ Yes | Gmail App Password (16 chars) | `abcdefghijklmnop` |
| `REPLY_TO_EMAIL` | ❌ No | Reply-to address | `peerreview@csmr.org` |
| `BASE_URL` | ❌ No | Base URL for links | `http://localhost:3000` |
| `PORT` | ❌ No | Server port | `3000` |
| `JWT_SECRET` | ❌ No | JWT secret key | `your-secret-key` |

## ✅ Verification Checklist

- [ ] 2-Factor Authentication enabled on Gmail
- [ ] App Password generated and copied
- [ ] `.env` file created in project root
- [ ] Credentials added to `.env` file
- [ ] Dependencies installed (`npm install`)
- [ ] Server starts without errors
- [ ] Email config shows in server logs
- [ ] Test invitation sent successfully

## Alternative Email Services

You can also use other email services by modifying the transporter configuration in `server.js`:

### SendGrid
```javascript
const transporter = nodemailer.createTransporter({
    service: 'SendGrid',
    auth: {
        user: 'apikey',
        pass: 'your_sendgrid_api_key'
    }
});
```

### Outlook/Hotmail
```javascript
const transporter = nodemailer.createTransporter({
    service: 'hotmail',
    auth: {
        user: 'your_email@outlook.com',
        pass: 'your_password'
    }
});
```
