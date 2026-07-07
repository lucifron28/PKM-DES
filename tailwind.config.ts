import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#004aad",
          yellow: "#f9d818"
        },
        primary: {
          50: "#edf5fe",
          100: "#d9e8fa",
          500: "#5d95db",
          600: "#3b7bcc",
          700: "#1f63b8",
          800: "#004aad",
          900: "#003a87"
        },
        secondary: {
          50: "#fffdf5",
          100: "#fff7cc",
          500: "#fbe14a",
          600: "#f9d818",
          700: "#f0cf00",
          800: "#d8b900",
          900: "#c49f00"
        },
        slateui: {
          background: "#f8fafc",
          surface: "#ffffff",
          surfaceAlt: "#f1f5f9",
          border: "#dbe4ee",
          text: "#0f172a",
          secondary: "#334155",
          muted: "#64748b"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(15, 23, 42, 0.08)"
      },
      gridTemplateColumns: {
        "admin-filters": "1fr 1fr 1fr 1fr auto",
        "report-filters": "1fr 1fr 1fr 1fr 1fr auto auto",
        "subject-table": "1fr 1fr auto auto",
        "detail-list": "220px 1fr"
      }
    }
  },
  plugins: []
};

export default config;
