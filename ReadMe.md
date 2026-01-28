# 90Plus Backend ⚽🏟️

This is the backend of **90Plus**, a football club management platform that allows coaches to create and manage the club, teams, matches, and players, while players can view their invitations.

It is built with **Node.js, Express, MongoDB**, and uses **JWT authentication** with role-based access control.

---

## ✨ Features

- JWT-based authentication (sign up, sign in)
- Role-based authorization (**Coach** vs **Player**)
- Club management:
  - Create, update, delete clubs
  - Invite and manage players
- Team management:
  - Create teams per club
  - Assign players and positions
- Match management:
  - Create matches between teams
  - Update scores
  - Rate players per match
- Player system:
  - Player market
  - Invitations (accept / reject)
- Secure handling of tokens and protected routes
- Clean RESTful API structure

---

## 🧠 Roles & Permissions

### Coach

- Create and manage a club
- Create teams
- Invite players
- Create matches
- Edit match scores and player ratings
- Delete club and related data

### Player

- Accept or reject club invitations

---

## 🧱 Tech Stack

- **Node.js**
- **Express.js**
- **MongoDB + Mongoose**
- **JWT Authentication**
- **bcrypt**
- **CORS**
- **Morgan**

---

## 📦 Setup & Installation

### 1️⃣ Clone the repository

- git clone https://github.com/fadhelhaji/90Plus-backend
- cd 90Plus-backend

### 2️⃣ Install dependencies

- npm install

### 3️⃣ Create a .env file

- PORT=3000
- MONGODB_URI=your_mongodb_connection_string
- JWT_SECRET=your_jwt_secret

#### Cloudinary (for match photos)

- CLOUDINARY_CLOUD_NAME=your_cloud_name
- CLOUDINARY_API_KEY=your_api_key
- CLOUDINARY_API_SECRET=your_api_secret

---

### 4️⃣ Start the server

- npm start
