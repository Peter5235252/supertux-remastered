mod installer;
mod ui;

use std::io::{self, Write};
use std::path::PathBuf;
use std::process::ExitCode;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use std::sync::mpsc::channel;
use eframe::egui;

use installer::{Event, InstallOptions, VERSION};

fn usage() {
    println!(
        "SuperTux Remastered Setup {VERSION}

Usage:
  supertux-remastered-setup [options]

Graphical installer (default):
  --prefix <PATH>     Install into PATH instead of ~/.local/share/SuperTux Remastered
  --no-shortcut       Do not add an application-menu shortcut

Advanced / terminal:
  --cli               Run the installer without a GUI
  --prefix <PATH>     Install location
  --no-shortcut       Skip the application-menu shortcut
  --uninstall         Remove a previous installation
  --yes               Do not ask for confirmation when uninstalling
  --help              Show this help
  --version           Print the installer version

The CLI downloads the same rolling test build, verifies its SHA-256 digest and
installs it in one pass. Save files in ~/.local/share/supertux2 are preserved.
"
    );
}

fn main() -> ExitCode {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut cli = false;
    let mut uninstall = false;
    let mut yes = false;
    let mut create_shortcut = true;
    let mut prefix: Option<String> = None;
    let mut index = 0;

    while index < args.len() {
        match args[index].as_str() {
            "--help" | "-h" => {
                usage();
                return ExitCode::SUCCESS;
            }
            "--version" | "-v" => {
                println!("SuperTux Remastered Setup {VERSION}");
                return ExitCode::SUCCESS;
            }
            "--cli" => cli = true,
            "--uninstall" => uninstall = true,
            "--yes" | "-y" => yes = true,
            "--no-shortcut" => create_shortcut = false,
            "--prefix" => {
                index += 1;
                if index >= args.len() {
                    eprintln!("error: --prefix needs a path");
                    return ExitCode::FAILURE;
                }
                prefix = Some(args[index].clone());
            }
            other if other.starts_with("--prefix=") => {
                prefix = Some(other.trim_start_matches("--prefix=").to_string());
            }
            other => {
                eprintln!("error: unknown option {other}");
                usage();
                return ExitCode::FAILURE;
            }
        }
        index += 1;
    }

    let prefix = prefix
        .map(|value| installer::expand_path(&value))
        .unwrap_or_else(installer::default_prefix);

    if uninstall {
        return run_uninstall(prefix, yes);
    }

    let options = InstallOptions {
        prefix,
        create_shortcut,
    };

    if cli {
        return run_cli(options);
    }

    if let Err(error) = run_gui(options) {
        eprintln!("Could not open the graphical installer: {error}");
        eprintln!("Run with --cli for the terminal installer.");
        return ExitCode::FAILURE;
    }
    ExitCode::SUCCESS
}

fn run_gui(options: InstallOptions) -> Result<(), String> {
    let native_options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([960.0, 640.0])
            .with_min_inner_size([840.0, 590.0])
            .with_title("SuperTux Remastered Setup"),
        ..Default::default()
    };
    eframe::run_native(
        "SuperTux Remastered Setup",
        native_options,
        Box::new(move |cc| Ok(Box::new(ui::SetupApp::new(cc, options)))),
    )
    .map_err(|error| error.to_string())
}

fn run_cli(options: InstallOptions) -> ExitCode {
    println!("SuperTux Remastered Setup {VERSION}");
    println!("Installing to: {}", options.prefix.display());
    println!();

    let (tx, rx) = channel();
    let install_options = options.clone();
    std::thread::spawn(move || {
        installer::install(
            &install_options,
            tx,
            Arc::new(AtomicBool::new(false)),
            None,
        );
    });

    let mut last_stage = String::new();
    let mut last_progress = 0.0_f32;
    let mut result = ExitCode::FAILURE;

    for event in rx {
        match event {
            Event::Stage(text) => {
                if text != last_stage {
                    if !last_stage.is_empty() {
                        println!();
                    }
                    print!("{text}");
                    let _ = io::stdout().flush();
                    last_stage = text;
                }
            }
            Event::Progress(value) => {
                if value - last_progress >= 1.0 {
                    print!("\r  {:>3.0}%  {}", value, " ".repeat(40));
                    print!("\r  {:>3.0}%", value);
                    let _ = io::stdout().flush();
                    last_progress = value;
                }
            }
            Event::Log(text) => {
                println!();
                println!("  · {text}");
            }
            Event::Done(path) => {
                println!();
                println!();
                println!("Tux has landed. Installed to {}", path.display());
                println!("Launch it from your application menu or with: supertux-remastered");
                println!("Uninstall with: supertux-remastered-setup --uninstall --prefix '{}'", path.display());
                result = ExitCode::SUCCESS;
            }
            Event::Failed(error) => {
                println!();
                eprintln!();
                eprintln!("Installation failed:");
                eprintln!("{error}");
                result = ExitCode::FAILURE;
            }
            Event::Cancelled => {
                println!();
                println!("Installation cancelled.");
                result = ExitCode::FAILURE;
            }
        }
    }
    result
}

fn run_uninstall(prefix: PathBuf, yes: bool) -> ExitCode {
    if !prefix.exists() {
        eprintln!("No installation found at {}.", prefix.display());
        return ExitCode::FAILURE;
    }
    if !yes {
        print!("Remove SuperTux Remastered from {}? [y/N] ", prefix.display());
        let _ = io::stdout().flush();
        let mut answer = String::new();
        if io::stdin().read_line(&mut answer).is_err() {
            return ExitCode::FAILURE;
        }
        let answer = answer.trim().to_lowercase();
        if answer != "y" && answer != "yes" {
            println!("Nothing was removed.");
            return ExitCode::SUCCESS;
        }
    }
    match installer::uninstall(&prefix) {
        Ok(()) => {
            println!("SuperTux Remastered was removed. Save files in ~/.local/share/supertux2 were kept.");
            ExitCode::SUCCESS
        }
        Err(error) => {
            eprintln!("Could not uninstall: {error}");
            ExitCode::FAILURE
        }
    }
}
