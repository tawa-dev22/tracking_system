import React from 'react'

const StepTabs = ({ steps, current, onSelect }) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {steps.map((s, idx) => {
        const active = idx === current;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(idx)}
            className={`px-3 py-2 rounded-xl text-sm border transition
              ${active ? "bg-black text-white border-black" : "bg-white border-black/15 hover:bg-black/5"}`}
          >
            {idx + 1}. {s}
          </button>
        );
      })}
    </div>
  )
}

export default StepTabs