import Image from 'next/image';

interface BrowserShotProps {
  src: string;
  alt: string;
  host: string;
  height: number;
  priority?: boolean;
  sizes?: string;
}

export default function BrowserShot({ src, alt, host, height, priority, sizes }: BrowserShotProps) {
  return (
    <figure className="shot">
      <div className="shot-bar" aria-hidden="true">
        <span /><span /><span />
        <em className="mono">{host}</em>
      </div>
      <Image
        className="shot-img"
        src={src}
        alt={alt}
        width={1440}
        height={height}
        priority={priority}
        sizes={sizes ?? '(max-width: 900px) 100vw, 720px'}
      />
    </figure>
  );
}
