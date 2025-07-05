import Image from "next/image";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-800 to-lime-800 h-screen p-4">
      
      <div className="relative w-[70vw] h-[70vw] max-w-[300px] mb-4">
        <Image
          src="/icons/icon3-192.png"
          alt="Company Logo"
          fill
          priority
          className="rounded-full object-cover"
        />
      </div>
      
      <h1 className={`${poppins.className} text-white text-base text-center`}>
        Sri Raghavendra Udupi Veg
      </h1>
    </div>
  );
}
