const Button = ({ children, variant = "primary", onClick, type = "button", disabled = false }) => {
  const base =
    "px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-violet-600 text-white hover:bg-violet-500",
    ghost: "bg-white/5 text-white border border-white/10 hover:bg-white/10",
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