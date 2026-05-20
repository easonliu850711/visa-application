import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '日本永住申請預估系統 | Visa Application Predictor',
  description: '利用 e-Stat 開放資料推算永住申請審查進度與預估通知時間',
  icons: {
    icon: '/visa-application/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;600;700;800;900&family=Noto+Sans+TC:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
