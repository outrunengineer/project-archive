'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, BarChart2, Folder, Settings, Download } from 'lucide-react';

export function Sidebar() {
  const [expanded, setExpanded] = useState(false);
  const params = useParams();
  const id = params?.id;

  const navItems = [
    { icon: <BarChart2 className="w-5 h-5" />, label: 'Timeline View', href: `/timelines/${id}/view` },
    { icon: <Folder className="w-5 h-5" />, label: 'Project Overview', href: `/projects` },
    { icon: <Settings className="w-5 h-5" />, label: 'Timeline Config', href: `/timelines/${id}` },
  ];

  return (
    <aside
      aria-expanded={expanded}
      className="fixed left-0 top-14 bottom-0 z-20 flex flex-col transition-all duration-200 rounded-r-xl overflow-hidden"
      style={{
        width: expanded ? '200px' : '48px',
        background: 'rgba(84, 94, 118, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
        className="flex items-center justify-center h-10 text-white/70 hover:text-white transition-colors"
      >
        {expanded ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>

      <nav className="flex-1 flex flex-col gap-1 px-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 h-10 px-3 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            {item.icon}
            {expanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="px-1 pb-3">
        <button
          aria-label="Download timeline export"
          className="flex items-center gap-3 h-10 w-full px-3 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Download className="w-5 h-5" />
          {expanded && <span className="text-sm whitespace-nowrap">Download</span>}
        </button>
      </div>
    </aside>
  );
}
