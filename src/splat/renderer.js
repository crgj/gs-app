// GaussianRenderer.js
import {
  getProjectionMatrix,
  multiply4,
  invert4,
  rotate4,
  translate4
} from '../utils/math-utils.js';

import { vertexShaderSource, fragmentShaderSource } from './shader/splat.js';
import { gridVertexShaderSource, gridFragmentShaderSource } from './shader/grid.js';
 
import { packHalf2x16 ,formatViewMatrix } from '../utils/math-utils.js';
import { systemInfoTracker } from '../utils/system_info_tracker.js'; // ⬅️ 改了


 

export class GaussianRenderer {
  constructor(canvas) {
    this.canvas = canvas; 

    this.gl = canvas.getContext("webgl2", { antialias: false, depth: true });
    if (!this.gl) throw new Error("WebGL2 not supported");

    this._initShaders();
    this._initBuffers();
    this._initGLSettings();


    this.blueNoiseTexture = this.createBlueNoiseTexture(this.gl); // 创建纹理

    this._initGridShader();


    this.mode = 0;
    this._showAxes = true;
    this.sortRunning = false;
    this.viewProj = null
  }

  showAxes(next) {
    this._showAxes = next;
  }
  updateRenderMode(renderMode) {
    this.mode = renderMode;
  }

  createBlueNoiseTexture(gl) {
    const size = 32;
    const noiseData = new Uint8Array(size * size * 4);
    for (let i = 0; i < noiseData.length; i++) {
      noiseData[i] = Math.floor(Math.random() * 256); // 0 ~ 255
    }

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,             // ✅ internal format
      size,
      size,
      0,
      gl.RGBA,             // ✅ format
      gl.UNSIGNED_BYTE,    // ✅ type matches sampler2D
      noiseData
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    return tex;
  }




  _initShaders() {

    const gl = this.gl;
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(vertexShader));

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
      console.error(gl.getShaderInfoLog(fragmentShader));

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      console.error(gl.getProgramInfoLog(program));

