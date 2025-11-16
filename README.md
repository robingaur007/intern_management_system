# Intern Management System

A modern, full-stack web application for managing interns, projects, and tasks with role-based access control. Built with React.js and Supabase, featuring AI-powered task description generation.

## 🚀 Features

### Admin Features
- **Project Management**: Create, edit, and delete projects with status tracking
- **Task Management**: Create, edit, delete, and assign tasks to interns
- **Intern Management**: View all interns, their assigned tasks, and project assignments
- **Comment System**: Add feedback and comments on intern tasks
- **AI-Powered Descriptions**: Automatically generate task descriptions using Google Gemini AI
- **Dashboard Overview**: Centralized view of all system activities

### Intern Features
- **Task Viewing**: View all assigned tasks with detailed information
- **Task Completion**: Mark tasks as completed with progress tracking
- **Project Viewing**: See all projects where tasks are assigned
- **Comment Viewing**: View admin comments and feedback on tasks
- **Progress Tracking**: Monitor task completion progress

### Security Features
- **Role-Based Access Control (RBAC)**: Separate admin and intern interfaces
- **Row Level Security (RLS)**: Database-level security policies
- **Secure Authentication**: Email/password authentication via Supabase
- **Protected Routes**: Route guards ensure authorized access only

## 🛠️ Tech Stack

- **Frontend**: React.js 19.2.0, React Router DOM 7.9.6
- **Backend**: Supabase (PostgreSQL, Authentication, RLS)
- **Build Tool**: Vite 7.2.2
- **AI Integration**: Google Gemini API
- **Styling**: Custom CSS with modern design system

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- Google Gemini API key (optional, for AI features)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd intern-mgmt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON=your_supabase_anon_key

   # Google Gemini API (Optional - for AI features)
   VITE_GEMINI_API_KEY=your_gemini_api_key
   ```

   You can copy from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. **Set up Supabase Database**
   
   Run the SQL schema from `database/schema.sql` in your Supabase SQL Editor:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Copy and paste the contents of `database/schema.sql`
   - Execute the script

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the port shown in terminal)

## 📁 Project Structure

```
intern-mgmt/
├── src/
│   ├── admin/              # Admin dashboard components
│   │   ├── AdminDashboard.jsx
│   │   ├── Projects.jsx
│   │   ├── Tasks.jsx
│   │   └── Interns.jsx
│   ├── intern/             # Intern dashboard components
│   │   ├── InternDashboard.jsx
│   │   ├── MyTasks.jsx
│   │   └── MyProjects.jsx
│   ├── auth/               # Authentication components
│   │   ├── UserTypeSelector.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   └── RequireAuth.jsx
│   ├── utils/              # Utility functions
│   │   └── aiService.js     # AI integration
│   ├── App.jsx             # Main app component with routing
│   ├── supabase.js         # Supabase client configuration
│   ├── Dashboard.css       # Dashboard styles
│   └── index.css           # Global styles
├── database/
│   └── schema.sql          # Complete database schema
├── public/                 # Static assets
├── .env.example            # Environment variables template
├── package.json
└── README.md
```

## 🗄️ Database Schema

The system uses the following main tables:

- **profiles**: User profiles linked to Supabase auth
- **projects**: Project information and status
- **tasks**: Task assignments with due dates
- **task_comments**: Comments on tasks
- **activity_log**: Activity tracking (optional)

See `database/schema.sql` for complete schema with:
- Table definitions
- Foreign key relationships
- Database triggers
- Row Level Security (RLS) policies
- Helper functions

## 🔐 Authentication & Authorization

### User Roles
- **Admin**: Full access to all features
- **Intern**: Limited to viewing assigned tasks and projects

### Security Features
- Row Level Security (RLS) policies on all tables
- Role-based route protection
- Secure session management
- Automatic profile creation via database triggers

## 🤖 AI Features

### AI-Powered Task Description Generation

The system includes Google Gemini AI integration for automatically generating task descriptions:

1. **How to use**:
   - Create or edit a task
   - Enter a task title
   - Click "✨ Generate with AI" next to the description field
   - The AI will generate a professional task description

2. **Features**:
   - Automatically discovers available Gemini models
   - Uses project context if available
   - Generates clear, actionable descriptions
   - Fallback mechanism for reliability

3. **Setup**:
   - Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Add `VITE_GEMINI_API_KEY` to your `.env` file
   - Restart the dev server

## 📝 Usage Guide

### For Admins

1. **Login**: Select "Admin" on the landing page and log in
2. **Create Projects**: Go to Projects → "+ New Project"
3. **Create Tasks**: Go to Tasks → "+ New Task" or create from Interns page
4. **Manage Interns**: View intern details, assign tasks, and add comments
5. **Use AI**: Click "Generate with AI" when creating tasks

### For Interns

1. **Login**: Select "Intern" on the landing page and log in
2. **View Tasks**: See all assigned tasks in "My Tasks"
3. **Complete Tasks**: Click "Mark Complete" on tasks
4. **View Projects**: See projects in "My Projects"
5. **Read Comments**: View admin feedback on tasks

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

The `dist` folder will contain the production build.

### Deploy to Vercel/Netlify

1. Push your code to GitHub
2. Connect your repository to Vercel/Netlify
3. Add environment variables in the deployment platform
4. Deploy

### Environment Variables for Production

Make sure to set these in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON`
- `VITE_GEMINI_API_KEY` (optional)

## 🧪 Testing

Currently, the project uses manual testing. To test:

1. Create test users (admin and intern) via Supabase dashboard
2. Test all CRUD operations
3. Verify RLS policies work correctly
4. Test AI generation feature

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to fetch user profile"**
   - Ensure RLS policies are set up correctly
   - Check that the database trigger is created
   - Verify user exists in `profiles` table

2. **"Gemini API key is not configured"**
   - Add `VITE_GEMINI_API_KEY` to `.env` file
   - Restart the dev server after adding

3. **"Permission denied" errors**
   - Check RLS policies in Supabase
   - Verify user role is correct
   - Ensure `is_admin()` function exists

4. **Build errors**
   - Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version (should be v18+)

## 📚 API Documentation

### Supabase Client

The app uses Supabase client for all database operations:

```javascript
import { supabase } from './supabase';

// Example: Fetch tasks
const { data, error } = await supabase
  .from('tasks')
  .select('*')
  .eq('assignee_id', userId);
```

### AI Service

```javascript
import { generateTaskDescription } from './utils/aiService';

const description = await generateTaskDescription(
  'Create login page',
  'Website Redesign'
);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is for educational purposes.

## 👤 Author

Aditya Suresh Nair

## 🙏 Acknowledgments

- Supabase for backend infrastructure
- Google Gemini for AI capabilities
- React team for the amazing framework
