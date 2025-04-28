import { useEffect, useRef, useState } from "react";
import ProgressDialog from "./progress_dialog.jsx";

import { multiply4 } from '../utils/math-utils.js';
import { InputController } from "../utils/controller.js";


import { GaussianRenderer } from "../splat/renderer.js";
import { SplatLoader } from "../splat/splat_loader.js";


function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  if (len === 0) return [0, 0, 0];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function computeLookAtViewMatrix(position, target, up = [0, 1, 0]) {
  // 计算 forward 方向向量（相机z轴朝向）
  let forward = normalize([
    target[0] - position[0],
    target[1] - position[1],
    target[2] - position[2],
  ]);

  // 如果 forward 和 up 太接近（叉乘会出问题），换一个 up
  const epsilon = 1e-6;
  const dotFU = Math.abs(dot(forward, up));
  if (1.0 - dotFU < epsilon) {
    up = [0, 0, 1]; // 换一个辅助up
  }

  // 计算 right（相机x轴）
  let right = normalize(cross(up, forward));

  // 重新计算正交 up（相机y轴）
  up = cross(forward, right);

  // 构建旋转矩阵（列优先）
  const rotation = [
    right[0], up[0], forward[0],
    right[1], up[1], forward[1],
    right[2], up[2], forward[2],
  ];

  // 旋转矩阵转置（行优先→列优先）
  const rotationT = [
    rotation[0], rotation[3], rotation[6],
    rotation[1], rotation[4], rotation[7],
    rotation[2], rotation[5], rotation[8],
  ];

  // 计算平移
  const tx = -(rotationT[0] * position[0] + rotationT[1] * position[1] + rotationT[2] * position[2]);
  const ty = -(rotationT[3] * position[0] + rotationT[4] * position[1] + rotationT[5] * position[2]);
  const tz = -(rotationT[6] * position[0] + rotationT[7] * position[1] + rotationT[8] * position[2]);

  // 拼接成 4x4 viewMatrix
  return [
    rotationT[0], rotationT[1], rotationT[2], 0,
    rotationT[3], rotationT[4], rotationT[5], 0,
    rotationT[6], rotationT[7], rotationT[8], 0,
    tx, ty, tz, 1,
  ];
}



export default function Viewer({ ply4dPath = "", onTotleFrameCountChange, currentFrame = 0, renderMode = 0, showAxes = true }) {
  const canvasRef = useRef();
  const rendererRef = useRef(null);
  const [loading_status, setLoadingStatus] = useState({ info: "准备中...", progress: 100 ,desc:''});
  const plyDatasRef = useRef([]);
  const viewProjRef = useRef(null);
  const lastFileRef = useRef([]);
  const count =useRef(0)

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
 
    const camera = {
      viewMatrix: [0.43540104244483085,0.33226830415480946,-0.8366741936333489,0,
        0.8998828040638406,-0.1866926703743199,0.39415325164036474,0,
        -0.02523630694304515,-0.9245234561018834,-0.38028871654216645,0,
        0.010345717330953888,-0.6994664951415385,2.806232988424672,0.9999999999999445
      ],
      fy: 1164.66,
      fx: 1159.58,
    };

    const downsample = 1;


    const run = async () => {
      const response = await fetch(ply4dPath);
      const text = await response.text();
      const fileList = text.split('\n').map(line => line.trim()).filter(line => line.endsWith('.ply'));
    
      if (fileList.length === 0) throw new Error(".4d文件中没有有效的ply文件名！");
    
      var folderUrl = ply4dPath.substring(0, ply4dPath.lastIndexOf('/'));
    
      const renderer = new GaussianRenderer(canvas);
      rendererRef.current = renderer;
      renderer.updateProjection(camera, innerWidth, innerHeight, downsample);
    
      window.addEventListener("resize", () =>
        renderer.updateProjection(camera, innerWidth, innerHeight, downsample)
      );
    
      plyDatasRef.current.length = 0;
      lastFileRef.current.length = 0;
      count.current = 0;
    
      const loadTasks = [];
    
      for (let i = 0; i < fileList.length; i++) {
        const plyPath = folderUrl + "/" + fileList[i]; 


        if (lastFileRef.current.includes(plyPath)) {
          continue;
        }
        lastFileRef.current.push(plyPath);
    
        // 🔥 收集每一个加载Promise到数组
        loadTasks.push(new Promise((resolve) => {
          const loader = new SplatLoader({
            url: plyPath,
            onDataReady: (type, data) => {
              if (type === 'buffer') {
                plyDatasRef.current.push(data);
                count.current++;
    
                if (count.current === fileList.length) {
                  onTotleFrameCountChange?.(plyDatasRef.current.length);
                }
    
                resolve(); // 单个文件加载完成
              }
            },
            onProgress: (percent, info) => {
              setLoadingStatus({
                info: `正在读取数据 ${plyPath}...`,
                progress: percent,
                desc: info
              });
            }
          });
    
          loader.load();
        }));
      }
    
      // 🔥 等所有文件都加载完成
      await Promise.all(loadTasks);
    
      console.log("✅ 所有PLY文件加载完成");
    
      // 创建控制器
      const controller = new InputController(
        canvas,
        () => camera.viewMatrix,
        (vm) => { camera.viewMatrix = vm; }
      );
    
      const actualViewMatrix = controller.getCurrentViewMatrix();
      var viewProj = multiply4(renderer.projectionMatrix, actualViewMatrix);
      viewProjRef.current = viewProj;
    
      // ✅ 确保有数据再setData
      if (plyDatasRef.current.length > 0) {
        renderer.setData(plyDatasRef.current[0], viewProj);
      } else {
        console.error("❌ 没有加载到有效的PLY数据！");
        return;
      }
    
      const frame = () => {
        controller.applyKeyboardControl();
        if (renderer.vertexCount > 0) {
          const actualViewMatrix = controller.getCurrentViewMatrix();
          viewProj = multiply4(renderer.projectionMatrix, actualViewMatrix);
    
          renderer.updateDepthIndex(viewProj);
          renderer.render(actualViewMatrix);
        }
        requestAnimationFrame(frame);
      };
    
      frame();
    };
    run();

  }, [ply4dPath]);


  useEffect(() => {
    if (rendererRef.current && rendererRef.current.updateRenderMode) {
      rendererRef.current.updateRenderMode(renderMode);
    }
  }, [renderMode]);

  useEffect(() => {
    if (rendererRef.current && rendererRef.current.updateRenderMode) {
      rendererRef.current.showAxes(showAxes);
    }
  }, [showAxes]);

  useEffect(() => {

    //console.log(plyDatasRef.current.length);
    if (plyDatasRef.current.length > 0) {

      if(currentFrame>=plyDatasRef.current.length)currentFrame=plyDatasRef.current.length-1;
      rendererRef.current.setData(plyDatasRef.current[currentFrame], viewProjRef);
      //console.log(currentFrame)
    }

  }, [currentFrame]);


  return (
    <div className="relative w-full h-full"> 
      <ProgressDialog title="正在加载" status={loading_status} />
      <canvas ref={canvasRef} id="canvas-viewer" className="w-full h-full bg-neutral-600" />
    </div>
  );
}
