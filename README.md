# 🏠 House Haven

> A full-stack MERN rental marketplace that connects homeowners with renters through real-time features, secure payments, and smart recommendations.  
> *Inspired by a critical problem raised by TikTok user **Yadeshi** — finding a reliable rental platform in Ethiopia is broken. I built this to fix it.*

---

## ✨ Technologies

| Category | Tools |
|----------|-------|
| Frontend | React 19, Vite, TailwindCSS, Framer Motion |
| Backend | Node.js, Express, MongoDB, Mongoose |
| Real-time | Socket.io |
| Payments | Stripe, Chapa (Ethiopian payment gateway) |
| Data | React Query, Axios |
| Maps | Leaflet, React-Leaflet |
| Auth | JWT, bcryptjs |
| Storage | Cloudinary |
| Validation | Zod, express-validator |
| Security | Helmet, CORS, XSS protection, rate limiting |
| Testing | Playwright |

---

## 🎯 Features

- **Browse Properties** — Interactive maps, filters, sorting
- **Manage Listings** — Post properties with images & availability
- **Real-time Notifications** — Live updates via WebSockets
- **Secure Payments** — Stripe for international, Chapa for local Ethiopian payments (ETB)
- **Smart Recommendations** — Personalized property suggestions
- **Messaging System** — Chat with landlords/renters
- **Wishlist** — Save & compare favorite properties
- **Reviews & Ratings** — Verified user feedback
- **Multi-image Gallery** — Immersive photo carousels

---

## 🧠 The Process

I started with architecture — monorepo setup, Vite + React frontend, Express + MongoDB backend. The first milestone was property browsing using React Query, which taught me that data sync is harder than UI rendering.

Authentication came next. JWTs meant scalable stateless auth, but careful token handling was critical. Then Socket.io changed everything — moving from request-response to event-driven thinking. One booking action triggers multiple notifications: owner, renter, and availability updates.

**Payment integration humbled me.** Stripe taught me about PCI compliance, webhooks, and idempotency. Adding **Chapa** — Ethiopia's own payment gateway — was a different challenge: local currency (ETB), bank transfer callbacks, and region-specific webhook handling. Lesson learned: plan payment flows twice, code once.

The biggest turning point? Stepping back. I realized I was adding features reactively. So I documented architecture decisions, recorded a video walkthrough, and asked: *"Will future me understand this?"* Documentation isn't busywork — it's how you truly understand what you built.

Finally, Playwright tests caught edge cases I never considered: failed payments, double bookings, race conditions. Painful to write. Invaluable to have.

> 💡 *Idea originally sparked by **Yadeshi** on TikTok, who highlighted how broken the rental search experience is in Ethiopia. This project is my attempt to solve that.*

---

## 📚 What I Learned

**`React Query`** — Server state isn't useState. Caching and invalidation are the real challenges.

**`Socket.io`** — Events are powerful, but careless listeners create chaos. Connection handling matters.

**`JWT Auth`** — Access tokens vs. refresh tokens. Security in distributed systems.

**`MongoDB Indexing`** — Slow searches taught me that databases are query engines, not just storage.

**`Stripe & Idempotency`** — Duplicate charges are career-ending. Idempotency keys save lives.

**`Chapa Integration`** — Working with Ethiopia's own payment gateway taught me local currency handling (ETB), bank callback patterns, and region-specific webhook challenges.

**`Component Composition`** — Tailwind + Framer Motion forced me to think in reusable parts.

**`Validation`** — Zod + express-validator created a shared contract. Validation is a feature.

**`Security Middleware`** — Helmet, CORS, rate limiting. Understanding *why* makes you a thoughtful builder.

---

## 🚀 How Can It Be Improved?

- Advanced search (date range, amenities, neighborhood autocomplete)
- Owner dashboard with analytics & occupancy tracking
- Automated review prompts & sentiment analysis
- Email notifications (Nodemailer)
- Wishlist sharing with friends
- Booking calendar (Google Calendar sync)
- Admin moderation panel
- React Native mobile app
- Installment payment plans
- AI-powered chat assistant for recommendations
- Video tour integration

---
## 🛠️ Running the Project

```bash
# 1. Clone the repository
git clone https://github.com/Nicohena/House-Rental-System.git
cd House-Rental-System

# 2. Install dependencies
npm run install-all
npm install --prefix client

# 3. Set up environment variables

# Server .env file (create in root directory)
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_key
CHAPA_SECRET_KEY=your_chapa_key
CHAPA_WEBHOOK_SECRET=your_chapa_webhook_secret
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
PORT=5000

# Client .env.local file (create in /client directory)
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
VITE_CHAPA_PUBLIC_KEY=your_chapa_public_key

# 4. Start backend server
npm run server-dev
# Backend running on http://localhost:5000

# 5. Open a new terminal and start frontend
cd client
npm run dev
# Frontend running on http://localhost:5173

# 6. Open your browser and visit http://localhost:5173
