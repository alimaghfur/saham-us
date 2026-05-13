import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        "card-hover": "rgb(var(--card-hover) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)",
        bull: "rgb(var(--bull) / <alpha-value>)",
        bear: "rgb(var(--bear) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        sidebar: "rgb(var(--sidebar) / <alpha-value>)",
        "sidebar-hover": "rgb(var(--sidebar-hover) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        "xl": "0.875rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        "glow": "0 0 20px rgb(var(--primary) / 0.15), 0 0 40px rgb(var(--primary) / 0.05)",
        "glow-sm": "0 0 10px rgb(var(--primary) / 0.1), 0 0 20px rgb(var(--primary) / 0.03)",
        "card": "0 2px 8px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.06)",
        "card-hover": "0 8px 24px rgb(0 0 0 / 0.12), 0 2px 8px rgb(0 0 0 / 0.08)",
        "inner-glow": "inset 0 1px 0 rgb(255 255 255 / 0.05)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-primary": "linear-gradient(135deg, rgb(var(--gradient-start)), rgb(var(--gradient-end)))",
        "noise": "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-in-up": "fadeInUp 0.5s ease-out",
        "fade-in-down": "fadeInDown 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.3s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
        "spin-slow": "spin 3s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "bounce-subtle": "bounceSubtle 2s ease-in-out infinite",
        "gradient": "gradient 8s ease infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        bounceSubtle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        gradient: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      transitionDuration: {
        "250": "250ms",
        "350": "350ms",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
