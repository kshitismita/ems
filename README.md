# Employee Management System (EMS)

A comprehensive Next.js employee management system with MongoDB Atlas integration, featuring role-based access control, document management, daily reports, and project management.

## Features

### User Roles & Authentication
- **Admin**: Full system access, employee management, role assignment
- **Manager**: Project oversight, team management, report reviews
- **Employee**: Profile management, task tracking, document uploads

### Core Features
- **Employee Management**: CRUD operations, role assignment, deactivation
- **Document Upload**: File management with categories and permissions
- **Daily Reports**: Task tracking, mood monitoring, feedback system
- **Project Management**: Deadlines, workflow management, team assignment
- **Dashboard**: Role-based statistics and quick actions
- **Attendance Tracking**: Check-in/out, overtime calculation
- **Leave Requests**: Multiple leave types, approval workflow

### Technical Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB Atlas
- **Authentication**: JWT tokens, bcrypt password hashing
- **File Upload**: Multer, Sharp for image processing

## Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB Atlas cluster
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ems
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` file:
```env
# MongoDB Atlas Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ems?retryWrites=true&w=majority

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# JWT Secret
JWT_SECRET=your-jwt-secret-here

# File Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Employees
- `GET /api/employees` - List employees (admin only)
- `POST /api/employees` - Create employee (admin only)
- `GET /api/employees/[id]` - Get employee details
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Deactivate employee (admin only)

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project (admin only)
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project (admin only)
- `PATCH /api/projects/[id]` - Update workflow

### Documents
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document

### Daily Reports
- `GET /api/daily-reports` - List daily reports
- `POST /api/daily-reports` - Submit daily report

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Database Schema

### User Model
- Basic info: name, email, password, role
- Employee details: employeeId, department, position, salary
- Relationships: manager, projects

### Project Model
- Project info: name, description, status, priority
- Dates: startDate, endDate, deadline
- Team: manager, assignedEmployees
- Workflow: stages and progress tracking

### Document Model
- File info: fileName, filePath, fileSize, mimeType
- Metadata: category, tags, version, downloadCount
- Access control: uploadedBy, isPublic

### Daily Report Model
- Employee and date tracking
- Work items: tasksCompleted, tasksInProgress, challenges, achievements
- Metrics: hoursWorked, mood, status

## Project Structure

```
ems/
├── src/app/                 # Next.js app directory
│   ├── api/                # API routes
│   ├── dashboard/          # Dashboard page
│   ├── login/              # Login page
│   └── page.tsx            # Home page
├── models/                 # Mongoose models
├── lib/                    # Utility functions
├── middleware/             # Authentication middleware
└── uploads/                # File upload directory
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
