"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export const DashboardLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="h-screen w-full flex overflow-hidden bg-[#FAFAFB] text-slate-900 font-sans antialiased">
      {/* Soft Ambient Light Gradient Overlay */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-60">
        <div className="absolute top-0 left-1/4 w-[800px] h-[500px] bg-indigo-100/40 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[400px] bg-purple-100/30 rounded-full blur-[120px]" />
      </div>

      {/* Floating Light Sidebar */}
      <div className="p-4 pr-0 h-full">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
          <div className="max-w-[1400px] mx-auto w-full pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
