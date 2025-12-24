# INSTRUCTION.md
## Daily Activity Team & Planning Poker Website

## 1. ROLE
You are a **Senior Fullstack Engineer**.

Your task is to build a **Daily Activity Team Website** using **Next.js** for the frontend and a **RESTful Backend API**.  
The system must be **production-ready**, cleanly structured, scalable, and easy to maintain.

---

## 2. TECH STACK (MANDATORY)

### Frontend
- Next.js (App Router)
- React
- Tailwind CSS
- State Management: React Context or Zustand
- HTTP Client: Axios or Fetch
- Authentication: JWT (stored in HttpOnly Cookie)

### Backend
- Node.js
- Express.js or NestJS
- REST API
- JWT Authentication
- ORM: Prisma
- Database: PostgreSQL (supabase)

---

## 3. CORE FEATURES

### 3.1 Authentication (Login Required)
- Login username & Password
- Generate JWT token
- Store token in HttpOnly Cookie
- Protected routes for authenticated users
- Logout clears authentication token

### 3.2 Team Management
- Create/Edit/Delete Teams
- Assign members to teams
- View team list and details

### 3.3 Daily Activity Log
- Team members can log daily activities
- Record: Date, Description, Status (Done/In Progress/Blocked)
- View activity history per team member
- Filter and search activities

### 3.4 Planning Poker
- Create planning poker sessions for stories/tasks
- Team members vote on story points
- Reveal votes simultaneously
- Record consensus results

---

## 4. STEP-BY-STEP IMPLEMENTATION GUIDE

### Step 1: Project Setup (Backend)

**1.1 Initialize Backend Project**
```bash
mkdir daylog-backend
cd daylog-backend
npm init -y
npm install express cors dotenv jsonwebtoken bcryptjs cookie-parser
npm install -D typescript @types/express @types/node @types/jsonwebtoken @types/bcryptjs @types/cookie-parser ts-node nodemon
npx tsc --init
```

**1.2 Install Prisma**
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init
```

**1.3 Configure Database (PostgreSQL - Supabase)**
- Sign up for Supabase account
- Create new project
- Copy connection string
- Update `.env` file:
```
DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
JWT_SECRET="your-secret-key-here"
PORT=5000
```

**1.4 Create Prisma Schema**
Create/Edit `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  password  String
  email     String?  @unique
  role      String   @default("member") // admin, member
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  teamMembers TeamMember[]
  activities  Activity[]
  votes       Vote[]
}

model Team {
  id          String   @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  members        TeamMember[]
  pokerSessions  PokerSession[]
}

model TeamMember {
  id        String   @id @default(uuid())
  userId    String
  teamId    String
  role      String   @default("member") // team_admin, member
  joinedAt  DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  team Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  @@unique([userId, teamId])
}

