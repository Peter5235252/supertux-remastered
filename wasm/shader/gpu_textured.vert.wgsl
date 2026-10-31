// SuperTux Remastered — WebGPU backend: textured-quad vertex shader (WGSL).
// Positions arrive in physical pixels; MVP maps to WebGPU NDC (y-down).
// Binding layout (SDL_GPU WebGPU):
//   group 2 = uniform buffers (Vulkan set 3)
//   group 3 = textures + samplers (Vulkan set 2)
// NOTE: group/binding indices may need tuning to match SDL3's WebGPU backend.

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) var_uv: vec2<f32>,
  @location(1) var_color: vec4<f32>,
};

@vertex
fn main(
  @location(0) in_pos: vec2<f32>,
  @location(1) in_uv: vec2<f32>,
  @location(2) in_color: vec4<f32>,
) -> VertexOutput {
  var output: VertexOutput;
  // Positions arrive pre-transformed to NDC (see GPUPainter).
  output.var_uv = in_uv;
  output.var_color = in_color;
  output.position = vec4<f32>(in_pos, 0.0, 1.0);
  return output;
}
