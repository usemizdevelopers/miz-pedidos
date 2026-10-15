export function LogoMiz({ className = "" }: { className?: string }) {
  return (
    <span className={`font-light tracking-[0.18em] text-taupe ${className}`} aria-label="Miz">
      MIZ
    </span>
  );
}
