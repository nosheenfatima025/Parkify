# 🚗 Parkify – Smart Vehicle Management System

Parkify is a full-stack web application built as my Final Year Project, designed to automate and digitize vehicle entry, exit, and parking management. The system provides a secure, efficient way to track vehicles, manage user accounts, and maintain complete activity records with real-time notifications.

## 📌 Project Overview

Traditional parking management relies heavily on manual record-keeping, which is slow and error-prone. Parkify solves this by providing a digital platform where vehicle entries, exits, billing, and user accounts are all managed through a centralized, secure system.

## 🎯 Objectives

- Automate vehicle entry and exit tracking
- Provide a secure user account management system
- Maintain digital, searchable activity records
- Reduce manual workload and human error
- Deliver real-time alerts and reporting through an admin dashboard

## ⚙️ Features

### 👤 User Module
- User registration and secure login (JWT-based authentication)
- Personal account dashboard
- Vehicle registration and management
- Wallet/balance management for billing

### 🚙 Vehicle Module
- Vehicle entry and exit tracking
- Complete vehicle history logs
- Parking rate management

### 🔔 Notifications & Alerts
- Entry/exit alerts
- Fraud detection alerts
- Account activity notifications

### 🛠 Admin Panel
- User management
- Reports and analytics
- Vehicle activity monitoring

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React.js, JavaScript |
| Backend | Node.js, Express.js |
| Microservice | Flask (Python) |
| Database | MongoDB |
| Authentication | JWT (JSON Web Tokens) |
| Tools | Git, GitHub, VS Code |

## 🏗️ Project Structure

```
Parkify/
├── backend/          # Node.js + Express REST API
├── flask_service/    # Python microservice
├── frontend/         # React.js client application
└── images/           # Project assets
```

## 🚀 Running Locally

**1. Clone the repository**
```bash
git clone https://github.com/nosheenfatima025/Parkify.git
cd Parkify
```

**2. Backend Setup**
```bash
cd backend
npm install
# Create a .env file with your own MongoDB URI, JWT secret, etc.
npm start
```

**3. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

**4. Flask Service Setup**
```bash
cd flask_service
pip install -r requirements.txt
python app.py
```

Nosheen Fatima
[LinkedIn](#) • [GitHub](https://github.com/nosheenfatima025)
