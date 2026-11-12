import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  title?: string;
  onQuickAddExpense?: () => void;
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ title, onQuickAddExpense, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-fintech-bg flex">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header 
          onToggleSidebar={() => setSidebarOpen(prev => !prev)} 
          title={title}
          onQuickAddExpense={onQuickAddExpense}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

