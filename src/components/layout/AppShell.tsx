import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
};
