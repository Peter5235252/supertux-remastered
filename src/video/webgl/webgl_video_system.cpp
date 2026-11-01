//  SuperTux
//  Copyright (C) 2026 SuperTux-HD contributors
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.

#include "video/webgl/webgl_video_system.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>
#include <stdexcept>
#include <string>
#include <vector>

#include "supertux/gameconfig.hpp"
#include "supertux/globals.hpp"
#include "util/log.hpp"
#include "video/drawing_request.hpp"
#include "video/flip.hpp"
#include "video/gradient.hpp"
#include "video/sdl_surface.hpp"
#include "video/texture_manager.hpp"

namespace {

const char* VERTEX_SHADER = R"glsl(#version 300 es
precision highp float;
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in vec4 a_color;
uniform vec2 u_target_size;
uniform vec4 u_viewport;
uniform vec2 u_logical_size;
out vec2 v_uv;
out vec4 v_color;
void main()
{
  vec2 physical = u_viewport.xy + a_position * (u_viewport.zw / u_logical_size);
  vec2 ndc = vec2(2.0 * physical.x / u_target_size.x - 1.0,
                  1.0 - 2.0 * physical.y / u_target_size.y);
  gl_Position = vec4(ndc, 0.0, 1.0);
  v_uv = a_uv;
  v_color = a_color;
}
)glsl";

const char* FRAGMENT_SHADER = R"glsl(#version 300 es
precision highp float;
in vec2 v_uv;
in vec4 v_color;
uniform sampler2D u_texture;
uniform vec2 u_animate;
uniform float u_game_time;
out vec4 frag_color;
void main()
{
  frag_color = v_color * texture(u_texture, v_uv + u_animate * u_game_time);
}
)glsl";

GLuint
compile_shader(GLenum type, const char* source)
{
  const GLuint shader = glCreateShader(type);
  glShaderSource(shader, 1, &source, nullptr);
  glCompileShader(shader);

  GLint compiled = GL_FALSE;
  glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
  if (compiled == GL_TRUE)
    return shader;

  GLint length = 0;
  glGetShaderiv(shader, GL_INFO_LOG_LENGTH, &length);
  std::string message(static_cast<size_t>(std::max(1, length)), '\0');
  glGetShaderInfoLog(shader, length, nullptr, message.data());
  glDeleteShader(shader);
  throw std::runtime_error("WebGL shader compilation failed: " + message);
}

GLuint
create_program()
{
  const GLuint vertex = compile_shader(GL_VERTEX_SHADER, VERTEX_SHADER);
  GLuint fragment = 0;
  try
  {
    fragment = compile_shader(GL_FRAGMENT_SHADER, FRAGMENT_SHADER);
  }
  catch (...)
  {
    glDeleteShader(vertex);
    throw;
  }

  const GLuint program = glCreateProgram();
  glAttachShader(program, vertex);
  glAttachShader(program, fragment);
  glLinkProgram(program);
  glDeleteShader(vertex);
  glDeleteShader(fragment);

  GLint linked = GL_FALSE;
  glGetProgramiv(program, GL_LINK_STATUS, &linked);
  if (linked == GL_TRUE)
    return program;

  GLint length = 0;
  glGetProgramiv(program, GL_INFO_LOG_LENGTH, &length);
  std::string message(static_cast<size_t>(std::max(1, length)), '\0');
  glGetProgramInfoLog(program, length, nullptr, message.data());
  glDeleteProgram(program);
  throw std::runtime_error("WebGL shader linking failed: " + message);
}

GLenum
texture_wrap(GLenum value)
{
  switch (value)
  {
    case GL_REPEAT: return GL_REPEAT;
    case GL_MIRRORED_REPEAT: return GL_MIRRORED_REPEAT;
    default: return GL_CLAMP_TO_EDGE;
  }
}

