use fs2::available_space;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{BufReader, Read, Write};
use std::os::unix::fs::{symlink, PermissionsExt};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::sync::mpsc::Sender;
use std::time::{Duration, Instant};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");
pub const RELEASE_TAG: &str = "test-build";
pub const API_URL: &str =
    "https://api.github.com/repos/Peter5235252/supertux-remastered/releases/tags/test-build";
pub const ASSET_NAME: &str = "supertux-remastered-linux-portable.tar.gz";
pub const FALLBACK_URL: &str = "https://github.com/Peter5235252/supertux-remastered/releases/download/test-build/supertux-remastered-linux-portable.tar.gz";

const SDL3_IMAGE: &[u8] = include_bytes!("../assets/SDL3_image.so");
const SDL3_TTF: &[u8] = include_bytes!("../assets/SDL3_ttf.so");

#[derive(Clone)]
pub struct InstallOptions {
    pub prefix: PathBuf,
    pub create_shortcut: bool,
}

impl Default for InstallOptions {
    fn default() -> Self {
        Self {
            prefix: default_prefix(),
            create_shortcut: true,
        }
    }
}

#[derive(Debug)]
pub enum Event {
    Stage(String),
    Progress(f32),
    Log(String),
    Done(PathBuf),
    Failed(String),
    Cancelled,
}

pub fn default_prefix() -> PathBuf {
    dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| ".".into())))
        .join("SuperTux Remastered")
}

pub fn expand_path(input: &str) -> PathBuf {
    let trimmed = input.trim();
    if trimmed == "~" {
        return dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"));
    }
    if let Some(rest) = trimmed.strip_prefix("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(rest);
        }
    }
    PathBuf::from(trimmed)
}

pub fn default_bin_dir() -> PathBuf {
    std::env::var_os("XDG_BIN_HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            std::env::var_os("HOME")
                .map(|home| PathBuf::from(home).join(".local/bin"))
                .unwrap_or_else(|| PathBuf::from("~/.local/bin"))
        })
}

fn send(tx: &Sender<Event>, event: Event) {
    let _ = tx.send(event);
}

fn stage(tx: &Sender<Event>, text: impl Into<String>) {
    send(tx, Event::Stage(text.into()));
}

fn log(tx: &Sender<Event>, text: impl Into<String>) {
    send(tx, Event::Log(text.into()));
}

fn progress(tx: &Sender<Event>, value: f32) {
    send(tx, Event::Progress(value.clamp(0.0, 100.0)));
}

fn cancelled(cancel: &AtomicBool) -> bool {
    cancel.load(Ordering::Relaxed)
}

fn cleanup(path: &Path) {
    if path.exists() {
        let _ = fs::remove_dir_all(path);
    }
}

struct StagingGuard(PathBuf);

impl Drop for StagingGuard {
    fn drop(&mut self) {
        cleanup(&self.0);
    }
}

fn human_bytes(bytes: u64) -> String {
    if bytes >= 1024 * 1024 * 1024 {
        format!("{:.1} GB", bytes as f64 / 1024.0 / 1024.0 / 1024.0)
    } else if bytes >= 1024 * 1024 {
        format!("{:.0} MB", bytes as f64 / 1024.0 / 1024.0)
    } else {
        format!("{:.0} KB", bytes as f64 / 1024.0)
    }
}

pub fn missing_runtime_libs() -> Vec<String> {
    let output = Command::new("ldconfig").arg("-p").output();
    let listing = match output {
        Ok(output) => String::from_utf8_lossy(&output.stdout).to_string(),
        Err(_) => String::new(),
    };
    let required = [
        ("libSDL3.so.0", "SDL3"),
        ("libopenal.so.1", "OpenAL"),
        ("libvulkan.so.1", "the Vulkan loader"),
    ];
    required
        .iter()
        .filter(|(lib, _)| !listing.contains(lib))
        .map(|(_, name)| (*name).to_string())
        .collect()
}


