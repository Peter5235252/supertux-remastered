//  SuperTux
//  Copyright (C) 2026 SuperTux-HD contributors
//
//  This program is free software: you can redistribute it and/or modify
//  it under the terms of the GNU General Public License as published by
//  the Free Software Foundation, either version 3 of the License, or
//  (at your option) any later version.

#pragma once

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#endif

inline void
supertux_wasm_phase(const char* phase)
{
#ifdef __EMSCRIPTEN__
  EM_ASM({
    const phase = UTF8ToString($0);
    window.__SUPERTUX_LAST_STARTUP_PHASE = phase;
    console.info("[superTux][phase] " + phase);
  }, phase);
#else
  (void)phase;
#endif
}
