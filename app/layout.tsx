import type { Metadata } from 'next';
import './globals.css';
import Nav from './components/Nav';

export const metadata: Metadata = {
  title: 'Таможенный ИИ-ассистент',
  description: 'Анализ документов и подбор кодов ТН ВЭД с ИИ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-900 text-gray-900 antialiased">
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
