import Image from "next/image";
import { Poppins } from "next/font/google";
  const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
export default function Home() {

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-800 to-lime-800 h-screen p-4">
      
      <div className="relative w-32 h-32 px-2 p-2 sm:w-32 sm:h-32 mb-6">
        <Image
          src="/icons/icon3-192.jpg"
          alt="Company Logo"
          fill
          priority
          className="rounded-full object-cover"
        />
      </div>
      
      <h1 className={`${poppins.className} text-white text-2xl text-center`}>Sri Raghavendra Udpi Veg</h1>
    </div>
  );
}
