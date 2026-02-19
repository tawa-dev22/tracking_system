const TextInput = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  rightSlot,
  className = "",
  inputClassName = "",
}) => {
  return (
    <div className={`grid gap-1 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={`w-full rounded-xl border border-black/15 bg-white px-3 py-2 pr-12
            focus:outline-none focus:ring-2 focus:ring-black/20 ${inputClassName}`}
        />
        {rightSlot && (
          <div className="absolute inset-y-0 right-2 flex items-center">{rightSlot}</div>
        )}
      </div>
    </div>
  );
};

export default TextInput;