    gl.useProgram(program);
    this.program = program;
    this._getUniformLocations();
  }

  _getUniformLocations() {
    const gl = this.gl;
    const program = this.program;
    this.u_projection = gl.getUniformLocation(program, "projection");
    this.u_viewport = gl.getUniformLocation(program, "viewport");
    this.u_focal = gl.getUniformLocation(program, "focal");
    this.u_view = gl.getUniformLocation(program, "view");
    this.u_textureLocation = gl.getUniformLocation(program, "u_texture");

    this.u_mode = gl.getUniformLocation(program, 'u_mode');
  }

  _initGridShader() {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, gridVertexShaderSource);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(vs));

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, gridFragmentShaderSource);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(fs));

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.error(gl.getProgramInfoLog(program));

    this.gridProgram = program;

    // uniform 和 attrib location
    this.gridUniforms = {
      near_origin: gl.getUniformLocation(program, "near_origin"),
      near_x: gl.getUniformLocation(program, "near_x"),
      near_y: gl.getUniformLocation(program, "near_y"),
      far_origin: gl.getUniformLocation(program, "far_origin"),
      far_x: gl.getUniformLocation(program, "far_x"),
      far_y: gl.getUniformLocation(program, "far_y"),
      view_position: gl.getUniformLocation(program, "view_position"),
      matrix_viewProjection: gl.getUniformLocation(program, "matrix_viewProjection"),
      plane: gl.getUniformLocation(program, "plane"),
      blueNoiseTex32: gl.getUniformLocation(program, "blueNoiseTex32")
    };

    const a_pos = gl.getAttribLocation(program, "vertex_position");
    const vertices = new Float32Array([-1, -1, 1, -1, 1, 1, -1, 1]);
    this.gridVBO = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.gridVBO);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.gridVAO = gl.createVertexArray();
    gl.bindVertexArray(this.gridVAO);
    gl.enableVertexAttribArray(a_pos);
    gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
  }


  _initGLSettings() {
    const gl = this.gl;

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.ONE_MINUS_DST_ALPHA, gl.ONE, gl.ONE_MINUS_DST_ALPHA, gl.ONE);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.FUNC_ADD);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(true);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);   // 深灰
    gl.clearDepth(1.0);                  // 清除深度缓冲默认值
  }

  _initBuffers() {
    const gl = this.gl;
    const program = this.program;

    const triangleVertices = new Float32Array([-2, -2, 2, -2, 2, 2, -2, 2]);
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

    const a_position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(a_position);
    gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

    this.indexBuffer = gl.createBuffer();
    const a_index = gl.getAttribLocation(program, "index");
    gl.enableVertexAttribArray(a_index);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.indexBuffer);
    gl.vertexAttribIPointer(a_index, 1, gl.INT, false, 0, 0);
    gl.vertexAttribDivisor(a_index, 1);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.u_textureLocation, 0);

    gl.uniform1i(this.u_mode, this.mode);
  }

  generateTexture(buffer, vertexCount) {
    const f_buffer = new Float32Array(buffer);
    const u_buffer = new Uint8Array(buffer);

    const texwidth = 1024 * 2;
    const texheight = Math.ceil((2 * vertexCount) / texwidth);
    const texdata = new Uint32Array(texwidth * texheight * 4);
    const texdata_c = new Uint8Array(texdata.buffer);
    const texdata_f = new Float32Array(texdata.buffer);

    for (let i = 0; i < vertexCount; i++) {
      // position
      texdata_f[8 * i + 0] = f_buffer[8 * i + 0];
      texdata_f[8 * i + 1] = f_buffer[8 * i + 1];
      texdata_f[8 * i + 2] = f_buffer[8 * i + 2];

      // rgba
      texdata_c[4 * (8 * i + 7) + 0] = u_buffer[32 * i + 24 + 0];
      texdata_c[4 * (8 * i + 7) + 1] = u_buffer[32 * i + 24 + 1];
      texdata_c[4 * (8 * i + 7) + 2] = u_buffer[32 * i + 24 + 2];
      texdata_c[4 * (8 * i + 7) + 3] = u_buffer[32 * i + 24 + 3];

      const scale = [
        f_buffer[8 * i + 3],
        f_buffer[8 * i + 4],
        f_buffer[8 * i + 5],
      ];

      const rot = [
        (u_buffer[32 * i + 28 + 0] - 128) / 128,
        (u_buffer[32 * i + 28 + 1] - 128) / 128,
        (u_buffer[32 * i + 28 + 2] - 128) / 128,
        (u_buffer[32 * i + 28 + 3] - 128) / 128,
      ];

      const M = [
        1.0 - 2.0 * (rot[2] * rot[2] + rot[3] * rot[3]),
        2.0 * (rot[1] * rot[2] + rot[0] * rot[3]),
        2.0 * (rot[1] * rot[3] - rot[0] * rot[2]),

        2.0 * (rot[1] * rot[2] - rot[0] * rot[3]),
        1.0 - 2.0 * (rot[1] * rot[1] + rot[3] * rot[3]),
        2.0 * (rot[2] * rot[3] + rot[0] * rot[1]),

        2.0 * (rot[1] * rot[3] + rot[0] * rot[2]),
        2.0 * (rot[2] * rot[3] - rot[0] * rot[1]),
        1.0 - 2.0 * (rot[1] * rot[1] + rot[2] * rot[2]),
      ].map((k, j) => k * scale[Math.floor(j / 3)]);

      const sigma = [
        M[0] * M[0] + M[3] * M[3] + M[6] * M[6],
        M[0] * M[1] + M[3] * M[4] + M[6] * M[7],
        M[0] * M[2] + M[3] * M[5] + M[6] * M[8],
        M[1] * M[1] + M[4] * M[4] + M[7] * M[7],
        M[1] * M[2] + M[4] * M[5] + M[7] * M[8],
        M[2] * M[2] + M[5] * M[5] + M[8] * M[8],
      ];

      texdata[8 * i + 4] = this.packHalf2x16(4 * sigma[0], 4 * sigma[1]);
      texdata[8 * i + 5] = this.packHalf2x16(4 * sigma[2], 4 * sigma[3]);
      texdata[8 * i + 6] = this.packHalf2x16(4 * sigma[4], 4 * sigma[5]);
    }

    this.setupTexture({ texdata, texwidth, texheight });
  }


  updateProjection(camera, width, height, downsample = 1.0) {
    const gl = this.gl;
    gl.useProgram(this.program);

    gl.uniform2fv(this.u_focal, new Float32Array([camera.fx, camera.fy]));
    gl.uniform2fv(this.u_viewport, new Float32Array([width, height]));

    this.projectionMatrix = getProjectionMatrix(camera.fx, camera.fy, width, height);
    gl.uniformMatrix4fv(this.u_projection, false, this.projectionMatrix);

    gl.canvas.width = Math.round(width / downsample);
    gl.canvas.height = Math.round(height / downsample);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    return this.projectionMatrix;
  }
  generateTexture(buffer,vertexCount) {
    if (!buffer) return;
    const f_buffer = new Float32Array(buffer);
    const u_buffer = new Uint8Array(buffer);
  
    var texwidth = 1024 * 2; // Set to your desired width
    var texheight = Math.ceil((2 * vertexCount) / texwidth); // Set to your desired height
    var texdata = new Uint32Array(texwidth * texheight * 4); // 4 components per pixel (RGBA)
    var texdata_c = new Uint8Array(texdata.buffer);
    var texdata_f = new Float32Array(texdata.buffer);
  
    // Here we convert from a .splat file buffer into a texture
    // With a little bit more foresight perhaps this texture file
    // should have been the native format as it'd be very easy to
    // load it into webgl.
    for (let i = 0; i < vertexCount; i++) {
      // x, y, z
      texdata_f[8 * i + 0] = f_buffer[8 * i + 0];
      texdata_f[8 * i + 1] = f_buffer[8 * i + 1];
      texdata_f[8 * i + 2] = f_buffer[8 * i + 2];
  
      // r, g, b, a
      texdata_c[4 * (8 * i + 7) + 0] = u_buffer[32 * i + 24 + 0];
      texdata_c[4 * (8 * i + 7) + 1] = u_buffer[32 * i + 24 + 1];
      texdata_c[4 * (8 * i + 7) + 2] = u_buffer[32 * i + 24 + 2];
      texdata_c[4 * (8 * i + 7) + 3] = u_buffer[32 * i + 24 + 3];
  
      // quaternions
      let scale = [
        f_buffer[8 * i + 3 + 0],
        f_buffer[8 * i + 3 + 1],
        f_buffer[8 * i + 3 + 2],
      ];
      let rot = [
        (u_buffer[32 * i + 28 + 0] - 128) / 128,
        (u_buffer[32 * i + 28 + 1] - 128) / 128,
        (u_buffer[32 * i + 28 + 2] - 128) / 128,
        (u_buffer[32 * i + 28 + 3] - 128) / 128,
      ];
  
      // Compute the matrix product of S and R (M = S * R)
      const M = [
        1.0 - 2.0 * (rot[2] * rot[2] + rot[3] * rot[3]),
        2.0 * (rot[1] * rot[2] + rot[0] * rot[3]),
        2.0 * (rot[1] * rot[3] - rot[0] * rot[2]),
  
        2.0 * (rot[1] * rot[2] - rot[0] * rot[3]),
        1.0 - 2.0 * (rot[1] * rot[1] + rot[3] * rot[3]),
        2.0 * (rot[2] * rot[3] + rot[0] * rot[1]),
  
        2.0 * (rot[1] * rot[3] + rot[0] * rot[2]),
        2.0 * (rot[2] * rot[3] - rot[0] * rot[1]),
        1.0 - 2.0 * (rot[1] * rot[1] + rot[2] * rot[2]),
      ].map((k, i) => k * scale[Math.floor(i / 3)]);
  
      const sigma = [
        M[0] * M[0] + M[3] * M[3] + M[6] * M[6],
        M[0] * M[1] + M[3] * M[4] + M[6] * M[7],
        M[0] * M[2] + M[3] * M[5] + M[6] * M[8],
        M[1] * M[1] + M[4] * M[4] + M[7] * M[7],
        M[1] * M[2] + M[4] * M[5] + M[7] * M[8],
        M[2] * M[2] + M[5] * M[5] + M[8] * M[8],
      ];
  
      texdata[8 * i + 4] = packHalf2x16(4 * sigma[0], 4 * sigma[1]);
      texdata[8 * i + 5] = packHalf2x16(4 * sigma[2], 4 * sigma[3]);
      texdata[8 * i + 6] = packHalf2x16(4 * sigma[4], 4 * sigma[5]);
    }
  
    return {texdata, texwidth, texheight};
  }

  //设置数据
  setData(data,viewProj) {
    if(viewProj==null)viewProj=this.lastProj

    
    const {buffer,vertexCount}=data;

    const texData= this.generateTexture(buffer,vertexCount);
    this.setTexture(texData);
 
    const depthData=this.runSort(buffer,vertexCount,viewProj); 
    this.setDepth(depthData);
  }

  setTexture(data) {

    const { texdata, texwidth, texheight } = data;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32UI,
      texwidth,
      texheight,
      0,
      gl.RGBA_INTEGER,
      gl.UNSIGNED_INT,
      texdata
    );
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);

    this.rawBuffer = data.texdata.buffer;

  }

  setDepth(depthData) {

    const { depthIndex, vertexCount } = depthData;
    const gl = this.gl;

    // 插入伪高斯网格
    const additional = [];
    let base = vertexCount;
    for (let x = -10; x <= 10; x++) {
      for (let z = -10; z <= 10; z++) {
        additional.push(base++);
      }
    }
    const combined = new Int32Array(depthIndex.length + additional.length);
    combined.set(depthIndex);
    combined.set(additional, depthIndex.length);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, combined, gl.DYNAMIC_DRAW);
    this.vertexCount = combined.length;
  }


  updateDepthIndex(viewProj) {
    this.viewProj = viewProj;
    if (!this.rawBuffer) return;
    
    const f_buffer = new Float32Array(this.rawBuffer);
    const vertexCount = this.vertexCount ?? (f_buffer.length / 8);
    if (vertexCount === 0) return;

    let maxDepth = -Infinity;
    let minDepth = Infinity;
    const sizeList = new Int32Array(vertexCount);

    for (let i = 0; i < vertexCount; i++) {
      const x = f_buffer[8 * i + 0];
      const y = f_buffer[8 * i + 1];
      const z = f_buffer[8 * i + 2];

      const depth = ((viewProj[2] * x + viewProj[6] * y + viewProj[10] * z) * 4096) | 0;
      sizeList[i] = depth;
      if (depth > maxDepth) maxDepth = depth;
      if (depth < minDepth) minDepth = depth;
    }

    const depthInv = (256 * 256 - 1) / (maxDepth - minDepth);
    const counts0 = new Uint32Array(256 * 256);

    for (let i = 0; i < vertexCount; i++) {
      sizeList[i] = ((sizeList[i] - minDepth) * depthInv) | 0;
      counts0[sizeList[i]]++;
    }

    const starts0 = new Uint32Array(256 * 256);
    for (let i = 1; i < 256 * 256; i++) {
      starts0[i] = starts0[i - 1] + counts0[i - 1];
    }

    const depthIndex = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      depthIndex[starts0[sizeList[i]]++] = i;
    }

    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, depthIndex, gl.DYNAMIC_DRAW);
    this.vertexCount = depthIndex.length;
  }
  _computeRayPlaneCorners(viewMatrix, projectionMatrix) {
    const invViewProj = invert4(multiply4(projectionMatrix, viewMatrix));
    const ndcCorners = [
      [-1, -1, -1], // near bottom left
      [1, -1, -1], // near bottom right
      [1, 1, -1], // near top right
      [-1, 1, -1], // near top left
      [-1, -1, 1], // far bottom left
      [1, -1, 1], // far bottom right
      [1, 1, 1], // far top right
      [-1, 1, 1], // far top left
    ];

    const unproject = (x, y, z) => {
      const v = [x, y, z, 1.0];
      const o = new Array(4).fill(0);
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          o[r] += invViewProj[r + c * 4] * v[c];
        }
      }
      return [o[0] / o[3], o[1] / o[3], o[2] / o[3]];
    };

    const near0 = unproject(-1, -1, -1);
    const near1 = unproject(1, -1, -1);
    const near2 = unproject(1, 1, -1);
    const near3 = unproject(-1, 1, -1);

    const far0 = unproject(-1, -1, 1);
    const far1 = unproject(1, -1, 1);
    const far2 = unproject(1, 1, 1);
    const far3 = unproject(-1, 1, 1);

    return {
      near_origin: near0,
      near_x: [near1[0] - near0[0], near1[1] - near0[1], near1[2] - near0[2]],
      near_y: [near3[0] - near0[0], near3[1] - near0[1], near3[2] - near0[2]],
      far_origin: far0,
      far_x: [far1[0] - far0[0], far1[1] - far0[1], far1[2] - far0[2]],
      far_y: [far3[0] - far0[0], far3[1] - far0[1], far3[2] - far0[2]],
    };
  }

  _getCameraPositionFromViewMatrix(viewMatrix) {
    const inv = invert4(viewMatrix); // 你已经引入了这个函数
    return [inv[12], inv[13], inv[14]]; // 相机世界坐标位置
  }


  
  render(actualViewMatrix) {
    systemInfoTracker.updateCamInfo(formatViewMatrix(actualViewMatrix));
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // 同时清除颜色和深度
 

    // === 渲染高斯点云 ===
    gl.depthMask(true);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.u_view, false, actualViewMatrix);

    gl.uniform1i(this.u_mode, this.mode);

    gl.drawArraysInstanced(gl.TRIANGLE_FAN, 0, 4, this.vertexCount);


    // === 渲染网格 === 
    if (this._showAxes) {
      gl.depthMask(true);
      gl.useProgram(this.gridProgram);
      gl.bindVertexArray(this.gridVAO);
      
      const camPos = this._getCameraPositionFromViewMatrix(actualViewMatrix);
      gl.uniform3fv(this.gridUniforms.view_position, new Float32Array(camPos));

      const viewProj = multiply4(this.projectionMatrix, actualViewMatrix);
      gl.uniformMatrix4fv(this.gridUniforms.matrix_viewProjection, false, viewProj);

      // 替换掉临时的 near/far origin，用真正的计算值
      const rays = this._computeRayPlaneCorners(actualViewMatrix, this.projectionMatrix);
      gl.uniform3fv(this.gridUniforms.near_origin, new Float32Array(rays.near_origin));
      gl.uniform3fv(this.gridUniforms.near_x, new Float32Array(rays.near_x));
      gl.uniform3fv(this.gridUniforms.near_y, new Float32Array(rays.near_y));
      gl.uniform3fv(this.gridUniforms.far_origin, new Float32Array(rays.far_origin));
      gl.uniform3fv(this.gridUniforms.far_x, new Float32Array(rays.far_x));
      gl.uniform3fv(this.gridUniforms.far_y, new Float32Array(rays.far_y));


      // 渲染前绑定：
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.blueNoiseTexture);
      gl.uniform1i(this.gridUniforms.blueNoiseTex32, 1); // sampler2D 对应 TEXTURE1

      // 绘制一个大四边形（clip-space）
      gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
      gl.bindVertexArray(null);
    } 


    // === 更新 FPS ===
    systemInfoTracker.updateFrame();
  

  }



  clear() {
    const gl = this.gl;
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    if (this.depthTexture) {
      gl.deleteTexture(this.depthTexture);
      this.depthTexture = null;
    }

    // 如有 buffer、VAO 等资源也可以清理
    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }

    console.log("Renderer: 清理完毕");
  }



  runSort(buffer,vertexCount,viewProj) {
    if (!buffer) return;
    const f_buffer = new Float32Array(buffer);
    if (this.lastVertexCount == vertexCount) {
      let dot =
      this.lastProj[2] * viewProj[2] +
      this.lastProj[6] * viewProj[6] +
      this.lastProj[10] * viewProj[10];
      if (Math.abs(dot - 1) < 0.01) {
        return;
      }
    } else {
      //this.generateTexture(buffer,vertexCount);
      this.lastVertexCount = vertexCount;
    }

    //console.time("sort");
    let maxDepth = -Infinity;
    let minDepth = Infinity;
    let sizeList = new Int32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
      let depth =
        ((viewProj[2] * f_buffer[8 * i + 0] +
          viewProj[6] * f_buffer[8 * i + 1] +
          viewProj[10] * f_buffer[8 * i + 2]) *
          4096) |
        0;
      sizeList[i] = depth;
      if (depth > maxDepth) maxDepth = depth;
      if (depth < minDepth) minDepth = depth;
    }

    // This is a 16 bit single-pass counting sort
    let depthInv = (256 * 256 - 1) / (maxDepth - minDepth);
    let counts0 = new Uint32Array(256 * 256);
    for (let i = 0; i < vertexCount; i++) {
      sizeList[i] = ((sizeList[i] - minDepth) * depthInv) | 0;
      counts0[sizeList[i]]++;
    }
    let starts0 = new Uint32Array(256 * 256);
    for (let i = 1; i < 256 * 256; i++)
      starts0[i] = starts0[i - 1] + counts0[i - 1];
    
    const depthIndex = new Uint32Array(vertexCount);
    for (let i = 0; i < vertexCount; i++)
      depthIndex[starts0[sizeList[i]]++] = i;

    //console.timeEnd("sort");

    this.lastProj = viewProj;
    return {depthIndex,vertexCount};
  }


  throttledSort() {
    if (!this.sortRunning) {
      this.sortRunning = true;
      let lastView = viewProj;
      this.runSort(lastView);
      setTimeout(() => {
        this.sortRunning = false;
        if (lastView !== this.viewProj) {
          this.throttledSort();
        }
      }, 0);
    }
  };
   

}