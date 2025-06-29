# WatchnLearn Admin System - Complete Documentation

## System Overview

WatchnLearn is a comprehensive educational platform admin system designed for managing educational content, users, past papers, textbooks, and syllabi for Zimbabwean schools. The system supports multiple education levels (JC, O-Level, A-Level) and exam boards (ZIMSEC, Cambridge).

## Technology Stack

### Frontend (React-based)
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API for authentication
- **Charts**: Recharts for analytics and data visualization
- **Icons**: Lucide React
- **Build Tool**: Vite (recommended for React)

### Backend & Database
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth with email/password
- **File Storage**: Supabase Storage with multiple buckets
- **API**: Supabase auto-generated REST API

### Key Dependencies
```json
{
  "@supabase/supabase-js": "^2.39.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.2.2",
  "tailwindcss": "^3.3.3",
  "lucide-react": "^0.446.0",
  "recharts": "^2.12.7",
  "@radix-ui/react-*": "Various UI components",
  "class-variance-authority": "^0.7.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.5.2"
}
```

## Project Structure

```
src/
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── auth/                   # Authentication components
│   │   ├── AuthForm.tsx
│   │   └── ProtectedRoute.tsx
│   ├── layout/                 # Layout components
│   │   ├── AdminLayout.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── dashboard/              # Dashboard components
│   │   ├── MetricsCards.tsx
│   │   ├── UserEngagement.tsx
│   │   ├── ContentPerformance.tsx
│   │   ├── DashboardOverview.tsx
│   │   └── RecentActivity.tsx
│   ├── content/                # Content management
│   │   ├── AddContentDialog.tsx
│   │   ├── AddSubjectDialog.tsx
│   │   ├── ContentHierarchy.tsx
│   │   └── AddHierarchyItemDialog.tsx
│   ├── textbooks/              # Textbook management
│   │   └── AddTextbookDialog.tsx
│   ├── syllabus/               # Syllabus management
│   │   └── AddSyllabusDialog.tsx
│   └── past-papers/            # Past papers management
│       └── AddPastPaperDialog.tsx
├── contexts/
│   └── AuthContext.tsx         # Authentication context
├── lib/
│   ├── supabase.ts            # Supabase client & types
│   ├── auth.ts                # Authentication utilities
│   └── utils.ts               # General utilities
├── pages/                     # React Router pages
│   ├── Dashboard.tsx
│   ├── Users.tsx
│   ├── Content.tsx
│   ├── ContentSubjects.tsx
│   ├── PastPapers.tsx
│   ├── Textbooks.tsx
│   ├── Syllabus.tsx
│   ├── Analytics.tsx
│   └── System.tsx
└── App.tsx                    # Main app component
```

## Database Schema

### Core Tables

