# Dating App Monorepo

This project contains the source code for the Dating App, organized as a monorepo.

## Structure

- **server/**: The backend application written in Go.
- **client/**: The frontend application (React).

## Setup

### Server
1. Navigate to the `server` directory:
   ```bash
   cd server
   ```
2. Install dependencies (if any):
   ```bash
   go mod tidy
   ```
3. Run the server:
   ```bash
   go run .
   ```

### Client
1. Navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Notes
- Ensure you have Go installed for the backend.
- Ensure you have Node.js and npm installed for the frontend.
