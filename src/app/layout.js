"use client";

import ResponsiveNav from "./components/BottomNav";
import UpdateBanner from "./components/UpdateBanner";
import "./globals.css";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="manifest"
          href={`/manifest.json?v=${process.env.NEXT_PUBLIC_MANIFEST_VERSION || "1"}`}
        />
        <link
          rel="apple-touch-icon"
          href={`/icons/icon3-192.png?v=${process.env.NEXT_PUBLIC_MANIFEST_VERSION || "1"}`}
        />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body>
        <SessionProvider>
          <RootContent>{children}</RootContent>
        </SessionProvider>
      </body>
    </html>
  );
}

// ✅ This renders children + nav using the *client* session
function RootContent({ children }) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
 useEffect(() => {
    if (session?.user?.role) {
      localStorage.setItem("userRole", session.user.role);
    }
  }, [session]);
  if (!mounted) return null;
 
  const manifestVersion = process.env.NEXT_PUBLIC_MANIFEST_VERSION || "1";

  return (
    <>
      {children}
      
      {session?.user && <ResponsiveNav />}
      <div className="fixed bottom-4 right-0 z-50">
        <UpdateBanner manifestVersion={manifestVersion} />
      </div>
    </>
  );
}
