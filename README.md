# pet_groomer_app
This is an app for a pet groomer to keep track of their clients and appointments.

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
