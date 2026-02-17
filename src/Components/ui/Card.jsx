
const Card = ({ title, children }) => {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
      {title && <h2 className="text-lg font-bold mb-3">{title}</h2>}
      {children}
    </div>
  );
}

export default Card