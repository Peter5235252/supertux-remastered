//  SuperTux
//  Copyright (C) 2018 Ingo Ruhnke <grumbel@gmail.com>
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program.  If not, see <http://www.gnu.org/licenses/>.

#pragma once

#define GLint int

enum GLenum {
  GL_SRC_ALPHA,
  GL_ONE_MINUS_SRC_ALPHA,
  GL_RGBA,
  GL_ONE,
  GL_ZERO,
  GL_DST_COLOR,
  GL_LINEAR,
  GL_NEAREST,
  GL_CLAMP_TO_EDGE,
  GL_MIRRORED_REPEAT,
  GL_REPEAT
};
