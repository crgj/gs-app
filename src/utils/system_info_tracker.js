// utils/systemInfoTracker.js

export class SystemInfoTracker {
  constructor() {
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fps = 0;

    this.infoMap = new Map(); // 用来保存所有要显示的信息
    this.infoMap.set("刷新帧率", `0`);
    this.infoMap.set("-1", `-`);
    this.infoMap.set("当前位置", `0`);
    this.infoMap.set("总共帧数", `0`);
    this.infoMap.set("-2", `-`);
    this.infoMap.set("相机外参", `-`);
    
  }

  // 每帧更新，内部统计fps
  updateFrame() {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;

      this.updateFPSInfo(); // ⚡ 每秒更新fps显示
    }
  }

  // 单独更新FPS信息
  updateFPSInfo() {
    this.infoMap.set("刷新帧率", `${this.fps}`);
  }

  // 可以扩展，比如更新当前帧数
  updateCurrentFrame(frame) {
    this.infoMap.set("当前位置", `${frame}`);
  }

  // 更新总帧数
  updateTotalFrames(total) {
    this.infoMap.set("总共帧数", `${total}`);
  }

  updateCamInfo(info) {
    this.infoMap.set("相机外参", `${info}`);
  }


  // 生成用于UI显示的列表
  getSystemInfo() {
    return Array.from(this.infoMap.entries()).map(([label, value]) => ({
      label,
      value,
    }));
  }
}

// 创建全局单例
export const systemInfoTracker = new SystemInfoTracker();