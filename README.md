# pet_groomer_app
This is an app for a pet groomer to keep track of their clients and appointments.

## What Was Built

Here is a summary of everything that was created in the initial implementation:

### React Application (`react-app/`)

A fully functional single-page application built with **React 19 + TypeScript** (powered by Vite) and styled with **Bootstrap 5 + react-bootstrap**.

#### Features

- **Client Management** (`src/components/ClientList.tsx`)
  - View all clients in a sortable table (Owner Name, Phone, Email, Pet Name, Pet Breed)
  - Add a new client via a modal form
  - Edit an existing client's details
  - Delete a client
  - Live count badge showing the total number of clients
  - Sample data pre-loaded (Alice Johnson / Buddy and Bob Smith / Mittens)

- **Appointment Management** (`src/components/AppointmentList.tsx`)
  - View all appointments in a table (Date, Time, Client, Pet, Service, Notes)
  - Appointments are automatically sorted chronologically by date and time
  - Add a new appointment via a modal form with a dropdown for service type
  - Edit an existing appointment
  - Delete an appointment
  - Live count badge showing the total number of appointments
  - Supported services: Bath & Brush, Full Groom, Nail Trim, Teeth Cleaning, Ear Cleaning, De-shedding
  - Sample data pre-loaded with two upcoming appointments

- **App Shell** (`src/App.tsx`)
  - Responsive navigation bar with a 🐾 brand logo
  - Tab-based navigation to switch between the Clients and Appointments views

#### Project Files Created

| File | Purpose |
|------|---------|
| `react-app/src/main.tsx` | App entry point; mounts React and imports Bootstrap CSS |
| `react-app/src/App.tsx` | Root component with navbar and tab navigation |
| `react-app/src/App.css` | Minimal app-level styles |
| `react-app/src/index.css` | Global base styles |
| `react-app/src/components/ClientList.tsx` | Client CRUD component |
| `react-app/src/components/AppointmentList.tsx` | Appointment CRUD component |
| `react-app/index.html` | HTML entry point |
| `react-app/vite.config.ts` | Vite configuration |
| `react-app/tsconfig*.json` | TypeScript configuration files |
| `react-app/eslint.config.js` | ESLint configuration |
| `react-app/package.json` | Dependencies and npm scripts |

### Developer Environment

- **`.devcontainer/devcontainer.json`** – Dev Container configuration so the app runs out of the box in VS Code or GitHub Codespaces (Node.js 22, auto-installs dependencies, forwards port 5173)
- **`.vscode/extensions.json`** – Recommended VS Code extensions (Prettier, ESLint, TypeScript Next, React Snippets, GitHub Copilot)
- **`.vscode/settings.json`** – Workspace settings (format on save with Prettier, ESLint auto-fix, TypeScript validation)

## Tech Stack

- **Frontend**: React 19 + TypeScript (Vite)
- **UI Library**: Bootstrap 5 + react-bootstrap

## Getting Started in VS Code

### Option 1: Dev Container (Recommended)

This repository includes a [Dev Container](https://containers.dev/) configuration so you can develop inside a fully configured container with all tools pre-installed.

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) in VS Code.
2. Open this repository in VS Code.
3. Click **Reopen in Container** when prompted (or press `F1` and select **Dev Containers: Reopen in Container**).
4. VS Code will build the container and install all dependencies automatically.
5. Start the development server:
   ```bash
   cd react-app
   npm run dev
   ```
6. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Option 2: GitHub Codespaces

1. Click the **Code** button on the GitHub repository page.
2. Select the **Codespaces** tab and click **Create codespace on main**.
3. The environment will be set up automatically.
4. Run `cd react-app && npm run dev` in the terminal.

### Option 3: Local Development

**Prerequisites:** Node.js 18+

```bash
cd react-app
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts (inside `react-app/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build |

## Recommended VS Code Extensions

When you open this project in VS Code, you will be prompted to install the recommended extensions defined in `.vscode/extensions.json`:

- **Prettier** – Code formatter
- **ESLint** – Linting
- **TypeScript Next** – Enhanced TypeScript support
- **ES7+ React Snippets** – React code snippets
- **GitHub Copilot** – AI coding assistant
