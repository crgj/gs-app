export const gridVertexShaderSource = `#version 300 es
precision highp float;

uniform vec3 near_origin;
uniform vec3 near_x;
uniform vec3 near_y;
uniform vec3 far_origin;
uniform vec3 far_x;
uniform vec3 far_y;

in vec2 vertex_position;

out vec3 worldFar;
out vec3 worldNear;

void main(void) {
  gl_Position = vec4(vertex_position, 0.0, 1.0);
  vec2 p = vertex_position * 0.5 + 0.5;
  worldNear = near_origin + near_x * p.x + near_y * p.y;
  worldFar = far_origin + far_x * p.x + far_y * p.y;
}
`.trim();;

export const gridFragmentShaderSource = `#version 300 es
precision highp float;

in vec3 worldNear;
in vec3 worldFar;

uniform vec3 view_position;
uniform mat4 matrix_viewProjection;
uniform sampler2D blueNoiseTex32;
uniform int plane; // 0: x (yz), 1: y (xz), 2: z (xy)

out vec4 outColor;

vec4 planes[3] = vec4[3](
  vec4(1.0, 0.0, 0.0, 0.0), // yz 平面
  vec4(0.0, 1.0, 0.0, 0.0), // xz 平面
  vec4(0.0, 0.0, 1.0, 0.0)  // xy 平面
);

bool intersectPlane(inout float t, vec3 pos, vec3 dir, vec4 plane) {
  float d = dot(dir, plane.xyz);
  if (abs(d) < 1e-6) return false;
  float n = -(dot(pos, plane.xyz) + plane.w) / d;
  if (n < 0.0) return false;
  t = n;
  return true;
}

float pristineGrid(vec2 uv, vec2 ddx, vec2 ddy, float lineWidth) {
  vec2 uvDeriv = vec2(length(vec2(ddx.x, ddy.x)), length(vec2(ddx.y, ddy.y)));
  vec2 aa = uvDeriv * 1.5;
  vec2 gridUV = abs(fract(uv) * 2.0 - 1.0);
  vec2 grid = smoothstep(lineWidth + aa, lineWidth - aa, gridUV);
  return max(grid.x, grid.y);
}

float calcDepth(vec3 p) {
  vec4 v = matrix_viewProjection * vec4(p, 1.0);
  return (v.z / v.w) * 0.5 + 0.5;
}

 

void main() {
  vec3 p = worldNear;
  vec3 v = normalize(worldFar - worldNear);

  float t;
  if (!intersectPlane(t, p, v, planes[plane])) {
    discard;
  }

  vec3 worldPos = p + v * t;
  vec2 pos = plane == 0 ? worldPos.yz : (plane == 1 ? worldPos.xz : worldPos.xy);
  pos += 0.5  ;  // ✅ 添加微小偏移，确保原点不落在格线间隙中
 
  vec2 ddx = dFdx(pos);
  vec2 ddy = dFdy(pos);

  float fade = 1.0 - smoothstep(10.0, 50.0, length(worldPos - view_position));
  if (fade < 0.01) discard;

  float lineWidth = 0.02;


  vec3 color = vec3(0.0); // 白网格略带灰
  float alpha = pristineGrid(pos, ddx, ddy, lineWidth) * fade;

  if (worldPos.y>-0.05 && worldPos.y<0.05) {
    lineWidth = 0.03;
    color = vec3(0.0,0.8,0.0); 
    
  }
  if (worldPos.z>-0.05 && worldPos.z<0.05) {
    lineWidth = 0.03;
    color = vec3(0.0,0.0,0.8);  
  }

  
  outColor = vec4(color, alpha*0.2f);
  gl_FragDepth =   calcDepth(worldPos)  ;



  if (alpha < 0.01) discard;
}
`.trim();
