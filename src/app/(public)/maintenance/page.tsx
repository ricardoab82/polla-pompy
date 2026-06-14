import Image from 'next/image';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-[#0a4a2e] flex flex-col items-center justify-center px-4 text-center">
      <Image
        src="/loading-images/Logo.jpeg"
        alt="La Polla de Pompy"
        width={120}
        height={120}
        className="rounded-2xl mb-8 shadow-xl"
      />
      <h1 className="font-display text-4xl sm:text-5xl text-[#f5c842] mb-4">
        La Polla de Pompy
      </h1>
      <p className="text-[#e8f5e9] text-xl sm:text-2xl font-medium mb-2">
        está en mantenimiento
      </p>
      <p className="text-[#e8f5e9]/70 text-lg mt-2">
        Volvemos pronto 🔧
      </p>
    </div>
  );
}