#### 1. Authentication & Users
```sql
-- Profiles (extends Supabase auth.users)
profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin', 'super_admin')),
  school_id UUID,
  level TEXT CHECK (level IN ('JC', 'O-Level', 'A-Level')),
  exam_board TEXT CHECK (exam_board IN ('ZIMSEC', 'Cambridge')),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

-- Admin users
admin_users (
  id UUID PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id),
  permissions TEXT[],
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

#### 2. Educational Structure
```sql
-- Schools
schools (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  principal_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Subjects
subjects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL,
  exam_board TEXT NOT NULL,
  school_id UUID REFERENCES schools(id),
  icon TEXT DEFAULT 'BookOpen',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Content hierarchy: subjects → terms → weeks → chapters → content
terms (id, subject_id, title, order_number, created_at)
weeks (id, term_id, title, order_number, created_at)
chapters (id, week_id, title, description, order_number, is_continuation, original_chapter_id, created_at)
```

#### 3. Content Management
```sql
-- Content/Topics
content (
  id UUID PRIMARY KEY,
  chapter_id UUID REFERENCES chapters(id),
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('video', 'pdf', 'quiz', 'notes')),
  description TEXT,
  file_url TEXT,
  file_size BIGINT,
  duration TEXT,
  estimated_study_time TEXT,
  order_number INTEGER NOT NULL,
  status TEXT DEFAULT 'published',
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Content views tracking
content_views (
  id UUID PRIMARY KEY,
  content_id UUID REFERENCES content(id),
  user_id UUID REFERENCES profiles(id),
  viewed_at TIMESTAMPTZ,
  duration_watched INTEGER,
  completed BOOLEAN DEFAULT false
)
```

#### 4. Past Papers
```sql
past_papers (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  year INTEGER NOT NULL,
  month TEXT NOT NULL,
  paper_type TEXT NOT NULL,
  level TEXT NOT NULL,
  exam_board TEXT NOT NULL,
  duration_hours DECIMAL(3,1) NOT NULL,
  total_marks INTEGER NOT NULL,
  description TEXT,
  question_paper_url TEXT NOT NULL,
  marking_scheme_url TEXT,
  has_marking_scheme BOOLEAN DEFAULT false,
  file_size TEXT,
  download_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published',
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

#### 5. Textbooks
```sql
textbooks (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  publisher TEXT NOT NULL,
  edition TEXT,
  publication_year INTEGER NOT NULL,
  isbn TEXT,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  exam_board TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

textbook_authors (
  id UUID PRIMARY KEY,
  textbook_id UUID REFERENCES textbooks(id),
  author_name TEXT NOT NULL,
  order_number INTEGER NOT NULL
)
```

#### 6. Syllabus Management
```sql
syllabi (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  level TEXT NOT NULL,
  exam_board TEXT NOT NULL,
  year INTEGER NOT NULL,
  overview TEXT NOT NULL,
  total_topics INTEGER DEFAULT 0,
  syllabus_file_url TEXT,
  assessment_file_url TEXT,
  specimen_file_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

syllabus_papers (
  id UUID PRIMARY KEY,
  syllabus_id UUID REFERENCES syllabi(id),
  paper_name TEXT NOT NULL,
  order_number INTEGER NOT NULL
)

syllabus_paper_topics (
  id UUID PRIMARY KEY,
  paper_id UUID REFERENCES syllabus_papers(id),
  topic_name TEXT NOT NULL,
  order_number INTEGER NOT NULL
)
```

### Storage Buckets
- `content-files` (private) - Educational content files
- `past-papers` (private) - Examination papers
- `marking-schemes` (private) - Answer keys
- `textbook-covers` (public) - Book cover images
- `syllabus-files` (private) - Syllabus documents
- `user-avatars` (public) - User profile pictures

## Key Features & Components

### 1. Authentication System
- **Email/password authentication** via Supabase Auth
- **Role-based access control** (student, teacher, admin, super_admin)
- **Protected routes** that redirect unauthenticated users
- **Profile management** with avatar uploads

### 2. Dashboard
- **Metrics cards** showing key statistics
- **Interactive charts** for user engagement and content performance
- **Recent activity feed** with real-time updates
- **Responsive design** for all screen sizes

### 3. User Management
- **User listing** with search and filtering
- **Role management** and permissions
- **User activity tracking**
- **Bulk operations** for user management

### 4. Content Management
- **Hierarchical content structure**: Subject → Term → Week → Chapter → Topics
- **Multiple content types**: Videos, PDFs, Quizzes, Notes
- **Content status management**: Draft, Published, Review, Archived
- **File upload** with progress tracking
- **Content analytics** and view tracking

### 5. Past Papers Management
- **Paper categorization** by subject, level, exam board, year
- **Marking scheme support**
- **Download tracking**
- **Bulk upload capabilities**

### 6. Textbook Management
- **Book cataloging** with metadata
- **Author management**
- **Cover image uploads**
- **ISBN tracking**

### 7. Syllabus Management
- **Syllabus document management**
- **Paper breakdown** with topics
- **Assessment objectives**
- **Specimen papers**

### 8. Analytics & Reporting
- **User engagement metrics**
- **Content performance analytics**
- **Download statistics**
- **Interactive charts** using Recharts

### 9. System Administration
- **System settings** management
- **Audit logging**
- **User role management**
- **Backup and maintenance**

## Implementation Guide

### 1. Setup React Project
```bash
# Create React project with Vite
npm create vite@latest watchnlearn-admin -- --template react-ts
cd watchnlearn-admin
npm install

# Install dependencies
npm install @supabase/supabase-js
npm install tailwindcss @tailwindcss/forms
npm install lucide-react recharts
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install class-variance-authority clsx tailwind-merge
npm install react-router-dom
```

### 2. Configure Tailwind CSS
```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "hsl(213 100% 56%)",
        secondary: "hsl(45 95% 64%)",
        success: "hsl(122 39% 49%)",
        warning: "hsl(36 100% 50%)",
        destructive: "hsl(4 90% 58%)",
      }
    }
  },
  plugins: []
}
```

### 3. Setup Supabase
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  role: 'student' | 'teacher' | 'admin' | 'super_admin'
  school_id?: string
  level?: 'JC' | 'O-Level' | 'A-Level'
  exam_board?: 'ZIMSEC' | 'Cambridge'
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}
```

### 4. Authentication Context
```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string) => Promise<void>
  signOut: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Implementation details...
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

