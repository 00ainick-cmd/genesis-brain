# Genesis Dashboard

A modern, dark-themed dashboard for the Genesis GTD system.

## Tech Stack

- **React 18** + TypeScript
- **Vite** for fast development
- **Tailwind CSS 4** for styling
- **React Router** for navigation
- **Lucide React** for icons

## Features

- 📊 **Dashboard** - Overview with summary cards and top actions
- ✅ **Actions** - View and filter all actions by energy level and context
- 🧠 **Memory** - Browse and search Genesis memories
- 👥 **CRM** - Contact management (placeholder for MailerLite integration)

## Getting Started

### Prerequisites

- Node.js 18+
- Genesis backend running on http://localhost:3000

### Installation

```bash
cd /home/ubuntu/genesis/frontend
npm install
```

### Development

```bash
npm run dev
```

Opens at http://localhost:5173

### Build for Production

```bash
npm run build
```

Output in `dist/` folder.

## API Configuration

The dashboard connects to the Genesis backend API:

- **Base URL:** http://localhost:3000
- **Auth:** X-Genesis-API-Key header
- **Key:** Configured in `src/lib/api.ts`

### Endpoints Used

| Endpoint | Description |
|----------|-------------|
| GET /api/v1/clawdbot/dashboard | Dashboard summary & top actions |
| GET /api/v1/clawdbot/actions | All actions |
| GET /api/v1/clawdbot/inbox | Inbox items |
| GET /api/v1/clawdbot/projects | Active projects |
| GET /api/v1/memory | Memory store |
| POST /api/v1/clawdbot/inbox | Quick capture |

## Design System

### Colors

- **Matrix Green:** #00FF41
- **Background:** #0a0a0a (primary), #111111 (secondary)
- **Cards:** #161616 with #2a2a2a borders
- **Text:** #e0e0e0 (primary), #888888 (secondary)

### Fonts

- **UI:** Inter
- **Code/Data:** JetBrains Mono

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── Layout.tsx   # Main layout with sidebar
│   ├── StatCard.tsx # Summary stat cards
│   ├── ActionItem.tsx
│   ├── QuickCapture.tsx
│   ├── Loading.tsx
│   └── EmptyState.tsx
├── pages/           # Page components
│   ├── Dashboard.tsx
│   ├── Actions.tsx
│   ├── Memory.tsx
│   └── CRM.tsx
├── lib/             # Utilities & API
│   ├── api.ts       # API client
│   └── utils.ts     # Helper functions
├── App.tsx          # Router setup
├── main.tsx         # Entry point
└── index.css        # Global styles
```

## License

Private - Genesis Project
