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
        <link rel="manifest" href={`/manifest.json?v=${manifestVersion}`} />
        <link
          rel="apple-touch-icon"
          href={`/icons/icon3-192.jpg?v=${manifestVersion}`}
        />
        <meta name="theme-color" content="#000000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
      </head>
      <body>
        {children}
        {/*  Show nav ONLY if logged in */}
        {session?.user && <BottomNav />}
        {manifestVersion === "2" && (
          <div className="bg-yellow-300 text-black text-center text-sm p-2">
            📣 App updated! Please remove and re-add to home screen to see
            changes.
          </div>
        )}
      </body>
    </html>
  );
}
