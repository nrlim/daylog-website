# Daily Activity Team & Planning Poker Backend

Backend API for the Daily Activity Team & Planning Poker application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Setup database:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

4. Start development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- POST /api/auth/logout - Logout user
- GET /api/auth/me - Get current user

### Teams
- GET /api/teams - Get all teams
- GET /api/teams/:id - Get team by ID
- POST /api/teams - Create team
- PUT /api/teams/:id - Update team
- DELETE /api/teams/:id - Delete team
- POST /api/teams/:id/members - Add member
- DELETE /api/teams/:id/members/:memberId - Remove member

### Activities
- GET /api/activities - Get activities
- GET /api/activities/:id - Get activity by ID
- POST /api/activities - Create activity
- PUT /api/activities/:id - Update activity
- DELETE /api/activities/:id - Delete activity

### Planning Poker
- GET /api/poker - Get poker sessions
- GET /api/poker/:id - Get session by ID
- POST /api/poker - Create session
- POST /api/poker/:id/vote - Submit vote
- POST /api/poker/:id/reveal - Reveal votes
- POST /api/poker/:id/complete - Complete session