void
set_blend_mode(Blend blend)
{
  switch (blend)
  {
    case Blend::NONE:
      glDisable(GL_BLEND);
      break;
    case Blend::BLEND:
      glEnable(GL_BLEND);
      glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
      break;
    case Blend::ADD:
      glEnable(GL_BLEND);
      glBlendFunc(GL_SRC_ALPHA, GL_ONE);
      break;
    case Blend::MOD:
      glEnable(GL_BLEND);
      glBlendFunc(GL_DST_COLOR, GL_ZERO);
      break;
  }
  glBlendEquation(GL_FUNC_ADD);
}

} // namespace

WebGLTexture::WebGLTexture(const SDL_Surface& image, const Sampler& sampler) :
  Texture(sampler),
  m_handle(0),
  m_width(0),
  m_height(0)
{
  upload(image);
}

WebGLTexture::~WebGLTexture()
{
  if (m_handle)
    glDeleteTextures(1, &m_handle);
}

void
WebGLTexture::reload(const SDL_Surface& image)
{
  upload(image);
}

void
WebGLTexture::upload(const SDL_Surface& image)
{
  SDL_Surface* converted = nullptr;
  const SDL_Surface* src = &image;
  if (image.format != SDL_PIXELFORMAT_RGBA32)
  {
    converted = SDL_ConvertSurface(const_cast<SDL_Surface*>(&image),
                                   SDL_PIXELFORMAT_RGBA32);
    if (!converted)
    {
      log_warning << "SDL_ConvertSurface failed for WebGL texture: "
                  << SDL_GetError() << std::endl;
      SDL_ClearError();
      return;
    }
    src = converted;
  }

  std::vector<Uint8> pixels(static_cast<size_t>(src->w) *
                            static_cast<size_t>(src->h) * 4);
  const Uint8* source_pixels = static_cast<const Uint8*>(src->pixels);
  const size_t row_bytes = static_cast<size_t>(src->w) * 4;
  for (int y = 0; y < src->h; ++y)
    std::memcpy(pixels.data() + static_cast<size_t>(y) * row_bytes,
                source_pixels + static_cast<size_t>(y) * src->pitch,
                row_bytes);

  if (converted)
    SDL_DestroySurface(converted);

  if (m_handle)
    glDeleteTextures(1, &m_handle);

  glGenTextures(1, &m_handle);
  glBindTexture(GL_TEXTURE_2D, m_handle);
  glPixelStorei(GL_UNPACK_ALIGNMENT, 1);
  glTexImage2D(GL_TEXTURE_2D, 0, GL_RGBA, src->w, src->h, 0,
               GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());

  const bool linear = m_sampler.get_filter() != GL_NEAREST;
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER,
                  linear ? GL_LINEAR : GL_NEAREST);
  const bool has_mipmaps = src->w > 1 || src->h > 1;
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER,
                  has_mipmaps ?
                    (linear ? GL_LINEAR_MIPMAP_LINEAR : GL_NEAREST_MIPMAP_NEAREST) :
                    (linear ? GL_LINEAR : GL_NEAREST));
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_S,
                  texture_wrap(m_sampler.get_wrap_s()));
  glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_WRAP_T,
                  texture_wrap(m_sampler.get_wrap_t()));
  if (has_mipmaps)
    glGenerateMipmap(GL_TEXTURE_2D);

  m_width = src->w;
  m_height = src->h;
}

WebGLPainter::WebGLPainter(WebGLVideoSystem& video_system, bool is_screen) :
  m_video_system(video_system),
  m_is_screen(is_screen),
  m_clip_rect{0, 0, 0, 0},
  m_clip_enabled(false)
{
}

void
WebGLPainter::push_quad(std::vector<float>& out,
                        float left, float top, float right, float bottom,
                        float uv_left, float uv_top, float uv_right, float uv_bottom,
                        const Color& color, float alpha)
{
  const float vertices[6][8] = {
    {left, top, uv_left, uv_top, color.red, color.green, color.blue, color.alpha * alpha},
    {right, top, uv_right, uv_top, color.red, color.green, color.blue, color.alpha * alpha},
    {right, bottom, uv_right, uv_bottom, color.red, color.green, color.blue, color.alpha * alpha},
    {left, bottom, uv_left, uv_bottom, color.red, color.green, color.blue, color.alpha * alpha},
    {left, top, uv_left, uv_top, color.red, color.green, color.blue, color.alpha * alpha},
    {right, bottom, uv_right, uv_bottom, color.red, color.green, color.blue, color.alpha * alpha},
  };
  for (const auto& vertex : vertices)
    out.insert(out.end(), vertex, vertex + 8);
}

