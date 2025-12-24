# 🚀 Deployment Guide - Vercel

## Setup Prerequisites

1. **Vercel Account**: https://vercel.com (sign up dengan GitHub)
2. **GitHub Repository**: Push semua code ke GitHub
3. **Environment Variables**: Siapkan di Vercel dashboard

---

## 📦 Deployment Steps

### **1. Backend Deployment**

#### Step 1: Push Backend ke GitHub
```bash
cd daylog-backend
git add .
git commit -m "Backend: Ready for Vercel deployment"
git push origin main
```

#### Step 2: Deploy Backend to Vercel
```bash
# Install Vercel CLI (jika belum)
npm i -g vercel

# Login ke Vercel
vercel login

# Deploy backend
vercel
```

**Atau via Vercel Dashboard:**
1. Go to https://vercel.com/new
2. Import Git Repository
3. Select `daylog-backend` folder
4. Configure Project Settings:
   - **Name**: `daylog-api` (atau nama lain)
   - **Framework**: Node.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Start Command**: `node dist/server.js`

#### Step 3: Add Environment Variables
1. Go to **Settings → Environment Variables**
2. Add variables:
   ```
   JWT_SECRET=sk_live_c8f2a91e47b3d6c5f8a2e9d1b4c7f0a3e6b9c2f5a8d1e4g7h0i3j6k9l2m5n8p1q4r7s0t3u6v9w2x5y8z1a4b7c0d3e6f9g2h5i8j1k4l7m0n3o6p9q2r5s8t1u4v7w0x3y6z9a2b5c8d1e4f7g0h3i6j9k2l5m8n1o4p7q0r3s6t9u2v5w8x1y4z7a0b3c6d9e2f5g8h1i4j7k0l3m6n9o2p5q8r1s4t7u0v3w6x9y2z5a8b1c4d7e0f3g6h9i2j5k8l1m4n7o0p3q6r9s2t5u8v1w4x7y0z3a6b9c2d5e8f1g4h7i0j3k6l9m2n5o8p1q4r7s0t3
   
   DATABASE_URL=postgresql://postgres.gfkelsqpptpmjbhidavn:daylog2025!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   
   DIRECT_URL=postgresql://postgres.gfkelsqpptpmjbhidavn:daylog2025!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
   
   NODE_ENV=production
   ```
3. Click **Deploy**

#### Step 4: Get Backend API URL
Setelah deploy berhasil, dapatkan URL:
- Format: `https://your-backend.vercel.app`
- Contoh: `https://daylog-api.vercel.app`

---

### **2. Frontend Deployment**

#### Step 1: Update API Base URL
**File**: `daylog-frontend/lib/api.ts`

Ubah API base URL ke Vercel backend URL:
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-backend.vercel.app/api';
```

#### Step 2: Add Environment Variables ke Frontend
**File**: `daylog-frontend/.env.production`
```
NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app/api
```

#### Step 3: Push Frontend ke GitHub
```bash
cd daylog-frontend
git add .
git commit -m "Frontend: Update API URL for production"
git push origin main
```

#### Step 4: Deploy Frontend to Vercel
**Via Vercel Dashboard:**
1. Go to https://vercel.com/new
2. Import Git Repository
3. Select `daylog-frontend` folder
4. Vercel auto-detect Next.js, configure:
   - **Name**: `daylog-app` (atau nama lain)
   - **Framework**: Next.js 14
   - **Root Directory**: `./`
   - Build Command: `next build` (auto)
   - Output Directory: `.next` (auto)

#### Step 5: Add Frontend Environment Variables
1. Go to **Settings → Environment Variables**
2. Add:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.vercel.app/api
   ```
3. **Redeploy** aplikasi

---

## ✅ Testing Deployment

### Backend Test
```bash
curl https://your-backend.vercel.app/api/health
```

### Frontend Test
1. Visit `https://your-frontend.vercel.app`
2. Test features:
   - ✅ Create session
   - ✅ Join session
   - ✅ Vote cards
   - ✅ Spin retrospective
   - ✅ View results

---

## 🔒 Security Checklist

- [ ] JWT_SECRET changed dari placeholder
- [ ] Database credentials di Vercel, bukan di source code
- [ ] .env file NOT committed ke Git
- [ ] .gitignore includes .env
- [ ] CORS properly configured di backend
- [ ] API URL points ke production Vercel domain

---

## 🆘 Troubleshooting

### Backend Build Fails
```bash
# Check logs di Vercel Dashboard
# Ensure tsconfig.json is correct
# Check dist folder generation locally: npm run build
```

### Frontend Can't Connect to API
- ✅ Check NEXT_PUBLIC_API_URL env variable
- ✅ Verify backend is running
- ✅ Check CORS headers in backend
- ✅ Test API URL directly in browser

### Port Issues
- Vercel auto-assigns PORT
- Backend should use: `const port = process.env.PORT || 3000`

---

## 📝 Next Steps

1. Deploy backend first ✅
2. Get backend API URL
3. Update frontend env variables
4. Deploy frontend
5. Test all features
6. Monitor logs in Vercel Dashboard

Happy deploying! 🎉
