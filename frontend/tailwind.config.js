/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary blue palette (unchanged - used for actions)
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Semantic color tokens (theme-aware via CSS variables)
        background: {
          primary: 'rgb(var(--color-background-primary))',
          secondary: 'rgb(var(--color-background-secondary))',
          tertiary: 'rgb(var(--color-background-tertiary))',
        },
        surface: {
          DEFAULT: 'rgb(var(--color-surface))',
          hover: 'rgb(var(--color-surface-hover))',
          active: 'rgb(var(--color-surface-active))',
        },
        border: {
          DEFAULT: 'rgb(var(--color-border))',
          light: 'rgb(var(--color-border-light))',
          dark: 'rgb(var(--color-border-dark))',
        },
        text: {
          primary: 'rgb(var(--color-text-primary))',
          secondary: 'rgb(var(--color-text-secondary))',
          tertiary: 'rgb(var(--color-text-tertiary))',
        },
      },
    },
  },
  plugins: [],
}
