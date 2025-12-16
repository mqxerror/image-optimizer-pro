/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			// Semantic colors
  			brand: {
  				DEFAULT: 'hsl(var(--brand))',
  				light: 'hsl(var(--brand-light))',
  				dark: 'hsl(var(--brand-dark))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				light: 'hsl(var(--info-light))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				light: 'hsl(var(--success-light))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				light: 'hsl(var(--warning-light))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		// Typography scale
  		fontSize: {
  			'micro': ['var(--text-micro)', { lineHeight: '1.2' }],
  			'tiny': ['var(--text-tiny)', { lineHeight: '1.3' }],
  			'small': ['var(--text-small)', { lineHeight: '1.4' }],
  			'caption': ['var(--text-caption)', { lineHeight: '1.4' }],
  		},
  		// Spacing scale
  		spacing: {
  			'space-1': 'var(--space-1)',
  			'space-2': 'var(--space-2)',
  			'space-3': 'var(--space-3)',
  			'space-4': 'var(--space-4)',
  			'space-6': 'var(--space-6)',
  			'space-8': 'var(--space-8)',
  		},
  		// UX-018: Shimmer animation for loading skeletons
  		keyframes: {
  			shimmer: {
  				'0%': { backgroundPosition: '-200% 0' },
  				'100%': { backgroundPosition: '200% 0' }
  			}
  		},
  		animation: {
  			shimmer: 'shimmer 2s ease-in-out infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