void
WebGLPainter::draw_vertices(Blend blend, bool lines, const WebGLTexture* texture,
                            const Vector& animate, const float* data,
                            size_t float_count)
{
  if (!texture || !texture->get_handle() || float_count == 0)
    return;

  m_video_system.draw_vertices(data, float_count, *texture, blend, lines,
                               animate, m_clip_enabled, m_clip_rect);
}

void
WebGLPainter::clear(const Color& color)
{
  if (m_is_screen)
    m_video_system.clear_color() = color;
}

void
WebGLPainter::set_clip_rect(const Rect& rect)
{
  m_clip_rect = rect.to_sdl();
  m_clip_enabled = true;
}

void
WebGLPainter::clear_clip_rect()
{
  m_clip_enabled = false;
}

void
WebGLPainter::get_pixel(const DrawingRequest&) const
{
}

void
WebGLPainter::draw_texture(const DrawingRequest& draw_req)
{
  const auto& request = std::get<TextureRequest>(draw_req.request);
  if (!request.texture ||
      request.srcrects.size() != request.dstrects.size() ||
      request.srcrects.size() != request.angles.size() ||
      request.srcrects.empty())
    return;

  const auto* texture = static_cast<const WebGLTexture*>(request.texture);
  std::vector<float> vertices;
  vertices.reserve(request.srcrects.size() * 6 * 8);

  for (size_t i = 0; i < request.srcrects.size(); ++i)
  {
    const float left = request.dstrects[i].get_left();
    const float top = request.dstrects[i].get_top();
    const float right = request.dstrects[i].get_right();
    const float bottom = request.dstrects[i].get_bottom();
    float uv_left = request.srcrects[i].get_left() / texture->get_texture_width();
    float uv_top = request.srcrects[i].get_top() / texture->get_texture_height();
    float uv_right = request.srcrects[i].get_right() / texture->get_texture_width();
    float uv_bottom = request.srcrects[i].get_bottom() / texture->get_texture_height();

    if (draw_req.flip & HORIZONTAL_FLIP)
      std::swap(uv_left, uv_right);
    if (draw_req.flip & VERTICAL_FLIP)
      std::swap(uv_top, uv_bottom);

    if (request.angles[i] == 0.0f)
    {
      push_quad(vertices, left, top, right, bottom, uv_left, uv_top,
                uv_right, uv_bottom, request.color, draw_req.alpha);
    }
    else
    {
      const float center_x = (left + right) / 2.0f;
      const float center_y = (top + bottom) / 2.0f;
      const float sine = std::sin(math::radians(request.angles[i]));
      const float cosine = std::cos(math::radians(request.angles[i]));
      const float corners[4][2] = {
        {left - center_x, top - center_y},
        {right - center_x, top - center_y},
        {right - center_x, bottom - center_y},
        {left - center_x, bottom - center_y},
      };
      const float uvs[4][2] = {
        {uv_left, uv_top}, {uv_right, uv_top},
        {uv_right, uv_bottom}, {uv_left, uv_bottom},
      };
      const int indices[6] = {0, 1, 2, 0, 2, 3};
      for (int k = 0; k < 6; ++k)
      {
        const int index = indices[k];
        const float x = corners[index][0] * cosine -
                        corners[index][1] * sine + center_x;
        const float y = corners[index][0] * sine +
                        corners[index][1] * cosine + center_y;
        const float vertex[8] = {
          x, y, uvs[index][0], uvs[index][1],
          request.color.red, request.color.green, request.color.blue,
          request.color.alpha * draw_req.alpha
        };
        vertices.insert(vertices.end(), vertex, vertex + 8);
      }
    }
  }

  draw_vertices(draw_req.blend, false, texture,
                texture->get_sampler().get_animate(),
                vertices.data(), vertices.size());
}

