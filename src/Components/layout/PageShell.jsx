const PageShell = ({ title, actions, children }) => {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-2xl font-extrabold text-white">{title}</h1>
          <div className="flex gap-2 flex-wrap">{actions}</div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default PageShell;
