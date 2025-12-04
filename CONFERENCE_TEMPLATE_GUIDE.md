# Conference Template System - Guide

## Overview
The conferences page now uses a dynamic template system. Conferences are loaded from the database and rendered automatically based on their category.

## Conference Data Structures

Each conference should have the following fields:

### Required Fields
- **title** (string): Conference title
- **description** (string): Conference description/details
- **category** (string): One of: `upcoming`, `proceedings`, `cfp`, `workshops`
- **status** (string): `active` or `inactive` (only active conferences are shown)

### Optional Fields
- **location** (string): Conference location (e.g., "New Delhi, India" or "Online")
- **start_date** (date): Start date (format: YYYY-MM-DD)
- **end_date** (date): End date (format: YYYY-MM-DD)
- **registration_link** (string): URL for registration or "Learn More"
- **border_color** (string): Color for card border (Note: Only blue theme is used - "blue-600" is the standard)
- **year** (integer): Year badge (e.g., 2025)
- **tags** (array/JSON): Array of tags for proceedings (e.g., `["Climate Change", "ESG", "Sustainability"]`)
- **topics** (array/JSON): Array of topics for CFP (e.g., `["Topic 1", "Topic 2"]`)
- **deadline** (date): Deadline for CFP (format: YYYY-MM-DD)
- **icon** (string): Font Awesome icon class for workshops (e.g., "fa-chalkboard-teacher", "fa-video", "fa-users", "fa-globe")

## Category-Specific Templates

### 1. Upcoming Conferences (`category: "upcoming"`)
**Template:** Card style with year badge, date range, location, description, and Register button

**Example:**
```json
{
  "title": "International Conference on Climate Change & Sustainability",
  "description": "Exploring innovative solutions for climate adaptation and sustainable development practices.",
  "location": "New Delhi, India",
  "start_date": "2025-03-15",
  "end_date": "2025-03-17",
  "category": "upcoming",
  "status": "active",
  "border_color": "blue-600",
  "registration_link": "https://example.com/register",
  "year": 2025
}
```

### 2. Conference Proceedings (`category: "proceedings"`)
**Template:** List style with date range, location, description, tags, and "View Proceedings" link

**Example:**
```json
{
  "title": "International Conference on Sustainability 2024",
  "description": "Proceedings include 45 peer-reviewed papers covering climate change, renewable energy, sustainable management, and environmental policy.",
  "location": "New Delhi, India",
  "start_date": "2024-10-15",
  "end_date": "2024-10-17",
  "category": "proceedings",
  "status": "active",
  "registration_link": "https://example.com/proceedings",
  "tags": ["Climate Change", "Renewable Energy", "ESG"]
}
```

### 3. Call for Papers (`category: "cfp"`)
**Template:** Card with deadline badge, description, topics list, and "Submit Paper" link

**Example:**
```json
{
  "title": "Special Issue: Climate Adaptation Strategies",
  "description": "We invite researchers to submit papers on innovative climate adaptation strategies, urban resilience, and sustainable infrastructure development.",
  "category": "cfp",
  "status": "active",
  "border_color": "red-600",
  "deadline": "2025-04-30",
  "registration_link": "submit.html",
  "topics": [
    "Urban planning for climate resilience",
    "Adaptive infrastructure systems",
    "Community-based adaptation strategies",
    "Climate risk assessment methodologies"
  ]
}
```

### 4. Workshops & Webinars (`category: "workshops"`)
**Template:** Card with icon, date/location, description, and "Register Now" button

**Example:**
```json
{
  "title": "Carbon Accounting Workshop",
  "description": "Learn practical carbon accounting methodologies, GHG inventory development, and reporting standards.",
  "location": "Online",
  "start_date": "2025-03-25",
  "category": "workshops",
  "status": "active",
  "border_color": "blue-600",
  "icon": "fa-chalkboard-teacher",
  "registration_link": "https://example.com/register"
}
```

## Color Theme
**Blue Theme Only** - All conferences use blue color scheme:
- Cards: `border-blue-600`
- Badges: `bg-blue-100 text-blue-800`
- Buttons: `bg-blue-600 hover:bg-blue-700`
- Icons: `text-blue-600`

## Icons Available (for workshops)
- `fa-chalkboard-teacher` - Workshop
- `fa-video` - Webinar
- `fa-users` - Training
- `fa-globe` - Global event
- `fa-certificate` - Certification
- `fa-book` - Course

## API Endpoints (To be implemented)

### GET /api/conferences
**Query Parameters:**
- `category` (optional): Filter by category
- `status` (optional): Filter by status (default: "active")

**Response:**
```json
[
  {
    "id": 1,
    "title": "Conference Title",
    "description": "Description...",
    ...
  }
]
```

### POST /api/conferences (Admin only)
**Body:** Conference object (all fields)

### PUT /api/conferences/:id (Admin only)
**Body:** Updated conference object

### DELETE /api/conferences/:id (Admin only)
**Response:** Success message

## Current Status
✅ Template system created
✅ Frontend rendering functions ready
⏳ Backend API endpoints (to be implemented)
⏳ Admin panel interface (to be implemented)

## Next Steps
1. Create database table for conferences
2. Implement API endpoints in server.js
3. Add admin panel interface for managing conferences
4. Test end-to-end flow

