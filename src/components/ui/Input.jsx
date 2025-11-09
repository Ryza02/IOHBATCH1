export default function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full h-11 rounded-xl bg-white/5 border border-white/10
                  px-3 outline-none text-white placeholder:text-white/50
                  focus:ring-2 focus:ring-white/20 focus:border-white/30 transition ${className}`}
      {...props}
    />
  );
}
