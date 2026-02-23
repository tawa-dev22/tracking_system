
const Card = ({ title, children, className = "", titleClassName = "" }) => {
  return (
    <div className={`rounded-2xl border border-black/10 bg-white p-4 shadow-sm text-black ${className}`}>
      {title && <h2 className={`text-lg font-bold mb-3 ${titleClassName}`}>{title}</h2>}
      {children}
    </div>
  );
}

export default Card