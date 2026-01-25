'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { href: '/', label: 'Анализ' },
  { href: '/calculator', label: 'Калькулятор' },
  { href: '/tnved', label: 'Поиск ТН ВЭД' },
  { href: '/history', label: 'История' },
  { href: '/admin/tnved', label: 'Админка' },
] as const;

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-semibold text-white transition hover:text-blue-300"
        >
          Таможенный ИИ
        </Link>
        <nav className="flex flex-wrap gap-1">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === href
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
