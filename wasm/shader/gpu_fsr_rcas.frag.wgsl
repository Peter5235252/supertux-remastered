// SuperTux Remastered — WebGPU backend: FSR RCAS sharpen pass (WGSL).
// Simplified identity pass for initial WebGPU port. Full FSR RCAS
// (with contrast-adaptive sharpening) can be ported from the GLSL
// version as a follow-up.

struct RcasUBO {
  sharpness_stops: f32,
  hdr_enabled: f32,
  hdr_headroom: f32,
  _pad: f32,
};

@group(2) @binding(0) var<uniform> rcas_ubo: RcasUBO;

@group(3) @binding(0) var src_tex: texture_2d<f32>;
@group(3) @binding(1) var src_sampler: sampler;

@location(0) var<out> out_color: vec4<f32>;

@fragment
fn main() -> @location(0) vec4<f32> {
  let pos = vec2<f32>(@builtin(position));
  let uv = (pos + 1.0) / 2.0;
  out_color = textureSample(src_tex, src_sampler, uv);
  return out_color;
}
