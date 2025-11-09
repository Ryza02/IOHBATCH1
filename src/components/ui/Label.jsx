export default function Label({ htmlFor, children, className = '' }) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-sm text-muted block mb-1 ${className}`}
    >
      {children}
    </label>
  );
}
