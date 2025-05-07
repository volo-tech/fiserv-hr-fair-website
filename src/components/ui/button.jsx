export function Button({
  children,
  className = "",
  disabled = false,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={`
        rounded  bg-gradient-to-r from-finnovaOrange to-finnovaOrange 
        px-4 py-2 text-white text-sm font-semibold shadow 
        transition-all 
        ${className}
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"} 
      `}
      {...props}
    >
      {children}
    </button>
  );
}
