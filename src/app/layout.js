import BottomNav from './components/BottomNav'
import './globals.css'


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="">
     <nav>  <BottomNav/></nav>
       <main className='sm:pt-18 '> {children}</main>

      </body>
    </html>
  )
}
