# StudioSpace — Backend API Server 🎬

[![Live API](https://img.shields.io/badge/Live%20API-StudioSpace%20Server-green.svg)](https://server-lac-ten-53.vercel.app)
[![Stack](https://img.shields.io/badge/Stack-Express.js%20%7C%20MongoDB%20%7C%20JWT-blue.svg)](#tech-stack)

The official REST API server for the **StudioSpace** peer-to-peer creative workspace marketplace.

---

## 🌐 Live URLs

| Resource | URL |
|---|---|
| **Live API Base** | [https://server-lac-ten-53.vercel.app](https://server-lac-ten-53.vercel.app) |
| **Health Check** | [https://server-lac-ten-53.vercel.app/api/health](https://server-lac-ten-53.vercel.app/api/health) |
| **Client App** | [https://client-pi-three-30.vercel.app](https://client-pi-three-30.vercel.app) |
| **Client Repo** | [studiospace-client](https://github.com/razzak-dev007/studiospace-client) |
| **Server Repo** | [studiospace-server](https://github.com/razzak-dev007/studiospace-server) |

---

## 🔑 Test Credentials (Pre-Seeded)

| Email | Password | Role |
|---|---|---|
| `alex.creator@studiospace.io` | `Studio@2026` | Host / Creator |

---

## ✨ Key Features

- **Challenge 1 — JWT in HTTPOnly Cookies**: All protected routes use `jsonwebtoken` stored in secure, HTTPOnly cookies preventing XSS attacks.
- **Challenge 2 — Double-Booking Prevention**: Mathematical overlap check `(startA < endB && endA > startB)` against existing Confirmed and Pending bookings, returning clear conflict errors.
- **MongoDB Auto-Fallback**: Uses `mongodb-memory-server` automatically if no live MongoDB is detected — zero setup required for local evaluation.
- **Pre-Seeded Data**: 8 diverse creative studios and 1 examiner test account seeded on startup.
- **Password Validation**: Enforces uppercase + lowercase + minimum 6 characters on both register and update.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express.js |
| Language | TypeScript |
| Database | MongoDB (native driver v6) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| Cookies | `cookie-parser` with HTTPOnly flag |
| Fallback DB | `mongodb-memory-server` |
| Deployment | Vercel (Serverless) |

---

## 📡 API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register new user (validates password strength) |
| POST | `/login` | ❌ | Login + set HTTPOnly JWT cookie |
| GET | `/me` | ✅ | Get current logged-in user |
| POST | `/google` | ❌ | Google OAuth login/register |
| POST | `/logout` | ✅ | Clear auth cookie |

### Studios (`/api/studios`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ❌ | List all studios (search, filter, sort, limit) |
| GET | `/:id` | ❌ | Get single studio by ID |
| POST | `/` | ✅ | Add new studio listing |
| PUT | `/:id` | ✅ | Update studio (owner only) |
| DELETE | `/:id` | ✅ | Delete studio (owner only) |
| GET | `/host/:email` | ✅ | Get all studios by a specific host |

### Bookings (`/api/bookings`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/my` | ✅ | Get current user's bookings |
| POST | `/` | ✅ | Create booking (Challenge 2 overlap check) |
| PATCH | `/:id/status` | ✅ | Update booking status |

### Wishlist (`/api/wishlist`)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | ✅ | Get saved studios |
| POST | `/toggle` | ✅ | Save / unsave a studio |

---

## 🚀 Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (auto in-memory MongoDB + seeded data)
npm run dev
```

> Server starts at `http://localhost:5000`. No MongoDB setup needed — `mongodb-memory-server` handles it automatically!

---

## 📜 Submission Details

- **Server Commits**: 10 commits in git history
- **Deployed on**: Vercel (Serverless Functions)
- **Client Repo**: [https://github.com/razzak-dev007/studiospace-client](https://github.com/razzak-dev007/studiospace-client)