pub fn install(options: &InstallOptions, tx: Sender<Event>, cancel: Arc<AtomicBool>, ctx: Option<egui::Context>) {
    let repaint = |ctx: &Option<egui::Context>| {
        if let Some(ctx) = ctx {
            ctx.request_repaint();
        }
    };

    let result = (|| -> Result<PathBuf, String> {
        let prefix = &options.prefix;
        if !prefix.is_absolute() {
            return Err("The install location must be an absolute path.".into());
        }
        if prefix.components().count() < 2 || prefix == Path::new("/") {
            return Err("That install location is too broad. Pick a folder, not the filesystem root.".into());
        }
        if *prefix == dirs::home_dir().unwrap_or_default() {
            return Err("Please pick a folder inside your home directory, not your home directory itself.".into());
        }

        let parent = prefix
            .parent()
            .ok_or_else(|| "The install location needs a parent folder.".to_string())?;
        fs::create_dir_all(parent).map_err(|e| format!("Could not create {}: {e}", parent.display()))?;

        let free = available_space(parent).unwrap_or(u64::MAX);
        if free < 1_200_000_000 {
            return Err(format!(
                "Not enough free space in {}. About 1.2 GB is needed; only {} is available.",
                parent.display(),
                human_bytes(free)
            ));
        }

        let staging = parent.join(format!(".supertux-remastered-setup-{}", std::process::id()));
        cleanup(&staging);
        fs::create_dir_all(&staging).map_err(|e| format!("Could not create a temporary folder: {e}"))?;
        let _staging_guard = StagingGuard(staging.clone());

        let client = reqwest::blocking::Client::builder()
            .user_agent(format!("SuperTux-Remastered-Setup/{VERSION}"))
            .connect_timeout(Duration::from_secs(30))
            .timeout(Duration::from_secs(1800))
            .build()
            .map_err(|e| format!("Could not start the network client: {e}"))?;

        stage(&tx, "Contacting GitHub…");
        progress(&tx, 2.0);
        repaint(&ctx);

        let mut download_url = FALLBACK_URL.to_string();
        let mut expected_digest: Option<String> = None;
        let mut expected_size: u64 = 0;

        match client
            .get(API_URL)
            .header("Accept", "application/vnd.github+json")
            .send()
            .and_then(|r| r.error_for_status())
        {
            Ok(response) => match response.json::<serde_json::Value>() {
                Ok(release) => {
                    if let Some(assets) = release.get("assets").and_then(|a| a.as_array()) {
                        if let Some(asset) = assets
                            .iter()
                            .find(|asset| asset.get("name").and_then(|n| n.as_str()) == Some(ASSET_NAME))
                        {
                            if let Some(url) = asset.get("browser_download_url").and_then(|u| u.as_str()) {
                                download_url = url.to_string();
                            }
                            if let Some(size) = asset.get("size").and_then(|s| s.as_u64()) {
                                expected_size = size;
                            }
                            if let Some(digest) = asset.get("digest").and_then(|d| d.as_str()) {
                                expected_digest = digest.strip_prefix("sha256:").map(str::to_string);
                            }
                            log(&tx, "Resolved the rolling test-build release.");
                        } else {
                            log(&tx, "Release asset not found in the API response; using the direct URL.");
                        }
                    }
                }
                Err(error) => log(&tx, format!("Could not parse the release metadata ({error}); using the direct URL.")),
            },
            Err(error) => log(
                &tx,
                format!("GitHub metadata request failed ({error}); using the direct URL without a published digest."),
            ),
        }

        if cancelled(&cancel) {
            cleanup(&staging);
            send(&tx, Event::Cancelled);
            return Ok(PathBuf::new());
        }

        stage(&tx, "Downloading SuperTux Remastered…");
        progress(&tx, 5.0);
        repaint(&ctx);

        let archive_path = staging.join("supertux-remastered-linux-portable.tar.gz");
        let mut response = client
            .get(&download_url)
            .send()
            .and_then(|r| r.error_for_status())
            .map_err(|e| format!("Download failed: {e}"))?;

        let total = response.content_length().filter(|value| *value > 0).or(if expected_size > 0 {
            Some(expected_size)
        } else {
            None
        });
        if let Some(total) = total {
            log(&tx, format!("Download size: {}", human_bytes(total)));
        }

        let mut file = fs::File::create(&archive_path)
            .map_err(|e| format!("Could not create the download file: {e}"))?;
        let mut hasher = Sha256::new();
        let mut buffer = vec![0u8; 128 * 1024];
        let mut downloaded: u64 = 0;
        let mut last_update = Instant::now();

        loop {
            if cancelled(&cancel) {
                drop(file);
                cleanup(&staging);
                send(&tx, Event::Cancelled);
                return Ok(PathBuf::new());
            }
            let read = response
                .read(&mut buffer)
                .map_err(|e| format!("The download was interrupted: {e}"))?;
            if read == 0 {
                break;
            }
            file.write_all(&buffer[..read])
                .map_err(|e| format!("Could not write the download: {e}"))?;
            hasher.update(&buffer[..read]);
            downloaded += read as u64;
            if last_update.elapsed() > Duration::from_millis(80) {
                last_update = Instant::now();
                if let Some(total) = total {
                    let fraction = (downloaded as f64 / total as f64).clamp(0.0, 1.0);
                    progress(&tx, 5.0 + fraction as f32 * 58.0);
                    stage(
                        &tx,
                        format!(
                            "Downloading SuperTux Remastered… {} / {}",
                            human_bytes(downloaded),
                            human_bytes(total)
                        ),
                    );
                } else {
                    stage(
                        &tx,
                        format!("Downloading SuperTux Remastered… {}", human_bytes(downloaded)),
                    );
                }
                repaint(&ctx);
            }
        }
        file.flush().map_err(|e| format!("Could not finish writing the download: {e}"))?;
        drop(file);
        progress(&tx, 64.0);

        stage(&tx, "Checking the download…");
        repaint(&ctx);
        let digest = hex::encode(hasher.finalize());
        if let Some(expected) = &expected_digest {
            if !digest.eq_ignore_ascii_case(expected) {
                cleanup(&staging);
                return Err(format!(
                    "The download failed its SHA-256 check.\nExpected {expected}\nGot {digest}\n\nThe release may have been updated. Try again in a moment."
                ));
            }
            log(&tx, "SHA-256 digest verified against the GitHub release.");
        } else {
            log(&tx, format!("No published digest available; computed SHA-256 {digest}."));
        }
        progress(&tx, 68.0);

        if cancelled(&cancel) {
            cleanup(&staging);
            send(&tx, Event::Cancelled);
            return Ok(PathBuf::new());
        }

        stage(&tx, "Unpacking the game…");
        repaint(&ctx);
        let archive = fs::File::open(&archive_path).map_err(|e| format!("Could not open the download: {e}"))?;
        let decoder = flate2::read::GzDecoder::new(BufReader::new(archive));
        let mut tar = tar::Archive::new(decoder);
        tar.unpack(&staging)
            .map_err(|e| format!("Could not unpack the game archive: {e}"))?;
        progress(&tx, 87.0);

        stage(&tx, "Installing game files…");
        repaint(&ctx);
        let extracted = find_extracted_root(&staging)
            .ok_or_else(|| "The archive did not contain a SuperTux portable folder.".to_string())?;

        if prefix.exists() {
            log(&tx, format!("Replacing the existing installation at {}.", prefix.display()));
            fs::remove_dir_all(prefix).map_err(|e| format!("Could not replace {}: {e}", prefix.display()))?;
        }
        fs::create_dir_all(prefix).map_err(|e| format!("Could not create {}: {e}", prefix.display()))?;

        match fs::rename(&extracted, prefix) {
            Ok(()) => {}
            Err(_) => copy_dir(&extracted, prefix)
                .map_err(|e| format!("Could not copy the game files: {e}"))?,
        }

        let binary = prefix.join("games/supertux2");
        if !binary.is_file() {
            return Err("The installed folder is missing games/supertux2.".into());
        }
        let _ = fs::set_permissions(&binary, fs::Permissions::from_mode(0o755));

        stage(&tx, "Bundling the runtime pieces…");
        repaint(&ctx);
        install_runtime_libs(prefix)?;
        write_launchers(prefix, options.create_shortcut)?;
        progress(&tx, 97.0);

        stage(&tx, "Finishing up…");
        repaint(&ctx);
        let metadata = serde_json::json!({
            "name": "SuperTux Remastered",
            "version": VERSION,
            "release": RELEASE_TAG,
            "installed_from": download_url,
            "sha256": digest,
            "installed_at": now_iso8601(),
        });
        let _ = fs::write(
            prefix.join("install.json"),
            serde_json::to_vec_pretty(&metadata).unwrap_or_default(),
        );

        cleanup(&staging);
        progress(&tx, 100.0);
        send(&tx, Event::Done(prefix.clone()));
        Ok(prefix.clone())
    })();

    if let Err(error) = result {
        send(&tx, Event::Failed(error));
    }
    repaint(&ctx);
}

