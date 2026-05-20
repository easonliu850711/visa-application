import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Studio Imori 品牌色 — 沈穩和風
        imori: {
          50: '#f0f7f4',
          100: '#dceee5',
          200: '#b9ddd2',
          300: '#8fc5b6',
          400: '#65a997',
          500: '#478d7d',
          600: '#367162',
          700: '#2d5b50',
          800: '#284a41',
          900: '#233e37',
          950: '#112720',
        },
        // 草本綠色系
        herb: {
          50: '#f4f9f2',
          100: '#e3f1de',
          200: '#c8e3c0',
          300: '#a1cf95',
          400: '#78b56a',
          500: '#56984a',
          600: '#427a39',
          700: '#366230',
          800: '#2e4e2a',
          900: '#284226',
          950: '#122410',
        },
        // 輔助—櫻花粉
        sakura: {
          50: '#fdf5f5',
          100: '#fce9e9',
          200: '#f9d4d4',
          300: '#f5b5b5',
          400: '#ee8b8b',
          500: '#e36363',
          600: '#d04545',
          700: '#ae3535',
          800: '#902f2f',
          900: '#782d2d',
          950: '#421414',
        },
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
