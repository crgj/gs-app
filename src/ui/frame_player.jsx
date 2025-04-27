import { useEffect, useRef, useState } from "react"

export default function FramePlayer({ totalFrames = 180, onFrameChange }) {
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const intervalRef = useRef(null)
  const dragRef = useRef(null)
  const requestRef = useRef(null)
  const containerRef = useRef(null)
  const containerallRef = useRef(null)

  
  const [hasFocus, setHasFocus] = useState(false);



  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying)
    if (!isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          const next = (prev + 1) % (totalFrames)
          //onFrameChange?.(next)
          return next
        })
      }, 1000 / 30)
    } else {
      clearInterval(intervalRef.current)
    }
  }

  const updateFrameFromEvent = (e) => {
    const rect = containerallRef.current.getBoundingClientRect()
    const usableWidth = rect.width
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, usableWidth))
    const blockWidth = usableWidth / (totalFrames)
    const frame = Math.round(offsetX / blockWidth)
    setCurrentFrame(frame)
    //onFrameChange?.(frame)
  }

  const handleSeek = (e) => updateFrameFromEvent(e)

  const handleDragStart = () => {
    dragRef.current = true
    document.addEventListener("mousemove", handleDrag)
    document.addEventListener("mouseup", handleDragEnd)
  }

  const handleDrag = (e) => {
    if (dragRef.current) {
      cancelAnimationFrame(requestRef.current)
      requestRef.current = requestAnimationFrame(() => updateFrameFromEvent(e))
    }
  }

  const handleMouseDown = (e) => {
    if (e.key === "ArrowLeft") {
      setCurrentFrame(f => {
        const newFrame = Math.max(0, f - 1);
        //onFrameChange?.(newFrame);
        return newFrame;
      });
    } else if (e.key === "ArrowRight") {
      setCurrentFrame(f => {
        const newFrame = Math.min(totalFrames - 1, f + 1);
        //onFrameChange?.(newFrame);
        return newFrame;
      });
    }
  }

  const handleMouseWheel = (e) => {
    if (e.deltaY < 0) {
      setCurrentFrame(f => {
        const newFrame = Math.min(totalFrames - 1, f + 1);
        //onFrameChange?.(newFrame);
        return newFrame;
      });
    } else {
      setCurrentFrame(f => {
        const newFrame = Math.max(0, f - 1);
        //onFrameChange?.(newFrame);
        return newFrame;
      });
    }
  }



  const handleDragEnd = () => {
    dragRef.current = false
    document.removeEventListener("mousemove", handleDrag)
    document.removeEventListener("mouseup", handleDragEnd)
  }

  useEffect(() => () => clearInterval(intervalRef.current), [])


  useEffect(() => {
    onFrameChange?.(currentFrame);  // currentFrame每次变化后，通知外部
  }, [currentFrame, onFrameChange]);


  const displayLabels = Array.from({ length: Math.floor((totalFrames) / 10) + 1 }, (_, i) => i * 10)
  const blockWidthPercent = 100 / (totalFrames)
  const currentLeft = `${(currentFrame + 0.5) * blockWidthPercent}%`
  const labelsperate = Math.floor((totalFrames) / 50) + 1
  return (
    <div className={`fixed bottom-2 left-0 right-0 bg-neutral-900 text-white px-4 pt-2 pb-3 select-none  
      focus:outline-none transition-all duration-100
      ${hasFocus ? 'ring-3 ring-stone-500 bg-neutral-900 opacity-100 ' : 'ring-2 ring-stone-500  bg-neutral-900 opacity-70'}`}

      ref={containerallRef}
      tabIndex={0}
      onFocus={() => setHasFocus(true)}
      onBlur={() => setHasFocus(false)}
      onMouseEnter={() => containerallRef.current?.focus()} // 鼠标进入聚焦
      onMouseLeave={() => containerallRef.current?.blur()}

      onKeyDown={handleMouseDown}
      onWheel={handleMouseWheel}
    >
      {/* Control Buttons */}
      <div className="flex justify-center space-x-4 mb-2">
        <button onClick={() => setCurrentFrame(f => Math.max(0, f - 1))} className="hover:cursor-pointer hover:scale-105 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6V18Z" className="hover:fill-orange-400" />
          </svg>
        </button>
        <button onClick={handlePlayToggle} className="hover:cursor-pointer hover:scale-105 transition">
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 16H8V8H10V16ZM16 16H14V8H16V16Z" className="hover:fill-orange-400" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5V19L19 12L8 5Z" className="hover:fill-orange-400" />
            </svg>
          )}
        </button>
        <button onClick={() => setCurrentFrame(f => Math.min(totalFrames - 1, f + 1))} className="hover:cursor-pointer hover:scale-105 transition">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 6L15 12L9 18V6Z" className="hover:fill-orange-400" />
          </svg>
        </button>
        <div className="ml-4 text-sm w-[80px] text-right">{currentFrame} / {totalFrames}</div>
      </div>

      {/* Timeline */}
      <div
        ref={containerRef}
        className={`fixed bottom-2 left-3 right-3 px-4 pt-2 pb-3 select-none outline-none`}

        onClick={handleSeek}
        onMouseDown={handleDragStart}

      >
        {/* Current Frame Indicator */}
        <div
          className="absolute top-1.5 -translate-x-1/2 px-2 py-0.5 bg-orange-500 z-30 text-black text-xs rounded"
          style={{ left: currentLeft, zIndex: 20 }}
        >
          {currentFrame}
        </div>

        {/* Frame Bars */}
        <div className="absolute top-2 left-0 right-0 flex z-10">
          {[...Array((totalFrames)).keys()].map(i => (
            <div
              key={i}
              className="h-5 flex-1 border-r border-gray-600 bg-neutral-900"
            />
          ))}
        </div>

        {/* Frame Number Labels */}
        <div className="absolute top-2 left-0 right-0 flex text-xs text-gray-300 z-10 pointer-events-none">
          {[...Array((totalFrames)).keys()].map(i => (
            i % labelsperate === 0 ? (
              <div key={i} style={{ width: `${blockWidthPercent}%`, textAlign: 'center' }}>{i}</div>
            ) : (
              <div key={i} style={{ width: `${blockWidthPercent}%` }} />
            )
          ))}
        </div>
      </div>
    </div>
  )
}