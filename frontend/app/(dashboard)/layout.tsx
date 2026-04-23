import { UIProvider } from '@/store/UIContext';
import Sidebar from '@/components/layouts/Sidebar';
import Navbar from '@/components/layouts/Navbar';
import CreateTaskModal from '@/components/features/tasks/CreateTaskModal';
import TaskDrawer from '@/components/features/tasks/TaskDrawer';
import PresenceHeartbeat from '@/components/layouts/PresenceHeartbeat';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <div className="flex h-full bg-[var(--c-bg)]">
        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex flex-shrink-0">
          <Sidebar />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6 pb-[calc(var(--nav-h)+1.5rem)] md:pb-6">
          {children}
        </main>

        {/* Mobile bottom nav — hidden on desktop */}
        <div className="md:hidden">
          <Navbar />
        </div>
      </div>

      {/* Global modal — disponible desde cualquier página del dashboard */}
      <CreateTaskModal />
      {/* Global drawer — disponible desde cualquier página del dashboard */}
      <TaskDrawer />
      {/* Presence heartbeat — updates online status every 2 minutes */}
      <PresenceHeartbeat />
    </UIProvider>
  );
}
