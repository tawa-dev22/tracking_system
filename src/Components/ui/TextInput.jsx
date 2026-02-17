const TextInput = ({ label, type = "text", value, onChange, placeholder, required = false }) => {
  return (
    <div className="grid gap-1">
      {label && <label className="text-sm font-medium">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-xl border border-black/15 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/20"
      />
    </div>
  );
};

export default TextInput;