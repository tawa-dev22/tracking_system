const Button = ({ children, variant = "primary", onClick, type = "button", disabled = false }) => {
  const base =
    "px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-white text-black hover:bg-white/90",
    ghost: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
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
