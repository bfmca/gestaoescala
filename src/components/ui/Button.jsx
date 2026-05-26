export default function Button({ children, onClick, variant = 'primary' }) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',

    secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-800',

    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-xl
        font-medium
        transition
        ${variants[variant]}
      `}
    >
      {children}
    </button>
  );
}