fn find_extracted_root(staging: &Path) -> Option<PathBuf> {
    let direct = staging.join("SuperTux-portable");
    if direct.join("games/supertux2").is_file() {
        return Some(direct);
    }
    let entries = fs::read_dir(staging).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() && path.join("games/supertux2").is_file() {
            return Some(path);
        }
    }
    None
}

fn copy_dir(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let target = to.join(entry.file_name());
        let metadata = entry.metadata()?;
        if metadata.is_dir() {
            copy_dir(&entry.path(), &target)?;
        } else if metadata.is_file() {
            fs::copy(entry.path(), &target)?;
            let _ = fs::set_permissions(&target, metadata.permissions());
        } else if metadata.file_type().is_symlink() {
            let link = fs::read_link(entry.path())?;
            let _ = symlink(link, &target);
        }
    }
    Ok(())
}

fn install_runtime_libs(prefix: &Path) -> Result<(), String> {
    let libdir = prefix.join("lib");
    fs::create_dir_all(&libdir).map_err(|e| format!("Could not create the library folder: {e}"))?;
    let image = libdir.join("libSDL3_image.so.0.4.8");
    let ttf = libdir.join("libSDL3_ttf.so.0.2.2");
    fs::write(&image, SDL3_IMAGE).map_err(|e| format!("Could not write SDL3_image: {e}"))?;
    fs::write(&ttf, SDL3_TTF).map_err(|e| format!("Could not write SDL3_ttf: {e}"))?;
    let _ = symlink("libSDL3_image.so.0.4.8", libdir.join("libSDL3_image.so.0"));
    let _ = symlink("libSDL3_ttf.so.0.2.2", libdir.join("libSDL3_ttf.so.0"));
    Ok(())
}

