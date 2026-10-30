// Admin icons are the Phosphor SVGs exported from the "Cab Service Admin" Figma
// file, stored as-is in public/admin-icons/. Each one is drawn as a CSS mask so
// it takes the current text colour (e.g. grey in the nav, white on a green
// button) while keeping the exact shape from the design.
//
// To add an icon: download it from Figma into public/admin-icons/<name>.svg
// and use <Icon name="<name>" />.

export default function Icon({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) {
  const url = `url(/admin-icons/${name}.svg)`;
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        width: size,
        height: size,
        maskImage: url,
        WebkitMaskImage: url,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
      }}
    />
  );
}