void
WebGLPainter::draw_gradient(const DrawingRequest& draw_req)
{
  const auto& request = std::get<GradientRequest>(draw_req.request);
  const Rectf& region = request.region;
  const float left = region.get_left();
  const float top = region.get_top();
  const float right = region.get_right();
  const float bottom = region.get_bottom();

  Color colors[4];
  if (request.direction == VERTICAL || request.direction == VERTICAL_SECTOR)
  {
    colors[0] = colors[1] = request.top;
    colors[2] = colors[3] = request.bottom;
  }
  else
  {
    colors[0] = colors[3] = request.top;
    colors[1] = colors[2] = request.bottom;
  }

  const float positions[4][2] = {
    {left, top}, {right, top}, {right, bottom}, {left, bottom}
  };
  const int indices[6] = {0, 1, 2, 0, 2, 3};
  std::vector<float> vertices;
  vertices.reserve(6 * 8);
  for (int i = 0; i < 6; ++i)
  {
    const int index = indices[i];
    const float vertex[8] = {
      positions[index][0], positions[index][1],
      index == 1 || index == 2 ? 1.0f : 0.0f,
      index >= 2 ? 1.0f : 0.0f,
      colors[index].red, colors[index].green, colors[index].blue,
      colors[index].alpha * draw_req.alpha
    };
    vertices.insert(vertices.end(), vertex, vertex + 8);
  }

  draw_vertices(draw_req.blend, false, m_video_system.white_texture(),
                Vector(0.0f, 0.0f), vertices.data(), vertices.size());
}

void
WebGLPainter::draw_filled_rect(const DrawingRequest& draw_req)
{
  const auto& request = std::get<FillRectRequest>(draw_req.request);
  std::vector<float> vertices;
  vertices.reserve(6 * 8);
  const Rectf& rect = request.rect;
  push_quad(vertices, rect.get_left(), rect.get_top(),
            rect.get_right(), rect.get_bottom(),
            0.0f, 0.0f, 1.0f, 1.0f, request.color, draw_req.alpha);
  draw_vertices(draw_req.blend, false, m_video_system.white_texture(),
                Vector(0.0f, 0.0f), vertices.data(), vertices.size());
}

void
WebGLPainter::draw_inverse_ellipse(const DrawingRequest&)
{
}

void
WebGLPainter::draw_line(const DrawingRequest& draw_req)
{
  const auto& request = std::get<LineRequest>(draw_req.request);
  const float vertices[16] = {
    request.pos.x, request.pos.y, 0.0f, 0.0f,
    request.color.red, request.color.green, request.color.blue,
    request.color.alpha * draw_req.alpha,
    request.dest_pos.x, request.dest_pos.y, 0.0f, 0.0f,
    request.color.red, request.color.green, request.color.blue,
    request.color.alpha * draw_req.alpha,
  };
  draw_vertices(draw_req.blend, true, m_video_system.white_texture(),
                Vector(0.0f, 0.0f), vertices, 16);
}

void
WebGLPainter::draw_triangle(const DrawingRequest& draw_req)
{
  const auto& request = std::get<TriangleRequest>(draw_req.request);
  const float vertices[24] = {
    request.pos1.x, request.pos1.y, 0.0f, 0.0f,
    request.color.red, request.color.green, request.color.blue,
    request.color.alpha * draw_req.alpha,
    request.pos2.x, request.pos2.y, 0.0f, 0.0f,
    request.color.red, request.color.green, request.color.blue,
    request.color.alpha * draw_req.alpha,
    request.pos3.x, request.pos3.y, 0.0f, 0.0f,
    request.color.red, request.color.green, request.color.blue,
    request.color.alpha * draw_req.alpha,
  };
  draw_vertices(draw_req.blend, false, m_video_system.white_texture(),
                Vector(0.0f, 0.0f), vertices, 24);
}

