/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        satoshi: ['Satoshi', 'sans-serif'],
        besley: ['Besley', 'serif'],
        'press-start': ['Press Start 2P', 'cursive'],
        roboto: ['Roboto', 'sans-serif'],
      },
      keyframes: {
        grid: {
          '0%': { transform: 'translateY(-50%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        grid: 'grid 15s linear infinite',
      },
      boxShadow: {
        drop: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
      fontSize: {
        // Headings
        display: ['48px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
        h1: ['36px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        h2: ['30px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
        h3: ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        h4: ['20px', { lineHeight: '1.3', fontWeight: '600' }],

        // Body
        'body-lg': ['18px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],

        // Utility
        caption: ['12px', { lineHeight: '1.5', fontWeight: '400' }],
        label: ['12px', { lineHeight: '1.5', fontWeight: '500', letterSpacing: '0.02em' }],

        // Legacy Semantic (Keep for backward compatibility or migration)
        'semantic-title': ['14px', { lineHeight: '1.4', fontWeight: '450' }],
        'semantic-description': ['14px', { lineHeight: '1.4', fontWeight: '350' }],
        'semantic-row-name': ['16px', { lineHeight: '1.4', fontWeight: '450' }],
        'semantic-data-value': ['16px', { lineHeight: '1.4', fontWeight: '350' }],
        'semantic-label': ['14px', { lineHeight: '1.4', fontWeight: '450' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderColor: {
        menu: {
          active: 'hsla(0, 0%, 100%, 1)',
        },
      },
      colors: {
        // Semantic Tokens
        surface: {
          default: '#17181D',
          muted: '#202126',
          elevated: '#27282D',
        },
        text: {
          primary: '#FFFFFF',
          secondary: 'hsla(212, 9%, 58%, 1)',
        },
        border: {
          subtle: 'hsla(0, 0%, 100%, 0.04)',
          highlight: 'rgba(255, 255, 255, 0.76)',
          muted: '#E3E8EF',
          dark: '#3e3e3e',
          DEFAULT: 'hsl(var(--border))',
        },
        accent: {
          primary: '#1EE6D1',
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        semantic: {
          third: 'hsla(212, 9%, 58%, 1)',
          secondary: 'hsla(212, 9%, 58%, 1)',
        },
        menu: {
          active: '#fff',
          inactive: 'hsla(0, 0%, 100%, 0.76)',
        },

        // Shadcn Colors
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
        // Custom dark green palette
        'green-dark': {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#50d2c1',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#04251f',
        },
        // Figma design colors
        'figma': {
          'gray-bg': '#dbdae0',
          'gray-light': '#f9f9f9',
          'gray-table': '#dadae0',
          'yellow': '#facb25',
          'purple-dark': '#170d2d',
          'purple-light': '#462886',
          'purple': '#895bf5',
          'text-dark': '#121213',
          'text-gray': '#3d3d43',
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