fn write_launchers(prefix: &Path, create_shortcut: bool) -> Result<(), String> {
    let bin_dir = default_bin_dir();
    let _ = fs::create_dir_all(&bin_dir);
    let wrapper = bin_dir.join("supertux-remastered");
    let wrapper_body = format!(
        "#!/bin/sh\nexec \"{}\" \"$@\"\n",
        prefix.join("games/supertux2").display()
    );
    fs::write(&wrapper, wrapper_body).map_err(|e| format!("Could not write the launcher: {e}"))?;
    let _ = fs::set_permissions(&wrapper, fs::Permissions::from_mode(0o755));

    let uninstaller = prefix.join("uninstall.sh");
    let desktop_file = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("~/.local/share"))
        .join("applications/supertux-remastered.desktop");
    let uninstall_body = format!(
        "#!/bin/sh\nset -eu\nrm -f \"{}\"\nrm -f \"{}\"\nrm -rf \"{}\"\necho \"SuperTux Remastered has been removed. Save files in ~/.local/share/supertux2 were kept.\"\n",
        desktop_file.display(),
        wrapper.display(),
        prefix.display()
    );
    fs::write(&uninstaller, uninstall_body).map_err(|e| format!("Could not write the uninstaller: {e}"))?;
    let _ = fs::set_permissions(&uninstaller, fs::Permissions::from_mode(0o755));

    if create_shortcut {
        let applications = dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("~/.local/share"))
            .join("applications");
        let _ = fs::create_dir_all(&applications);
        let icon = prefix.join("share/icons/hicolor/128x128/apps/supertux.png");
        let entry = format!(
            "[Desktop Entry]\nType=Application\nVersion=1.5\nName=SuperTux Remastered\nComment=Independent hobbyist remaster of SuperTux 2\nExec=\"{}\"\nIcon={}\nTerminal=false\nStartupNotify=true\nStartupWMClass=supertux2\nCategories=Game;ArcadeGame;\nKeywords=game;platform;penguin;tux;\n",
            prefix.join("games/supertux2").display(),
            if icon.exists() {
                icon.display().to_string()
            } else {
                "supertux2".to_string()
            }
        );
        fs::write(applications.join("supertux-remastered.desktop"), entry)
            .map_err(|e| format!("Could not add the desktop shortcut: {e}"))?;
        let _ = Command::new("update-desktop-database").arg(&applications).status();
    }
    Ok(())
}

pub fn find_game_binary(prefix: &Path) -> Option<PathBuf> {
    let binary = prefix.join("games/supertux2");
    binary.is_file().then_some(binary)
}

pub fn uninstall(prefix: &Path) -> Result<(), String> {
    let desktop = dirs::data_dir()
        .unwrap_or_else(|| PathBuf::from("~/.local/share"))
        .join("applications/supertux-remastered.desktop");
    let wrapper = default_bin_dir().join("supertux-remastered");
    let _ = fs::remove_file(&desktop);
    let _ = fs::remove_file(&wrapper);
    if prefix.exists() {
        fs::remove_dir_all(prefix).map_err(|e| format!("Could not remove {}: {e}", prefix.display()))?;
    }
    Ok(())
}

fn now_iso8601() -> String {
    let output = Command::new("date")
        .args(["-u", "+%Y-%m-%dT%H:%M:%SZ"])
        .output();
    match output {
        Ok(output) => String::from_utf8_lossy(&output.stdout).trim().to_string(),
        Err(_) => String::new(),
    }
}
