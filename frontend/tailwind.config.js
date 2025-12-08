/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'scan': 'scan 2s linear infinite',
        'blob': 'blob 10s infinite', // Slower breathing
        'shimmer': 'shimmer 2s linear infinite',
        'shine': 'shine 8s ease-in-out infinite', // Slower, smoother shine
      },
      keyframes: {
        scan: {
          '0%': { top: '0%', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" },
        },
        shimmer: {
          from: { "backgroundPosition": "0 0" },
          to: { "backgroundPosition": "-200% 0" }
        },
        // Updated Shine Keyframe
        shine: {
          '0%, 100%': { backgroundPosition: '-100% center' },
          '50%': { backgroundPosition: '200% center' },
        }
      }
    },
  },
  plugins: [
    require("tailwindcss-animate"),
  ],
}