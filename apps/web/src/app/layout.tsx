import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Glaszetter Snel',
  description: 'Volledige bedrijfsapp voor glaszetters',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
