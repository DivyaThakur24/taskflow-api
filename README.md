# TaskFlow API

A scalable REST API with **JWT Authentication**, **Role-Based Access Control**, and a full-featured **React-style frontend dashboard**.

---

## Tech Stack

| Layer       | Technology                               |
|-------------|------------------------------------------|
| Runtime     | Node.js 20 + Express 4                   |
| Database    | MongoDB (Mongoose ODM)                   |
| Auth        | JWT (access + refresh tokens)            |
| Security    | Helmet, CORS, bcryptjs, express-rate-limit |
| Validation  | express-validator                        |
| Docs        | Swagger / OpenAPI 3.0                    |
| Logging     | Winston                                  |
| Caching     | Redis (optional)                         |
| Container   | Docker + Docker Compose                  |
| Frontend    | Vanilla JS single-file SPA               |

---

## Quick Start (Local)

### Prerequisites
- Node.js 20+
- MongoDB running on `localhost:27017`

### Setup

```bash
# 1. Clone & install
cd backend
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set JWT_SECRET and MONGODB_URI

# 3. Start dev server
npm run dev
```

Server runs at **http://localhost:5000**  
Swagger docs at **http://localhost:5000/api-docs**

### Frontend

Open `frontend/index.html` in any browser. Set the API base URL to `http://localhost:5000`.

---

## Docker Deployment

```bash
# Build & run all services (API + MongoDB + Redis)
docker-compose up --build

# Stop
docker-compose down
```

---

## API Endpoints

### Auth  `POST /api/v1/auth/...`

| Method | Path         | Auth | Description             |
|--------|--------------|------|-------------------------|
| POST   | /register    | No   | Register new user        |
| POST   | /login       | No   | Login, get JWT tokens    |
| POST   | /refresh     | No   | Refresh access token     |
| POST   | /logout      | Yes  | Logout, revoke token     |
| GET    | /me          | Yes  | Get current user profile |

### Tasks  `* /api/v1/tasks/...`

| Method | Path       | Auth  | Description              |
|--------|------------|-------|--------------------------|
| GET    | /          | User  | List tasks (paginated)   |
| POST   | /          | User  | Create task              |
| GET    | /:id       | User  | Get single task          |
| PATCH  | /:id       | User  | Update task              |
| DELETE | /:id       | User  | Soft-delete task         |
| GET    | /stats     | Admin | Task statistics          |

### Admin  `* /api/v1/admin/...`

| Method | Path                   | Auth  | Description         |
|--------|------------------------|-------|---------------------|
| GET    | /dashboard             | Admin | System overview     |
| GET    | /users                 | Admin | List all users      |
| PATCH  | /users/:id/promote     | Admin | Promote to admin    |
| PATCH  | /users/:id/deactivate  | Admin | Deactivate user     |

---

## Authentication Flow

```
Register/Login ──→ { accessToken, refreshToken }
                          │
              ┌───────────┴──────────────────────┐
              ↓                                  ↓
   Authorization: Bearer <token>     POST /auth/refresh
   (7d expiry)                       (30d expiry)
```

---

## Role-Based Access

| Feature              | User | Admin |
|----------------------|------|-------|
| Own tasks CRUD       | ✅   | ✅    |
| View all tasks       | ❌   | ✅    |
| Task statistics      | ❌   | ✅    |
| Manage users         | ❌   | ✅    |
| Admin dashboard      | ❌   | ✅    |

---

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # MongoDB connection
│   │   └── swagger.js       # OpenAPI spec config
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── taskController.js
│   │   └── adminController.js
│   ├── middleware/
│   │   ├── auth.js          # JWT verify + RBAC
│   │   ├── errorHandler.js  # Global error handler + 404
│   │   └── validators.js    # express-validator chains
│   ├── models/
│   │   ├── User.js          # User schema (bcrypt, roles)
│   │   └── Task.js          # Task schema (soft delete)
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── taskRoutes.js
│   │   └── adminRoutes.js
│   ├── utils/
│   │   ├── logger.js        # Winston logger
│   │   └── response.js      # Standardized API responses
│   ├── app.js               # Express app setup
│   └── server.js            # Entry point
├── .env.example
├── Dockerfile
└── package.json

frontend/
└── index.html               # Single-file SPA dashboard
```

---

## Security Measures

- **Password hashing** — bcryptjs with salt rounds = 12
- **JWT** — Short-lived access tokens (7d) + long-lived refresh tokens (30d)
- **HTTP Security Headers** — Helmet.js (XSS, CSRF, clickjacking protection)
- **Rate Limiting** — 100 req/15min global; 10 req/15min on auth routes
- **Input Validation** — express-validator on all endpoints
- **CORS** — Configured allowlist only
- **Payload Size Limit** — 10kb max body
- **Soft Deletes** — Tasks never hard-deleted; `isDeleted` filter on all queries
- **No password in responses** — `select: false` on password field
- **Role escalation prevention** — Users cannot self-assign admin role

---

## Scalability Note

See [`SCALABILITY.md`](./SCALABILITY.md) for the full architecture discussion.

---

## API Documentation

Run the server and visit: **http://localhost:5000/api-docs**

Alternatively, import `TaskFlow.postman_collection.json` into Postman.
# taskflow-api
