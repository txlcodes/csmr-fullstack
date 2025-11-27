require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Initialize SQLite Database
const db = new sqlite3.Database('users.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        
        // Create users table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'author',
            expertise TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error('Error creating users table:', err.message);
            } else {
                console.log('Users table created/verified');
                
                // Add role column if it doesn't exist (for existing databases)
                db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'author'`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.log('Role column added');
                    }
                });
                db.run(`ALTER TABLE users ADD COLUMN expertise TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.log('Expertise column added');
                    }
                });
                db.run(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'approved'`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.log('Status column added');
                    }
                });
                
                // Insert sample reviewers for testing
                db.run(`INSERT OR IGNORE INTO users (first_name, last_name, email, password, role, expertise) VALUES
                    ('James', 'Wilson', 'james.wilson@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Sustainability, Management, ESG'),
                    ('Lisa', 'Thompson', 'lisa.thompson@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Innovation, Technology, Research'),
                    ('Robert', 'Kim', 'robert.kim@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Environment, Policy, Climate'),
                    ('Sarah', 'Johnson', 'sarah.johnson@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Business, Finance, CSR'),
                    ('Michael', 'Chen', 'michael.chen@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Technology, Digital Transformation, Analytics')`);
                
                // Insert sample editors for testing
                db.run(`INSERT OR IGNORE INTO users (first_name, last_name, email, password, role, expertise) VALUES
                    ('Sarah', 'Johnson', 'sarah.johnson.editor@example.com', '$2a$10$dummy.hash.for.testing', 'editor', 'Sustainability & Management'),
                    ('Michael', 'Chen', 'michael.chen.editor@example.com', '$2a$10$dummy.hash.for.testing', 'editor', 'Innovation & Technology'),
                    ('Emily', 'Rodriguez', 'emily.rodriguez.editor@example.com', '$2a$10$dummy.hash.for.testing', 'editor', 'Environmental Studies'),
                    ('David', 'Williams', 'david.williams.editor@example.com', '$2a$10$dummy.hash.for.testing', 'editor', 'Business & Finance')`);
                
                // Create editor_assignments table
                db.run(`CREATE TABLE IF NOT EXISTS editor_assignments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    manuscript_id TEXT NOT NULL,
                    manuscript_title TEXT NOT NULL,
                    editor_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'assigned',
                    assigned_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    authors TEXT,
                    abstract TEXT,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (editor_id) REFERENCES users (id)
                )`, (err) => {
                    if (err) {
                        console.error('Error creating editor_assignments table:', err.message);
                    } else {
                        console.log('Editor assignments table created/verified');
                    }
                });
                
                // Create review_invitations table
                db.run(`CREATE TABLE IF NOT EXISTS review_invitations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    manuscript_id TEXT NOT NULL,
                    manuscript_title TEXT,
                    reviewer_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'pending',
                    accept_token TEXT UNIQUE NOT NULL,
                    decline_token TEXT UNIQUE NOT NULL,
                    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    authors TEXT,
                    abstract TEXT,
                    due_date TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (reviewer_id) REFERENCES users (id)
                )`, (err) => {
                    if (err) {
                        console.error('Error creating review_invitations table:', err.message);
                    } else {
                        console.log('Review invitations table created/verified');
                        // Add columns if they don't exist
                        db.run(`ALTER TABLE review_invitations ADD COLUMN manuscript_title TEXT`, (err) => {
                            if (err && !err.message.includes('duplicate column name')) {
                                console.log('manuscript_title column added');
                            }
                        });
                        db.run(`ALTER TABLE review_invitations ADD COLUMN authors TEXT`, (err) => {
                            if (err && !err.message.includes('duplicate column name')) {
                                console.log('authors column added');
                            }
                        });
                        db.run(`ALTER TABLE review_invitations ADD COLUMN abstract TEXT`, (err) => {
                            if (err && !err.message.includes('duplicate column name')) {
                                console.log('abstract column added');
                            }
                        });
                        db.run(`ALTER TABLE review_invitations ADD COLUMN due_date TEXT`, (err) => {
                            if (err && !err.message.includes('duplicate column name')) {
                                console.log('due_date column added');
                            }
                        });
                    }
                });
                
                // Create reviewer_approvals table
                db.run(`CREATE TABLE IF NOT EXISTS reviewer_approvals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reviewer_id INTEGER NOT NULL,
                    approval_token TEXT UNIQUE NOT NULL,
                    decline_token TEXT UNIQUE NOT NULL,
                    email TEXT NOT NULL,
                    first_name TEXT NOT NULL,
                    last_name TEXT NOT NULL,
                    expertise TEXT,
                    password_hash TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME NOT NULL,
                    FOREIGN KEY (reviewer_id) REFERENCES users (id)
                )`, (err) => {
                    if (err) {
                        console.error('Error creating reviewer_approvals table:', err.message);
                    } else {
                        console.log('Reviewer approvals table created/verified');
                        // Add decline_token column if it doesn't exist
                        db.run(`ALTER TABLE reviewer_approvals ADD COLUMN decline_token TEXT`, (err) => {
                            if (err && !err.message.includes('duplicate column name')) {
                                console.log('Decline token column added');
                            }
                        });
                    }
                });
                
                // Create submissions table
                db.run(`CREATE TABLE IF NOT EXISTS submissions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    manuscript_id TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    authors TEXT NOT NULL,
                    abstract TEXT NOT NULL,
                    keywords TEXT,
                    author_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'submitted',
                    submitted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                    file_path TEXT,
                    editor_id INTEGER,
                    decision TEXT,
                    decision_date DATETIME,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (author_id) REFERENCES users (id),
                    FOREIGN KEY (editor_id) REFERENCES users (id)
                )`, (err) => {
                    if (err) {
                        console.error('Error creating submissions table:', err.message);
                    } else {
                        console.log('Submissions table created/verified');
                    }
                });
                
                // Create reviews table
                db.run(`CREATE TABLE IF NOT EXISTS reviews (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    reviewer_id INTEGER NOT NULL,
                    manuscript_id TEXT NOT NULL,
                    manuscript_title TEXT NOT NULL,
                    assigned_date TEXT NOT NULL,
                    due_date TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    comments_to_author TEXT,
                    comments_to_editor TEXT,
                    recommendation TEXT,
                    submitted_date TEXT,
                    authors TEXT,
                    abstract TEXT,
                    invitation_id INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (reviewer_id) REFERENCES users (id),
                    FOREIGN KEY (invitation_id) REFERENCES review_invitations (id)
                )`, (err) => {
                    if (err) {
                        console.error('Error creating reviews table:', err.message);
                    } else {
                        console.log('Reviews table created/verified');
                        
                        // Add invitation_id column if it doesn't exist
                        db.run(`ALTER TABLE reviews ADD COLUMN invitation_id INTEGER`, (err) => {
                            if (err && !err.message.includes('duplicate column name')) {
                                console.log('Invitation ID column added to reviews');
                            }
                        });
                        
                        // Insert sample reviews for testing
                        db.run(`INSERT OR IGNORE INTO reviews (reviewer_id, manuscript_id, manuscript_title, assigned_date, due_date, status, authors, abstract) VALUES
                            (1, 'MS-2024-001', 'Sustainable Supply Chain Management in Indian Manufacturing', '2024-01-15', '2024-02-15', 'pending', 'Dr. Rajesh Kumar, Dr. Priya Sharma', 'This study examines sustainable supply chain practices in Indian manufacturing industries...'),
                            (2, 'MS-2024-002', 'ESG Reporting Impact on Financial Performance', '2024-01-20', '2024-02-20', 'in-progress', 'Dr. Vikram Singh', 'An analysis of how ESG reporting affects financial performance in publicly traded companies...'),
                            (3, 'MS-2024-003', 'Climate Change Adaptation Strategies for Business', '2024-01-25', '2024-02-25', 'completed', 'Dr. Anjali Patel, Dr. Ravi Gupta', 'A comprehensive study on business adaptation strategies for climate change impacts...')`);
                    }
                });
            }
        });
    }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { firstName, lastName, email, password, confirmPassword } = req.body;
        
        // Validation
        if (!firstName || !lastName || !email || !password || !confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Passwords do not match' 
            });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters' 
            });
        }
        
        // Check if user already exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            if (row) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User already exists with this email' 
                });
            }
            
            // Hash password and create user
            const hashedPassword = await bcrypt.hash(password, 10);
            
            db.run(
                'INSERT INTO users (first_name, last_name, email, password) VALUES (?, ?, ?, ?)',
                [firstName, lastName, email, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error creating user' 
                        });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: 'Registration successful! Welcome to CSMR!',
                        userId: this.lastID
                    });
                }
            );
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Login endpoint
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }
        
        // Find user
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            if (!user) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }
            
            // Check password
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Invalid email or password' 
                });
            }
            
            // Create JWT token
            const token = jwt.sign(
                { userId: user.id, email: user.email },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({ 
                success: true, 
                message: `Welcome back, ${user.first_name}!`,
                token: token,
                user: {
                    id: user.id,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    email: user.email
                }
            });
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Email configuration
// Load from .env file (create .env file with EMAIL_USER and EMAIL_PASS)
// For security, credentials should be in .env file, not hardcoded
console.log('Email config:', {
    user: process.env.EMAIL_USER || 'NOT_SET',
    pass: process.env.EMAIL_PASS ? '***hidden***' : 'NOT_SET'
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your_email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your_app_password'
    }
});

// Verify transporter connection
transporter.verify(function (error, success) {
    if (error) {
        console.error('❌ Email transporter verification failed:', error);
    } else {
        console.log('✅ Email transporter is ready to send emails');
    }
});

// Get reviewers endpoint
app.get('/api/reviewers', (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT id, first_name, last_name, email, expertise FROM users WHERE role = ? AND (status IS NULL OR status = ? OR status = ?)';
        let params = ['reviewer', 'approved', 'active'];
        
        if (search) {
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR expertise LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        db.all(query, params, (err, rows) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            res.json({ 
                success: true, 
                reviewers: rows 
            });
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Helper function to generate secure random token
function generateSecureToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Invite reviewer endpoint
app.post('/api/reviewers/invite', async (req, res) => {
    try {
        const { reviewerId, manuscriptId, manuscriptTitle, dueDate, authors, abstract } = req.body;
        
        // Validation
        if (!reviewerId || !manuscriptId || !manuscriptTitle) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: reviewerId, manuscriptId, and manuscriptTitle are required' 
            });
        }
        
        // Get reviewer details
        db.get('SELECT first_name, last_name, email, expertise FROM users WHERE id = ? AND role = ?', 
               [reviewerId, 'reviewer'], async (err, reviewer) => {
            if (err) {
                console.error('Database error fetching reviewer:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            if (!reviewer) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Reviewer not found' 
                });
            }
            
            // Generate unique secure tokens
            const acceptToken = generateSecureToken();
            const declineToken = generateSecureToken();
            
            // Set token expiry to 7 days from now
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);
            const expiresAtISO = expiresAt.toISOString();
            
            // Calculate review deadline (default 14 days)
            const dueDateObj = dueDate ? new Date(dueDate) : new Date();
            if (!dueDate) {
                dueDateObj.setDate(dueDateObj.getDate() + 14);
            }
            const reviewDeadline = Math.ceil((dueDateObj - new Date()) / (1000 * 60 * 60 * 24));
            
            // Base URL for links
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            const acceptLink = `${baseUrl}/api/reviewers/accept/${acceptToken}`;
            const declineLink = `${baseUrl}/api/reviewers/decline/${declineToken}`;
            
            // Format reviewer name
            const reviewerName = `Dr. ${reviewer.first_name} ${reviewer.last_name}`;
            const reviewerNameUpper = `Dr. ${reviewer.first_name.toUpperCase()} ${reviewer.last_name.toUpperCase()}`;
            
            // Get reviewer expertise for email
            const reviewerExpertise = reviewer.expertise || 'your field of expertise';
            
            // Email content - Professional format matching academic journal standards
            const mailOptions = {
                from: `"CSMR - Centre for Sustainability & Management Research" <${process.env.EMAIL_USER || 'peerreview@csmr.org'}>`,
                to: reviewer.email,
                replyTo: process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org',
                subject: `Invitation to Review Manuscript: ${manuscriptTitle}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; max-width: 700px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 20px 0;">Dear ${reviewerName},</p>
                            
                            <p style="margin: 0 0 15px 0;">We recently received a manuscript titled <strong>"${manuscriptTitle}"</strong> for <strong>Centre for Sustainability & Management Research (CSMR)</strong>.</p>
                            
                            <p style="margin: 0 0 15px 0;">Given your expertise in ${reviewerExpertise}, we would like to invite you to review it.</p>
                            
                            <p style="margin: 0 0 15px 0;"><strong>If you agree to review, please click the appropriate link below:</strong></p>
                            
                            <p style="margin: 0 0 10px 0;">If you are unable to review, you can suggest alternative reviewers via the online system after clicking the 'Decline' link.</p>
                            
                            <p style="margin: 15px 0; padding: 10px; background-color: #fff3cd; border-left: 4px solid #ffc107; color: #856404;">
                                <strong>*** PLEASE NOTE: This is a two-step process. After clicking on the link, you will be directed to a webpage to confirm. ***</strong>
                            </p>
                            
                            <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                                <p style="margin: 0 0 15px 0; font-weight: bold;">Action Links:</p>
                                <p style="margin: 0 0 10px 0;">
                                    <strong>Accept:</strong> 
                                    <a href="${acceptLink}" style="color: #0066cc; word-break: break-all;">${acceptLink}</a>
                                </p>
                                <p style="margin: 0;">
                                    <strong>Decline:</strong> 
                                    <a href="${declineLink}" style="color: #0066cc; word-break: break-all;">${declineLink}</a>
                                </p>
                            </div>
                            
                            <p style="margin: 15px 0;">Please complete your review within <strong>${reviewDeadline} days</strong> after accepting.</p>
                            
                            <p style="margin: 15px 0;">For questions, contact <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}" style="color: #0066cc;">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a>.</p>
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                                <p style="margin: 0 0 5px 0;">Regards,</p>
                                <p style="margin: 0 0 5px 0;"><strong>Editorial Office</strong></p>
                                <p style="margin: 0 0 5px 0;"><strong>Centre for Sustainability & Management Research (CSMR)</strong></p>
                            </div>
                            
                            ${abstract ? `
                            <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                                <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a1a1a;">MANUSCRIPT INFORMATION</h3>
                                <p style="margin: 0 0 10px 0;"><strong>TITLE:</strong> ${manuscriptTitle}</p>
                                ${authors ? `<p style="margin: 0 0 10px 0;"><strong>AUTHORS:</strong> ${authors}</p>` : ''}
                                <p style="margin: 0 0 10px 0;"><strong>ABSTRACT:</strong></p>
                                <p style="margin: 0; text-align: justify; line-height: 1.8;">${abstract}</p>
                            </div>
                            ` : ''}
                            </div>
                            
                        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px; font-size: 12px; color: #666;">
                            <p style="margin: 0;"><strong>Note:</strong> This is an automated email. Please do not reply directly to this message.</p>
                            <p style="margin: 5px 0 0 0;">If you have questions, contact us at <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}" style="color: #0066cc;">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a></p>
                        </div>
                    </body>
                    </html>
                `
            };
            
            try {
                // Save invitation to database first
                const dueDateISO = dueDate ? new Date(dueDate).toISOString().split('T')[0] : dueDateObj.toISOString().split('T')[0];
                
                console.log('Saving invitation to database...', {
                    manuscriptId,
                    reviewerId,
                    reviewerEmail: reviewer.email
                });
                
                db.run(
                    `INSERT INTO review_invitations (manuscript_id, manuscript_title, reviewer_id, status, accept_token, decline_token, expires_at, authors, abstract, due_date)
                     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
                    [manuscriptId, manuscriptTitle, reviewerId, acceptToken, declineToken, expiresAtISO, authors || '', abstract || '', dueDateISO],
                    async function(err) {
                        if (err) {
                            console.error('Error saving invitation:', err);
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Failed to save invitation record' 
                            });
                        }
                        
                        const invitationId = this.lastID;
                        console.log('Invitation saved with ID:', invitationId);
                        console.log('Preparing to send email to:', reviewer.email);
                        console.log('Email transporter configured:', !!transporter);
                        
                        try {
                            // Send email
                            console.log('Sending email...');
                            const emailResult = await transporter.sendMail(mailOptions);
                            console.log('Email sent successfully!', {
                                messageId: emailResult.messageId,
                                to: reviewer.email
                            });
                            
                            res.json({ 
                                success: true, 
                                message: 'Invitation sent successfully' 
                            });
                        } catch (emailError) {
                            console.error('Email sending failed:', emailError);
                            console.error('Email error details:', {
                                code: emailError.code,
                                command: emailError.command,
                                response: emailError.response,
                                message: emailError.message
                            });
                            // Rollback invitation if email fails
                            db.run('DELETE FROM review_invitations WHERE id = ?', [invitationId], (delErr) => {
                                if (delErr) console.error('Error deleting invitation after email failure:', delErr);
                            });
                            res.status(500).json({ 
                                success: false, 
                                message: 'Failed to send email: ' + (emailError.message || 'Unknown error') 
                            });
                        }
                    }
                );
            } catch (error) {
                console.error('Error in invitation process:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Server error: ' + error.message 
                });
            }
        });
        
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Accept review invitation
app.get('/api/reviewers/accept/:token', (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            return res.status(400).send(`
                <html>
                <head><title>Invalid Link</title></head>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                    <h2>Invalid or Missing Token</h2>
                    <p>The review invitation link is invalid or has expired.</p>
                    <p>Please contact the editorial office if you believe this is an error.</p>
                </body>
                </html>
            `);
        }
        
        // Find invitation by accept_token
        db.get(
            `SELECT * FROM review_invitations WHERE accept_token = ? AND status = 'pending'`,
            [token],
            (err, invitation) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send(`
                        <html>
                        <head><title>Server Error</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2>Server Error</h2>
                            <p>An error occurred processing your request. Please try again later.</p>
                        </body>
                        </html>
                    `);
                }
                
                if (!invitation) {
                    return res.status(404).send(`
                        <html>
                        <head><title>Invitation Not Found</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2>Invitation Not Found</h2>
                            <p>The review invitation link is invalid or has already been processed.</p>
                            <p>Please contact the editorial office if you need assistance.</p>
                        </body>
                        </html>
                    `);
                }
                
                // Check token expiry (7 days)
                const expiresAt = new Date(invitation.expires_at);
                const now = new Date();
                
                if (now > expiresAt) {
                    return res.status(400).send(`
                        <html>
                        <head><title>Token Expired</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2>Invitation Expired</h2>
                            <p>This review invitation has expired. Invitations are valid for 7 days.</p>
                            <p>Please contact the editorial office if you would still like to review this manuscript.</p>
                            <p>Email: <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a></p>
                        </body>
                        </html>
                    `);
                }
                
                // Update invitation status to 'accepted'
                db.run(
                    `UPDATE review_invitations SET status = 'accepted' WHERE id = ?`,
                    [invitation.id],
                    (err) => {
                        if (err) {
                            console.error('Error updating invitation status:', err);
                            return res.status(500).send('Server error');
                        }
                        
                        // Create or update review record using invitation data
                        const assignedDate = new Date().toISOString();
                        const dueDate = invitation.due_date || (() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 14);
                            return d.toISOString().split('T')[0];
                        })();
                        
                        // Check if review already exists
                        db.get(
                            `SELECT id FROM reviews 
                             WHERE reviewer_id = ? AND manuscript_id = ? 
                             ORDER BY created_at DESC LIMIT 1`,
                            [invitation.reviewer_id, invitation.manuscript_id],
                            (err, existingReview) => {
                                if (err) {
                                    console.error('Error checking existing review:', err);
                                }
                                
                                if (!existingReview) {
                                    // Create new review record
                                    db.run(
                                        `INSERT INTO reviews (reviewer_id, manuscript_id, manuscript_title, assigned_date, due_date, status, invitation_id, authors, abstract)
                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                        [
                                            invitation.reviewer_id, 
                                            invitation.manuscript_id, 
                                            invitation.manuscript_title || 'Manuscript',
                                            assignedDate, 
                                            dueDate,
                                            'in-progress',
                                            invitation.id,
                                            invitation.authors || '',
                                            invitation.abstract || ''
                                        ],
                                        (err) => {
                                            if (err) {
                                                console.error('Error creating review record:', err);
                                            }
                                        }
                                    );
                                } else {
                                    // Update existing review to link with invitation
                                    db.run(
                                        `UPDATE reviews SET status = 'in-progress', invitation_id = ?, assigned_date = ?
                                         WHERE reviewer_id = ? AND manuscript_id = ?`,
                                        [invitation.id, assignedDate, invitation.reviewer_id, invitation.manuscript_id],
                                        (err) => {
                                            if (err) {
                                                console.error('Error updating review:', err);
                                            }
                                        }
                                    );
                                }
                                
                                res.send(`
                                    <html>
                                    <head>
                                        <title>Review Confirmed</title>
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                    </head>
                                    <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                                        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
                                            <h2 style="color: #155724; margin: 0 0 10px 0;">✓ Review Confirmed</h2>
                                            <p style="color: #155724; margin: 0;">Thank you for agreeing to review this manuscript!</p>
                                        </div>
                                        <p>You have successfully confirmed your agreement to review the manuscript. The editorial team has been notified.</p>
                                        <p>You will receive further instructions and access to the manuscript shortly.</p>
                                        <p>If you have any questions, please contact the editorial office at <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a>.</p>
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                                            <p style="color: #666; font-size: 14px;">This is a two-step confirmation process. Your response has been recorded.</p>
                            </div>
                                    </body>
                                    </html>
                                `);
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error processing agreement:', error);
        res.status(500).send('Server error');
    }
});

// Decline review invitation
app.get('/api/reviewers/decline/:token', (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            return res.status(400).send(`
                <html>
                <head><title>Invalid Link</title></head>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                    <h2>Invalid or Missing Token</h2>
                    <p>The review invitation link is invalid or has expired.</p>
                </body>
                </html>
            `);
        }
        
        // Find invitation by decline_token
        db.get(
            `SELECT * FROM review_invitations WHERE decline_token = ? AND status = 'pending'`,
            [token],
            (err, invitation) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send(`
                        <html>
                        <head><title>Server Error</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2>Server Error</h2>
                            <p>An error occurred processing your request. Please try again later.</p>
                        </body>
                        </html>
                    `);
                }
                
                if (!invitation) {
                    return res.status(404).send(`
                        <html>
                        <head><title>Invitation Not Found</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2>Invitation Not Found</h2>
                            <p>The review invitation link is invalid or has already been processed.</p>
                        </body>
                        </html>
                    `);
                }
                
                // Check token expiry (7 days)
                const expiresAt = new Date(invitation.expires_at);
                const now = new Date();
                
                if (now > expiresAt) {
                    return res.status(400).send(`
                        <html>
                        <head><title>Token Expired</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2>Invitation Expired</h2>
                            <p>This review invitation has expired. Invitations are valid for 7 days.</p>
                            <p>Please contact the editorial office if you have any questions.</p>
                            <p>Email: <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a></p>
                        </body>
                        </html>
                    `);
                }
                
                // Update invitation status to 'declined'
                db.run(
                    `UPDATE review_invitations SET status = 'declined' WHERE id = ?`,
                    [invitation.id],
                    (err) => {
                        if (err) {
                            console.error('Error updating invitation status:', err);
                            return res.status(500).send('Server error');
                        }
                        
                        res.send(`
                            <html>
                            <head>
                                <title>Review Declined</title>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            </head>
                            <body style="font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; line-height: 1.6;">
                                <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 5px; padding: 20px; margin-bottom: 20px;">
                                    <h2 style="color: #856404; margin: 0 0 10px 0;">Review Declined</h2>
                                    <p style="color: #856404; margin: 0;">Thank you for your response.</p>
                            </div>
                                <p>You have declined the review invitation. The editorial team has been notified.</p>
                                <p>If you would like to suggest alternative reviewers, please contact the editorial office at <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a>.</p>
                                <p>We appreciate your consideration and hope to work with you on future manuscripts.</p>
                                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                                    <p style="color: #666; font-size: 14px;">This is a two-step confirmation process. Your response has been recorded.</p>
                        </div>
                            </body>
                            </html>
                        `);
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error processing decline:', error);
        res.status(500).send('Server error');
    }
});

// ==================== EDITOR ENDPOINTS ====================

// Get editors endpoint
app.get('/api/editors', (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT id, first_name, last_name, email, expertise FROM users WHERE role = ?';
        let params = ['editor'];
        
        if (search) {
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR expertise LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }
        
        db.all(query, params, (err, rows) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            res.json({ 
                success: true, 
                editors: rows 
            });
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Delete editor endpoint
app.delete('/api/editors/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if editor has any active assignments
        db.get(
            'SELECT COUNT(*) as count FROM editor_assignments WHERE editor_id = ? AND status = "assigned"',
            [id],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Database error' 
                    });
                }
                
                if (result.count > 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Cannot delete editor with active assignments. Please reassign manuscripts first.' 
                    });
                }
                
                // Delete editor
                db.run('DELETE FROM users WHERE id = ? AND role = ?', [id, 'editor'], function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error deleting editor' 
                        });
                    }
                    
                    if (this.changes === 0) {
                        return res.status(404).json({ 
                            success: false, 
                            message: 'Editor not found' 
                        });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: 'Editor deleted successfully' 
                    });
                });
            }
        );
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Add editor endpoint
app.post('/api/editors/add', async (req, res) => {
    try {
        const { firstName, lastName, email, expertise, password } = req.body;
        
        // Validation
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }
        
        // Check if editor already exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            if (row) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Editor with this email already exists' 
                });
            }
            
            // Hash password and create editor
            const hashedPassword = await bcrypt.hash(password, 10);
            
            db.run(
                'INSERT INTO users (first_name, last_name, email, password, role, expertise) VALUES (?, ?, ?, ?, ?, ?)',
                [firstName, lastName, email, hashedPassword, 'editor', expertise || ''],
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error creating editor' 
                        });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: 'Editor added successfully!',
                        editorId: this.lastID
                    });
                }
            );
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Assign editor to manuscript endpoint
app.post('/api/editors/assign', async (req, res) => {
    try {
        const { editorId, manuscriptId, manuscriptTitle, authors, abstract, notes } = req.body;
        
        // Validation
        if (!editorId || !manuscriptId || !manuscriptTitle) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: editorId, manuscriptId, and manuscriptTitle are required' 
            });
        }
        
        // Get editor details
        db.get('SELECT first_name, last_name, email FROM users WHERE id = ? AND role = ?', 
               [editorId, 'editor'], async (err, editor) => {
            if (err) {
                console.error('Database error fetching editor:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            if (!editor) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Editor not found' 
                });
            }
            
            // Base URL for links
            const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
            const dashboardLink = `${baseUrl}/dashboard.html`;
            
            // Format editor name
            const editorName = `Dr. ${editor.first_name} ${editor.last_name}`;
            
            // Professional email template for editor assignment
            const mailOptions = {
                from: `"CSMR - Centre for Sustainability & Management Research" <${process.env.EMAIL_USER || 'peerreview@csmr.org'}>`,
                to: editor.email,
                replyTo: process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org',
                subject: `Editor Assignment: ${manuscriptTitle}`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    </head>
                    <body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; max-width: 700px; margin: 0 auto; padding: 20px;">
                        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                            <p style="margin: 0 0 20px 0;">Dear ${editorName},</p>
                            
                            <p style="margin: 0 0 15px 0;">You have been assigned as the <strong>Editor</strong> for the following manuscript submitted to <strong>Centre for Sustainability & Management Research (CSMR)</strong>:</p>
                            
                            <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #1e3a8a; margin: 20px 0; border-radius: 5px;">
                                <p style="margin: 0 0 10px 0;"><strong>Manuscript ID:</strong> ${manuscriptId}</p>
                                <p style="margin: 0 0 10px 0;"><strong>Title:</strong> ${manuscriptTitle}</p>
                                ${authors ? `<p style="margin: 0 0 10px 0;"><strong>Authors:</strong> ${authors}</p>` : ''}
                    </div>
                            
                            <p style="margin: 15px 0;"><strong>Your responsibilities as Editor include:</strong></p>
                            <ul style="margin: 15px 0; padding-left: 20px;">
                                <li>Review the manuscript for scope, quality, and relevance</li>
                                <li>Assign appropriate reviewers based on expertise</li>
                                <li>Monitor the review process and ensure timely completion</li>
                                <li>Make editorial decisions based on reviewer recommendations</li>
                                <li>Communicate with authors regarding manuscript status</li>
                            </ul>
                            
                            <div style="margin: 25px 0; padding: 20px; background-color: #e7f3ff; border-radius: 5px;">
                                <p style="margin: 0 0 10px 0; font-weight: bold;">Access Your Editor Dashboard:</p>
                                <p style="margin: 0 0 15px 0;">You can access the manuscript and manage the editorial process through your dashboard:</p>
                                <div style="text-align: center; margin: 15px 0;">
                                    <a href="${dashboardLink}" style="background-color: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                        Access Editor Dashboard
                                    </a>
                                </div>
                            </div>
                            
                            ${notes ? `
                            <div style="margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px;">
                                <p style="margin: 0 0 10px 0; font-weight: bold;">Additional Notes:</p>
                                <p style="margin: 0;">${notes}</p>
                            </div>
                            ` : ''}
                            
                            ${abstract ? `
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                                <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #1a1a1a;">MANUSCRIPT ABSTRACT</h3>
                                <p style="margin: 0; text-align: justify; line-height: 1.8;">${abstract}</p>
                            </div>
                            ` : ''}
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                                <p style="margin: 0 0 5px 0;">Thank you for your continued contribution to CSMR.</p>
                                <p style="margin: 0 0 5px 0;"><strong>Editorial Office</strong></p>
                                <p style="margin: 0 0 5px 0;"><strong>Centre for Sustainability & Management Research (CSMR)</strong></p>
                                <p style="margin: 5px 0 0 0;">
                                    <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}" style="color: #0066cc;">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a>
                                </p>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px; font-size: 12px; color: #666;">
                            <p style="margin: 0;"><strong>Note:</strong> This is an automated email. Please do not reply directly to this message.</p>
                            <p style="margin: 5px 0 0 0;">If you have questions, contact us at <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}" style="color: #0066cc;">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a></p>
                        </div>
                    </body>
                    </html>
                `
            };
            
            try {
                // Save editor assignment to database first
                db.run(
                    `INSERT INTO editor_assignments (manuscript_id, manuscript_title, editor_id, status, authors, abstract, notes)
                     VALUES (?, ?, ?, 'assigned', ?, ?, ?)`,
                    [manuscriptId, manuscriptTitle, editorId, authors || '', abstract || '', notes || ''],
                    async function(err) {
                        if (err) {
                            console.error('Error saving editor assignment:', err);
                            return res.status(500).json({ 
                                success: false, 
                                message: 'Failed to save editor assignment' 
                            });
                        }
                        
                        const assignmentId = this.lastID;
                        
                        try {
                            // Send email
                await transporter.sendMail(mailOptions);
                            
                res.json({ 
                    success: true, 
                                message: 'Editor assigned successfully and notification email sent!',
                                assignmentId: assignmentId
                });
            } catch (emailError) {
                console.error('Email error:', emailError);
                            // Rollback assignment if email fails
                            db.run('DELETE FROM editor_assignments WHERE id = ?', [assignmentId]);
                res.status(500).json({ 
                    success: false, 
                                message: 'Failed to send email: ' + emailError.message 
                            });
                        }
                    }
                );
            } catch (error) {
                console.error('Error in editor assignment process:', error);
                res.status(500).json({ 
                    success: false, 
                    message: 'Server error' 
                });
            }
        });
        
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Delete reviewer endpoint
app.delete('/api/reviewers/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if reviewer has any active reviews
        db.get(
            'SELECT COUNT(*) as count FROM reviews WHERE reviewer_id = ? AND status IN ("pending", "in-progress")',
            [id],
            (err, result) => {
                if (err) {
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Database error' 
                    });
                }
                
                if (result.count > 0) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'Cannot delete reviewer with active reviews. Please complete or reassign reviews first.' 
                    });
                }
                
                // Delete reviewer
                db.run('DELETE FROM users WHERE id = ? AND role = ?', [id, 'reviewer'], function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error deleting reviewer' 
                        });
                    }
                    
                    if (this.changes === 0) {
                        return res.status(404).json({ 
                            success: false, 
                            message: 'Reviewer not found' 
                        });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: 'Reviewer deleted successfully' 
                    });
                });
            }
        );
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Add reviewer endpoint - creates pending reviewer and sends approval email
app.post('/api/reviewers/add', async (req, res) => {
    try {
        const { firstName, lastName, email, expertise, password } = req.body;
        
        // Validation
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'All fields are required' 
            });
        }
        
        // Check if reviewer already exists (including pending)
        db.get('SELECT id, status FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.error('Error checking existing reviewer:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error: ' + err.message 
                });
            }
            
            if (row) {
                const statusMsg = row.status === 'pending' 
                    ? 'A pending invitation already exists for this email. Please wait for the reviewer to approve their invitation.'
                    : 'Reviewer with this email already exists';
                console.log('Reviewer already exists:', { email, status: row.status });
                return res.status(400).json({ 
                    success: false, 
                    message: statusMsg 
                });
            }
            
            // Check if there's a pending approval for this email
            db.get('SELECT id FROM reviewer_approvals WHERE email = ? AND status = ?', [email, 'pending'], async (err, pendingApproval) => {
                if (err) {
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Database error' 
                    });
                }
                
                if (pendingApproval) {
                    return res.status(400).json({ 
                        success: false, 
                        message: 'A pending approval already exists for this email. Please wait for the reviewer to approve.' 
                    });
                }
                
                // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
                // Create a temporary user record with pending status
            console.log('Creating reviewer user record...', {
                firstName,
                lastName,
                email,
                role: 'reviewer',
                expertise: expertise || '',
                status: 'pending'
            });
            
            db.run(
                    'INSERT INTO users (first_name, last_name, email, password, role, expertise, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [firstName, lastName, email, hashedPassword, 'reviewer', expertise || '', 'pending'],
                    async function(err) {
                    if (err) {
                        console.error('❌ Error creating reviewer in database:', err);
                        console.error('Database error details:', {
                            code: err.code,
                            message: err.message,
                            stack: err.stack
                        });
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error creating reviewer: ' + (err.message || 'Database error') 
                        });
                    }
                        
                        const reviewerId = this.lastID;
                        
                        // Generate approval and decline tokens
                        const approvalToken = generateSecureToken();
                        const declineToken = generateSecureToken();
                        
                        // Set token expiry to 7 days from now
                        const expiresAt = new Date();
                        expiresAt.setDate(expiresAt.getDate() + 7);
                        const expiresAtISO = expiresAt.toISOString();
                        
                        // Save approval record
                        db.run(
                            `INSERT INTO reviewer_approvals (reviewer_id, approval_token, decline_token, email, first_name, last_name, expertise, password_hash, expires_at)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [reviewerId, approvalToken, declineToken, email, firstName, lastName, expertise || '', hashedPassword, expiresAtISO],
                            async function(err) {
                                if (err) {
                                    // Rollback: delete the user if approval record creation fails
                                    db.run('DELETE FROM users WHERE id = ?', [reviewerId]);
                                    return res.status(500).json({ 
                                        success: false, 
                                        message: 'Error creating approval record' 
                                    });
                                }
                                
                                // Send approval email with Accept/Decline links
                                const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
                                const approvalLink = `${baseUrl}/api/reviewers/approve/${approvalToken}`;
                                const declineLink = `${baseUrl}/api/reviewers/decline-invitation/${declineToken}`;
                                
                                const reviewerName = `${firstName} ${lastName}`;
                                const reviewerExpertise = expertise || 'your field';
                                
                                console.log('Preparing to send reviewer approval email to:', email);
                                console.log('Reviewer details:', {
                                    reviewerId,
                                    firstName,
                                    lastName,
                                    email,
                                    expertise
                                });
                                
                                const mailOptions = {
                                    from: `"CSMR - Centre for Sustainability & Management Research" <${process.env.EMAIL_USER || 'peerreview@csmr.org'}>`,
                                    to: email,
                                    replyTo: process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org',
                                    subject: 'Invitation to Join CSMR as a Reviewer',
                                    html: `
                                        <!DOCTYPE html>
                                        <html>
                                        <head>
                                            <meta charset="UTF-8">
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        </head>
                                        <body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; max-width: 700px; margin: 0 auto; padding: 20px;">
                                            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                                                <p style="margin: 0 0 20px 0;">Dear ${reviewerName},</p>
                                                
                                                <p style="margin: 0 0 15px 0;">You have been invited to join <strong>Centre for Sustainability & Management Research (CSMR)</strong> as a reviewer.</p>
                                                
                                                <p style="margin: 0 0 15px 0;">We would be honored to have you as part of our peer review team. Your expertise in <strong>${reviewerExpertise}</strong> would be invaluable to our publication process.</p>
                                                
                                                <p style="margin: 0 0 15px 0;"><strong>If you agree to join as a reviewer, please click the appropriate link below:</strong></p>
                                                
                                                <p style="margin: 0 0 10px 0;">If you are unable to accept this invitation, you can decline via the link below.</p>
                                                
                                                <p style="margin: 15px 0; padding: 10px; background-color: #fff3cd; border-left: 4px solid #ffc107; color: #856404;">
                                                    <strong>*** PLEASE NOTE: This is a two-step process. After clicking on the link, you will be directed to a webpage to confirm. ***</strong>
                                                </p>
                                                
                                                <div style="margin: 25px 0; padding: 20px; background-color: #f8f9fa; border-radius: 5px;">
                                                    <p style="margin: 0 0 15px 0; font-weight: bold;">Action Links:</p>
                                                    <p style="margin: 0 0 10px 0;">
                                                        <strong>Accept:</strong> 
                                                        <a href="${approvalLink}" style="color: #0066cc; word-break: break-all;">${approvalLink}</a>
                                                    </p>
                                                    <p style="margin: 0;">
                                                        <strong>Decline:</strong> 
                                                        <a href="${declineLink}" style="color: #0066cc; word-break: break-all;">${declineLink}</a>
                                                    </p>
                                                </div>
                                                
                                                <p style="margin: 15px 0; font-size: 12px; color: #666666;">This invitation will expire in 7 days.</p>
                                                
                                                <p style="margin: 15px 0;">For questions, contact <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}" style="color: #0066cc;">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a>.</p>
                                                
                                                <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                                                    <p style="margin: 0 0 5px 0;">Regards,</p>
                                                    <p style="margin: 0 0 5px 0;"><strong>Editorial Office</strong></p>
                                                    <p style="margin: 0 0 5px 0;"><strong>Centre for Sustainability & Management Research (CSMR)</strong></p>
                                                </div>
                                                
                                                <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px; font-size: 12px; color: #666;">
                                                    <p style="margin: 0;"><strong>Note:</strong> This is an automated email. Please do not reply directly to this message.</p>
                                                    <p style="margin: 5px 0 0 0;">If you have questions, contact us at <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}" style="color: #0066cc;">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a></p>
                                                </div>
                                            </div>
                                        </body>
                                        </html>
                                    `
                                };
                                
                                try {
                                    console.log('Sending reviewer approval email...');
                                    console.log('Email transporter configured:', !!transporter);
                                    console.log('Email config check:', {
                                        user: process.env.EMAIL_USER ? 'SET' : 'NOT_SET',
                                        pass: process.env.EMAIL_PASS ? 'SET' : 'NOT_SET'
                                    });
                                    
                                    const emailResult = await transporter.sendMail(mailOptions);
                                    console.log('✅ Reviewer approval email sent successfully!', {
                                        messageId: emailResult.messageId,
                                        to: email,
                                        reviewerId: reviewerId
                                    });
                    
                    res.json({ 
                        success: true, 
                                        message: 'Reviewer invitation sent successfully! The reviewer will receive an email to approve their account.',
                                        reviewerId: reviewerId
                                    });
                                } catch (emailError) {
                                    console.error('❌ Error sending approval email:', emailError);
                                    console.error('Email error details:', {
                                        code: emailError.code,
                                        command: emailError.command,
                                        response: emailError.response,
                                        message: emailError.message,
                                        stack: emailError.stack
                                    });
                                    // Rollback: delete user and approval record if email fails
                                    db.run('DELETE FROM reviewer_approvals WHERE reviewer_id = ?', [reviewerId], (err) => {
                                        if (err) console.error('Error deleting approval record:', err);
                                    });
                                    db.run('DELETE FROM users WHERE id = ?', [reviewerId], (err) => {
                                        if (err) console.error('Error deleting user:', err);
                                    });
                                    
                                    return res.status(500).json({ 
                                        success: false, 
                                        message: 'Reviewer created but failed to send approval email: ' + (emailError.message || 'Unknown error') 
                                    });
                                }
                            }
                        );
                    }
                );
            });
        });
        
    } catch (error) {
        console.error('Error adding reviewer:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Reviewer approval endpoint
app.get('/api/reviewers/approve/:token', (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            return res.status(400).send(`
                <html>
                <head><title>Invalid Link</title></head>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                    <h2 style="color: #dc2626;">Invalid or Missing Token</h2>
                    <p>The approval link is invalid or has expired.</p>
                    <p>Please contact the editorial office if you believe this is an error.</p>
                </body>
                </html>
            `);
        }
        
        // Find approval record by approval_token
        db.get(
            `SELECT * FROM reviewer_approvals WHERE approval_token = ? AND status = 'pending'`,
            [token],
            (err, approval) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send(`
                        <html>
                        <head><title>Server Error</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2 style="color: #dc2626;">Server Error</h2>
                            <p>An error occurred processing your request. Please try again later.</p>
                        </body>
                        </html>
                    `);
                }
                
                if (!approval) {
                    return res.status(404).send(`
                        <html>
                        <head><title>Approval Not Found</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2 style="color: #dc2626;">Approval Not Found</h2>
                            <p>The approval link is invalid, has expired, or has already been used.</p>
                            <p>Please contact the editorial office if you believe this is an error.</p>
                        </body>
                        </html>
                    `);
                }
                
                // Check if token has expired
                const now = new Date();
                const expiresAt = new Date(approval.expires_at);
                
                if (now > expiresAt) {
                    return res.status(400).send(`
                        <html>
                        <head><title>Link Expired</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2 style="color: #dc2626;">Link Expired</h2>
                            <p>This approval link has expired. Please contact the editorial office to request a new invitation.</p>
                        </body>
                        </html>
                    `);
                }
                
                // Update user status to approved
                db.run(
                    'UPDATE users SET status = ? WHERE id = ?',
                    ['approved', approval.reviewer_id],
                    function(err) {
                        if (err) {
                            console.error('Error updating user status:', err);
                            return res.status(500).send(`
                                <html>
                                <head><title>Server Error</title></head>
                                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                                    <h2 style="color: #dc2626;">Server Error</h2>
                                    <p>An error occurred while activating your account. Please contact support.</p>
                                </body>
                                </html>
                            `);
                        }
                        
                        // Update approval record status
                        db.run(
                            'UPDATE reviewer_approvals SET status = ? WHERE id = ?',
                            ['approved', approval.id],
                            (err) => {
                                if (err) {
                                    console.error('Error updating approval status:', err);
                                }
                                
                                // Success page
                                res.send(`
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <meta charset="UTF-8">
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        <title>Approval Successful - CSMR</title>
                                    </head>
                                    <body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; max-width: 700px; margin: 0 auto; padding: 40px; background-color: #f5f5f5;">
                                        <div style="background-color: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                                            <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px;">
                                                <span style="color: white; font-size: 40px;">✓</span>
                                            </div>
                                            <h1 style="color: #10b981; margin: 0 0 20px 0;">Approval Successful!</h1>
                                            <p style="font-size: 18px; margin: 0 0 30px 0; color: #333333;">
                                                Thank you, <strong>${approval.first_name} ${approval.last_name}</strong>!
                                            </p>
                                            <p style="margin: 0 0 20px 0; color: #666666;">
                                                Your reviewer account has been successfully activated. You are now part of the CSMR peer review team.
                                            </p>
                                            <p style="margin: 0 0 30px 0; color: #666666;">
                                                You will receive review invitations via email when manuscripts matching your expertise are submitted.
                                            </p>
                                            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e0e0e0;">
                                                <p style="margin: 0; font-size: 14px; color: #999999;">
                                                    If you have any questions, please contact us at<br>
                                                    <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}" style="color: #2563eb;">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a>
                                                </p>
                                            </div>
                                        </div>
                                    </body>
                                    </html>
                                `);
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error processing approval:', error);
        res.status(500).send(`
            <html>
            <head><title>Server Error</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h2 style="color: #dc2626;">Server Error</h2>
                <p>An error occurred processing your approval. Please try again later or contact support.</p>
            </body>
            </html>
        `);
    }
});

// Reviewer decline invitation endpoint
app.get('/api/reviewers/decline-invitation/:token', (req, res) => {
    try {
        const { token } = req.params;
        
        if (!token) {
            return res.status(400).send(`
                <html>
                <head><title>Invalid Link</title></head>
                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                    <h2 style="color: #dc2626;">Invalid or Missing Token</h2>
                    <p>The decline link is invalid or has expired.</p>
                    <p>Please contact the editorial office if you believe this is an error.</p>
                </body>
                </html>
            `);
        }
        
        // Find approval record by decline_token
        db.get(
            `SELECT * FROM reviewer_approvals WHERE decline_token = ? AND status = 'pending'`,
            [token],
            (err, approval) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send(`
                        <html>
                        <head><title>Server Error</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2 style="color: #dc2626;">Server Error</h2>
                            <p>An error occurred processing your request. Please try again later.</p>
                        </body>
                        </html>
                    `);
                }
                
                if (!approval) {
                    return res.status(404).send(`
                        <html>
                        <head><title>Invitation Not Found</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2 style="color: #dc2626;">Invitation Not Found</h2>
                            <p>The decline link is invalid, has expired, or has already been used.</p>
                            <p>Please contact the editorial office if you believe this is an error.</p>
                        </body>
                        </html>
                    `);
                }
                
                // Check if token has expired
                const now = new Date();
                const expiresAt = new Date(approval.expires_at);
                
                if (now > expiresAt) {
                    return res.status(400).send(`
                        <html>
                        <head><title>Link Expired</title></head>
                        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                            <h2 style="color: #dc2626;">Link Expired</h2>
                            <p>This invitation link has expired.</p>
                        </body>
                        </html>
                    `);
                }
                
                // Update approval record status to declined
                db.run(
                    'UPDATE reviewer_approvals SET status = ? WHERE id = ?',
                    ['declined', approval.id],
                    function(err) {
                        if (err) {
                            console.error('Error updating approval status:', err);
                            return res.status(500).send(`
                                <html>
                                <head><title>Server Error</title></head>
                                <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                                    <h2 style="color: #dc2626;">Server Error</h2>
                                    <p>An error occurred while processing your decline. Please contact support.</p>
                                </body>
                                </html>
                            `);
                        }
                        
                        // Delete the pending user account
                        db.run('DELETE FROM users WHERE id = ? AND status = ?', [approval.reviewer_id, 'pending'], (err) => {
                            if (err) {
                                console.error('Error deleting pending user:', err);
                            }
                        });
                        
                        // Success page
                        res.send(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <title>Invitation Declined - CSMR</title>
                            </head>
                            <body style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; max-width: 700px; margin: 0 auto; padding: 40px; background-color: #f5f5f5;">
                                <div style="background-color: #ffffff; padding: 40px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center;">
                                    <div style="width: 80px; height: 80px; background-color: #fff3cd; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 30px;">
                                        <span style="color: #856404; font-size: 40px;">ℹ</span>
                                    </div>
                                    <h1 style="color: #856404; margin: 0 0 20px 0;">Invitation Declined</h1>
                                    <p style="font-size: 18px; margin: 0 0 30px 0; color: #333333;">
                                        Thank you, <strong>${approval.first_name} ${approval.last_name}</strong>!
                                    </p>
                                    <p style="margin: 0 0 20px 0; color: #666666;">
                                        You have declined the invitation to join CSMR as a reviewer. The editorial team has been notified.
                                    </p>
                                    <p style="margin: 0 0 30px 0; color: #666666;">
                                        We appreciate your consideration and hope to work with you on future opportunities.
                                    </p>
                                    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e0e0e0;">
                                        <p style="margin: 0; font-size: 14px; color: #999999;">
                                            If you have any questions, please contact us at<br>
                                            <a href="mailto:${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}" style="color: #2563eb;">${process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org'}</a>
                                        </p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `);
                    }
                );
            }
        );
    } catch (error) {
        console.error('Error processing decline:', error);
        res.status(500).send(`
            <html>
            <head><title>Server Error</title></head>
            <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
                <h2 style="color: #dc2626;">Server Error</h2>
                <p>An error occurred processing your decline. Please try again later or contact support.</p>
            </body>
            </html>
        `);
    }
});

