import BottomNav from './components/BottomNav'
import './globals.css'
import { getServerSession } from "next-auth";


export default async function RootLayout({ children }) {
  const session = await getServerSession(); // SSR get current user session

  return (
    <html lang="en">
      <head>
         {/*  Add manifest link */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        <link rel="icon" href="/icons/icon-192.png"/>
      </head>
      <body>
        {children}
        {/* ✅ Show nav ONLY if logged in */}
        {session?.user && <BottomNav />}
      </body>
    </html>
  );
}

