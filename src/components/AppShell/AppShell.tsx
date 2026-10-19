import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import Breadcrumbs from "./Breadcrumbs";

interface Props {
  children: ReactNode;
}

export default function AppShell({ children }: Props) {
  // Start closed on phones and tablets, so the sidebar doesn't slide open and shut on every page load
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window === "undefined" || window.innerWidth >= 992);

  // Open on laptops and wider, closed below; only changes when the width crosses that line, so the phone address
  // bar showing or hiding (which fires resize) doesn't close a sidebar someone just opened
  useEffect(() => {
    let wide = window.innerWidth >= 992;
    const handleResize = () => {
      const nowWide = window.innerWidth >= 992;
      if (nowWide !== wide) {
        wide = nowWide;
        setIsSidebarOpen(nowWide);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex h-screen w-full min-w-0 overflow-hidden bg-background text-foreground">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <TopBar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden bg-background px-3 py-3 sm:px-5 sm:py-4 lg:px-6"
        >
          <Breadcrumbs />
          <div className="mx-auto w-full max-w-[1600px] pb-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
