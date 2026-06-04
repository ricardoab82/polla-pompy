'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// ─── Add more filenames here as you drop images into /public/loading-images/ ───
const LOADING_IMAGES = [
  'Anibal.png',
  'Javi.png',
  'Javi2.png',
  'Jebs.png',
  'Mario.png',
  'Nico.png',
  'Paisa.png',
  'PompySavi.png',
  'Sebas.png',
  'ball.svg',
];

export default function LoadingSpinner() {
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    const picked = LOADING_IMAGES[Math.floor(Math.random() * LOADING_IMAGES.length)];
    setImage(picked);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      {image && (
        <div className="animate-spin" style={{ animationDuration: '1.8s', animationTimingFunction: 'linear' }}>
          <Image
            src={`/loading-images/${image}`}
            alt="Cargando..."
            width={120}
            height={120}
            className="object-contain"
            priority
          />
        </div>
      )}
      <p className="font-display text-4xl text-[#f5c842] tracking-widest">
        LA POLLA DE POMPY
      </p>
    </div>
  );
}
