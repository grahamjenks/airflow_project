# Cricket Statistics Tracker

A modern React UI for capturing and viewing cricket statistics.

## Features

- **Match Details**: Record match information including teams, venue, format, and toss details
- **Batting Statistics**: Track player batting performance with runs, balls, strike rate, boundaries, and dismissal information
- **Bowling Statistics**: Record bowling figures including overs, maidens, runs, wickets, economy rate, average, and strike rate
- **Statistics View**: View comprehensive statistics summary with calculated totals and exportable data
- **Modern UI**: Beautiful, responsive design with gradient themes and smooth animations

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the cricket-ui directory:
```bash
cd cricket-ui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The app will open in your browser at `http://localhost:3000`

### Building for Production

To create a production build:
```bash
npm run build
```

To preview the production build:
```bash
npm run preview
```

## Usage

1. **Start by entering Match Details** - Fill in information about the match
2. **Add Batting Statistics** - Record individual player batting performances
3. **Add Bowling Statistics** - Record individual bowler figures
4. **View Statistics** - See a comprehensive summary and export data as JSON

## Technology Stack

- React 18
- Vite
- CSS3 (Modern styling with gradients and animations)

## Project Structure

```
cricket-ui/
├── src/
│   ├── components/
│   │   ├── MatchDetails.jsx
│   │   ├── BattingStats.jsx
│   │   ├── BowlingStats.jsx
│   │   └── StatisticsView.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

