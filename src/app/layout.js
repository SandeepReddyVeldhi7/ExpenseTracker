
import ResponsiveNav from "./components/BottomNav";
import UpdateBanner from "./components/UpdateBanner";
import "./globals.css";
import { getServerSession } from "next-auth";


export default async function RootLayout({ children }) {
  const session = await getServerSession();
  console.log("sesion::::::::",session)
  const manifestVersion = process.env.NEXT_PUBLIC_MANIFEST_VERSION || "1";

  return (
    <html lang="en">
      <head>
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
        {session?.user && <ResponsiveNav/>}
        <div  className="fixed bottom-4 right-0 z-50">
        <UpdateBanner manifestVersion={manifestVersion} />
        </div>
      </body>
    </html>
  );
}
