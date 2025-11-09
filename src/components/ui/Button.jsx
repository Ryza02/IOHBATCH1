export default function Button({
  as = 'button',
  className = '',
  children,
  ...props
}) {
  const Comp = as;
  return (
    <Comp
      className={`inline-flex h-11 items-center justify-center rounded-xl px-4 font-medium
                  bg-white/90 text-black hover:bg-white transition
                  disabled:opacity-60 disabled:cursor-not-allowed shadow-soft ${className}`}
      {...props}
    >
      {children}
    </Comp>
  );
}
