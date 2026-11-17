/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#090D16',
        slatecard: '#111827',
        slatehover: '#162033',
        techborder: '#1F2937',
        dosha: {
          vata: '#06B6D4',
          pitta: '#F59E0B',
          kapha: '#10B981',
          vatapitta: '#8B5CF6',
          pittakapha: '#F43F5E',
          vatakapha: '#6366F1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px -6px rgba(6, 182, 212, 0.35)',
        'glow-emerald': '0 0 24px -6px rgba(16, 185, 129, 0.35)',
        'glow-violet': '0 0 24px -6px rgba(139, 92, 246, 0.35)',
        'glow-amber': '0 0 24px -6px rgba(245, 158, 11, 0.35)',
      },
    },
  },
  plugins: [],
};
