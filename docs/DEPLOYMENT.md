# MoveMate Backend Deployment

Recommended free setup:

- Backend: Render free web service
- Database: Neon free PostgreSQL
- Redis: not required for current V1 backend

## 1. Create Neon Database

1. Go to `https://neon.com`.
2. Create a new project.
3. Create or select a Postgres database.
4. Copy the pooled or direct connection string.

It should look like:

```env
postgresql://USER:PASSWORD@HOST.neon.tech/DB_NAME?sslmode=require
```

Use this as `DATABASE_URL` on Render.

## 2. Push Code To GitHub

Render deploys from GitHub/GitLab.

```bash
git init
git add .
git commit -m "Initial MoveMate backend"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

## 3. Deploy On Render

Option A: Blueprint deploy

1. Go to `https://dashboard.render.com`.
2. Click **New**.
3. Choose **Blueprint**.
4. Select the MoveMate repository.
5. Render will read `render.yaml`.
6. Add `DATABASE_URL` from Neon when Render asks for it.

Option B: Manual web service

Use these settings:

```txt
Runtime: Node
Root Directory: .
Build Command: npm install && npm run prisma:generate && npm run prisma:deploy && npm run build:backend
Start Command: npm run start:backend
```

Environment variables:

```env
NODE_ENV=production
DATABASE_URL=your_neon_database_url
JWT_SECRET=use-a-long-random-secret
JWT_REFRESH_SECRET=use-a-different-long-random-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
REDIS_URL=
RAZORPAY_KEY_ID=
RAZORPAY_SECRET=
MAPBOX_TOKEN=
FIREBASE_SERVER_KEY=
```

Render provides `PORT` automatically.

## 4. Verify Deployment

After deploy completes, open:

```txt
https://YOUR_RENDER_SERVICE.onrender.com/api/docs
```

Test OTP:

```bash
curl -X POST https://YOUR_RENDER_SERVICE.onrender.com/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"+919999999999"}'
```

For V1 dev OTP, use:

```txt
123456
```

## Notes

- Render free services can sleep after inactivity. First request after sleep may be slow.
- Neon free database has usage limits. It is fine for MVP testing.
- Do not use the hardcoded dev OTP for real production users.
- Redis is optional in the current backend because realtime tracking uses in-memory Socket.IO.
