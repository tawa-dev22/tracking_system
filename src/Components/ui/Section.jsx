import React from 'react'

const Section = ({ title, children }) => {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <h3 className="font-bold text-base mb-3">{title}</h3>
      {children}
    </div>
  )
}

export default Section