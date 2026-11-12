/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flat tokens for seamless @apply resolution
        'fintech-bg': '#F5F7FC',
        'fintech-card': '#FFFFFF',
        'fintech-border': '#E2E8F0',
        'primary-text': '#18243A',
        'secondary-text': '#738096',
        'text-primary': '#18243A',
        'text-secondary': '#738096',
        'text-muted': '#94A3B8',
        'success-green': '#16A36A',
        'royal-blue': '#3563E9',
        'royal-dark': '#264BC2',
        'royal-light': '#5982FA',

        // Hierarchical token trees
        navy: {
          DEFAULT: '#101D35',
          dark: '#0A1222',
          light: '#1B2C4E',
        },
        royal: {
          DEFAULT: '#3563E9',
          dark: '#264BC2',
          light: '#5982FA',
          soft: '#EEF4FF',
        },
        fintech: {
          DEFAULT: '#F5F7FC',
          bg: '#F5F7FC',
          card: '#FFFFFF',
          border: '#E2E8F0',
        },
        success: {
          DEFAULT: '#16A36A',
          green: '#16A36A',
          light: '#DCFCE7',
          dark: '#15803D',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
        },
        text: {
          DEFAULT: '#18243A',
          primary: '#18243A',
          secondary: '#738096',
          muted: '#94A3B8',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'fintech': '0 4px 20px -2px rgba(16, 29, 53, 0.06), 0 2px 6px -1px rgba(16, 29, 53, 0.04)',
        'fintech-lg': '0 10px 30px -4px rgba(16, 29, 53, 0.08), 0 4px 12px -2px rgba(16, 29, 53, 0.05)',
        'fintech-card': '0 1px 3px rgba(16, 29, 53, 0.05), 0 10px 25px -5px rgba(53, 99, 233, 0.04)',
      }
    },
  },
  plugins: [],
}
