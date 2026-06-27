/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eafaf0', 100: '#d2f3df', 200: '#a7e7bf', 300: '#74d79b',
          400: '#45c279', 500: '#2da84f', 600: '#1f8c3f', 700: '#1b6f34',
          800: '#19582d', 900: '#154827',
        },
        slate: {
          850: '#172033',
        },
        ai: {
          50: '#f1f0ff', 100: '#e6e3ff', 200: '#cfc9ff', 300: '#b0a6ff',
          400: '#8f7bf7', 500: '#7559e8', 600: '#6442d4', 700: '#5333b0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        serif: ['"Times New Roman"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)',
        panel: '0 4px 16px rgba(16,24,40,0.08)',
        pop: '0 8px 28px rgba(16,24,40,0.18)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-dot': { '0%,100%': { opacity: '0.4' }, '50%': { opacity: '1' } },
        'slide-in-right': { '0%': { opacity: '0', transform: 'translateX(16px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        'dock-in': { '0%': { opacity: '0', transform: 'translateX(-12px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        'pulse-dot': 'pulse-dot 1.2s ease-in-out infinite',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.22,1,0.36,1)',
        'dock-in': 'dock-in 0.3s cubic-bezier(0.22,1,0.36,1)',
      },
    },
  },
  plugins: [],
}
