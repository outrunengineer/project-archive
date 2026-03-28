'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, Settings, User, ChevronRight } from 'lucide-react';
import { IconButton } from './ui/IconButton';

export function NavBar() {
  const pathname = usePathname();

  const isConfigPage = /^\/timelines\/\d+(?!\/view)/.test(pathname);
  const isViewPage = /^\/timelines\/\d+\/view/.test(pathname);

  const tab = (href: string, label: string) => {
    const active = pathname === href || pathname.startsWith(href + '/');
    return (
      <Link
        href={href}
        className={`text-sm px-1 pb-0.5 transition-colors ${
          active
            ? 'text-on-surface font-semibold border-b-2 border-on-surface'
            : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="h-14 bg-surface-container-highest flex items-center px-6 gap-8 shrink-0">
      <span className="font-display font-bold text-base text-on-surface tracking-tight whitespace-nowrap">
        Project Archive
      </span>

      <nav className="flex items-center gap-3">
        {tab('/projects', 'Projects')}
        {(isConfigPage || isViewPage) && (
          <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant opacity-50 shrink-0" />
        )}
        {isConfigPage && tab(pathname, 'Timeline Config')}
        {isViewPage && tab(pathname, 'Project Timeline')}
      </nav>

      <div className="flex-1 flex justify-end items-center gap-2">
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
          <input
            type="search"
            placeholder="Search Project Entities..."
            className="w-full h-8 pl-8 pr-3 text-xs bg-surface-container-high rounded-md outline-none placeholder:text-on-surface-variant focus:bg-surface-container-lowest transition-colors"
          />
        </div>
        <IconButton icon={<Bell className="w-4 h-4" />} label="Notifications" />
        <IconButton icon={<Settings className="w-4 h-4" />} label="Settings" />
        <IconButton icon={<User className="w-4 h-4" />} label="User profile" variant="filled" />
      </div>
    </header>
  );
}
