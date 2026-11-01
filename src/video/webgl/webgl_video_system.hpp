//  SuperTux
//  Copyright (C) 2026 SuperTux-HD contributors
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.

#pragma once

#include <SDL3/SDL.h>

#include <memory>
#include <vector>

#include "video/blend.hpp"

#include "video/gl.hpp"
#include "video/painter.hpp"
#include "video/renderer.hpp"
#include "video/sdlbase_video_system.hpp"
#include "video/texture.hpp"
#include "video/viewport.hpp"

class TextureManager;

class WebGLTexture final : public Texture
{
public:
  WebGLTexture(const SDL_Surface& image, const Sampler& sampler);
  ~WebGLTexture() override;

  void reload(const SDL_Surface& image) override;

  int get_texture_width() const override { return m_width; }
  int get_texture_height() const override { return m_height; }
  int get_image_width() const override { return m_width; }
  int get_image_height() const override { return m_height; }

  GLuint get_handle() const { return m_handle; }

private:
  void upload(const SDL_Surface& image);

  GLuint m_handle;
  int m_width;
  int m_height;
};

class WebGLVideoSystem;

class WebGLPainter final : public Painter
{
public:
  WebGLPainter(WebGLVideoSystem& video_system, bool is_screen);

  void draw_texture(const DrawingRequest& request) override;
  void draw_gradient(const DrawingRequest& request) override;
  void draw_filled_rect(const DrawingRequest& request) override;
  void draw_inverse_ellipse(const DrawingRequest& request) override;
  void draw_line(const DrawingRequest& request) override;
  void draw_triangle(const DrawingRequest& request) override;

  void clear(const Color& color) override;
  void get_pixel(const DrawingRequest& request) const override;
  void set_clip_rect(const Rect& rect) override;
  void clear_clip_rect() override;

private:
  void push_quad(std::vector<float>& out,
                 float left, float top, float right, float bottom,
                 float uv_left, float uv_top, float uv_right, float uv_bottom,
                 const Color& color, float alpha);
  void draw_vertices(Blend blend, bool lines, const WebGLTexture* texture,
                     const Vector& animate, const float* data, size_t float_count);

  WebGLVideoSystem& m_video_system;
  bool m_is_screen;
  SDL_Rect m_clip_rect;
  bool m_clip_enabled;
};

class WebGLRenderer final : public Renderer
{
public:
  WebGLRenderer(WebGLVideoSystem& video_system, bool is_screen);

  void start_draw() override;
  void end_draw() override;
  Painter& get_painter() override;
  Rect get_rect() const override;
  Size get_logical_size() const override;
  TexturePtr get_texture() const override { return {}; }

private:
  WebGLVideoSystem& m_video_system;
  bool m_is_screen;
  std::unique_ptr<WebGLPainter> m_painter;
};

/** WebAssembly-only GLES 3.0 renderer, presented through browser WebGL 2. */
class WebGLVideoSystem final : public SDLBaseVideoSystem
{
public:
  WebGLVideoSystem();
  ~WebGLVideoSystem() override;

  std::string get_name() const override { return "WebGL 2 (OpenGL ES 3.0)"; }

  Renderer* get_back_renderer() const override { return nullptr; }
  Renderer& get_renderer() const override;
  Renderer& get_lightmap() const override;

  TexturePtr new_texture(const SDL_Surface& image,
                         const Sampler& sampler = Sampler()) override;

  const Viewport& get_viewport() const override { return m_viewport; }
  void apply_config() override;
  void flip() override;
  void on_resize(int w, int h) override;

  void set_vsync(int mode) override;
  int get_vsync() const override { return m_vsync_mode; }
  SDLSurfacePtr make_screenshot() override;

  Color& clear_color() { return m_clear_color; }
  const WebGLTexture* white_texture() const;

  void begin_draw();
  void draw_vertices(const float* data, size_t float_count,
                     const WebGLTexture& texture, Blend blend, bool lines,
                     const Vector& animate, bool clip_enabled,
                     const SDL_Rect& clip_rect);

private:
  SDL_GLContext m_context;
  GLuint m_program;
  GLuint m_vao;
  GLuint m_vbo;
  GLint m_target_size_uniform;
  GLint m_viewport_uniform;
  GLint m_logical_size_uniform;
  GLint m_texture_uniform;
  GLint m_animate_uniform;
  GLint m_game_time_uniform;

  Viewport m_viewport;
  std::unique_ptr<TextureManager> m_texture_manager;
  std::unique_ptr<WebGLRenderer> m_renderer;
  std::unique_ptr<WebGLRenderer> m_lightmap;
  TexturePtr m_white_texture;
  Color m_clear_color;
  int m_vsync_mode;
};
