/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './config/**/*.{js,jsx}',
    './hooks/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        arena: {
          void: '#06040f',
          deep: '#0b0820',
          panel: '#131033',
          edge: '#241f54',
        },
        ember: '#ffb547',
        aurora: '#37e5f0',
        nebula: '#a45bff',
        signal: '#4d7cff',
      },
      gridTemplateColumns: {
        15: 'repeat(15, minmax(0, 1fr))',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 30px -6px rgba(164, 91, 255, 0.55)',
        'glow-cyan': '0 0 30px -6px rgba(55, 229, 240, 0.55)',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'shake-hand': {
          '0%, 100%': { transform: 'rotate(0deg) translateY(0)' },
          '25%': { transform: 'rotate(-14deg) translateY(-10px)' },
          '75%': { transform: 'rotate(14deg) translateY(-10px)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '70%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'sweep': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(220%)' },
        },
      },
      animation: {
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'shake-hand': 'shake-hand 0.42s ease-in-out 3',
        'pop-in': 'pop-in 0.35s cubic-bezier(0.2, 1.3, 0.5, 1) both',
        'sweep': 'sweep 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