model Activity {
  id          String   @id @default(uuid())
  userId      String
  date        DateTime
  description String
  status      String   // Done, InProgress, Blocked
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model PokerSession {
  id          String   @id @default(uuid())
  teamId      String
  storyName   String
  description String?
  status      String   @default("voting") // voting, revealed, completed
  finalPoints Int?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  team  Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  votes Vote[]
}

model Vote {
  id              String   @id @default(uuid())
  pokerSessionId  String
  userId          String
  points          Int
  createdAt       DateTime @default(now())
  
  session PokerSession @relation(fields: [pokerSessionId], references: [id], onDelete: Cascade)
  user    User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([pokerSessionId, userId])
}
```

**1.5 Run Prisma Migration**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### Step 2: Backend API Implementation

**2.1 Create Folder Structure**
```
daylog-backend/
├── src/
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── teamController.ts
│   │   ├── activityController.ts
│   │   └── pokerController.ts
│   ├── middleware/
│   │   └── authMiddleware.ts
│   ├── routes/
│   │   ├── authRoutes.ts
│   │   ├── teamRoutes.ts
│   │   ├── activityRoutes.ts
│   │   └── pokerRoutes.ts
│   ├── utils/
│   │   └── prisma.ts
│   └── server.ts
├── .env
├── package.json
└── tsconfig.json
```

**2.2 Create Prisma Client Utility**
Create `src/utils/prisma.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

**2.3 Create Authentication Middleware**
Create `src/middleware/authMiddleware.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
```

**2.4 Create Auth Controller**
Create `src/controllers/authController.ts`:
```typescript
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, email } = req.body;
    
    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
      },
    });
    
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
    
    res.json({ message: 'Login successful', user: { id: user.id, username: user.username, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};

export const logout = (req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, username: true, email: true, role: true },
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
};
```

**2.5 Create Team Controller**
Create `src/controllers/teamController.ts`:
```typescript
import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description } = req.body;
    
    const team = await prisma.team.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId: req.userId!,
            role: 'team_admin',
          },
        },
      },
    });
    
    res.status(201).json({ team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
};

export const getTeams = async (req: AuthRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: req.userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });
    
    res.json({ teams });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get teams' });
  }
};

export const getTeamById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, email: true },
            },
          },
        },
      },
    });
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get team' });
  }
};

export const updateTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const team = await prisma.team.update({
      where: { id },
      data: { name, description },
    });
    
    res.json({ team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team' });
  }
};

export const deleteTeam = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.team.delete({ where: { id } });
    
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
};

export const addMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const member = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId,
      },
    });
    
    res.status(201).json({ member });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

export const removeMember = async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params;
    
    await prisma.teamMember.delete({
      where: { id: memberId },
    });
    
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};
```

**2.6 Create Activity Controller**
Create `src/controllers/activityController.ts`:
```typescript
import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { date, description, status } = req.body;
    
    const activity = await prisma.activity.create({
      data: {
        userId: req.userId!,
        date: new Date(date),
        description,
        status,
      },
    });
    
    res.status(201).json({ activity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
};

export const getActivities = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    const where: any = {};
    
    if (userId) {
      where.userId = userId as string;
    }
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }
    
    const activities = await prisma.activity.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
      orderBy: { date: 'desc' },
    });
    
    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activities' });
  }
};

export const getActivityById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get activity' });
  }
};

export const updateActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { description, status } = req.body;
    
    const activity = await prisma.activity.update({
      where: { id },
      data: { description, status },
    });
    
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update activity' });
  }
};

export const deleteActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.activity.delete({ where: { id } });
    
    res.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
};
```

**2.7 Create Poker Controller**
Create `src/controllers/pokerController.ts`:
```typescript
import { Response } from 'express';
import { prisma } from '../utils/prisma';
import { AuthRequest } from '../middleware/authMiddleware';

export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId, storyName, description } = req.body;
    
    const session = await prisma.pokerSession.create({
      data: {
        teamId,
        storyName,
        description,
      },
    });
    
    res.status(201).json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create poker session' });
  }
};

export const getSessions = async (req: AuthRequest, res: Response) => {
  try {
    const { teamId } = req.query;
    
    const sessions = await prisma.pokerSession.findMany({
      where: teamId ? { teamId: teamId as string } : undefined,
      include: {
        team: {
          select: { id: true, name: true },
        },
        votes: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get poker sessions' });
  }
};

export const getSessionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.pokerSession.findUnique({
      where: { id },
      include: {
        team: {
          select: { id: true, name: true },
        },
        votes: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Poker session not found' });
    }
    
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get poker session' });
  }
};

export const vote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { points } = req.body;
    
    const vote = await prisma.vote.upsert({
      where: {
        pokerSessionId_userId: {
          pokerSessionId: id,
          userId: req.userId!,
        },
      },
      update: { points },
      create: {
        pokerSessionId: id,
        userId: req.userId!,
        points,
      },
    });
    
    res.json({ vote });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit vote' });
  }
};

export const revealVotes = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const session = await prisma.pokerSession.update({
      where: { id },
      data: { status: 'revealed' },
      include: {
        votes: {
          include: {
            user: {
              select: { id: true, username: true },
            },
          },
        },
      },
    });
    
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reveal votes' });
  }
};

export const completeSession = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { finalPoints } = req.body;
    
    const session = await prisma.pokerSession.update({
      where: { id },
      data: {
        status: 'completed',
        finalPoints,
      },
    });
    
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete session' });
  }
};
```

**2.8 Create Routes**
Create `src/routes/authRoutes.ts`:
```typescript
import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authMiddleware, getMe);

export default router;
```

Create `src/routes/teamRoutes.ts`:
```typescript
import { Router } from 'express';
import {
  createTeam,
  getTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
} from '../controllers/teamController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createTeam);
router.get('/', getTeams);
router.get('/:id', getTeamById);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);
router.post('/:id/members', addMember);
router.delete('/:id/members/:memberId', removeMember);

export default router;
```

Create `src/routes/activityRoutes.ts`:
```typescript
import { Router } from 'express';
import {
  createActivity,
  getActivities,
  getActivityById,
  updateActivity,
  deleteActivity,
} from '../controllers/activityController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createActivity);
router.get('/', getActivities);
router.get('/:id', getActivityById);
router.put('/:id', updateActivity);
router.delete('/:id', deleteActivity);

export default router;
```

Create `src/routes/pokerRoutes.ts`:
```typescript
import { Router } from 'express';
import {
  createSession,
  getSessions,
  getSessionById,
  vote,
  revealVotes,
  completeSession,
} from '../controllers/pokerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', createSession);
router.get('/', getSessions);
router.get('/:id', getSessionById);
router.post('/:id/vote', vote);
router.post('/:id/reveal', revealVotes);
router.post('/:id/complete', completeSession);

export default router;
```

**2.9 Create Main Server File**
Create `src/server.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import teamRoutes from './routes/teamRoutes';
import activityRoutes from './routes/activityRoutes';
import pokerRoutes from './routes/pokerRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/poker', pokerRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Daily Activity Team API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**2.10 Update package.json Scripts**
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

**2.11 Start Backend Server**
```bash
npm run dev
```

---

### Step 3: Frontend Setup

**3.1 Create Next.js Project**
```bash
npx create-next-app@latest daylog-frontend
# Select: TypeScript, ESLint, Tailwind CSS, App Router, No src directory
cd daylog-frontend
```

**3.2 Install Dependencies**
```bash
npm install axios zustand
npm install -D @types/cookie
```

**3.3 Create Folder Structure**
```
daylog-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── teams/
│   │   │   ├── page.tsx
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx
│   │   │   └── create/
│   │   │       └── page.tsx
│   │   ├── activities/
│   │   │   ├── page.tsx
│   │   │   └── create/
│   │   │       └── page.tsx
│   │   └── poker/
│   │       ├── page.tsx
│   │       ├── [id]/
│   │       │   └── page.tsx
│   │       └── create/
│   │           └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── TeamCard.tsx
│   ├── ActivityCard.tsx
│   └── PokerCard.tsx
├── lib/
│   ├── api.ts
│   └── store.ts
└── types/
    └── index.ts
```

**3.4 Create Types**
Create `types/index.ts`:
```typescript
export interface User {
  id: string;
  username: string;
  email?: string;
  role: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  user: {
    id: string;
    username: string;
  };
}

export interface Activity {
  id: string;
  userId: string;
  date: string;
  description: string;
  status: 'Done' | 'InProgress' | 'Blocked';
  user: {
    id: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PokerSession {
  id: string;
  teamId: string;
  storyName: string;
  description?: string;
  status: 'voting' | 'revealed' | 'completed';
  finalPoints?: number;
  team: {
    id: string;
    name: string;
  };
  votes: Vote[];
  createdAt: string;
  updatedAt: string;
}

export interface Vote {
  id: string;
  pokerSessionId: string;
  userId: string;
  points: number;
  user: {
    id: string;
    username: string;
  };
}
```

**3.5 Create API Client**
Create `lib/api.ts`:
```typescript
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Auth API
export const authAPI = {
  register: (data: { username: string; password: string; email?: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// Team API
export const teamAPI = {
  getTeams: () => api.get('/teams'),
  getTeamById: (id: string) => api.get(`/teams/${id}`),
  createTeam: (data: { name: string; description?: string }) =>
    api.post('/teams', data),
  updateTeam: (id: string, data: { name: string; description?: string }) =>
    api.put(`/teams/${id}`, data),
  deleteTeam: (id: string) => api.delete(`/teams/${id}`),
  addMember: (teamId: string, userId: string) =>
    api.post(`/teams/${teamId}/members`, { userId }),
  removeMember: (teamId: string, memberId: string) =>
    api.delete(`/teams/${teamId}/members/${memberId}`),
};

// Activity API
export const activityAPI = {
  getActivities: (params?: { userId?: string; startDate?: string; endDate?: string }) =>
    api.get('/activities', { params }),
  getActivityById: (id: string) => api.get(`/activities/${id}`),
  createActivity: (data: { date: string; description: string; status: string }) =>
    api.post('/activities', data),
  updateActivity: (id: string, data: { description?: string; status?: string }) =>
    api.put(`/activities/${id}`, data),
  deleteActivity: (id: string) => api.delete(`/activities/${id}`),
};

// Poker API
export const pokerAPI = {
  getSessions: (teamId?: string) =>
    api.get('/poker', { params: teamId ? { teamId } : undefined }),
  getSessionById: (id: string) => api.get(`/poker/${id}`),
  createSession: (data: { teamId: string; storyName: string; description?: string }) =>
    api.post('/poker', data),
  vote: (sessionId: string, points: number) =>
    api.post(`/poker/${sessionId}/vote`, { points }),
  revealVotes: (sessionId: string) => api.post(`/poker/${sessionId}/reveal`),
  completeSession: (sessionId: string, finalPoints: number) =>
    api.post(`/poker/${sessionId}/complete`, { finalPoints }),
};
```

**3.6 Create Zustand Store**
Create `lib/store.ts`:
```typescript
import { create } from 'zustand';
import { User } from '@/types';

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));
```

**3.7 Create Login Page**
Create `app/(auth)/login/page.tsx`:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      setUser(response.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Username</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-center text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="text-blue-500 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**3.8 Create Dashboard Layout with Auth Protection**
Create `app/(dashboard)/layout.tsx`:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authAPI.getMe();
        setUser(response.data.user);
      } catch (error) {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router, setUser]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex space-x-8">
              <Link href="/dashboard" className="flex items-center text-gray-900 hover:text-blue-500">
                Dashboard
              </Link>
              <Link href="/teams" className="flex items-center text-gray-900 hover:text-blue-500">
                Teams
              </Link>
              <Link href="/activities" className="flex items-center text-gray-900 hover:text-blue-500">
                Activities
              </Link>
              <Link href="/poker" className="flex items-center text-gray-900 hover:text-blue-500">
                Planning Poker
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.username}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
```

---

### Step 4: Testing & Deployment

**4.1 Test Authentication**
- Register a new user
- Login with credentials
- Verify JWT token in cookie
- Test protected routes

**4.2 Test Team Management**
- Create teams
- Add members
- Update/delete teams

**4.3 Test Activity Logging**
- Create daily activities
- Filter by date range
- Update activity status

**4.4 Test Planning Poker**
- Create poker session
- Submit votes
- Reveal votes
- Complete session

**4.5 Production Deployment**

Backend (Render/Railway/Heroku):
```bash
# Build
npm run build

# Set environment variables
DATABASE_URL=<supabase-connection-string>
JWT_SECRET=<your-secret>
NODE_ENV=production

# Deploy
```

Frontend (Vercel):
```bash
# Set environment variable
NEXT_PUBLIC_API_URL=<backend-url>

# Deploy
vercel --prod
```

---

## 5. ADDITIONAL FEATURES (OPTIONAL)

- Real-time updates with Socket.IO
- Email notifications
- Role-based access control
- Activity reports and analytics
- Export data to CSV/PDF
- Dark mode
- Mobile responsive design
- PWA support

---

## 6. TESTING CHECKLIST

- [ ] User registration works
- [ ] User login/logout works
- [ ] JWT authentication is secure
- [ ] Protected routes require authentication
- [ ] Team CRUD operations work
- [ ] Activity CRUD operations work
- [ ] Planning poker voting works
- [ ] Vote reveal functionality works
- [ ] Database relationships are correct
- [ ] API error handling is proper
- [ ] Frontend state management works
- [ ] Responsive design on mobile
- [ ] Production deployment successful

---

