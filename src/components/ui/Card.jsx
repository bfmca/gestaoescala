export default function Card({ children }) {
  return (
    <div
      className="
      bg-white
      rounded-2xl
      shadow-sm
      border border-slate-200
    "
    >
      {children}
    </div>
  );
}
