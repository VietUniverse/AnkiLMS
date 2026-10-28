import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../contexts/AppProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoKorean = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700", "900"], variable: "--font-noto-kr" });

export const metadata: Metadata = {
  title: "HaechiVN – Nền tảng Học Tiếng Hàn Duo-Style",
  description: "Học tiếng Hàn phong cách HaechiVN, đọc file Anki .apkg, Luyện nghe Dictation, Shadowing, SRS Flashcard & Thi thử TOPIK",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HaechiVN KR",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="light" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var p=new URLSearchParams(window.location.search);var t=p.get('theme')||localStorage.getItem('haechivn_theme')||'light';document.documentElement.dataset.theme=t;if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}catch(e){}`,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${notoKorean.variable} bg-slate-900 text-slate-100 min-h-screen flex flex-col font-sans antialiased selection:bg-blue-500 selection:text-white`}
      >
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
