import { useState } from 'react'

export default function DialogDemo() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Open Dialog
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-xl w-80">
            <h2 className="text-lg font-semibold mb-2">Dialog Title</h2>
            <p className="text-sm text-gray-600">This is a Tailwind-styled modal.</p>
            <div className="text-right mt-4">
              <button onClick={() => setOpen(false)} className="text-sm text-blue-600">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
