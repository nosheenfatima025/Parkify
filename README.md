# 🚗 Parkify – Smart Vehicle Management System

Parkify is my Final Year Project — a full-stack web app that automates vehicle entry, exit, and parking management. Instead of manual registers and paperwork, everything is tracked digitally: who entered, who left, billing, and account activity, all in one system.

## Why I Built This

Most parking systems I looked at were still manual — paper logs, no real tracking, and lots of room for error. I wanted to build something that handles the whole flow digitally: from a user registering their vehicle, to tracking entries and exits, to managing billing through a wallet system, with an admin panel to oversee everything.

## What It Does

**For Users:**
- Register and log in securely (JWT-based auth)
- Register their vehicle(s)
- View their entry/exit history
- Manage their wallet/balance for billing

**Vehicle Tracking:**
- Logs every entry and exit
- Keeps a full history per vehicle
- Configurable parking rates

**Notifications:**
- Alerts on entry/exit
- Fraud alerts (flags unusual activity)
- Account activity notifications

**Admin Panel:**
- Manage all users
- View reports
- Monitor vehicle activity across the system

## Tech Stack

I used the MERN stack for the core app, plus a small Python/Flask service for one part of the backend logic.

- **Frontend:** React.js
- **Backend:** Node.js + Express.js
- **Microservice:** Flask (Python)
- **Database:** MongoDB
- **Auth:** JWT

## Project Structure

```
Parkify/
├── backend/          # Node.js + Express API
├── flask_service/    # Python microservice
├── frontend/         # React client
└── images/           # Assets
```

## Running It Locally

```bash
git clone https://github.com/nosheenfatima025/Parkify.git
cd Parkify
```

**Backend:**
```bash
cd backend
npm install
# add your own .env (Mongo URI, JWT secret, etc.)
npm start
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Flask service:**
```bash
cd flask_service
pip install -r requirements.txt
python app.py
```

> Note: the `.env` file isn't included in the repo for security reasons — you'll need to set up your own with your MongoDB URI and JWT secret to run it.

## A Few Things I'd Improve Next

- Add automated tests for the backend routes
- Move the Flask service logic into the main backend to simplify deployment
- Re-deploy with proper environment configs (currently running locally)

---

**Nosheen Fatima**
MERN Stack Developer
[GitHub](https://github.com/nosheenfatima025)
