import Image from 'next/image';

export default function MobileGlassHeader() {
  return (
    <header className="lg:hidden fixed top-0 inset-x-0 z-[50]">
      <div className="mx-auto max-w-[1400px] px-4">
        <div className="mt-3 rounded-2xl border border-white/40 bg-white/55 backdrop-blur-xl shadow-xl">
          <div className="h-14 flex items-center justify-center px-4">
            <div className="relative h-9 w-[140px]">
              <Image
                src="/logo.png"
                alt="ClassTrack"
                fill
                priority
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}





















