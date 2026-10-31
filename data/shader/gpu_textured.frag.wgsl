// SuperTux Remastered — WebGPU backend: textured-quad fragment shader (WGSL).
// Uniform samplers live in group 3 (bindings 0,2,4 = textures; 1,3,5 = samplers),
// scalar/vector uniforms in a group-2 uniform buffer (std140 layout).
// Binding layout may need tuning to match SDL3's WebGPU backend.

struct FragBlock {
  fragcoord2uv: mat3x3<f32>,
  backbuffer: f32,
  game_time: f32,
  animate: vec2<f32>,
  displacement_animate: vec2<f32>,
  is_displacement: i32,
  blur: i32,
};

@group(2) @binding(0) var<uniform> frag_block: FragBlock;

@group(3) @binding(0) var diffuse_texture: texture_2d<f32>;
@group(3) @binding(1) var diffuse_sampler: sampler;

@group(3) @binding(2) var displacement_texture: texture_2d<f32>;
@group(3) @binding(3) var displacement_sampler: sampler;

@group(3) @binding(4) var framebuffer_texture: texture_2d<f32>;
@group(3) @binding(5) var framebuffer_sampler: sampler;

@location(0) var<in> var_uv: vec2<f32>;
@location(1) var<in> var_color: vec4<f32>;

@location(0) var<out> frag_color: vec4<f32>;

@fragment
fn main() -> @location(0) vec4<f32> {
  let fb = frag_block.backbuffer;
  let is_disp = frag_block.is_displacement;
  let blur = frag_block.blur;

  if (fb == 0.0 || is_disp == 0 || blur != 0) {
    var color = var_color * textureSample(diffuse_texture, diffuse_sampler, var_uv.st + frag_block.animate * frag_block.game_time);
    if (blur != 0) {
      let uv = (frag_block.fragcoord2uv * vec3<f32>(@builtin(position), 1.0)).xy;
      // Note: WebGPU fragment position is in the same space; uv.y flip applied below.
      let flipped_uv = vec2<f32>(uv.x, 1.0 - uv.y);
      let texel = vec2<f32>(frag_block.fragcoord2uv[0][0], frag_block.fragcoord2uv[1][1]);
      var num = 0.0;
      var sum = vec4<f32>(0.0);
      var y = -f32(blur);
      while (y <= f32(blur)) {
        var x = -f32(blur);
        while (x <= f32(blur)) {
          let offset = vec2<f32>(x, y) * texel;
          sum = sum + textureSample(framebuffer_texture, framebuffer_sampler, flipped_uv + offset);
          num = num + 1.0;
          x = x + 1.0;
        }
        y = y + 1.0;
      }
      let blurred = sum / num;
      frag_color = vec4<f32>(mix(color.rgb, blurred.rgb * 1.05, color.a), 1.0);
    } else {
      frag_color = color;
    }
  } else {
    let pixel = textureSample(displacement_texture, displacement_sampler, var_uv.st + frag_block.displacement_animate * frag_block.game_time);
    let displacement = (pixel.rg - vec2<f32>(0.5, 0.5)) * 255.0;
    let alpha = pixel.a;

    let pos = vec3<f32>(@builtin(position), 1.0);
    let uv = (frag_block.fragcoord2uv * (pos + vec3<f32>(displacement.xy * alpha, 0.0))).xy;
    let flipped_uv = vec2<f32>(uv.x, 1.0 - uv.y);
    let back_color = textureSample(framebuffer_texture, framebuffer_sampler, flipped_uv);

    let color = var_color * textureSample(diffuse_texture, diffuse_sampler, var_uv.st + frag_block.animate * frag_block.game_time);
    frag_color = vec4<f32>(mix(color.rgb, back_color.rgb, alpha), color.a);
  }
  return frag_color;
}
