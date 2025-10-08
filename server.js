require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'your-secret-key-change-in-production';

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
                
                // Insert sample reviewers for testing
                db.run(`INSERT OR IGNORE INTO users (first_name, last_name, email, password, role, expertise) VALUES
                    ('James', 'Wilson', 'james.wilson@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Sustainability, Management, ESG'),
                    ('Lisa', 'Thompson', 'lisa.thompson@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Innovation, Technology, Research'),
                    ('Robert', 'Kim', 'robert.kim@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Environment, Policy, Climate'),
                    ('Sarah', 'Johnson', 'sarah.johnson@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Business, Finance, CSR'),
                    ('Michael', 'Chen', 'michael.chen@example.com', '$2a$10$dummy.hash.for.testing', 'reviewer', 'Technology, Digital Transformation, Analytics')`);
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
// For testing, let's set the credentials directly
process.env.EMAIL_USER = 'txlweb3@gmail.com';
process.env.EMAIL_PASS = 'jvje euix equx nfxp';

console.log('Email config:', {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS ? '***hidden***' : 'NOT_SET'
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'your_email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your_app_password'
    }
});

// Get reviewers endpoint
app.get('/api/reviewers', (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT id, first_name, last_name, email, expertise FROM users WHERE role = ?';
        let params = ['reviewer'];
        
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

// Invite reviewer endpoint
app.post('/api/reviewers/invite', async (req, res) => {
    try {
        const { reviewerId, manuscriptId, manuscriptTitle, dueDate } = req.body;
        
        if (!reviewerId || !manuscriptId || !manuscriptTitle) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields' 
            });
        }
        
        // Get reviewer details
        db.get('SELECT first_name, last_name, email FROM users WHERE id = ? AND role = ?', 
               [reviewerId, 'reviewer'], async (err, reviewer) => {
            if (err) {
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
            
            // Generate review token
            const reviewToken = jwt.sign(
                { reviewerId, manuscriptId }, 
                JWT_SECRET, 
                { expiresIn: '30d' }
            );
            
            const reviewLink = `http://localhost:3000/review?token=${reviewToken}`;
            
            // Email content
            const mailOptions = {
                from: process.env.EMAIL_USER || 'peerreview@csmr.org',
                to: reviewer.email,
                subject: `Review Request – ${manuscriptTitle}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #333;">
                        <div style="background-color: #1e3a8a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h2 style="margin: 0; font-size: 24px;">Review Request</h2>
                        </div>
                        
                        <div style="padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
                            <p>Dear Dr. ${reviewer.last_name},</p>
                            
                            <p>We are pleased to invite you to review the manuscript titled:</p>
                            <div style="background-color: white; padding: 15px; border-left: 4px solid #1e3a8a; margin: 15px 0;">
                                <strong>"${manuscriptTitle}"</strong>
                            </div>
                            <p>submitted to the Centre for Sustainability and Management Research (CSMR).</p>
                            
                            <p>Please try your best to complete your review by <strong>${dueDate}</strong>.<br>
                            If you require additional time, feel free to contact us.</p>
                            
                            <p>You can directly access the manuscript and submit your review through the following secure link:</p>
                            
                            <div style="text-align: center; margin: 25px 0;">
                                <a href="${reviewLink}" style="background-color: #1e3a8a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                                    👉 Review Manuscript
                                </a>
                            </div>
                            
                            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 5px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0;"><strong>Review Guidelines:</strong></p>
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li>Provide detailed and constructive comments for the author</li>
                                    <li>Include any confidential comments for the editorial team in the "Editor-only comments" section</li>
                                    <li>Report any conflicts of interest, plagiarism, or ethical concerns immediately</li>
                                </ul>
                            </div>
                            
                            <p><strong>All communications regarding this manuscript are confidential.</strong></p>
                            
                            <p>Thank you for contributing your valuable time and expertise to support high-quality research publication at CSMR.</p>
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                                <p style="margin: 0;"><strong>Warm regards,</strong><br>
                                Editorial Office<br>
                                Centre for Sustainability and Management Research (CSMR)<br>
                                📧 <a href="mailto:peerreview@csmr.org" style="color: #1e3a8a;">peerreview@csmr.org</a></p>
                            </div>
                            
                            <div style="margin-top: 20px; padding: 15px; background-color: #f5f5f5; border-radius: 5px; font-size: 12px; color: #666;">
                                <p style="margin: 0;"><strong>Note:</strong> If the button doesn't work, copy and paste this link into your browser:</p>
                                <p style="margin: 5px 0 0 0; word-break: break-all;">${reviewLink}</p>
                            </div>
                        </div>
                    </div>
                `
            };
            
            try {
                await transporter.sendMail(mailOptions);
                res.json({ 
                    success: true, 
                    message: 'Review invitation sent successfully' 
                });
            } catch (emailError) {
                console.error('Email error:', emailError);
                res.status(500).json({ 
                    success: false, 
                    message: 'Failed to send email' 
                });
            }
        });
        
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
});

// Add reviewer endpoint
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
        
        // Check if reviewer already exists
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
                    message: 'Reviewer with this email already exists' 
                });
            }
            
            // Hash password and create reviewer
            const hashedPassword = await bcrypt.hash(password, 10);
            
            db.run(
                'INSERT INTO users (first_name, last_name, email, password, role, expertise) VALUES (?, ?, ?, ?, ?, ?)',
                [firstName, lastName, email, hashedPassword, 'reviewer', expertise || ''],
                function(err) {
                    if (err) {
                        return res.status(500).json({ 
                            success: false, 
                            message: 'Error creating reviewer' 
                        });
                    }
                    
                    res.json({ 
                        success: true, 
                        message: 'Reviewer added successfully!',
                        reviewerId: this.lastID
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

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: users.db`);
    console.log(`🔐 Authentication endpoints ready!`);
});
