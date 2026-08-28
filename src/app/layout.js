"use client";

import ResponsiveNav from "./components/BottomNav";
import UpdateBanner from "./components/UpdateBanner";
import "./globals.css";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

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
        <meta name="theme-color" content="#F4F4F0" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex" />
        <meta name="googlebot" content="noindex, nofollow, noarchive, nosnippet" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <title>Sri Raghavendra Udupi Veg</title>
      </head>
      <body className="bg-[#F4F4F0] text-[#0A0A0A] antialiased selection:bg-[#D4FF00] selection:text-black">
        <SessionProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                border: "2.5px solid #0A0A0A",
                borderRadius: "12px",
                background: "#FFFFFF",
                color: "#0A0A0A",
                boxShadow: "4px 4px 0px 0px #0A0A0A",
                fontWeight: "800",
                fontSize: "13px",
                padding: "12px 18px",
              },
              success: {
                iconTheme: {
                  primary: "#0A0A0A",
                  secondary: "#D4FF00",
                },
                style: {
                  background: "#FFFFFF",
                  border: "2.5px solid #0A0A0A",
                },
              },
              error: {
                iconTheme: {
                  primary: "#0A0A0A",
                  secondary: "#FF5A5F",
                },
                style: {
                  background: "#FFF1F2",
                  border: "2.5px solid #0A0A0A",
                  color: "#991B1B",
                },
              },
              loading: {
                iconTheme: {
                  primary: "#0A0A0A",
                  secondary: "#00F0FF",
                },
                style: {
                  background: "#F0FDFA",
                  border: "2.5px solid #0A0A0A",
                },
              },
            }}
          />
          <RootContent>{children}</RootContent>
        </SessionProvider>
      </body>
    </html>
  );
}

function RootContent({ children }) {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (session?.user?.role) {
      localStorage.setItem("userRole", session.user.role);
    }
  }, [session]);

  const manifestVersion = process.env.NEXT_PUBLIC_MANIFEST_VERSION || "1";

  return (
    <div className="min-h-screen flex flex-col justify-between overflow-x-hidden">
      <main className="w-full pb-28 md:pb-16 pt-0 md:pt-20">
        {children}
      </main>

      {mounted && session?.user && <ResponsiveNav />}

      {mounted && (
        <div className="fixed bottom-20 md:bottom-4 right-4 z-40">
          <UpdateBanner manifestVersion={manifestVersion} />
        </div>
      )}
    </div>
  );
}
