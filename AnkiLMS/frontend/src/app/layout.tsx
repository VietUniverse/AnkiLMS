import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { AppProvider } from "../contexts/AppProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const notoKorean = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700", "900"], variable: "--font-noto-kr" });

export const metadata: Metadata = {
  metadataBase: new URL("https://lms.ankivn.com"),
  title: { default: "HaechiVN | Học tiếng Hàn với Flashcard, Dictation và Shadowing", template: "%s | HaechiVN" },
  description: "Học tiếng Hàn tại HaechiVN với flashcard ôn tập SRS, từ điển Hàn–Việt, luyện nghe chép chính tả và shadowing theo video. Bắt đầu học miễn phí.",
  applicationName: "HaechiVN",
  openGraph: { type: "website", locale: "vi_VN", siteName: "HaechiVN", title: "HaechiVN | Học tiếng Hàn mỗi ngày", description: "Flashcard SRS, từ điển Hàn–Việt, dictation và shadowing trên một nền tảng học tiếng Hàn.", url: "https://lms.ankivn.com", images: [{ url: "/brand/haechivn-mark.png", alt: "HaechiVN" }] },
  twitter: { card: "summary", title: "HaechiVN | Học tiếng Hàn mỗi ngày", description: "Flashcard SRS, từ điển Hàn–Việt, dictation và shadowing." },
  manifest: "/manifest.json",
  icons: {
    icon: "/brand/haechivn-mark.png?v=20261028",
    apple: "/brand/haechivn-mark.png?v=20261028",
  },
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebSite", name: "HaechiVN", url: "https://lms.ankivn.com", inLanguage: "vi", description: "Nền tảng học tiếng Hàn với flashcard SRS, từ điển, dictation và shadowing." }) }} />
        <link rel="icon" type="image/png" href="/brand/haechivn-mark.png?v=20261028" />
        <link rel="apple-touch-icon" href="/brand/haechivn-mark.png?v=20261028" />
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
