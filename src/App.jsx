
import { useState,useRef ,useEffect} from 'react';

import { systemInfoTracker } from './utils/system_info_tracker.js'; // ⬅️ 改了

import MenuBar from './ui/menubar'
import Dock from './ui/dock'
import DialogDemo from './ui/dialog'
import Card from './ui/card'
import Viewer from './ui/viewer';
import FramePlayer from './ui/frame_player';
import SystemInfoPanel from "./ui/system_info_panel";


export default function App() {
  const [mode, setMode] = useState(0);
  const [axes, setAxes] = useState(0);
  const [frame, setFrame] = useState(0);
  const [totalframes, setTotalFrames] = useState(0);

  const [infoList, setInfoList] = useState(systemInfoTracker.getSystemInfo());

  useEffect(() => {
    let animationFrameId;
    let intervalId;

    const loop = () => {
      systemInfoTracker.updateFrame(); // ✅ 更新内部fps统计
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    intervalId = setInterval(() => {
      setInfoList(systemInfoTracker.getSystemInfo()); // 每秒刷新一次UI信息
    }, 1000);

    return () => {
      cancelAnimationFrame(animationFrameId);
      clearInterval(intervalId);
    };
  }, []);

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  const handleToggleAxes = (next) => {
    setAxes(next);
  };

  const handleFrameChange = (frame) => {
    try {
      setFrame(frame);
      systemInfoTracker.updateCurrentFrame(frame); // ✅ 更新当前帧到系统信息里
    } catch (e) {
      console.log(e);
    }
  };

  const handleotleFrameCountChange = (totleframe) => {
    setTotalFrames(totleframe);
    systemInfoTracker.updateTotalFrames(totleframe); // ✅ 更新总帧数
  };

  return (
    <div>
      <MenuBar onModeChange={handleModeChange} onToggleAxes={handleToggleAxes} />
      <SystemInfoPanel infoList={infoList} />
      <div className="h-screen w-screen">
        <Viewer
          ply4dPath="/ply/001.4d"
          onTotleFrameCountChange={handleotleFrameCountChange}
          renderMode={mode}
          showAxes={axes}
          currentFrame={frame}
        />
      </div>
      <FramePlayer totalFrames={totalframes} onFrameChange={handleFrameChange} />
    </div>
  );
}