WebGLRenderer::WebGLRenderer(WebGLVideoSystem& video_system, bool is_screen) :
  m_video_system(video_system),
  m_is_screen(is_screen),
  m_painter(new WebGLPainter(video_system, is_screen))
{
}

void
WebGLRenderer::start_draw()
{
  if (m_is_screen)
    m_video_system.begin_draw();
}

void
WebGLRenderer::end_draw()
{
}

Painter&
WebGLRenderer::get_painter()
{
  return *m_painter;
}

Rect
WebGLRenderer::get_rect() const
{
  return m_video_system.get_viewport().get_rect();
}

Size
WebGLRenderer::get_logical_size() const
{
  return m_video_system.get_viewport().get_screen_size();
}

WebGLVideoSystem::WebGLVideoSystem() :
  m_context(nullptr),
  m_program(0),
  m_vao(0),
  m_vbo(0),
  m_target_size_uniform(-1),
  m_viewport_uniform(-1),
  m_logical_size_uniform(-1),
  m_texture_uniform(-1),
  m_animate_uniform(-1),
  m_game_time_uniform(-1),
  m_viewport(Rect(0, 0, 1920, 1080), Vector(1.0f, 1.0f)),
  m_texture_manager(),
  m_renderer(),
  m_lightmap(),
  m_white_texture(),
  m_clear_color(0.1f, 0.2f, 0.4f),
  m_vsync_mode(1)
{
  SDL_GL_SetAttribute(SDL_GL_CONTEXT_PROFILE_MASK, SDL_GL_CONTEXT_PROFILE_ES);
  SDL_GL_SetAttribute(SDL_GL_CONTEXT_MAJOR_VERSION, 3);
  SDL_GL_SetAttribute(SDL_GL_CONTEXT_MINOR_VERSION, 0);
  SDL_GL_SetAttribute(SDL_GL_DOUBLEBUFFER, 1);

  create_sdl_window(SDL_WINDOW_OPENGL);
  m_context = SDL_GL_CreateContext(m_sdl_window.get());
  if (!m_context)
    throw std::runtime_error(std::string("Couldn't create WebGL 2 context: ") + SDL_GetError());
  if (!SDL_GL_MakeCurrent(m_sdl_window.get(), m_context))
    throw std::runtime_error(std::string("Couldn't activate WebGL 2 context: ") + SDL_GetError());

  int pixel_width = 0;
  int pixel_height = 0;
  SDL_GetWindowSizeInPixels(m_sdl_window.get(), &pixel_width, &pixel_height);
  if (m_desktop_size.width <= 0 || m_desktop_size.height <= 0)
    m_desktop_size = Size(pixel_width, pixel_height);

  m_program = create_program();
  glGenVertexArrays(1, &m_vao);
  glBindVertexArray(m_vao);
  glGenBuffers(1, &m_vbo);
  glBindBuffer(GL_ARRAY_BUFFER, m_vbo);
  glEnableVertexAttribArray(0);
  glVertexAttribPointer(0, 2, GL_FLOAT, GL_FALSE, 8 * sizeof(float), nullptr);
  glEnableVertexAttribArray(1);
  glVertexAttribPointer(1, 2, GL_FLOAT, GL_FALSE, 8 * sizeof(float),
                        reinterpret_cast<void*>(2 * sizeof(float)));
  glEnableVertexAttribArray(2);
  glVertexAttribPointer(2, 4, GL_FLOAT, GL_FALSE, 8 * sizeof(float),
                        reinterpret_cast<void*>(4 * sizeof(float)));

  m_target_size_uniform = glGetUniformLocation(m_program, "u_target_size");
  m_viewport_uniform = glGetUniformLocation(m_program, "u_viewport");
  m_logical_size_uniform = glGetUniformLocation(m_program, "u_logical_size");
  m_texture_uniform = glGetUniformLocation(m_program, "u_texture");
  m_animate_uniform = glGetUniformLocation(m_program, "u_animate");
  m_game_time_uniform = glGetUniformLocation(m_program, "u_game_time");

  glDisable(GL_DEPTH_TEST);
  glDisable(GL_CULL_FACE);
  glBlendEquation(GL_FUNC_ADD);
  log_info << "WebGL renderer: "
           << reinterpret_cast<const char*>(glGetString(GL_VERSION))
           << " / " << reinterpret_cast<const char*>(glGetString(GL_RENDERER))
           << std::endl;

  m_texture_manager.reset(new TextureManager);
  m_renderer.reset(new WebGLRenderer(*this, true));
  m_lightmap.reset(new WebGLRenderer(*this, false));

  SDLSurfacePtr white = SDLSurface::create_rgba(1, 1);
  std::memset(white->pixels, 0xFF, 4);
  m_white_texture = TexturePtr(new WebGLTexture(*white, Sampler()));

  apply_config();
}

