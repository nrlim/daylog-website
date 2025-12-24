# Daily Activity Team & Planning Poker

A full-stack web application for team collaboration, daily activity tracking, and planning poker estimation.

## Project Structure

```
daylog-website/
├── daylog-backend/          # Backend API (Node.js + Express + Prisma)
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth middleware
│   │   ├── routes/          # API routes
│   │   ├── utils/           # Prisma client
│   │   └── server.ts        # Main server file
│   ├── prisma/              # Database schema
│   └── package.json
│
└── daylog-frontend/         # Frontend (Next.js + React + Tailwind)
    ├── app/                 # Next.js app directory
    │   ├── (dashboard)/     # Protected routes
    │   ├── login/
    │   ├── register/
    │   └── page.tsx
    ├── lib/                 # API client & store
    ├── types/               # TypeScript types
    └── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd daylog-backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials and JWT secret
```

4. Setup database:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

5. Start server:
```bash
npm run dev
```

Backend runs on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd daylog-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.local.example .env.local
# Edit .env.local with backend API URL
```

4. Start development server:
```bash
npm run dev
```

Frontend runs on http://localhost:3000

## Features

### ✅ Authentication
- User registration and login
- JWT-based authentication
- HttpOnly cookie storage
- Protected routes

### ✅ Team Management
- Create, update, and delete teams
- Add/remove team members
- View team details

### ✅ Activity Tracking
- Log daily activities
- Track status (Done, In Progress, Blocked)
- Filter by date range
- View activity history

### ✅ Planning Poker
- Create estimation sessions
- Vote on story points
- Reveal votes simultaneously
- Complete sessions with final points

## Tech Stack

### Backend
- Node.js + Express.js
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- bcryptjs for password hashing

### Frontend
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- Zustand (State Management)
- Axios (HTTP Client)

## API Endpoints

See [daylog-backend/README.md](daylog-backend/README.md) for complete API documentation.

## Development

### Backend Development
```bash
cd daylog-backend
npm run dev
```

### Frontend Development
```bash
cd daylog-frontend
npm run dev
```

## Production Build

### Backend
```bash
cd daylog-backend
npm run build
npm start
```

### Frontend
```bash
cd daylog-frontend
npm run build
npm start
```

## Deployment

### Backend (Railway/Render/Heroku)
1. Set environment variables
2. Deploy from Git repository
3. Run Prisma migrations

### Frontend (Vercel)
1. Connect Git repository
2. Set NEXT_PUBLIC_API_URL
3. Deploy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License
