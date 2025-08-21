# Frontend Implementation Guide: LLM Prompt Optimization Platform

## Project Overview
This document provides complete technical specifications for implementing the LLM Prompt Optimization Platform - a full-stack platform for designing, simulating, scoring, and optimizing mission-driven prompts across multiple LLMs.

## Technical Stack & Setup

### Required Dependencies
\`\`\`json
{
  "next": "^14.0.0",
  "react": "^18.0.0",
  "typescript": "^5.0.0",
  "tailwindcss": "^4.0.0",
  "@radix-ui/react-accordion": "latest",
  "@radix-ui/react-alert-dialog": "latest",
  "@radix-ui/react-avatar": "latest",
  "@radix-ui/react-button": "latest",
  "@radix-ui/react-card": "latest",
  "@radix-ui/react-dropdown-menu": "latest",
  "@radix-ui/react-input": "latest",
  "@radix-ui/react-label": "latest",
  "@radix-ui/react-select": "latest",
  "@radix-ui/react-textarea": "latest",
  "@radix-ui/react-toast": "latest",
  "lucide-react": "latest",
  "recharts": "^2.8.0",
  "class-variance-authority": "latest",
  "clsx": "latest",
  "tailwind-merge": "latest"
}
\`\`\`

### Project Structure
\`\`\`
app/
├── layout.tsx                 # Root layout with fonts and theme
├── page.tsx                   # Dashboard homepage
├── globals.css                # Design system tokens
├── model-wars/
│   └── page.tsx              # Model comparison arena
├── conversation-sim/
│   └── page.tsx              # Bulk conversation simulation
├── prompt-bro/
│   └── page.tsx              # AI-powered prompt generator
├── jobs/
│   └── page.tsx              # Background job management
└── analytics/
    ├── page.tsx              # Analytics dashboard
    └── loading.tsx           # Loading state

components/
├── sidebar-nav.tsx            # Main navigation sidebar
├── dashboard-header.tsx       # Dashboard welcome header
├── dashboard-stats.tsx        # Key metrics cards
├── recent-activity.tsx        # Activity feed
├── model-wars/               # Model Wars components
│   ├── model-wars-header.tsx
│   ├── battle-setup.tsx
│   ├── active-battles.tsx
│   ├── model-leaderboard.tsx
│   └── battle-history.tsx
├── conversation-sim/          # Conversation Simulation components
│   ├── conversation-sim-header.tsx
│   ├── simulation-setup.tsx
│   ├── active-simulations.tsx
│   ├── conversation-templates.tsx
│   └── simulation-results.tsx
├── prompt-bro/               # PromptBRO components
│   ├── prompt-bro-header.tsx
│   ├── prompt-generator.tsx
│   ├── prompt-optimizer.tsx
│   ├── prompt-versions.tsx
│   └── prompt-library.tsx
├── jobs/                     # Jobs Pipeline components
│   ├── jobs-header.tsx
│   ├── job-scheduler.tsx
│   ├── job-queue.tsx
│   ├── system-resources.tsx
│   └── job-history.tsx
└── analytics/                # Analytics components
    ├── analytics-header.tsx
    ├── performance-overview.tsx
    ├── model-comparison.tsx
    ├── prompt-effectiveness.tsx
    └── trend-analysis.tsx

components/ui/                 # shadcn/ui components
├── button.tsx
├── card.tsx
├── badge.tsx
├── input.tsx
├── select.tsx
├── textarea.tsx
└── [other shadcn components]
\`\`\`

## Design System Implementation

### Color Palette (OKLCH Values)
\`\`\`css
/* app/globals.css */
@import 'tailwindcss';

@theme inline {
  /* Fonts */
  --font-sans: var(--font-dm-sans);
  --font-heading: var(--font-space-grotesk);
  
  /* Light Mode Colors */
  --primary: oklch(0.68 0.15 35);              /* Orange-500 */
  --primary-foreground: oklch(0.99 0.01 35);   /* Near white */
  --secondary: oklch(0.65 0.18 25);            /* Deep Orange-Red */
  --secondary-foreground: oklch(0.99 0.01 25); /* Near white */
  
  --background: oklch(0.99 0.01 35);           /* Near white */
  --foreground: oklch(0.25 0.02 35);           /* Dark gray */
  --muted: oklch(0.96 0.01 35);                /* Light gray */
  --muted-foreground: oklch(0.45 0.02 35);     /* Medium gray */
  --card: oklch(0.99 0.01 35);                 /* Card background */
  --card-foreground: oklch(0.25 0.02 35);      /* Card text */
  --border: oklch(0.90 0.01 35);               /* Border color */
  --input: oklch(0.90 0.01 35);                /* Input border */
  --ring: oklch(0.68 0.15 35);                 /* Focus ring */
  
  --success: oklch(0.65 0.15 145);             /* Green */
  --warning: oklch(0.75 0.15 85);              /* Yellow */
  --destructive: oklch(0.65 0.18 15);          /* Red */
  --destructive-foreground: oklch(0.99 0.01 15);
}

@media (prefers-color-scheme: dark) {
  @theme inline {
    --background: oklch(0.12 0.02 35);         /* Dark background */
    --foreground: oklch(0.90 0.01 35);         /* Light text */
    --muted: oklch(0.18 0.02 35);              /* Dark muted */
    --muted-foreground: oklch(0.65 0.02 35);   /* Muted text */
    --card: oklch(0.15 0.02 35);               /* Dark card */
    --card-foreground: oklch(0.90 0.01 35);    /* Light card text */
    --border: oklch(0.25 0.02 35);             /* Dark border */
    --input: oklch(0.25 0.02 35);              /* Dark input */
  }
}
\`\`\`

### Typography Setup
\`\`\`tsx
// app/layout.tsx
import { Space_Grotesk, DM_Sans } from 'next/font/google'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} antialiased`}
    >
      <body>{children}</body>
    </html>
  )
}
\`\`\`

## Component Implementation Patterns

### Standard Page Layout
\`\`\`tsx
// Standard layout pattern used across all pages
<div className="flex h-screen bg-background">
  <SidebarNav />
  <div className="flex-1 flex flex-col overflow-hidden">
    <PageHeader />
    <main className="flex-1 overflow-auto p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page content */}
      </div>
    </main>
  </div>
</div>
\`\`\`

### Sidebar Navigation
\`\`\`tsx
// components/sidebar-nav.tsx key features:
interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Model Wars', href: '/model-wars', icon: Zap },
  { name: 'Conversation Sim', href: '/conversation-sim', icon: MessageSquare },
  { name: 'PromptBRO', href: '/prompt-bro', icon: Sparkles },
  { name: 'Jobs Pipeline', href: '/jobs', icon: Settings },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
]

// Implementation features:
- Collapsible state with useState
- Active route detection with usePathname()
- Smooth transitions with Tailwind classes
- Responsive behavior (hidden on mobile, overlay on tablet)
\`\`\`

### Card-Based Layout Pattern
\`\`\`tsx
// Consistent card structure across all pages
<Card className="p-6">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold font-heading">Section Title</h3>
    <Button variant="outline" size="sm">Action</Button>
  </div>
  <div className="space-y-4">
    {/* Card content */}
  </div>
</Card>
\`\`\`

## Page-Specific Implementation

### Dashboard (`/`)
**Components Required:**
- `dashboard-header.tsx`: Welcome message, user info, notifications
- `dashboard-stats.tsx`: 4-card grid with key metrics
- `recent-activity.tsx`: Scrollable activity feed

**Data Structures:**
\`\`\`tsx
interface DashboardStats {
  totalBattles: number;
  activeSimulations: number;
  promptsGenerated: number;
  runningJobs: number;
}

interface ActivityItem {
  id: string;
  type: 'battle' | 'simulation' | 'prompt' | 'job';
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
  user?: string;
}
\`\`\`

**Layout:**
- Stats grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
- Activity feed: Scrollable with max height
- Quick actions: Button grid for common tasks

### Model Wars Arena (`/model-wars`)
**Key Features:**
- Model selection with provider badges (OpenAI, Anthropic, Google, etc.)
- Battle configuration form with validation
- Real-time battle progress tracking
- Leaderboard with sortable columns
- Battle history with filtering

**State Management:**
\`\`\`tsx
interface Battle {
  id: string;
  models: string[];
  type: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  startTime: Date;
  results?: BattleResult;
}

interface ModelRanking {
  model: string;
  provider: string;
  wins: number;
  losses: number;
  winRate: number;
  avgResponseTime: number;
  trend: 'up' | 'down' | 'stable';
}
\`\`\`

**Implementation Notes:**
- Use badges for model providers with distinct colors
- Progress bars with animated transitions
- Real-time updates (WebSocket integration points marked)
- Sortable table headers with arrow indicators

### Conversation Simulation (`/conversation-sim`)
**Key Features:**
- Batch size configuration with range sliders
- Template library with search and filtering
- Progress monitoring with success rate charts
- Results visualization with detailed metrics

**Components:**
- Template cards with preview and rating system
- Simulation progress with real-time updates
- Results charts using Recharts library
- Batch configuration form with validation

**Data Structures:**
\`\`\`tsx
interface Simulation {
  id: string;
  name: string;
  template: string;
  batchSize: number;
  progress: number;
  successRate: number;
  status: 'running' | 'completed' | 'failed';
  results?: SimulationResult[];
}

interface ConversationTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  rating: number;
  usageCount: number;
  template: string;
}
\`\`\`

### PromptBRO Generator (`/prompt-bro`)
**Key Features:**
- AI-powered prompt generation with parameter controls
- Real-time optimization scoring and suggestions
- Version control with diff visualization
- Template library with ratings and categories

**Implementation Details:**
- Textarea with monospace font for prompts
- Parameter sliders for creativity, length, etc.
- Side-by-side comparison for optimization
- Version history with restore functionality

**State Management:**
\`\`\`tsx
interface PromptVersion {
  id: string;
  content: string;
  version: number;
  score: number;
  createdAt: Date;
  changes?: string[];
}

interface OptimizationSuggestion {
  type: 'clarity' | 'specificity' | 'structure';
  description: string;
  before: string;
  after: string;
  impact: 'high' | 'medium' | 'low';
}
\`\`\`

### Jobs Pipeline (`/jobs`)
**Key Features:**
- Job scheduler with cron-like interface
- Real-time queue monitoring with progress bars
- System resource utilization charts
- Job history with filtering and search

**Chart Implementation:**
- Use Recharts for resource monitoring (CPU, Memory, Disk, Network)
- Real-time updates with smooth animations
- Color-coded status indicators

**Data Structures:**
\`\`\`tsx
interface Job {
  id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

interface SystemResources {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  timestamp: Date;
}
\`\`\`

### Analytics Dashboard (`/analytics`)
**Key Features:**
- Performance overview with KPI cards
- Interactive charts with time range selection
- Model comparison visualizations
- Trend analysis with forecasting

**Chart Types Required:**
- Line charts for performance trends
- Bar charts for model comparisons
- Area charts for cumulative metrics
- Pie charts for distribution analysis

**Implementation:**
- Use Recharts for all visualizations
- Responsive chart sizing
- Interactive tooltips and legends
- Export functionality for reports

## Responsive Design Implementation

### Breakpoint Strategy
\`\`\`css
/* Mobile-first approach */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Small desktops */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large screens */
\`\`\`

### Responsive Patterns
\`\`\`tsx
// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Sidebar behavior
<div className="hidden lg:flex lg:w-64 lg:flex-col"> {/* Desktop sidebar */}
<div className="lg:hidden"> {/* Mobile menu button */}

// Typography scaling
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold font-heading">

// Card layouts
<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
\`\`\`

### Mobile Considerations
- Collapsible sidebar becomes overlay on mobile
- Touch-friendly button sizes (min 44px)
- Swipe gestures for navigation
- Optimized chart interactions for touch

## State Management & Data Flow

### Component State Patterns
\`\`\`tsx
// Loading states
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Form handling with validation
const [formData, setFormData] = useState(initialState);
const [formErrors, setFormErrors] = useState<Record<string, string>>({});

// Real-time updates (WebSocket ready)
const [liveData, setLiveData] = useState([]);
const [connectionStatus, setConnectionStatus] = useState('disconnected');
\`\`\`

### API Integration Points
\`\`\`tsx
// Expected API endpoints structure
const API_ENDPOINTS = {
  dashboard: {
    stats: '/api/dashboard/stats',
    activity: '/api/dashboard/activity'
  },
  modelWars: {
    battles: '/api/model-wars/battles',
    models: '/api/model-wars/models',
    leaderboard: '/api/model-wars/leaderboard'
  },
  conversationSim: {
    simulations: '/api/conversation-sim/simulations',
    templates: '/api/conversation-sim/templates',
    results: '/api/conversation-sim/results'
  },
  promptBro: {
    generate: '/api/prompt-bro/generate',
    optimize: '/api/prompt-bro/optimize',
    versions: '/api/prompt-bro/versions'
  },
  jobs: {
    queue: '/api/jobs/queue',
    schedule: '/api/jobs/schedule',
    resources: '/api/jobs/resources'
  },
  analytics: {
    metrics: '/api/analytics/metrics',
    trends: '/api/analytics/trends',
    export: '/api/analytics/export'
  }
};
\`\`\`

### Error Handling
\`\`\`tsx
// Global error boundary implementation
// Toast notifications for user feedback
// Retry mechanisms for failed requests
// Graceful degradation for offline scenarios
\`\`\`

## Accessibility Implementation

### ARIA Labels and Roles
\`\`\`tsx
// Navigation
<nav aria-label="Main navigation" role="navigation">
<button 
  aria-expanded={isOpen} 
  aria-controls="sidebar-menu"
  aria-label="Toggle navigation menu"
>

// Status indicators
<div role="status" aria-live="polite">
  <span className="sr-only">Battle in progress</span>
</div>

// Form labels and descriptions
<label htmlFor="model-select" className="text-sm font-medium">
  Select Model
</label>
<select 
  id="model-select"
  aria-describedby="model-select-description"
>
<div id="model-select-description" className="text-xs text-muted-foreground">
  Choose which AI model to use for the battle
</div>
\`\`\`

### Keyboard Navigation
\`\`\`tsx
// Tab order management
tabIndex={0} // Focusable elements
tabIndex={-1} // Programmatically focusable

// Focus management
const focusRef = useRef<HTMLButtonElement>(null);
useEffect(() => {
  if (isOpen) focusRef.current?.focus();
}, [isOpen]);

// Keyboard shortcuts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') closeModal();
    if (e.key === '/' && e.ctrlKey) openSearch();
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, []);
\`\`\`

### Focus Management
\`\`\`css
/* Focus indicators */
.focus-visible:focus {
  @apply ring-2 ring-ring ring-offset-2 ring-offset-background;
}

/* Skip links for screen readers */
.skip-link {
  @apply sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4;
  @apply bg-background text-foreground p-2 rounded border;
}
\`\`\`

## Performance Optimization

### Code Splitting
\`\`\`tsx
// Lazy load heavy components
const AnalyticsCharts = lazy(() => import('./analytics/analytics-charts'));
const ModelComparison = lazy(() => import('./model-wars/model-comparison'));

// Route-based splitting (automatic with App Router)
// Component-based splitting for large features
\`\`\`

### Optimization Patterns
\`\`\`tsx
// Memoization for expensive calculations
const memoizedStats = useMemo(() => {
  return calculateComplexStats(rawData);
}, [rawData]);

// Debounced search and input
const debouncedSearch = useCallback(
  debounce((query: string) => {
    performSearch(query);
  }, 300),
  []
);

// Virtual scrolling for large lists
// Image optimization with Next.js Image component
// Bundle analysis and tree shaking
\`\`\`

### Data Fetching
\`\`\`tsx
// SWR or React Query for data fetching
// Optimistic updates for better UX
// Background refetching
// Cache invalidation strategies
\`\`\`

## Testing Strategy

### Unit Testing
\`\`\`tsx
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarNav } from './sidebar-nav';

test('renders navigation items', () => {
  render(<SidebarNav />);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
  expect(screen.getByText('Model Wars')).toBeInTheDocument();
});

// User interaction testing
test('toggles sidebar when button clicked', () => {
  render(<SidebarNav />);
  const toggleButton = screen.getByLabelText('Toggle navigation menu');
  fireEvent.click(toggleButton);
  // Assert sidebar state change
});
\`\`\`

### Integration Testing
\`\`\`tsx
// API integration testing
// WebSocket connection testing
// Error boundary testing
// Accessibility testing with axe-core
\`\`\`

### E2E Testing
\`\`\`tsx
// Critical user flows
// Cross-browser compatibility
// Performance testing
// Mobile responsiveness
\`\`\`

## Development Workflow

### Setup Instructions
1. Clone repository and install dependencies
2. Set up environment variables for API endpoints
3. Configure shadcn/ui components
4. Set up development database/mock data
5. Configure WebSocket connections for real-time features

### Development Guidelines
- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Implement proper error boundaries
- Use semantic HTML elements
- Maintain consistent component structure
- Document complex logic and API integrations

### Deployment Considerations
- Environment-specific configurations
- CDN setup for static assets
- WebSocket server configuration
- Database connection pooling
- Monitoring and logging setup

## WebSocket Integration Points

### Real-time Features
\`\`\`tsx
// Battle progress updates
// Job queue monitoring
// System resource metrics
// Live activity feed
// Collaborative prompt editing

// WebSocket hook pattern
const useWebSocket = (url: string) => {
  const [data, setData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Connecting');
  
  useEffect(() => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => setConnectionStatus('Connected');
    ws.onmessage = (event) => setData(JSON.parse(event.data));
    ws.onclose = () => setConnectionStatus('Disconnected');
    ws.onerror = () => setConnectionStatus('Error');
    
    return () => ws.close();
  }, [url]);
  
  return { data, connectionStatus };
};
\`\`\`

This implementation guide provides complete technical specifications for recreating the LLM Prompt Optimization Platform with pixel-perfect accuracy and full functionality. All components, styling, and interactions are documented with specific implementation details for the frontend development team.
