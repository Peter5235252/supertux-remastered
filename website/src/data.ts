export const REPO_URL = 'https://github.com/Peter5235252/supertux-remastered'
export const RELEASES_URL = `${REPO_URL}/releases/tag/test-build`
export const UPSTREAM_URL = 'https://github.com/SuperTux/supertux'
export const ORIGINAL_SITE = 'https://www.supertux.org'

const ANDROID_APK_BASE = 'https://github.com/Peter5235252/supertux-remastered/releases/download/test-build/'

export const RELEASE = {
  tag: 'test-build',
  label: 'Rolling test build',
  date: 'October 2026',
  linuxPortable:
    'https://github.com/Peter5235252/supertux-remastered/releases/download/test-build/supertux-remastered-linux-portable.tar.gz',
  windowsPortable:
    'https://github.com/Peter5235252/supertux-remastered/releases/download/test-build/supertux-remastered-windows-portable.zip',
  macosUniversal:
    'https://github.com/Peter5235252/supertux-remastered/releases/download/test-build/supertux-remastered-macos-universal.tar.gz',
  androidArm64:
    `${ANDROID_APK_BASE}SuperTux-Android-arm64-v8a.apk`,
  androidArmv7:
    `${ANDROID_APK_BASE}SuperTux-Android-armeabi-v7a.apk`,
  androidX64:
    `${ANDROID_APK_BASE}SuperTux-Android-x86_64.apk`,
  androidX86:
    `${ANDROID_APK_BASE}SuperTux-Android-x86.apk`,
}

export type Platform = 'linux' | 'windows' | 'macos'

export const PLATFORM_META: Record<
  Platform,
  { name: string; short: string; backend: string; icon: string }
> = {
  linux: { name: 'Linux', short: 'Linux', backend: 'Vulkan', icon: 'linux' },
  windows: { name: 'Windows', short: 'Windows', backend: 'Direct3D 12', icon: 'windows' },
  macos: { name: 'macOS', short: 'macOS', backend: 'Metal', icon: 'apple' },
}

export const DOWNLOADS = {
  linuxInstaller: '/downloads/supertux-remastered-setup-linux-x86_64',
  linuxInstallerName: 'supertux-remastered-setup-linux-x86_64',
  linuxInstallerSize: '9 MB',
  linuxPortableSize: '275 MB',
  windowsPortableSize: '282 MB',
  macosPortableSize: '288 MB',
}

export const CLI = {
  linux: `mkdir -p ~/SuperTux2 && cd ~/SuperTux2 \\
  && curl -fL --retry 3 -O "${RELEASE.linuxPortable}" \\
  && tar -xzf supertux-remastered-linux-portable.tar.gz \\
  && ./SuperTux-portable/games/supertux2`,
  windows: `$dir = "$env:USERPROFILE\\SuperTux2"
New-Item -ItemType Directory -Force "$dir" | Out-Null
Set-Location "$dir"
Invoke-WebRequest "${RELEASE.windowsPortable}" -OutFile "supertux.zip"
Expand-Archive "supertux.zip" -DestinationPath "." -Force
& (Get-ChildItem -Recurse -Filter supertux2.exe | Select-Object -First 1).FullName`,
  macos: `mkdir -p ~/SuperTux2 && cd ~/SuperTux2 \\
  && curl -fL --retry 3 -O "${RELEASE.macosUniversal}" \\
  && tar -xzf supertux-remastered-macos-universal.tar.gz \\
  && xattr -dr com.apple.quarantine SuperTux.app \\
  && open SuperTux.app`,
}

export const WORLDS = [
  {
    id: 'icy-island',
    index: '01',
    name: 'Icy Island',
    kicker: 'Where the story begins',
    description:
      'Snowdrifts, crumbling bridges and a kidnapped Penny. Thirty-one levels of the original Antarctic adventure, rendered natively at your display’s refresh rate.',
    image: '/shots/antarctic-outpost.webp',
    art: '/brand/world-icyisland.webp',
    levels: '31 levels',
    tone: 'ice',
  },
  {
    id: 'rooted-forest',
    index: '02',
    name: 'Rooted Forest',
    kicker: 'Deeper into the woods',
    description:
      'The second story world turns up the heat. Thirty-eight levels of tangled roots, ancient ruins and things that would very much like to bite Tux.',
    image: '/shots/granito-village.webp',
    art: '/brand/world-rootedforest.webp',
    levels: '38 levels',
    tone: 'forest',
  },
  {
    id: 'bonus-arcade',
    index: '03',
    name: 'Bonus Arcade',
    kicker: 'No story. No mercy.',
    description:
      'A whole second campaign of side levels, secret challenges and physics experiments. Thirty levels that assume you already know what you’re doing.',
    image: '/shots/bonus-arcade.webp',
    art: '/shots/bonus-arcade.webp',
    levels: '30 levels',
    tone: 'gold',
  },
  {
    id: 'revenge-in-redmond',
    index: '04',
    name: 'Revenge in Redmond',
    kicker: 'The post-credits problem',
    description:
      'Eight extra levels for players who finished the story and decided that was not nearly enough. A community classic, still shipping with the game.',
    image: '/shots/ancient-ruin.webp',
    art: '/shots/ancient-ruin.webp',
    levels: '8 levels',
    tone: 'dusk',
  },
] as const

