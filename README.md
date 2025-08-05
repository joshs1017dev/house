# 🏡 House - Ultimate Home Improvement Project Manager

A fully-featured Progressive Web App for managing home improvement projects with AI-powered assistance.

## 🚀 Live Demo

**Production URL:** https://house-dgo24valf-joshs-projects-afa38a9f.vercel.app

## ✨ Features

### Core Project Management
- **Projects**: Create and manage multiple home improvement projects
- **Tasks**: Drag-and-drop task boards with priority management
- **Budget Tracking**: Real-time expense tracking with visual charts
- **Materials List**: Shopping list management with vendor tracking
- **Photo Gallery**: Before/after photo documentation with camera support
- **Dashboard**: Overview of all projects, budgets, and upcoming tasks

### AI-Powered Assistant (Gemini 2.5 Pro)
- **Cost Estimator**: Get accurate project cost breakdowns
- **Project Advisor**: Expert advice on any home improvement question
- **Materials Suggester**: Generate complete shopping lists
- **Timeline Generator**: Create realistic project schedules

### Technical Features
- **PWA**: Works offline, installable on mobile devices
- **Local Storage**: All data stored locally using IndexedDB
- **Responsive Design**: Mobile-first approach
- **No React**: Built with Svelte + TypeScript for better performance

## 🛠️ Tech Stack

- **Frontend**: Svelte 5 + TypeScript
- **Build Tool**: Vite
- **Database**: Dexie.js (IndexedDB wrapper)
- **Styling**: Custom CSS with CSS Variables
- **Charts**: Chart.js
- **Drag & Drop**: SortableJS
- **AI**: Google Gemini 2.5 Pro API
- **Deployment**: Vercel

## 📱 Installation

### Use as PWA
1. Visit the [live app](https://house-dgo24valf-joshs-projects-afa38a9f.vercel.app)
2. Click "Install" when prompted (or use browser menu)
3. Access from your home screen

### Run Locally
```bash
# Clone the repository
git clone https://github.com/joshs1017dev/house.git
cd house

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 📸 Features in Detail

### Project Management
- Create projects with budgets, timelines, and priority levels
- Track project status (planning, active, paused, completed)
- Organize by rooms and tags
- Visual budget progress indicators

### Task Management
- Drag-and-drop interface for task prioritization
- Task states: pending, in-progress, completed, blocked
- Due date tracking with reminders
- Time estimation and tracking

### Expense Tracking
- Categorized expenses (materials, labor, permits, tools, other)
- Link expenses to specific materials
- Monthly spending charts
- Budget vs actual comparison

### Materials Management
- Shopping list with quantity and unit tracking
- Price comparison (estimated vs actual)
- Vendor information and product links
- Status tracking (needed, ordered, received)

### Photo Documentation
- Before/after photo comparison
- Link photos to specific tasks
- Camera integration for instant capture
- Organized gallery with filtering

### AI Assistant
- Natural language project advice
- Accurate cost estimates based on room size and scope
- Material recommendations with brand suggestions
- Realistic timeline generation

## 🔐 Privacy

All data is stored locally on your device using IndexedDB. No data is sent to external servers except for AI queries to Google Gemini API.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is open source and available under the [MIT License](LICENSE).