import { Sidebar } from '@/components/Sidebar';

export default function ViewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 relative">
      <Sidebar />
      <div className="flex-1 pl-12">{children}</div>
    </div>
  );
}