export const TIMELINE = [
  {
    date: 'Oct 31, 2026',
    title: 'A real installer, not a curl poem',
    body: 'The project gets a native Linux setup app and this website. The installer fetches the rolling build, checks the published SHA-256, bundles the two SDL3 add-on libraries and leaves a desktop shortcut behind. The terminal fallback stays for the people who want it.',
    tag: 'Install',
  },
  {
    date: 'Oct 23, 2026',
    title: 'Graphics smoke test in CI',
    body: 'Linux CI now launches a real level under Xvfb with Mesa lavapipe, renders through SDL_GPU/Vulkan and verifies the saved screenshot. The stale OpenGL options are gone.',
    tag: 'CI',
  },
  {
    date: 'Oct 16, 2026',
    title: 'SuperTux HD becomes SuperTux Remastered',
    body: 'The project gets its proper name, a rolling test-build release and a clear identity: an independent hobbyist remaster of the SuperTux 2 / Milestone 2 generation. Not a sequel, not an official release.',
    tag: 'Project',
  },
  {
    date: 'Oct 16, 2026',
    title: 'The AI-upscaled textures are removed',
    body: 'The 4K texture set and its whole pipeline are deleted. It caused opaque rectangles over transparency and mis-scaled sprites. Current builds ship the original SuperTux artwork, unmodified.',
    tag: 'Assets',
  },
  {
    date: 'Oct 14, 2026',
    title: 'Native renderers on every OS',
    body: 'SDL_GPU takes over: Vulkan on Linux, Direct3D 12 on Windows with a Vulkan fallback, Metal on macOS. MoltenVK, KosmicKrisp and the OpenGL backend are deleted. No translation layers.',
    tag: 'Renderer',
  },
  {
    date: 'Oct 11, 2026',
    title: 'The remaster begins',
    body: 'An upstream 0.7.0-era tree, a CachyOS desktop with an i5-8500 and GTX 1660 SUPER, and a plan to rebuild the renderer around SDL_GPU. The first playable baseline boots the same day.',
    tag: 'Origin',
  },
]

export const FAQS = [
  {
    q: 'Is this an official SuperTux game?',
    a: 'No. SuperTux Remastered is an independent, hobbyist remaster of SuperTux 2 (the Milestone 2 / supertux2 engine generation). It is not a sequel and not an official SuperTux Team release. The original game, art, music and levels are © 2003–2026 The SuperTux Team; see the attribution in the footer.',
  },
  {
    q: 'Does it really need no OpenGL or translation layers?',
    a: 'Correct. The old SDL and OpenGL backends were deleted. Rendering goes through SDL_GPU directly to Vulkan on Linux, Direct3D 12 on Windows (with Vulkan as a fallback) and Metal on macOS. Shaders ship as SPIR-V, DXIL and MSL, built from the same source.',
  },
  {
    q: 'Why is the build unsigned, and why does Windows warn me?',
    a: 'These are rolling, unsigned test builds made by a single hobbyist. Windows SmartScreen may show a warning — choose “More info” then “Run anyway” only if you trust the source. The macOS build may need a right-click → Open the first time. Every asset is downloadable from the GitHub release, so you can inspect it before running.',
  },
  {
    q: 'What are the Linux requirements?',
    a: 'A 64-bit x86_64 Linux desktop with a Vulkan-capable GPU and driver, plus SDL3, SDL3_image, SDL3_ttf and OpenAL system libraries. On Arch and CachyOS those are sdl3, sdl3_image, sdl3_ttf and openal. The installer checks for the common pieces and tells you what is missing before it starts.',
  },
  {
    q: 'Where does the installer put my files?',
    a: 'By default, everything goes into ~/.local/share/SuperTux Remastered. The game reads and writes saves under ~/.local/share/supertux2, so your progress survives updates. The installer adds a desktop entry and a small uninstaller; it never touches system directories unless you explicitly choose a system-wide prefix.',
  },
  {
    q: 'Are the HD textures still included?',
    a: 'No. The AI-upscaled 4K set was removed because it produced visual glitches that could not be reliably fixed. Current builds ship the original SuperTux artwork only. The renderer itself is still native, with FSR 1.0 upscaling and HDR groundwork available in the engine.',
  },
  {
    q: 'Can I use a controller?',
    a: 'Yes. Keyboard, gamepad and joystick input are supported, and every control can be rebound under Options → Controls. The game also has a built-in level editor, add-on support, and the original community level packs.',
  },
  {
    q: 'How do I report a bug?',
    a: 'Open an issue on GitHub with a screenshot, the level name and the commit hash shown in the window title. The renderer is fresh, so graphical glitches and platform-specific reports are especially useful.',
  },
]
