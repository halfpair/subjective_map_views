function initBuffers(webgl)
{
    return {position: initPositionBuffer(webgl)};
}

function initPositionBuffer(webgl)
{
    const pos_buffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, pos_buffer);

    const positions = [0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, -0.5];
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array(positions), webgl.STATIC_DRAW);
  
    return pos_buffer;
}
  
export { initBuffers };
