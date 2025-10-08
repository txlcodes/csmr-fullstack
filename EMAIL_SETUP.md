# Email Setup for Reviewer Invitations

## Gmail Configuration

To enable email invitations for reviewers, you need to set up Gmail credentials:

### 1. Enable 2-Factor Authentication
- Go to your Google Account settings
- Enable 2-Factor Authentication

### 2. Generate App Password
- Go to Google Account > Security > App passwords
- Generate a new app password for "Mail"
- Copy the 16-character password

### 3. Set Environment Variables
Create a `.env` file in the project root with:
```
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_character_app_password
```

### 4. Test the System
1. Go to `http://localhost:3000/admin.html`
2. Navigate to "Assign Reviewers"
3. Select a manuscript
4. Click "Invite" on any reviewer
5. Check the reviewer's email for the invitation

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
