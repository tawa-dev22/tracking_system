const Button = ({ children, variant = "primary", onClick, type = "button", disabled = false }) => {
  const base =
    "px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-black text-white hover:bg-black/80",
    ghost: "bg-transparent text-black border border-black/15 hover:bg-black/5",
    danger: "bg-red-600 text-white hover:bg-red-500",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant] || variants.primary}`}
    >
      {children}
    </button>
  );
};

export default Button;