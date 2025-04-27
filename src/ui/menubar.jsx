import { useState } from 'react';

export default function MenuBar({ onModeChange, onToggleAxes }) {
  const [selected, setSelected] = useState(0); // 0: 高斯, 1: 点, 2: 椭圆
  const [showAxes, setShowAxes] = useState(true); // 坐标轴显示状态

  const modes = [
    {
      id: 0, title: '高斯', svg: (
        <svg width="24" height="24" viewBox="0 0 100 100"   xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="fade-circle" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="40" fill="url(#fade-circle)" />
        </svg>
      )
    },
    {
      id: 1, title: '点', svg: (
        <svg width="24" height="24" viewBox="0 0 24 24"  fill="gray">
          <rect x="9" y="9" width="6" height="6" stroke="white" transform="rotate(45 12 12)" />
        </svg>
      )
    },
    {
      id: 2, title: '椭圆', svg: (
        <svg width="24" height="24" viewBox="0 0 24 24"   fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="6" stroke="white" fill="none" />
        </svg>
      )
    }
  ];

  const handleClick = (id) => {
    setSelected(id);
    onModeChange?.(id);
  };

  const handleToggleAxes = () => {
    const next = !showAxes;
    setShowAxes(next);
    onToggleAxes?.(next);
  };

  return (
    <div className="bg-neutral-800 text-white px-4 py-2 flex justify-between items-center text-sm select-none">
      <div className="flex space-x-6">
        <div className="font-semibold">GS App</div>
        <div className="hover:text-gray-300 cursor-pointer">File</div>
        <div className="hover:text-gray-300 cursor-pointer">Edit</div>
        <div className="hover:text-gray-300 cursor-pointer">View</div>
        <div className="hover:text-gray-300 cursor-pointer">Help</div>
      </div>
      <div className="flex space-x-2 items-center">
        {/* 坐标轴开关按钮 */}
        <button
          onClick={handleToggleAxes}
          className={`p-1 rounded mr-3 outline-none ${showAxes ? 'bg-orange-500' : 'bg-gray-600 hover:bg-gray-700'}`}
          title="切换坐标轴显示"
        >
          <svg width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="m12 2l4 4h-3v7.85l6.53 3.76L21 15.03l1.5 5.47l-5.5 1.46l1.53-2.61L12 15.58l-6.53 3.77L7 21.96L1.5 20.5L3 15.03l1.47 2.58L11 13.85V6H8l4-4Z" /></svg>
        </button>

        {/* 渲染模式按钮 */}
        {modes.map(({ id, svg }) => (
          <button
            key={id}
            onClick={() => handleClick(id)}
            className={`p-1 rounded outline-none ${selected === id ? 'bg-orange-500 text-white' : 'hover:bg-black'}`}
            title={modes[id].title}
          >
            {svg}
          </button>
        ))}
      </div>
    </div>
  );
}
