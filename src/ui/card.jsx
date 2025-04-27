export default function Card({ title, content }) {
    return (
      <div className="rounded-xl shadow-md bg-white p-4 w-64">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-gray-600">{content}</p>
      </div>
    )
  }
  