import type { Metadata } from 'next';
import { Manrope, Newsreader } from 'next/font/google';
import './globals.css';
import Nav from '@/components/Nav';

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
});

export const metadata: Metadata = {
  title: 'The BIG Board',
  description: 'NBA and NHL playoff standings for your private league.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className={`${manrope.variable} ${newsreader.variable} min-h-full bg-[linear-gradient(180deg,#f6f2e8_0%,#f8f6f0_42%,#fbfaf7_100%)] font-sans text-slate-900`}
      >
        <div className="fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute left-[-12%] top-[-8%] h-72 w-72 rounded-full bg-[rgba(189,153,88,0.16)] blur-3xl" />
          <div className="absolute right-[-10%] top-[12%] h-80 w-80 rounded-full bg-[rgba(58,93,125,0.15)] blur-3xl" />
          <div className="absolute bottom-[-10%] left-[18%] h-64 w-64 rounded-full bg-[rgba(36,65,54,0.10)] blur-3xl" />
        </div>
        <Nav />
        <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
        <footer className="py-6 text-center text-sm text-slate-400">
          Duggan Blows
        </footer>
      </body>
    </html>
  );
}
