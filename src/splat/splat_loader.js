// SplatLoader.js（重构版本）
export class SplatLoader {
  constructor({ url, onDataReady, onProgress }) {
    this.url = url;
    this.rowLength = 3 * 4 + 3 * 4 + 4 + 4;
    this.splatData = null; 
    this.downsample = 1;
    this.onDataReady = onDataReady;
    this.onProgress = onProgress; // ✅ 新增
  }

  _isPly(data) {
    return data[0] === 112 && data[1] === 108 && data[2] === 121 && data[3] === 10;
  }
 

  processPlyBuffer(inputBuffer) {
    const ubuf = new Uint8Array(inputBuffer);
    // 10KB ought to be enough for a header...
    const header = new TextDecoder().decode(ubuf.slice(0, 1024 * 10));
    const header_end = "end_header\n";
    const header_end_index = header.indexOf(header_end);
    if (header_end_index < 0)
      throw new Error("Unable to read .ply file header");
    const vertexCount = parseInt(/element vertex (\d+)\n/.exec(header)[1]);
    //.log("Vertex Count", vertexCount);
    let row_offset = 0,
      offsets = {},
      types = {};
    const TYPE_MAP = {
      double: "getFloat64",
      int: "getInt32",
      uint: "getUint32",
      float: "getFloat32",
      short: "getInt16",
      ushort: "getUint16",
      uchar: "getUint8",
    };
    for (let prop of header
      .slice(0, header_end_index)
      .split("\n")
      .filter((k) => k.startsWith("property "))) {
      const [p, type, name] = prop.split(" ");
      const arrayType = TYPE_MAP[type] || "getInt8";
      types[name] = arrayType;
      offsets[name] = row_offset;
      row_offset += parseInt(arrayType.replace(/[^\d]/g, "")) / 8;
    }
    //console.log("Bytes per row", row_offset, types, offsets);

    let dataView = new DataView(
      inputBuffer,
      header_end_index + header_end.length,
    );
    let row = 0;
    const attrs = new Proxy(
      {},
      {
        get(target, prop) {
          if (!types[prop]) throw new Error(prop + " not found");
          return dataView[types[prop]](
            row * row_offset + offsets[prop],
            true,
          );
        },
      },
    );

    //console.time("calculate importance");
    let sizeList = new Float32Array(vertexCount);
    let sizeIndex = new Uint32Array(vertexCount);
    for (row = 0; row < vertexCount; row++) {
      sizeIndex[row] = row;
      if (!types["scale_0"]) continue;
      const size =
        Math.exp(attrs.scale_0) *
        Math.exp(attrs.scale_1) *
        Math.exp(attrs.scale_2);
      const opacity = 1 / (1 + Math.exp(-attrs.opacity));
      sizeList[row] = size * opacity;
    }
    //console.timeEnd("calculate importance");

    //console.time("sort");
    sizeIndex.sort((b, a) => sizeList[a] - sizeList[b]);
    //console.timeEnd("sort");

    // 6*4 + 4 + 4 = 8*4
    // XYZ - Position (Float32)
    // XYZ - Scale (Float32)
    // RGBA - colors (uint8)
    // IJKL - quaternion/rot (uint8)
    const rowLength = 3 * 4 + 3 * 4 + 4 + 4;
    const buffer = new ArrayBuffer(rowLength * vertexCount);

    //console.time("build buffer");
    for (let j = 0; j < vertexCount; j++) {
      row = sizeIndex[j];

      const position = new Float32Array(buffer, j * rowLength, 3);
      const scales = new Float32Array(buffer, j * rowLength + 4 * 3, 3);
      const rgba = new Uint8ClampedArray(
        buffer,
        j * rowLength + 4 * 3 + 4 * 3,
        4,
      );
      const rot = new Uint8ClampedArray(
        buffer,
        j * rowLength + 4 * 3 + 4 * 3 + 4,
        4,
      );

      if (types["scale_0"]) {
        const qlen = Math.sqrt(
          attrs.rot_0 ** 2 +
          attrs.rot_1 ** 2 +
          attrs.rot_2 ** 2 +
          attrs.rot_3 ** 2,
        );

        rot[0] = (attrs.rot_0 / qlen) * 128 + 128;
        rot[1] = (attrs.rot_1 / qlen) * 128 + 128;
        rot[2] = (attrs.rot_2 / qlen) * 128 + 128;
        rot[3] = (attrs.rot_3 / qlen) * 128 + 128;

        scales[0] = Math.exp(attrs.scale_0);
        scales[1] = Math.exp(attrs.scale_1);
        scales[2] = Math.exp(attrs.scale_2);
      } else {
        scales[0] = 0.01;
        scales[1] = 0.01;
        scales[2] = 0.01;

        rot[0] = 255;
        rot[1] = 0;
        rot[2] = 0;
        rot[3] = 0;
      }

      position[0] = attrs.x;
      position[1] = attrs.y;
      position[2] = attrs.z;

      if (types["f_dc_0"]) {
        const SH_C0 = 0.28209479177387814;
        rgba[0] = (0.5 + SH_C0 * attrs.f_dc_0) * 255;
        rgba[1] = (0.5 + SH_C0 * attrs.f_dc_1) * 255;
        rgba[2] = (0.5 + SH_C0 * attrs.f_dc_2) * 255;
      } else {
        rgba[0] = attrs.red;
        rgba[1] = attrs.green;
        rgba[2] = attrs.blue;
      }
      if (types["opacity"]) {
        rgba[3] = (1 / (1 + Math.exp(-attrs.opacity))) * 255;
      } else {
        rgba[3] = 255;
      }
    }
    //console.timeEnd("build buffer");
    return buffer;
  }



  async load() {
    const req = await fetch(this.url, {
      mode: "cors",
      credentials: "omit",
    });
  
    if (req.status !== 200) {
      throw new Error(`${req.status} Unable to load ${req.url}`);
    }
  
    const reader = req.body.getReader();
    const contentLengthHeader = req.headers.get("content-length");
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader) : undefined;
    
    // 🔥 初始化变量
    const chunks = [];      // 临时存每段数据
    let totalLength = 0;     // 已经读取的总长度
    let bytesRead = 0;       // 本次读取位置
  
    // 🔥 读取流
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
    
      chunks.push(value);
      totalLength += value.length;
      bytesRead += value.length;
    
      // 🔥 每次读取更新进度
      if (this.onProgress) {
        if (contentLength) {
          const percent = Math.min((bytesRead / contentLength) * 100, 99.9);
          this.onProgress(percent.toFixed(1), `${bytesRead} / ${contentLength} bytes`);
        } else {
          const percent=0;
          this.onProgress(percent.toFixed(1), `${bytesRead} bytes`);
          //console.log("bytesRead",bytesRead)
        }
      }
    }
    
    // 🔥 读取完成后，补100%进度
    if (this.onProgress ) {
      this.onProgress(100);
    }
  
    // 🔥 合并chunks成完整数据
    this.splatData = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      this.splatData.set(chunk, offset);
      offset += chunk.length;
    }
  
    console.log("Finished loading:", totalLength, "bytes");
  
    // 🔥 判断是否是ply文件（根据开头magic number）
    if (this._isPly(this.splatData)) {
      const buffer = this.processPlyBuffer(this.splatData.buffer);
      const vertexCount = Math.floor(buffer.byteLength / this.rowLength);
  
      // 🔥 通知外部，数据准备好了
      this.onDataReady?.('buffer', { buffer, vertexCount });
    } else {
      console.warn("Loaded data is not a valid .ply file");
    }
  }
  


}


