# UI Design Guide

This skill document defines the UI design patterns and conventions used throughout the ToolHub project.

## Page Layout Structure

### Root Container
```tsx
// Standard page wrapper with responsive padding (recommended)
<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {/* Content */}
</div>

// Wider layout for complex tools
<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  {/* Content */}
</div>

// Full-width layout
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
  {/* Content */}
</div>
```

**Key classes:**
- `px-4 sm:px-6 lg:px-8` - Responsive horizontal padding (required)
- `py-8` or `py-12` - Vertical padding
- `max-w-4xl` / `max-w-6xl` / `max-w-7xl` - Max width constraints
- `mx-auto` - Center the container

### Page Header Pattern
All pages use a consistent header structure:

```tsx
{/* Header */}
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
      {t('title')}
    </h1>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
      {t('description')}
    </p>
  </div>
  {/* Optional: CalculationHistory or other controls */}
</div>
```

**Key rules:**
- Title: `text-2xl font-bold` (NOT text-3xl)
- Description: `text-sm text-gray-500 dark:text-gray-400 mt-1`
- No icon boxes or decorative elements in header
- Simple, clean layout

## Card Components

### Standard Card
```tsx
<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
  {/* Content */}
</div>

// Alternative with shadow-xl for emphasis
<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
  {/* Content */}
</div>
```

### Card with Header
```tsx
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
  <div className="flex items-center space-x-2">
    <IconComponent className="w-5 h-5 text-blue-600" />
    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
      {t('section.title')}
    </h2>
  </div>
  {/* Card content */}
</div>
```

## Typography Scale

| Element | Classes |
|---------|---------|
| Page Title (h1) | `text-2xl font-bold text-gray-900 dark:text-white` |
| Section Title (h2) | `text-xl font-semibold text-gray-900 dark:text-white` or `text-2xl font-bold` |
| Subsection (h3) | `text-lg font-semibold text-gray-900 dark:text-white` |
| Label | `text-sm font-medium text-gray-700 dark:text-gray-300` |
| Description | `text-sm text-gray-500 dark:text-gray-400` |
| Body text | `text-gray-600 dark:text-gray-400` |
| Small text | `text-xs text-gray-500 dark:text-gray-400` |

## Form Elements

### Input Fields
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
/>
```

### Labels
```tsx
<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
  {t('input.label')}
</label>
```

### Textarea
```tsx
<textarea
  className="w-full h-64 p-4 text-gray-900 dark:text-white bg-transparent resize-none focus:outline-none text-base leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500"
  spellCheck={false}
/>
```

## Button Styles

### Primary Button (Action)
```tsx
<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
  <Icon className="w-4 h-4" />
  {t('button.label')}
</button>

// Blue variant
<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white">
```

### Secondary Button
```tsx
<button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
  <Icon className="w-4 h-4" />
  {t('button.label')}
</button>
```

### Ghost/Outline Button
```tsx
<button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
  <Icon className="w-4 h-4" />
</button>
```

## Tab Navigation

```tsx
<div className="flex border-b border-gray-200 dark:border-gray-700">
  <button
    onClick={() => setActiveTab('tab1')}
    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
      activeTab === 'tab1'
        ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
    }`}
  >
    <div className="flex items-center space-x-2">
      <Icon className="w-4 h-4" />
      <span>{t('tabs.tab1')}</span>
    </div>
  </button>
</div>
```

## Grid Layouts

### Two Column (Desktop)
```tsx
<div className="grid lg:grid-cols-2 gap-8">
  {/* Left column */}
  <div>{/* Content */}</div>
  {/* Right column */}
  <div>{/* Content */}</div>
</div>
```

### Three Column (Desktop)
```tsx
<div className="grid lg:grid-cols-3 gap-8">
  <div className="lg:col-span-1">{/* Sidebar */}</div>
  <div className="lg:col-span-2">{/* Main content */}</div>
</div>
```

### Responsive Stats Grid
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
  {/* Stat cards */}
</div>
```

## Stat Card Component

```tsx
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number
  highlight?: boolean
}

const StatCard = ({ icon, label, value, highlight }: StatCardProps) => (
  <div className={`flex flex-col items-center p-4 rounded-xl transition-all ${
    highlight
      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-105'
      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md'
  }`}>
    <div className={`mb-2 ${highlight ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
      {icon}
    </div>
    <div className={`text-xs font-medium mb-1 ${highlight ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
      {label}
    </div>
    <div className={`text-2xl font-bold tabular-nums ${highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
      {value.toLocaleString()}
    </div>
  </div>
)
```

## Color Palette

### Brand Colors
- Primary: `blue-600` / `blue-500`
- Success/Accent: `emerald-500` / `teal-600`
- Warning: `yellow-600`
- Error: `red-600`

### Text Colors
- Primary: `gray-900 dark:text-white`
- Secondary: `gray-600 dark:text-gray-400`
- Muted: `gray-500 dark:text-gray-400`
- Very Muted: `gray-400 dark:text-gray-500`

### Background Colors
- Page: handled by parent layout
- Card: `bg-white dark:bg-gray-800`
- Input: `bg-transparent` or `dark:bg-gray-700`
- Hover/Active: `bg-gray-50 dark:bg-gray-700/50`

### Border Colors
- Default: `border-gray-200 dark:border-gray-700`
- Input: `border-gray-300 dark:border-gray-600`

## Icon Sizes

| Context | Size |
|---------|------|
| In buttons | `w-4 h-4` |
| Section headers | `w-5 h-5` |
| Card headers | `w-6 h-6` |
| Feature icons | `w-8 h-8` |

## Spacing Guidelines

- Page sections: `space-y-6` or `space-y-8`
- Card internal: `space-y-6`
- Form fields: `space-y-6`
- Grid gap: `gap-3` (small), `gap-6` (medium), `gap-8` (large)
- Button groups: `gap-2`

## Dark Mode

All components must support dark mode using Tailwind's `dark:` prefix:
- Always pair light/dark variants for backgrounds, text, and borders
- Test both modes when creating new components

## Section Spacing

Use `mb-6` between major sections:
```tsx
{/* Stats Grid */}
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
  {/* Content */}
</div>

{/* Main Content */}
<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg ... mb-6">
  {/* Content */}
</div>

{/* Guide Section */}
<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg ...">
  {/* Content - last section, no mb-6 */}
</div>
```

## Anti-patterns to Avoid

1. **Overly decorative headers** with large icon boxes
2. Using `text-3xl` for page titles (use `text-2xl`)
3. Wrapping content in `min-h-screen` background gradients (parent handles this)
4. Inconsistent spacing between sections
5. Missing dark mode support
6. Using absolute font sizes instead of Tailwind classes
7. **Missing responsive padding** - always use `px-4 sm:px-6 lg:px-8`
8. **Missing vertical padding** - always use `py-8` or `py-12`
