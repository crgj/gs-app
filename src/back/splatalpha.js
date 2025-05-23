

export const vertexShaderSourceAlpha = `#version 300 es
precision highp float;
precision highp int;

uniform highp usampler2D u_texture;
uniform mat4 projection, view;
uniform vec2 focal;
uniform vec2 viewport;
uniform int u_mode; // 0: normal, 1: position only, 2: ellipse

in vec2 position;
in int index;

out vec4 vColor;
out vec2 vPosition;
out vec2 vEllipseCenter;
out vec2 vMajorAxis;
out vec2 vMinorAxis;
out float vDepth;

void main () {
    int dummy = u_mode; // 假装用一下，防止被优化掉

    uvec4 cen = texelFetch(u_texture, ivec2((uint(index) & 0x3ffu) << 1, uint(index) >> 10), 0);
    vec4 cam = view * vec4(uintBitsToFloat(cen.xyz), 1);
    vec4 pos2d = projection * cam;

    float clip = 1.2 * pos2d.w;
    if (pos2d.z < -clip || pos2d.x < -clip || pos2d.x > clip || pos2d.y < -clip || pos2d.y > clip) {
        gl_Position = vec4(0.0, 0.0, 2.0, 1.0);
        return;
    }

    uvec4 cov = texelFetch(u_texture, ivec2(((uint(index) & 0x3ffu) << 1) | 1u, uint(index) >> 10), 0);
    vec2 u1 = unpackHalf2x16(cov.x), u2 = unpackHalf2x16(cov.y), u3 = unpackHalf2x16(cov.z);
    mat3 Vrk = mat3(u1.x, u1.y, u2.x, u1.y, u2.y, u3.x, u2.x, u3.x, u3.y);

    mat3 J = mat3(
        focal.x / cam.z, 0., -(focal.x * cam.x) / (cam.z * cam.z),
        0., -focal.y / cam.z, (focal.y * cam.y) / (cam.z * cam.z),
        0., 0., 0.
    );

    mat3 T = transpose(mat3(view)) * J;
    mat3 cov2d = transpose(T) * Vrk * T;

    float mid = (cov2d[0][0] + cov2d[1][1]) / 2.0;
    float radius = length(vec2((cov2d[0][0] - cov2d[1][1]) / 2.0, cov2d[0][1]));
    float lambda1 = mid + radius, lambda2 = mid - radius;

    if(lambda2 < 0.0) return;
    vec2 diagonalVector = normalize(vec2(cov2d[0][1], lambda1 - cov2d[0][0]));
    vec2 majorAxis = min(sqrt(2.0 * lambda1), 1024.0) * diagonalVector;
    vec2 minorAxis = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagonalVector.y, -diagonalVector.x);

    vColor = clamp(pos2d.z/pos2d.w+1.0, 0.0, 1.0) * vec4((cov.w) & 0xffu, (cov.w >> 8) & 0xffu, (cov.w >> 16) & 0xffu, (cov.w >> 24) & 0xffu) / 255.0;
    vPosition = position;

    vec2 vCenter = vec2(pos2d) / pos2d.w;
    //vDepth = pos2d.z / pos2d.w;
    vDepth = (pos2d.z / pos2d.w) * 0.5 + 0.5;


    vec2 screenPos = vec2(pos2d) / pos2d.w;
    vEllipseCenter = screenPos;
    
    vec2 diagVec = normalize(vec2(cov2d[0][1], lambda1 - cov2d[0][0]));
    vec2 major = min(sqrt(2.0 * lambda1), 1024.0) * diagVec;
    vec2 minor = min(sqrt(2.0 * lambda2), 1024.0) * vec2(diagVec.y, -diagVec.x);
    vMajorAxis = major;
    vMinorAxis = minor;

    gl_Position = vec4(
        vCenter
        + position.x * majorAxis / viewport
        + position.y * minorAxis / viewport, 
        vDepth, 1.0);
}`;


export const fragmentShaderSourceAlpha = `#version 300 es
precision highp float;

uniform int u_mode; // 0: normal, 1: position only, 2: ellipse

in vec4 vColor;
in vec2 vPosition;
in vec2 vEllipseCenter;
in vec2 vMajorAxis;
in vec2 vMinorAxis;
in float vDepth;

out vec4 fragColor;

void main () {
    float A = -dot(vPosition, vPosition);
    if (A < -4.0) discard;
    float B = exp(A) * vColor.a;
    fragColor = vec4(B * vColor.rgb, B);


    gl_FragDepth = vDepth; // ✅ 补上这一行！！！

     if (u_mode == 1) {
        vec2 point = vPosition.x * vMajorAxis + vPosition.y * vMinorAxis;
        float d = dot(point, point);
        float ellipse = exp(-d);
        if (ellipse > 0.0001) 
        {
            fragColor = vec4(0.0, 1.0, 0.0, 1.0); // cyan-like ellipse
        }
        return;
    }


    if (u_mode == 2) {
        if (A > -2.0 && A < -1.9) {
            fragColor = vec4(vColor.rgb, 0.0); // white-like ellipse
            return;
        }
    }
}`;