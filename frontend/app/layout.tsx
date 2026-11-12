import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QuickBite | PES University Cafeteria DBMS',
  description: 'Smart campus cafeteria ordering with SQL transactions, NoSQL reviews, and AI Vector recommendations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
