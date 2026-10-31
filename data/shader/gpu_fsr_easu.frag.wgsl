// SuperTux Remastered — WebGPU backend: FSR EASU upscale pass (WGSL).
// Simplified identity pass for initial WebGPU port. Full FSR EASU
// (with textureGather-based edge detection) can be ported from the GLSL
// version as a follow-up. Reads srcTex and writes to display resolution.

struct EasuUBO {
  inputViewport: vec2<f32>,
  inputSize: vec2<f32>,
  outputSize: vec2<f32>,
};

@group(2) @binding(0) var<uniform> easu_ubo: EasuUBO;

@group(3) @binding(0) var src_tex: texture_2d<f32>;
@group(3) @binding(1) var src_sampler: sampler;

@fragment
fn main(@builtin(position) position: vec4<f32>) -> @location(0) vec4<f32> {
  // Fragment position is in framebuffer pixels, not NDC.
  let uv = position.xy / easu_ubo.outputSize;
  return textureSample(src_tex, src_sampler, uv);
}
