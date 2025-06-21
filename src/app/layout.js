import BottomNav from './components/BottomNav'
import './globals.css'
import { getServerSession } from "next-auth";


export default async function RootLayout({ children }) {
  const session = await getServerSession(); // SSR get current user session

  return (
    <html lang="en">
      <body>
        {children}
        {/* ✅ Show nav ONLY if logged in */}
        {session?.user && <BottomNav />}
      </body>
    </html>
  );
}

