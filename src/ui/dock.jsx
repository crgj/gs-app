const icons = [
    { label: 'Home', emoji: '🏠' },
    { label: 'Chat', emoji: '💬' },
    { label: 'Media', emoji: '🎞️' },
    { label: 'Settings', emoji: '⚙️' },
  ]
  
  export default function Dock() {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex bg-white/90 backdrop-blur-md rounded-xl shadow-xl px-4 py-2 space-x-6">
        {icons.map((item) => (
          <button key={item.label} className="text-2xl hover:scale-125 transition">
            <span title={item.label}>{item.emoji}</span>
          </button>
        ))}
      </div>
    )
  }
  