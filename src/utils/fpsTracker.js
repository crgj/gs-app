export class FPSTracker {
    constructor() {
      this.lastFrameTime = performance.now();
      this.frameCount = 0;
      this.fps = 0;
    }
  
    /**
     * 更新 FPS 计算
     */
    update() {
      const now = performance.now();
      this.frameCount++;
  
      // 每秒更新一次 FPS
      if (now - this.lastFrameTime >= 1000) {
        this.fps = this.frameCount;
        this.frameCount = 0;
        this.lastFrameTime = now;
      }
    }
  
    /**
     * 获取当前 FPS
     * @returns {number} 当前 FPS
     */
    getFPS() {
      return this.fps;
    }
  }
  
  // 创建全局单例
  export const fpsTracker = new FPSTracker();