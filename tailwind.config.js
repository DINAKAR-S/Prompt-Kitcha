/** @type {import('tailwindcss').Config} */
export default {
  content: ["./*.html", "./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI Variable', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
        },
        accent: {
          400: "#a855f7",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
      },
      boxShadow: {
        'glow': '0 0 0 1px rgba(99,102,241,0.2), 0 8px 24px -8px rgba(99,102,241,0.45)',
        'float': '0 10px 40px -12px rgba(0,0,0,0.35), 0 2px 6px -2px rgba(0,0,0,0.12)',
        'pill': '0 8px 28px -6px rgba(99,102,241,0.55), 0 2px 6px rgba(0,0,0,0.2)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        'brand-gradient-hover': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      },
      animation: {
        "fade-in": "fadeIn 140ms ease-out",
        "fade-out": "fadeOut 200ms ease-in",
        "slide-up": "slideUp 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-soft": "pulseSoft 1.6s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeOut: { "0%": { opacity: "1" }, "100%": { opacity: "0" } },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
