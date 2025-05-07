export function Card({ children, className, style }) {
  return (
    <div className={`rounded-xl bg-white shadow p-6 ${className}`} style={style}>
      {children}
    </div>
  );
}

export function CardContent({ children }) {
  return <div>{children}</div>;
}
