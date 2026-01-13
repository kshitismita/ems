# Employee Management System (EMS) - Complete Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Authentication & Authorization](#authentication--authorization)
5. [Routing System](#routing-system)
6. [Features Documentation](#features-documentation)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Security Implementation](#security-implementation)
10. [Deployment & Configuration](#deployment--configuration)

---

## Project Overview

### System Description
The Employee Management System (EMS) is a comprehensive web application built with Next.js that provides:
- Employee management and administration
- Task assignment and tracking
- Meeting scheduling and management
- Activity logging and monitoring
- Role-based access control
- Real-time dashboard analytics

### Key Features
- **Multi-role System**: Admin and Employee roles with different permissions
- **Task Management**: Create, assign, track, and complete tasks
- **Meeting System**: Schedule, manage, and track meetings with attendees
- **Activity Logging**: Comprehensive audit trail of all system activities
- **File Management**: Cloudinary integration for file uploads
- **Dashboard Analytics**: Real-time data visualization

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS with custom glassmorphism design
- **UI Components**: Lucide React icons
- **State Management**: React hooks (useState, useEffect)
- **HTTP Client**: Fetch API with JWT authentication

### Backend
- **Runtime**: Node.js (Next.js API routes)
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: Cloudinary
- **Validation**: Custom validation middleware

### Development Tools
- **Package Manager**: npm
- **Code Quality**: ESLint configuration
- **Environment**: dotenv for configuration management

---

## Project Structure

```
ems/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── (auth)/                  # Authentication routes group
│   │   │   ├── login/               # Login page
│   │   │   └── register/           # Registration page
│   │   ├── admin/                   # Admin-only routes
│   │   │   ├── dash/               # Admin dashboard
│   │   │   └── employees/          # Employee management
│   │   ├── employee-dash/           # Employee dashboard
│   │   ├── meetings/                # Meeting management
│   │   │   ├── page.tsx            # Meetings list
│   │   │   ├── create/             # Create meeting
│   │   │   └── edit/[id]/         # Edit meeting
│   │   ├── tasks/                  # Task management
│   │   │   ├── page.tsx            # Tasks list
│   │   │   ├── create/             # Create task
│   │   │   └── edit/[id]/         # Edit task
│   │   ├── activity-logs/           # Activity monitoring
│   │   └── api/                   # API routes
│   │       ├── auth/                # Authentication APIs
│   │       ├── employees/            # Employee management APIs
│   │       ├── meetings/            # Meeting APIs
│   │       ├── tasks/               # Task APIs
│   │       ├── activity-logs/        # Activity logging APIs
│   │       └── upload/             # File upload APIs
│   ├── components/                  # Reusable UI components
│   │   ├── dashboard/              # Dashboard-specific components
│   │   ├── ui/                    # Base UI components
│   │   └── login-history/         # Login history components
│   ├── lib/                       # Utility libraries
│   │   ├── auth.ts                # Authentication utilities
│   │   ├── db.ts                 # Database connection
│   │   ├── cloudinary.ts          # Cloudinary integration
│   │   ├── mongodb.ts             # MongoDB setup
│   │   ├── storage.ts             # File storage utilities
│   │   └── activityLogger.ts      # Activity logging system
│   ├── middleware/                 # Next.js middleware
│   │   └── auth.ts               # Route protection middleware
│   └── models/                    # Database models
│       ├── User.ts                # User schema
│       ├── Task.ts                # Task schema
│       ├── Meeting.ts             # Meeting schema
│       └── ActivityLog.ts        # Activity log schema
├── lib/                          # Root-level utilities
│   ├── cloudinary.ts              # Cloudinary configuration
│   ├── mongodb.ts                # MongoDB connection
│   └── storage.ts                # File storage helpers
├── middleware/                   # Global middleware
│   └── auth.ts                  # Authentication middleware
├── public/                       # Static assets
│   └── uploads/                  # Local file uploads
├── scripts/                      # Utility scripts
└── uploads/                      # File upload directory
```

---

## Authentication & Authorization

### JWT Authentication System

#### Token Generation
```typescript
// JWT Token Structure
{
  id: string,           // User ID
  email: string,        // User email
  role: 'admin' | 'employee',  // User role
  iat: number,          // Issued at timestamp
  exp: number           // Expiration timestamp
}
```

#### Authentication Flow
1. **Login**: User submits credentials
2. **Validation**: Database verifies email/password
3. **Token Generation**: JWT created with user data
4. **Storage**: Token stored in localStorage
5. **Request Headers**: Token sent in `Authorization: Bearer <token>`

#### Token Verification
```typescript
// Middleware token verification
const verifyToken = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!);
};
```

### Role-Based Access Control (RBAC)

#### User Roles
- **Admin**: Full system access
  - Create, read, update, delete employees
  - Create, assign, manage tasks
  - Schedule and manage meetings
  - View all activity logs
  - Access admin dashboard

- **Employee**: Limited access
  - View own profile
  - View assigned tasks
  - View meetings they're attending
  - View own activity logs
  - Access employee dashboard

#### Route Protection
```typescript
// Middleware route protection
export function middleware(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split(' ')[1];
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  const user = verifyToken(token);
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Role-based route protection
  if (request.nextUrl.pathname.startsWith('/admin') && user.role !== 'admin') {
    return NextResponse.redirect(new URL('/employee-dash', request.url));
  }
}
```

#### API Endpoint Protection
```typescript
// API route protection
const token = request.headers.get('authorization')?.split(' ')[1];
if (!token) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const user: any = verifyToken(token);
if (!user || user.role !== 'admin') {
  return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
}
```

---

## Routing System

### Next.js App Router Structure

#### Authentication Routes
```
/login                    - Login page
/register                 - Registration page
```

#### Admin Routes (Protected)
```
/admin/dash               - Admin dashboard
/admin/employees          - Employee management
/admin/employees/create    - Create employee
/admin/employees/edit/[id] - Edit employee
```

#### Employee Routes (Protected)
```
/employee-dash            - Employee dashboard
/tasks                   - Task list
/tasks/create             - Create task
/tasks/edit/[id]         - Edit task
```

#### Meeting Routes (Role-based)
```
/meetings                - Meeting list (all users)
/meetings/create         - Create meeting (admin only)
/meetings/edit/[id]      - Edit meeting (admin only)
```

#### API Routes
```
/api/auth/login           - Authentication
/api/auth/register       - User registration
/api/employees          - Employee CRUD
/api/tasks              - Task CRUD
/api/meetings           - Meeting CRUD
/api/activity-logs      - Activity logging
/api/upload             - File uploads
```

### Route Protection Implementation

#### Middleware Configuration
```typescript
// middleware.ts
export const config = {
  matcher: [
    '/admin/:path*',
    '/employee-dash/:path*',
    '/tasks/:path*',
    '/meetings/:path*',
    '/activity-logs/:path*'
  ]
};
```

#### Dynamic Route Protection
- **Admin routes**: Require `role === 'admin'`
- **Employee routes**: Require valid token
- **Public routes**: Login, register accessible without auth
- **API routes**: Token verification for all endpoints

---

## Features Documentation

### 1. User Management

#### Admin Features
- **Employee Creation**: Add new employees with details
- **Employee Editing**: Update employee information
- **Employee Deletion**: Remove employees (soft delete)
- **Role Assignment**: Assign admin/employee roles
- **Profile Management**: Update user profiles

#### Employee Features
- **Profile View**: View own profile information
- **Password Update**: Change own password
- **Login History**: View login attempts

### 2. Task Management

#### Task Creation (Admin)
```typescript
interface Task {
  title: string;
  description: string;
  assignedTo: string;      // Employee ID
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: Date;
  attachments?: string[];   // Cloudinary URLs
}
```

#### Task Features
- **Task Assignment**: Assign tasks to employees
- **Priority Levels**: Low, Medium, High
- **Status Tracking**: Pending, In-Progress, Completed
- **File Attachments**: Upload task-related files
- **Activity Logging**: Track task creation, updates, completion

#### Employee Task View
- **Assigned Tasks**: View tasks assigned to them
- **Task Details**: See full task information
- **Status Updates**: Mark tasks as in-progress/completed
- **File Downloads**: Access task attachments

### 3. Meeting Management

#### Meeting Creation (Admin)
```typescript
interface Meeting {
  title: string;
  description?: string;
  agenda: string[];
  startTime: Date;
  endTime: Date;
  organizer: string;        // Admin ID
  attendees: string[];      // Employee IDs
  location?: string;
  meetingLink?: string;     // Video conference link
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  isRecurring: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate: string;
  };
}
```

#### Meeting Features
- **Scheduling**: Set date, time, and duration
- **Attendee Management**: Select multiple employees
- **Location/Link**: Physical or virtual meeting
- **Agenda Items**: Multiple agenda points
- **Recurring Meetings**: Daily, weekly, monthly
- **Status Management**: Track meeting lifecycle
- **Activity Logging**: Creation, invitations, updates, cancellations

#### Modern UI Features
- **Filtering**: Status-based filtering (Scheduled, Ongoing, Completed, Cancelled)
- **Search**: Real-time search by title, description, organizer
- **Auto-filtering**: Immediate results without apply button
- **Attendee Dropdown**: Multi-select with all employees visible

### 4. Activity Logging System

#### Activity Types
```typescript
enum ActivityType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  TASK_CREATED = 'TASK_CREATED',
  TASK_UPDATED = 'TASK_UPDATED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  MEETING = 'MEETING',           // Meeting activities
  MEETING_CREATED = 'MEETING_CREATED',
  MEETING_INVITED = 'MEETING_INVITED',
  MEETING_STATUS_UPDATED = 'MEETING_STATUS_UPDATED',
  MEETING_COMPLETED = 'MEETING_COMPLETED',
  FILE_UPLOADED = 'FILE_UPLOADED',
  PROFILE_UPDATED = 'PROFILE_UPDATED'
}
```

#### Activity Features
- **Comprehensive Logging**: All user actions tracked
- **Role-based Views**: Admins see all, employees see own
- **Real-time Updates**: Activities logged immediately
- **Rich Metadata**: Detailed context for each activity
- **Search & Filter**: Find specific activities
- **Visual Indicators**: Icons and colors for activity types

#### Activity Metadata
```typescript
interface ActivityMetadata {
  taskId?: string;
  taskTitle?: string;
  meetingId?: string;
  meetingTitle?: string;
  organizerId?: string;
  attendeeId?: string;
  attendees?: string[];
  startTime?: Date;
  oldStatus?: string;
  newStatus?: string;
  fileName?: string;
  fileSize?: number;
}
```

### 5. File Management

#### Cloudinary Integration
- **Secure Uploads**: Direct Cloudinary uploads
- **File Types**: Images, documents, spreadsheets
- **Size Limits**: Configurable file size restrictions
- **Metadata Tracking**: File information stored in database
- **CDN Delivery**: Fast file serving via Cloudinary CDN

#### Upload Features
- **Drag & Drop**: Modern file upload interface
- **Progress Tracking**: Real-time upload progress
- **Multiple Files**: Batch upload support
- **File Preview**: Image previews before upload
- **Error Handling**: Comprehensive upload error messages

### 6. Dashboard Analytics

#### Admin Dashboard
- **Employee Statistics**: Total, active, inactive counts
- **Task Analytics**: Created, completed, pending tasks
- **Meeting Overview**: Scheduled, ongoing, completed meetings
- **Recent Activities**: Latest system activities
- **Performance Metrics**: Task completion rates, meeting attendance

#### Employee Dashboard
- **Personal Tasks**: Assigned and personal task counts
- **Meeting Schedule**: Upcoming meetings
- **Recent Activities**: Personal activity feed
- **Performance Stats**: Task completion history
- **Notifications**: New tasks and meeting alerts

---

## Database Schema

### User Model
```typescript
interface User {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;          // Hashed password
  role: 'admin' | 'employee';
  employeeId?: string;      // Employee ID
  department?: string;
  position?: string;
  profileImage?: string;    // Cloudinary URL
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}
```

### Task Model
```typescript
interface Task {
  _id: ObjectId;
  title: string;
  description: string;
  assignedTo: ObjectId;      // User reference
  createdBy: ObjectId;      // Admin reference
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: Date;
  attachments: string[];    // Cloudinary URLs
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

### Meeting Model
```typescript
interface Meeting {
  _id: ObjectId;
  title: string;
  description?: string;
  agenda: string[];
  startTime: Date;
  endTime: Date;
  organizer: ObjectId;      // User reference
  attendees: ObjectId[];    // User references
  location?: string;
  meetingLink?: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  isRecurring: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### ActivityLog Model
```typescript
interface ActivityLog {
  _id: ObjectId;
  user: ObjectId;          // User reference
  type: ActivityType;
  action: string;
  description: string;
  metadata: object;         // Flexible metadata
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
```

---

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/login
```typescript
// Request
{
  email: string;
  password: string;
}

// Response
{
  success: boolean;
  token: string;
  user: User;
}
```

#### POST /api/auth/register
```typescript
// Request
{
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'employee';
  employeeId?: string;
}

// Response
{
  success: boolean;
  message: string;
  user: User;
}
```

### Employee Endpoints

#### GET /api/employees
- **Description**: Get all employees (Admin only)
- **Response**: Array of User objects
- **Auth**: Admin token required

#### POST /api/employees
- **Description**: Create new employee (Admin only)
- **Request**: User object without _id
- **Response**: Created User object
- **Auth**: Admin token required

#### PATCH /api/employees/[id]
- **Description**: Update employee (Admin only)
- **Request**: Partial User object
- **Response**: Updated User object
- **Auth**: Admin token required

#### DELETE /api/employees/[id]
- **Description**: Delete employee (Admin only)
- **Response**: Success message
- **Auth**: Admin token required

### Task Endpoints

#### GET /api/tasks
- **Description**: Get tasks (filtered by role)
- **Query Params**: status, assignedTo, priority
- **Response**: Array of Task objects
- **Auth**: Valid token required

#### POST /api/tasks
- **Description**: Create new task (Admin only)
- **Request**: Task object
- **Response**: Created Task object
- **Auth**: Admin token required

#### PATCH /api/tasks/[id]
- **Description**: Update task
- **Request**: Partial Task object
- **Response**: Updated Task object
- **Auth**: Valid token required (owner or admin)

#### DELETE /api/tasks/[id]
- **Description**: Delete task
- **Response**: Success message
- **Auth**: Admin token or task creator

### Meeting Endpoints

#### GET /api/meetings
- **Description**: Get meetings (filtered by role)
- **Query Params**: status, organizer, attendee
- **Response**: Array of Meeting objects
- **Auth**: Valid token required

#### POST /api/meetings
- **Description**: Create new meeting (Admin only)
- **Request**: Meeting object
- **Response**: Created Meeting object
- **Auth**: Admin token required

#### PATCH /api/meetings/[id]
- **Description**: Update meeting
- **Request**: Partial Meeting object
- **Response**: Updated Meeting object
- **Auth**: Admin token required

#### DELETE /api/meetings/[id]
- **Description**: Cancel meeting (soft delete)
- **Response**: Success message
- **Auth**: Admin token required

### Activity Log Endpoints

#### GET /api/activity-logs
- **Description**: Get activity logs (filtered by role)
- **Query Params**: user, type, action, limit
- **Response**: Array of ActivityLog objects
- **Auth**: Valid token required

#### POST /api/activity-logs
- **Description**: Create activity log entry
- **Request**: ActivityLog object
- **Response**: Created ActivityLog object
- **Auth**: System use only

### File Upload Endpoints

#### POST /api/upload
- **Description**: Upload file to Cloudinary
- **Request**: FormData with file
- **Response**: Cloudinary file info
- **Auth**: Valid token required

---

## Security Implementation

### Authentication Security

#### Password Hashing
```typescript
import bcrypt from 'bcryptjs';

const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};
```

#### JWT Security
- **Secret Key**: Environment variable (JWT_SECRET)
- **Expiration**: Configurable token lifetime
- **Algorithm**: HS256 for token signing
- **Payload**: Minimal user data (no sensitive info)

#### Input Validation
```typescript
// Example validation
const validateEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string) => {
  return password.length >= 8; // Minimum 8 characters
};
```

### API Security

#### Request Validation
- **Token Verification**: All protected endpoints
- **Role Checking**: Admin-only endpoints
- **Input Sanitization**: Prevent XSS attacks
- **Rate Limiting**: Prevent brute force attacks

#### Error Handling
- **Generic Error Messages**: Don't leak sensitive info
- **Status Codes**: Proper HTTP status codes
- **Logging**: Security events logged
- **Graceful Degradation**: Handle failures gracefully

### Data Protection

#### Environment Variables
```env
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://localhost:27017/ems
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

#### Database Security
- **Connection Security**: MongoDB connection string security
- **Input Validation**: Mongoose schema validation
- **Query Injection Prevention**: Using ODM prevents injection
- **Access Control**: Role-based data access

---

## Deployment & Configuration

### Environment Setup

#### Development
```bash
# Install dependencies
npm install

# Environment variables
cp .env.example .env

# Start development server
npm run dev
```

#### Production
```bash
# Build application
npm run build

# Start production server
npm start
```

### Configuration Files

#### next.config.ts
```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['res.cloudinary.com'],
  },
};

export default nextConfig;
```

#### package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### Database Configuration

#### MongoDB Connection
```typescript
// lib/mongodb.ts
import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
```

#### Mongoose Models
- **Indexes**: Optimized query performance
- **Validation**: Schema-level data validation
- **Middleware**: Pre/post hooks for data processing
- **Relationships**: Proper foreign key references

---

## Summary

The Employee Management System is a comprehensive, production-ready application with:

### ✅ **Complete Feature Set**
- User management with role-based access
- Task assignment and tracking
- Meeting scheduling and management
- Activity logging and monitoring
- File management with Cloudinary
- Real-time dashboard analytics

### ✅ **Robust Security**
- JWT authentication
- Role-based authorization
- Input validation and sanitization
- Secure password hashing
- Environment-based configuration

### ✅ **Modern Architecture**
- Next.js 14 with App Router
- TypeScript for type safety
- MongoDB with Mongoose ODM
- Cloudinary for file storage
- Responsive TailwindCSS design

### ✅ **Production Ready**
- Comprehensive error handling
- Activity logging for audit trails
- Scalable database design
- Optimized API endpoints
- Modern UI/UX patterns

The system provides a complete solution for employee management with enterprise-grade security, scalability, and user experience.
