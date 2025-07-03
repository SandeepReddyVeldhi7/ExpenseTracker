import BottomNav from "./components/BottomNav";
import "./globals.css";
import { getServerSession } from "next-auth";

export default async function RootLayout({ children }) {
  const session = await getServerSession(); // SSR get current user session
  const manifestVersion = process.env.NEXT_PUBLIC_MANIFEST_VERSION || "1";
  return (
    <html lang="en">
      <head>
        {/*  Add manifest link */}
        {/* Manifest with versioning */}
        <link
          rel="manifest"
          href={`/manifest.json?v=${process.env.NEXT_PUBLIC_MANIFEST_VERSION}`}
        />
        <link
          rel="apple-touch-icon"
          href={`/icons/icon3-192.jpg?v=${process.env.NEXT_PUBLIC_MANIFEST_VERSION}`}
        />
        <meta name="theme-color" content="#000000" />

        {/* Apple specific icons and meta */}

        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body>
        {children}
        {/*  Show nav ONLY if logged in */}
        {session?.user && <BottomNav />}
      </body>
    </html>
  );
}
