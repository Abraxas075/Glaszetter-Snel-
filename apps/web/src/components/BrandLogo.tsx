import Image from 'next/image';

export function BrandLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`brand-logo ${className}`}>
      <Image
        src="/images/glaszetter-snel-logo-panel.png"
        alt="Glaszetter Snel"
        width={2022}
        height={778}
        priority
      />
    </div>
  );
}