// Reviews API endpoints

// Get all reviews
app.get('/api/reviews', (req, res) => {
    try {
        const query = `
            SELECT r.*, u.first_name, u.last_name, u.email as reviewer_email
            FROM reviews r
            LEFT JOIN users u ON r.reviewer_id = u.id
            ORDER BY r.assigned_date DESC
        `;
        
        db.all(query, [], (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            const reviews = rows.map(row => ({
                id: row.id,
                manuscript_id: row.manuscript_id,
                manuscript_title: row.manuscript_title,
                reviewer_id: row.reviewer_id,
                reviewer_name: `${row.first_name} ${row.last_name}`,
                reviewer_email: row.reviewer_email,
                assigned_date: row.assigned_date,
                due_date: row.due_date,
                status: row.status,
                comments_to_author: row.comments_to_author,
                comments_to_editor: row.comments_to_editor,
                recommendation: row.recommendation,
                submitted_date: row.submitted_date,
                authors: row.authors,
                abstract: row.abstract
            }));
            
            res.json({ success: true, reviews });
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update review draft
app.put('/api/reviews/:id/draft', (req, res) => {
    try {
        const { id } = req.params;
        const { comments_to_author, comments_to_editor, recommendation, status } = req.body;
        
        const query = `
            UPDATE reviews 
            SET comments_to_author = ?, comments_to_editor = ?, recommendation = ?, status = ?
            WHERE id = ?
        `;
        
        db.run(query, [comments_to_author, comments_to_editor, recommendation, status, id], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            res.json({ success: true, message: 'Draft saved successfully' });
        });
    } catch (error) {
        console.error('Error saving draft:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Submit review
app.put('/api/reviews/:id/submit', (req, res) => {
    try {
        const { id } = req.params;
        const { comments_to_author, comments_to_editor, recommendation, status } = req.body;
        const submitted_date = new Date().toISOString();
        
        const query = `
            UPDATE reviews 
            SET comments_to_author = ?, comments_to_editor = ?, recommendation = ?, status = ?, submitted_date = ?
            WHERE id = ?
        `;
        
        db.run(query, [comments_to_author, comments_to_editor, recommendation, status, submitted_date, id], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            res.json({ success: true, message: 'Review submitted successfully' });
        });
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Create review assignment (when inviting reviewer)
app.post('/api/reviews/assign', (req, res) => {
    try {
        const { reviewer_id, manuscript_id, manuscript_title, due_date, authors, abstract } = req.body;
        const assigned_date = new Date().toISOString();
        
        const query = `
            INSERT INTO reviews (reviewer_id, manuscript_id, manuscript_title, assigned_date, due_date, status, authors, abstract)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
        `;
        
        db.run(query, [reviewer_id, manuscript_id, manuscript_title, assigned_date, due_date, authors, abstract], function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            
            res.json({ success: true, message: 'Review assigned successfully', review_id: this.lastID });
        });
    } catch (error) {
        console.error('Error assigning review:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ==================== SUBMISSIONS API ENDPOINTS ====================

// Create new submission
app.post('/api/submissions', (req, res) => {
    try {
        const { title, authors, abstract, keywords, authorId } = req.body;
        
        if (!title || !authors || !abstract || !authorId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: title, authors, abstract, and authorId are required' 
            });
        }
        
        // Generate unique manuscript ID
        const year = new Date().getFullYear();
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const manuscriptId = `MS-${year}-${randomNum}`;
        
        db.run(
            `INSERT INTO submissions (manuscript_id, title, authors, abstract, keywords, author_id, status)
             VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
            [manuscriptId, title, authors, abstract, keywords || '', authorId],
            function(err) {
                if (err) {
                    console.error('Error creating submission:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Failed to create submission' 
                    });
                }
                
                res.json({ 
                    success: true, 
                    message: 'Submission created successfully',
                    submissionId: this.lastID,
                    manuscriptId: manuscriptId
                });
            }
        );
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Get user's submissions
app.get('/api/submissions/my', (req, res) => {
    try {
        const { authorId } = req.query;
        
        if (!authorId) {
            return res.status(400).json({ 
                success: false, 
                message: 'authorId is required' 
            });
        }
        
        db.all(
            `SELECT s.*, u.first_name, u.last_name, u.email as author_email
             FROM submissions s
             LEFT JOIN users u ON s.author_id = u.id
             WHERE s.author_id = ?
             ORDER BY s.submitted_date DESC`,
            [authorId],
            (err, rows) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Database error' 
                    });
                }
                
                res.json({ 
                    success: true, 
                    submissions: rows 
                });
            }
        );
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Get all submissions (for admin)
app.get('/api/submissions', (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT s.*, u.first_name, u.last_name, u.email as author_email,
                   e.first_name as editor_first_name, e.last_name as editor_last_name
            FROM submissions s
            LEFT JOIN users u ON s.author_id = u.id
            LEFT JOIN users e ON s.editor_id = e.id
        `;
        let params = [];
        
        if (status) {
            query += ' WHERE s.status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY s.submitted_date DESC';
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            res.json({ 
                success: true, 
                submissions: rows 
            });
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Update submission status (for admin)
app.put('/api/submissions/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status, decision, notes, editorId } = req.body;
        
        if (!status) {
            return res.status(400).json({ 
                success: false, 
                message: 'Status is required' 
            });
        }
        
        let query = 'UPDATE submissions SET status = ?';
        let params = [status];
        
        if (decision) {
            query += ', decision = ?, decision_date = ?';
            params.push(decision, new Date().toISOString());
        }
        
        if (notes) {
            query += ', notes = ?';
            params.push(notes);
        }
        
        if (editorId) {
            query += ', editor_id = ?';
            params.push(editorId);
        }
        
        query += ' WHERE id = ?';
        params.push(id);
        
        db.run(query, params, function(err) {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Database error' 
                });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Submission not found' 
                });
            }
            
            res.json({ 
                success: true, 
                message: 'Submission status updated successfully' 
            });
        });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Serve the main page
// Test email endpoint
app.post('/api/test-email', async (req, res) => {
    try {
        const { to } = req.body;
        const testEmail = to || process.env.EMAIL_USER || 'test@example.com';
        
        console.log('📧 Testing email to:', testEmail);
        
        const mailOptions = {
            from: `"CSMR - Centre for Sustainability & Management Research" <${process.env.EMAIL_USER || 'peerreview@csmr.org'}>`,
            to: testEmail,
            replyTo: process.env.REPLY_TO_EMAIL || 'peerreview@csmr.org',
            subject: 'Test Email from CSMR Platform',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #002377;">✅ Email Test Successful!</h2>
                    <p>This is a test email from your CSMR Platform.</p>
                    <p>If you received this, your email configuration is working correctly!</p>
                    <p style="margin-top: 20px; color: #666; font-size: 12px;">
                        Sent at: ${new Date().toLocaleString()}
                    </p>
                </div>
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully!', {
            messageId: info.messageId,
            to: testEmail
        });
        
        res.json({
            success: true,
            message: 'Test email sent successfully!',
            messageId: info.messageId,
            to: testEmail
        });
    } catch (error) {
        console.error('❌ Test email failed:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send test email: ' + error.message,
            error: error.code || error.response || error.message
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin panel route - redirect to admin login
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-login.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Database: users.db`);
    console.log(`🔐 Authentication endpoints ready!`);
    if (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-secret-key-change-in-production') {
        console.log(`✅ JWT_SECRET: Configured`);
    } else {
        console.warn(`⚠️  WARNING: JWT_SECRET not set or using default! Set JWT_SECRET environment variable in production.`);
    }
    if (process.env.BASE_URL) {
        console.log(`✅ BASE_URL: ${process.env.BASE_URL}`);
    } else {
        console.warn(`⚠️  WARNING: BASE_URL not set! Email links may not work. Set BASE_URL environment variable.`);
    }
});
