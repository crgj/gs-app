import { useState } from "react";

export default function SystemInfoPanel({ infoList = [] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="fixed top-15 right-4 z-50  ">
      <div
        className={`transition-all duration-300 ease-in-out ${expanded ? "w-64 h-auto" : "w-32 h-12"
          }  bg-black/50 text-white rounded-2xl p-4 shadow-lg`}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold text-sm">系统信息</div>
          <button
            className="text-xs hover:text-gray-300 no-select focus:outline-none focus:ring-0"
            onClick={() => setExpanded(!expanded)}
            tabIndex={-1}
          >
            {expanded ? "收起" : "展开"}
          </button>
        </div>

        {expanded && (
          <div className="text-xs space-y-1">
            {infoList.map((item, idx) => (
              item.label?.[0] === '-' ? (
                <div key={idx} className="flex space-x-2 items-center">
                   <div className="flex-1 border-t border-gray-400/80"></div> {/* 分割线占满右边 */}
                </div>
              ) : (
                <div key={idx} className="flex text-xs space-x-2">
                  <span className="font-semibold w-14">{item.label}</span> {/* 固定宽度 */}
                  <span className="flex-1 truncate whitespace-pre-line">{item.value}</span> {/* 剩余空间自适应 */}
                </div>
              )
              
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
