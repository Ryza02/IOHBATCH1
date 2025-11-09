export default function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-3 w-3 rounded-full bg-white/90" />
      <span className="font-semibold tracking-wide">IOH</span>
    </div>
  );
}