WebGLVideoSystem::~WebGLVideoSystem()
{
  if (m_context && m_sdl_window)
    SDL_GL_MakeCurrent(m_sdl_window.get(), m_context);

  m_texture_manager.reset();
  m_renderer.reset();
  m_lightmap.reset();
  m_white_texture.reset();

  if (m_vbo)
    glDeleteBuffers(1, &m_vbo);
  if (m_vao)
    glDeleteVertexArrays(1, &m_vao);
  if (m_program)
    glDeleteProgram(m_program);

  if (m_context)
  {
    SDL_GL_DestroyContext(m_context);
    m_context = nullptr;
  }
}

Renderer&
WebGLVideoSystem::get_renderer() const
{
  return *m_renderer;
}

Renderer&
WebGLVideoSystem::get_lightmap() const
{
  return *m_lightmap;
}

TexturePtr
WebGLVideoSystem::new_texture(const SDL_Surface& image, const Sampler& sampler)
{
  return TexturePtr(new WebGLTexture(image, sampler));
}

void
WebGLVideoSystem::apply_config()
{
  apply_video_mode();

#ifndef __ANDROID__
  const Size target_size =
    (g_config->use_fullscreen && g_config->fullscreen_size != Size(0, 0)) ?
      g_config->fullscreen_size : g_config->window_size;
#else
  const Size target_size = m_desktop_size;
#endif
  m_viewport = Viewport::from_size(target_size, m_desktop_size);

  // WebGL 2 targets SDR output; do not leave an unsupported HDR mode enabled.
  g_config->use_hdr = false;
  set_vsync(g_config->vsync);
}

void
WebGLVideoSystem::on_resize(int w, int h)
{
  SDLBaseVideoSystem::on_resize(w, h);
}

void
WebGLVideoSystem::set_vsync(int mode)
{
  m_vsync_mode = mode;
  if (m_context && !SDL_GL_SetSwapInterval(mode == 0 ? 0 : 1))
  {
    log_warning << "SDL_GL_SetSwapInterval failed: " << SDL_GetError() << std::endl;
    SDL_ClearError();
  }
}

void
WebGLVideoSystem::begin_draw()
{
  int width = 0;
  int height = 0;
  SDL_GetWindowSizeInPixels(m_sdl_window.get(), &width, &height);
  glBindFramebuffer(GL_FRAMEBUFFER, 0);
  glViewport(0, 0, width, height);
  glDisable(GL_SCISSOR_TEST);
  glClearColor(m_clear_color.red, m_clear_color.green,
               m_clear_color.blue, m_clear_color.alpha);
  glClear(GL_COLOR_BUFFER_BIT);
}

