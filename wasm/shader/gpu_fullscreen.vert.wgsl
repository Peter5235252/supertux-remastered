// SuperTux Remastered — WebGPU backend: fullscreen-triangle vertex shader (WGSL).
// No vertex buffers: positions derived from @builtin(vertex_index).

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) var_uv: vec2<f32>,
};

@vertex
fn main(@builtin(vertex_index) vertex_index: i32) -> VertexOutput {
  var output: VertexOutput;
  let x = f32((vertex_index << 1) & 2);
  let y = f32(vertex_index & 2);
  output.var_uv = vec2<f32>(x, y);
  output.position = vec4<f32>(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
  return output;
}
