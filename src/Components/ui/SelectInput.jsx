const SelectInput = ({
  label,
  value,
  onChange,
  options = [],
  required = false,
  className = "",
  selectClassName = "",
}) => {
  return (
    <div className={`grid gap-1 ${className}`}>
      {label && <label className="text-sm font-medium">{label}</label>}
      <select
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-black
          focus:outline-none focus:ring-2 focus:ring-black/20 ${selectClassName}`}
      >
        <option value="">-- Select --</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectInput;
