import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata = {
  title: "IOHDASH Project",
  description: "Modern analytics dashboard for IOHDASH",
  icons: {
    icon: "/favicon.ico",     // ← pakai favicon statis
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={[
          geistSans.className,     // font default
          geistMono.variable,      // simpan var font mono
          "bg-black antialiased overflow-x-hidden",
        ].join(" ")}
      >
        {children}
      </body>
    </html>
  );
}