### 5. Main App Structure
```typescript
// App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AdminLayout } from './components/layout/AdminLayout'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
// ... other imports

function App() {
  return (
    <AuthProvider>
      <Router>
        <ProtectedRoute>
          <AdminLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/users" element={<Users />} />
              <Route path="/content" element={<Content />} />
              <Route path="/content/subjects" element={<ContentSubjects />} />
              <Route path="/past-papers" element={<PastPapers />} />
              <Route path="/textbooks" element={<Textbooks />} />
              <Route path="/syllabus" element={<Syllabus />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/system" element={<System />} />
            </Routes>
          </AdminLayout>
        </ProtectedRoute>
      </Router>
    </AuthProvider>
  )
}

export default App
```

### 6. Environment Variables
```env
# .env.local
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Design System

### Color Palette
- **Primary**: Blue (#007bff) - Main brand color
- **Secondary**: Yellow (#f9c846) - Accent color
- **Success**: Green (#4caf50) - Success states
- **Warning**: Orange (#ff9800) - Warning states
- **Destructive**: Red (#f44336) - Error states

### Typography
- **Font**: Inter (Google Fonts)
- **Headings**: 600-700 weight
- **Body**: 400-500 weight
- **Line Height**: 1.5 for body, 1.2 for headings

### Spacing
- **Base unit**: 8px
- **Component padding**: 16px, 24px
- **Section margins**: 24px, 32px

### Components
- Use shadcn/ui for consistent UI components
- Custom components for domain-specific functionality
- Responsive design with mobile-first approach

## Security Considerations

### Row Level Security (RLS)
- Enable RLS on all tables
- Admin-only access for management operations
- User-specific data access for students/teachers

### Authentication
- Email verification (optional)
- Strong password requirements
- Session management via Supabase

### File Upload Security
- File type validation
- Size limits
- Virus scanning (recommended)
- Secure storage with proper access controls

## Performance Optimization

### Frontend
- Code splitting with React.lazy()
- Image optimization
- Efficient state management
- Debounced search inputs

### Database
- Proper indexing on frequently queried columns
- Pagination for large datasets
- Optimized queries with proper joins

### Caching
- Browser caching for static assets
- Supabase real-time subscriptions for live data

## Deployment

### Frontend Deployment
- Build: `npm run build`
- Deploy to: Vercel, Netlify, or similar
- Environment variables configuration

### Database Setup
1. Create Supabase project
2. Run migration files in order
3. Configure RLS policies
4. Set up storage buckets
5. Configure authentication settings

## Testing Strategy

### Unit Tests
- Component testing with React Testing Library
- Utility function testing
- Authentication flow testing

### Integration Tests
- API integration testing
- Database operation testing
- File upload testing

### E2E Tests
- User journey testing
- Admin workflow testing
- Cross-browser compatibility

## Maintenance & Monitoring

### Logging
- Error tracking with Sentry or similar
- User activity logging
- Performance monitoring

### Backups
- Automated database backups
- File storage backups
- Configuration backups

### Updates
- Regular dependency updates
- Security patch management
- Feature rollout strategy

## Migration from Next.js

When converting from Next.js to React:

1. **Remove Next.js specific features**:
   - Replace `next/router` with `react-router-dom`
   - Remove `next/image` and use regular `<img>` tags
   - Replace `next/link` with React Router `<Link>`

2. **Update build configuration**:
   - Use Vite instead of Next.js build system
   - Configure environment variables for Vite
   - Update deployment scripts

3. **Routing changes**:
   - Implement client-side routing with React Router
   - Update navigation components
   - Handle protected routes manually

4. **API calls**:
   - All API calls go directly to Supabase
   - No API routes needed (Next.js specific)
   - Use Supabase client for all backend operations

This documentation provides a complete blueprint for recreating the WatchnLearn Admin System using React instead of Next.js, maintaining all functionality while leveraging React's ecosystem and Supabase for backend services.