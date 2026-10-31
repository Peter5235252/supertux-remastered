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

@location(0) var<out> out_color: vec4<f32>;

@fragment
fn main() -> @location(0) vec4<f32> {
  let pos = vec2<f32>(@builtin(position));
  // Map NDC position (-1..1) to UV (0..1)
  let uv = (pos + 1.0) / 2.0;
  out_color = textureSample(src_tex, src_sampler, uv);
  return out_color;
}
