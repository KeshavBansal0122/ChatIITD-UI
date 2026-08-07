/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        pplx: {
          bg: '#f6f2ec',
          surface: '#fcfbf8',
          border: '#d7d0c5',
          ink: '#1f1b17',
          muted: '#8a8176',
          accent: '#25211c',
        },
        iitd: {
          red: '#A31F34',
          'red-dark': '#7F1828',
          'red-soft': '#F3D6DB',
        },
      },
      keyframes: {
        'think-bounce': {
          '0%, 80%, 100%': { transform: 'translateY(0)', opacity: '0.35' },
          '40%': { transform: 'translateY(-3px)', opacity: '1' },
        },
      },
      animation: {
        'think-bounce': 'think-bounce 1.1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
