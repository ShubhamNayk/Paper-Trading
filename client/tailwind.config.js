/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#00C853',
          'green-light': '#E8F5E9',
          'green-dark': '#00962E',
          red: '#F44336',
          'red-light': '#FFEBEE',
          'red-dark': '#C62828',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F9FA',
          border: '#EAEAEA',
        },
        ink: {
          primary: '#0D0D0D',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 4px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
};

