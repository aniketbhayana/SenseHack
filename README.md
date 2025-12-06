# SenseHack - Safe Route App

This project is a full‑stack "Safe Route" application that helps users find safer paths using crime statistics and infrastructure data.

## Tech Stack
- **Client**: React 18, Vite, React Router, React Leaflet, Tailwind CSS
- **Server**: Node.js, Express, PostgreSQL

## Project Structure
- `client/` – React frontend (Vite)
- `server/` – Node/Express backend

## Getting Started

### Prerequisites
- Node.js (LTS recommended)
- npm
- PostgreSQL running locally or accessible via connection string

### 1. Install dependencies
```bash
# In project root (installs root lockfile deps, if any)
npm install

# Client dependencies
cd client
npm install

# Server dependencies
cd ../server
npm install
```

### 2. Environment variables
Create a `.env` file in `server/` with at least:
```bash
PORT=5000
DATABASE_URL=postgres://<user>:<password>@localhost:5432/<dbname>
```
Adjust to match your local PostgreSQL setup.

### 3. Database setup
Use the scripts in `server/db/` to initialize and seed the database (crime stats and infrastructure). For example:
```bash
cd server
node db/init.js
node db/seedCrimeStats.js
node db/seedInfrastructure.js
```

### 4. Run the backend
```bash
cd server
npm run dev
```
This starts the API server (by default on `http://localhost:5000`).

### 5. Run the frontend
```bash
cd client
npm run dev
```
Vite will start the React app (usually on `http://localhost:5173`).

## Scripts

### Client (`client/package.json`)
- `npm run dev` – start Vite dev server
- `npm run build` – production build
- `npm run preview` – preview production build
- `npm run lint` – run ESLint

### Server (`server/package.json`)
- `npm start` – start server
- `npm run dev` – start server with nodemon

## Contributing
Feel free to fork the repo and open pull requests with improvements or bug fixes.

## License
MIT (or add your preferred license here).
