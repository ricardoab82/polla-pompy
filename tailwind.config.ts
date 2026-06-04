import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:    '#0a4a2e',
        secondary:  '#f5c842',
        accent:     '#e8f5e9',
        dark:       '#111827',
      },
      fontFamily: {
        display: ['var(--font-bebas-neue)', 'sans-serif'],
        sans:    ['var(--font-dm-sans)',    'sans-serif'],
      },
      animation: {
        'in': 'slideIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