void
WebGLVideoSystem::draw_vertices(const float* data, size_t float_count,
                                const WebGLTexture& texture, Blend blend,
                                bool lines, const Vector& animate,
                                bool clip_enabled, const SDL_Rect& clip_rect)
{
  if (!data || float_count < 8 || float_count % 8 != 0 ||
      texture.get_handle() == 0)
    return;

  int width = 0;
  int height = 0;
  SDL_GetWindowSizeInPixels(m_sdl_window.get(), &width, &height);
  const Size logical = m_viewport.get_screen_size();
  if (width <= 0 || height <= 0 || logical.width <= 0 || logical.height <= 0)
    return;

  const Rect viewport = m_viewport.get_rect();
  glUseProgram(m_program);
  glUniform2f(m_target_size_uniform, static_cast<float>(width),
              static_cast<float>(height));
  glUniform4f(m_viewport_uniform, static_cast<float>(viewport.left),
              static_cast<float>(viewport.top),
              static_cast<float>(viewport.get_width()),
              static_cast<float>(viewport.get_height()));
  glUniform2f(m_logical_size_uniform, static_cast<float>(logical.width),
              static_cast<float>(logical.height));
  glUniform1i(m_texture_uniform, 0);
  glUniform2f(m_animate_uniform, animate.x, animate.y);
  glUniform1f(m_game_time_uniform, g_game_time);

  glActiveTexture(GL_TEXTURE0);
  glBindTexture(GL_TEXTURE_2D, texture.get_handle());
  glBindVertexArray(m_vao);
  glBindBuffer(GL_ARRAY_BUFFER, m_vbo);
  glBufferData(GL_ARRAY_BUFFER,
               static_cast<GLsizeiptr>(float_count * sizeof(float)),
               data, GL_STREAM_DRAW);

  set_blend_mode(blend);
  if (clip_enabled)
  {
    const int x = viewport.left +
      viewport.get_width() * clip_rect.x / logical.width;
    const int y_top = viewport.top +
      viewport.get_height() * clip_rect.y / logical.height;
    const int clip_width =
      viewport.get_width() * clip_rect.w / logical.width;
    const int clip_height =
      viewport.get_height() * clip_rect.h / logical.height;
    const int left = std::clamp(x, 0, width);
    const int top = std::clamp(y_top, 0, height);
    const int right = std::clamp(x + clip_width, 0, width);
    const int bottom = std::clamp(y_top + clip_height, 0, height);
    glEnable(GL_SCISSOR_TEST);
    glScissor(left, height - bottom, std::max(0, right - left),
              std::max(0, bottom - top));
  }
  else
  {
    glDisable(GL_SCISSOR_TEST);
  }

  const GLsizei vertex_count = static_cast<GLsizei>(float_count / 8);
  glDrawArrays(lines ? GL_LINE_STRIP : GL_TRIANGLES, 0, vertex_count);
  glDisable(GL_SCISSOR_TEST);
}

void
WebGLVideoSystem::flip()
{
  glFlush();
  SDL_GL_SwapWindow(m_sdl_window.get());
}

const WebGLTexture*
WebGLVideoSystem::white_texture() const
{
  return static_cast<const WebGLTexture*>(m_white_texture.get());
}

SDLSurfacePtr
WebGLVideoSystem::make_screenshot()
{
  int width = 0;
  int height = 0;
  SDL_GetWindowSizeInPixels(m_sdl_window.get(), &width, &height);
  if (width <= 0 || height <= 0)
    return {};

  std::vector<Uint8> pixels(static_cast<size_t>(width) *
                            static_cast<size_t>(height) * 4);
  glPixelStorei(GL_PACK_ALIGNMENT, 1);
  glReadPixels(0, 0, width, height, GL_RGBA, GL_UNSIGNED_BYTE, pixels.data());

  SDLSurfacePtr surface = SDLSurface::create_rgba(width, height);
  Uint8* dst = static_cast<Uint8*>(surface->pixels);
  const size_t row_bytes = static_cast<size_t>(width) * 4;
  for (int y = 0; y < height; ++y)
  {
    const Uint8* src = pixels.data() +
      static_cast<size_t>(height - 1 - y) * row_bytes;
    std::memcpy(dst + static_cast<size_t>(y) * surface->pitch,
                src, row_bytes);
  }
  return surface;
}
