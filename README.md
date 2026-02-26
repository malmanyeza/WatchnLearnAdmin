## `WatchnLearnAdmin` — README.md


# WatchnLearn Admin Dashboard

Admin dashboard for managing WatchnLearn content, users, and platform operations. Built to support the mobile application with structured content management and operational controls.

## Features
- ✅ Admin authentication
- ✅ Manage lessons / videos / PDFs
- ✅ Manage categories / subjects / grades
- ✅ User management (view users, roles, access)
- ✅ Content workflow support (create → update → publish)
- ✅ Database-driven UI with clear, maintainable structure

---

## Tech Stack
- **React**
- **TypeScript**
- **Supabase (PostgreSQL + Auth + Storage)**
- **Modern frontend tooling** (Vite or equivalent)

---

## Architecture (Simple)
- UI Components: reusable, modular components
- Data Access: Supabase client for database/auth/storage
- Pages: admin workflows (content, users, settings)

---

## Getting Started
### Prerequisites
- Node.js (LTS)
- Supabase project (URL + anon key)

### Setup
```bash
git clone https://github.com/malmanyeza/WatchnLearnAdmin.git
cd WatchnLearnAdmin
npm install
cp .env.example .env
npm run dev
