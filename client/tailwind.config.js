/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Gojo brand colors from design
        gojo: {
          coral: '#E67E5F',
          brown: '#3D2C29',
          lightGray: '#F7F7F7',
          darkGray: '#6B6B6B',
        },
        primary: {
          DEFAULT: '#2563EB',
          dark: '#1E3A8A',
        },
        success: '#10B981',
        warning: '#FBBF24',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

