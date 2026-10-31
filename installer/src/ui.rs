use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver};
use std::sync::Arc;
use std::time::{Duration, Instant};

use eframe::egui::{self, Align, Align2, Color32, FontData, FontDefinitions, FontFamily, FontId, Layout, Margin, RichText, Stroke, Vec2};
use egui::{CornerRadius, Sense};

use crate::installer::{self, Event, InstallOptions};

const BG: Color32 = Color32::from_rgb(5, 10, 18);
const SIDEBAR: Color32 = Color32::from_rgb(4, 9, 16);
const PANEL: Color32 = Color32::from_rgb(10, 22, 37);
const PANEL_2: Color32 = Color32::from_rgb(13, 29, 47);
const TEXT: Color32 = Color32::from_rgb(242, 247, 255);
const MUTED: Color32 = Color32::from_rgb(152, 171, 196);
const FAINT: Color32 = Color32::from_rgb(102, 122, 148);
const ICE: Color32 = Color32::from_rgb(139, 230, 255);
const AURORA: Color32 = Color32::from_rgb(111, 240, 196);
const GOLD: Color32 = Color32::from_rgb(255, 181, 46);
const GOLD_BRIGHT: Color32 = Color32::from_rgb(255, 201, 87);
const LINE: Color32 = Color32::from_rgba_premultiplied(24, 32, 37, 40);
const LINE_STRONG: Color32 = Color32::from_rgba_premultiplied(41, 55, 65, 70);
const DANGER: Color32 = Color32::from_rgb(255, 112, 92);

const INTER: &[u8] = include_bytes!("../assets/Inter.ttf");
const BRICOLAGE: &[u8] = include_bytes!("../assets/Bricolage.ttf");
const JETBRAINS: &[u8] = include_bytes!("../assets/JetBrainsMono.ttf");
const BACKGROUND: &[u8] = include_bytes!("../assets/background.jpg");
const LOGO: &[u8] = include_bytes!("../assets/logo.png");

#[derive(Clone, Copy, PartialEq, Eq)]
enum Step {
    Welcome,
    Installing,
    Complete,
    Error,
}

pub struct SetupApp {
    step: Step,
    install_dir: String,
    create_shortcut: bool,
    launch_after: bool,
    progress: f32,
    stage: String,
    logs: Vec<String>,
    receiver: Option<Receiver<Event>>,
    cancel: Arc<AtomicBool>,
    installed_path: Option<PathBuf>,
    error: Option<String>,
    missing_libs: Vec<String>,
    background: egui::TextureHandle,
    logo: egui::TextureHandle,
    toast: Option<(String, Instant)>,
}

impl SetupApp {
    pub fn new(cc: &eframe::CreationContext<'_>, options: InstallOptions) -> Self {
        install_fonts(&cc.egui_ctx);
        apply_style(&cc.egui_ctx);

        let background = load_texture(&cc.egui_ctx, "background", BACKGROUND);
        let logo = load_texture(&cc.egui_ctx, "logo", LOGO);
        let missing_libs = installer::missing_runtime_libs();

        let mut app = Self {
            step: Step::Welcome,
            install_dir: options.prefix.display().to_string(),
            create_shortcut: options.create_shortcut,
            launch_after: true,
            progress: 0.0,
            stage: "Ready when you are.".into(),
            logs: Vec::new(),
            receiver: None,
            cancel: Arc::new(AtomicBool::new(false)),
            installed_path: None,
            error: None,
            missing_libs,
            background,
            logo,
            toast: None,
        };
        if !app.missing_libs.is_empty() {
            app.logs.push(format!(
                "Missing runtime libraries: {}",
                app.missing_libs.join(", ")
            ));
        }
        app
    }

    fn start_install(&mut self, ctx: &egui::Context) {
        let prefix = installer::expand_path(&self.install_dir);
        if self.install_dir.trim().is_empty() {
            self.error = Some("Choose an install folder first.".into());
            self.step = Step::Error;
            return;
        }
        self.step = Step::Installing;
        self.progress = 0.0;
        self.stage = "Starting setup…".into();
        self.logs.clear();
        self.error = None;
        self.installed_path = None;
        self.cancel.store(false, Ordering::Relaxed);

        let options = InstallOptions {
            prefix,
            create_shortcut: self.create_shortcut,
        };
        let (tx, rx) = channel();
        self.receiver = Some(rx);
        let cancel = self.cancel.clone();
        let ctx = ctx.clone();
        std::thread::spawn(move || {
            installer::install(&options, tx, cancel, Some(ctx));
        });
    }

    fn poll_events(&mut self, ctx: &egui::Context) {
        let mut events = Vec::new();
        if let Some(receiver) = &self.receiver {
            while let Ok(event) = receiver.try_recv() {
                events.push(event);
            }
        }
        for event in events {
            match event {
                Event::Stage(text) => self.stage = text,
                Event::Progress(value) => self.progress = value,
                Event::Log(text) => {
                    self.logs.push(text);
                    if self.logs.len() > 240 {
                        self.logs.remove(0);
                    }
                }
                Event::Done(path) => {
                    self.installed_path = Some(path);
                    self.step = Step::Complete;
                    self.progress = 100.0;
                    self.receiver = None;
                    if self.launch_after {
                        let _ = self.launch_game();
                    }
                }
                Event::Failed(message) => {
                    self.error = Some(message);
                    self.step = Step::Error;
                    self.receiver = None;
                }
                Event::Cancelled => {
                    self.stage = "Installation cancelled.".into();
                    self.step = Step::Welcome;
                    self.receiver = None;
                    self.progress = 0.0;
                }
            }
        }
        if self.receiver.is_some() {
            ctx.request_repaint_after(Duration::from_millis(80));
        }
    }

    fn launch_game(&mut self) -> Result<(), String> {
        let prefix = self
            .installed_path
            .clone()
            .or_else(|| Some(PathBuf::from(&self.install_dir)))
            .unwrap();
        let binary = installer::find_game_binary(&prefix)
            .ok_or_else(|| "Could not find the game binary.".to_string())?;
        Command::new(&binary)
            .current_dir(prefix)
            .spawn()
            .map(|_| ())
            .map_err(|e| format!("Could not launch the game: {e}"))
    }

    fn open_folder(&mut self) {
        if let Some(path) = &self.installed_path {
            let _ = Command::new("xdg-open").arg(path).spawn();
        }
    }

    fn browse_folder(&mut self) {
        let start = self.install_dir.clone();
        if let Ok(output) = Command::new("kdialog")
            .args(["--getexistingdirectory", &start, "--title", "Choose where to install SuperTux Remastered"])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    self.install_dir = path;
                    return;
                }
            }
        }
        if let Ok(output) = Command::new("zenity")
            .args(["--file-selection", "--directory", "--title=Choose where to install SuperTux Remastered", &format!("--filename={start}/")])
            .output()
        {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() {
                    self.install_dir = path;
                }
            }
        }
    }

    fn reset(&mut self) {
        self.step = Step::Welcome;
        self.error = None;
        self.installed_path = None;
        self.progress = 0.0;
        self.stage = "Ready when you are.".into();
    }
}

impl eframe::App for SetupApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        self.poll_events(ctx);

        if let Some((message, at)) = &self.toast {
            if at.elapsed() > Duration::from_secs(5) {
                self.toast = None;
            } else {
                let message = message.clone();
                egui::TopBottomPanel::bottom("toast")
                    .frame(
                        egui::Frame::NONE
                            .fill(Color32::from_rgb(20, 35, 40))
                            .inner_margin(Margin::symmetric(18, 10)),
                    )
                    .show(ctx, |ui| {
                        ui.label(RichText::new(message).size(11.5).color(AURORA));
                    });
            }
        }

        egui::SidePanel::left("sidebar")
            .exact_width(258.0)
            .resizable(false)
            .frame(
                egui::Frame::NONE
                    .fill(SIDEBAR)
                    .inner_margin(Margin::symmetric(26, 24)),
            )
            .show(ctx, |ui| {
                self.sidebar(ui);
            });

        egui::CentralPanel::default()
            .frame(egui::Frame::NONE)
            .show(ctx, |ui| {
                let rect = ui.max_rect();
                paint_background(ui.painter(), rect, &self.background);
                let inner = rect.shrink2(Vec2::new(44.0, 30.0));
                ui.scope_builder(egui::UiBuilder::new().max_rect(inner), |ui| {
                    ui.set_max_width(580.0);
                    match self.step {
                        Step::Welcome => self.welcome(ui),
                        Step::Installing => self.installing(ui),
                        Step::Complete => self.complete(ui),
                        Step::Error => self.error(ui),
                    }
                });
            });
    }
}

impl SetupApp {
    fn sidebar(&mut self, ui: &mut egui::Ui) {
        ui.add(
            egui::Image::new((self.logo.id(), Vec2::new(154.0, 87.0)))
                .fit_to_exact_size(Vec2::new(154.0, 87.0)),
        );
        ui.add_space(2.0);
        ui.label(
            RichText::new("R E M A S T E R E D")
                .font(FontId::new(8.0, FontFamily::Monospace))
                .color(ICE),
        );
        ui.add_space(30.0);

        let current = match self.step {
            Step::Welcome | Step::Error => 0,
            Step::Installing => 1,
            Step::Complete => 2,
        };
        let labels = ["Welcome", "Install", "Finish"];
        for (index, label) in labels.iter().enumerate() {
            self.step_row(ui, index, label, current);
            if index < labels.len() - 1 {
                let (rect, _) = ui.allocate_exact_size(Vec2::new(ui.available_width(), 12.0), Sense::hover());
                let x = rect.left() + 12.0;
                ui.painter().line_segment(
                    [egui::pos2(x, rect.top()), egui::pos2(x, rect.bottom())],
                    Stroke::new(1.0_f32, LINE),
                );
            }
        }

        ui.add_space(22.0);
        egui::Frame::NONE
            .fill(Color32::from_rgba_unmultiplied(139, 230, 255, 10))
            .stroke(Stroke::new(1.0_f32, LINE))
            .corner_radius(CornerRadius::same(10))
            .inner_margin(Margin::same(12))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    dot(ui, AURORA);
                    ui.label(
                        RichText::new("ROLLING TEST BUILD")
                            .font(FontId::new(8.0, FontFamily::Monospace))
                            .color(AURORA),
                    );
                });
                ui.add_space(4.0);
                ui.label(
                    RichText::new("An independent hobbyist remaster of SuperTux 2. Not an official release.")
                        .size(9.5)
                        .color(MUTED),
                );
            });

        ui.with_layout(Layout::bottom_up(Align::LEFT), |ui| {
            ui.label(
                RichText::new("SuperTux Remastered is free software · GPL-3.0")
                    .size(8.5)
                    .color(FAINT),
            );
            ui.add_space(4.0);
            ui.label(
                RichText::new(format!("Setup {} · Linux x86_64", installer::VERSION))
                    .font(FontId::new(8.0, FontFamily::Monospace))
                    .color(FAINT),
            );
            ui.add_space(10.0);
            ui.hyperlink_to(
                RichText::new("github.com/Peter5235252").size(9.0).color(MUTED),
                "https://github.com/Peter5235252/supertux-remastered",
            );
            ui.add_space(10.0);
            ui.label(
                RichText::new("All game art, music and levels © The SuperTux Team.")
                    .size(8.0)
                    .color(FAINT),
            );
        });
    }

    fn step_row(&self, ui: &mut egui::Ui, index: usize, label: &str, current: usize) {
        let (rect, _) = ui.allocate_exact_size(Vec2::new(ui.available_width(), 34.0), Sense::hover());
        let center = egui::pos2(rect.left() + 12.0, rect.center().y);
        let done = index < current;
        let active = index == current;
        let fill = if done {
            ICE
        } else if active {
            Color32::from_rgb(38, 31, 14)
        } else {
            Color32::from_rgb(12, 26, 41)
        };
        let stroke = if active {
            Stroke::new(1.5_f32, GOLD)
        } else {
            Stroke::new(1.0_f32, LINE_STRONG)
        };
        ui.painter().circle_filled(center, 11.0, fill);
        if done {
            let tick = vec![
                center + Vec2::new(-4.0, 0.0),
                center + Vec2::new(-1.0, 4.0),
                center + Vec2::new(5.0, -4.0),
            ];
            ui.painter().add(egui::Shape::line(tick, Stroke::new(1.6_f32, BG)));
        } else {
            ui.painter().circle_stroke(center, 11.0, stroke);
            ui.painter().text(
                center,
                Align2::CENTER_CENTER,
                format!("{}", index + 1),
                FontId::new(9.0, FontFamily::Monospace),
                if active { GOLD } else { FAINT },
            );
        }
        ui.painter().text(
            egui::pos2(rect.left() + 34.0, rect.center().y),
            Align2::LEFT_CENTER,
            label,
            FontId::new(12.0, FontFamily::Proportional),
            if active { TEXT } else if done { MUTED } else { FAINT },
        );
    }

    fn header(&self, ui: &mut egui::Ui) {
        ui.horizontal(|ui| {
            ui.label(
                RichText::new("SUPERTUX REMASTERED SETUP")
                    .font(FontId::new(8.5, FontFamily::Monospace))
                    .color(FAINT),
            );
            ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                egui::Frame::NONE
                    .fill(Color32::from_rgba_unmultiplied(255, 181, 46, 18))
                    .stroke(Stroke::new(1.0_f32, Color32::from_rgba_unmultiplied(255, 181, 46, 60)))
                    .corner_radius(CornerRadius::same(4))
                    .inner_margin(Margin::symmetric(7, 3))
                    .show(ui, |ui| {
                        ui.label(
                            RichText::new("UNSIGNED TEST BUILD")
                                .font(FontId::new(7.5, FontFamily::Monospace))
                                .color(GOLD),
                        );
                    });
            });
        });
        ui.add_space(22.0);
    }

    fn welcome(&mut self, ui: &mut egui::Ui) {
        self.header(ui);
        ui.label(
            RichText::new("Bring Tux home.")
                .font(FontId::new(42.0, FontFamily::Name("display".into())))
                .color(TEXT),
        );
        ui.add_space(8.0);
        ui.label(
            RichText::new("The installer will put SuperTux Remastered on your Linux desktop, add a menu shortcut and keep the command line out of your way.")
                .size(12.5)
                .color(MUTED),
        );
        ui.add_space(24.0);

        section_label(ui, "INSTALL LOCATION");
        egui::Frame::NONE
            .fill(PANEL)
            .stroke(Stroke::new(1.0_f32, LINE))
            .corner_radius(CornerRadius::same(11))
            .inner_margin(Margin::same(11))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    let browse_width = 82.0;
                    let width = (ui.available_width() - browse_width - 8.0).max(120.0);
                    egui::Frame::NONE
                        .fill(Color32::from_rgb(4, 10, 18))
                        .stroke(Stroke::new(1.0_f32, LINE))
                        .corner_radius(CornerRadius::same(7))
                        .inner_margin(Margin::symmetric(9, 7))
                        .show(ui, |ui| {
                            ui.add_sized(
                                [width - 18.0, 18.0],
                                egui::TextEdit::singleline(&mut self.install_dir)
                                    .font(egui::TextStyle::Monospace)
                                    .text_color(TEXT)
                                    .frame(false)
                                    .desired_width(f32::INFINITY),
                            );
                        });
                    if ui
                        .add_sized(
                            [browse_width, 34.0],
                            egui::Button::new(RichText::new("Browse…").size(11.0).color(TEXT))
                                .fill(PANEL_2)
                                .stroke(Stroke::new(1.0_f32, LINE_STRONG)),
                        )
                        .clicked()
                    {
                        self.browse_folder();
                    }
                });
                ui.add_space(5.0);
                ui.label(
                    RichText::new("The game, data, runtime libraries and uninstaller will live in this folder.")
                        .size(9.0)
                        .color(FAINT),
                );
            });
        ui.add_space(9.0);
        ui.label(
            RichText::new("Tip: the default keeps everything in your user folder. No administrator password needed.")
                .size(9.0)
                .color(FAINT),
        );

        ui.add_space(22.0);
        section_label(ui, "OPTIONS");
        ui.checkbox(
            &mut self.create_shortcut,
            RichText::new("Add SuperTux Remastered to the application menu").size(11.5).color(MUTED),
        );
        ui.add_space(3.0);
        ui.checkbox(
            &mut self.launch_after,
            RichText::new("Launch the game when setup finishes").size(11.5).color(MUTED),
        );

        ui.add_space(20.0);
        egui::Frame::NONE
            .fill(Color32::from_rgba_unmultiplied(139, 230, 255, 7))
            .stroke(Stroke::new(1.0_f32, LINE))
            .corner_radius(CornerRadius::same(9))
            .inner_margin(Margin::symmetric(12, 9))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    ui.label(
                        RichText::new("~275 MB download  ·  ~650 MB installed  ·  test build · Oct 2026")
                            .font(FontId::new(8.5, FontFamily::Monospace))
                            .color(MUTED),
                    );
                });
            });

        if !self.missing_libs.is_empty() {
            ui.add_space(10.0);
            egui::Frame::NONE
                .fill(Color32::from_rgba_unmultiplied(255, 181, 46, 14))
                .stroke(Stroke::new(1.0_f32, Color32::from_rgba_unmultiplied(255, 181, 46, 55)))
                .corner_radius(CornerRadius::same(9))
                .inner_margin(Margin::symmetric(12, 9))
                .show(ui, |ui| {
                    ui.label(
                        RichText::new(format!(
                            "Heads up: {} could not be found. Install the matching packages before launching the game.",
                            self.missing_libs.join(", ")
                        ))
                        .size(9.5)
                        .color(Color32::from_rgb(255, 216, 143)),
                    );
                });
        }

        ui.with_layout(Layout::bottom_up(Align::LEFT), |ui| {
            ui.horizontal(|ui| {
                if ui
                    .add_sized(
                        [168.0, 42.0],
                        egui::Button::new(
                            RichText::new("Install SuperTux").size(12.5).color(Color32::from_rgb(26, 18, 5)),
                        )
                        .fill(GOLD)
                        .stroke(Stroke::new(1.0_f32, GOLD_BRIGHT)),
                    )
                    .clicked()
                {
                    self.start_install(ui.ctx());
                }
                ui.add_space(6.0);
                if ui
                    .add_sized(
                        [80.0, 42.0],
                        egui::Button::new(RichText::new("Quit").size(11.0).color(MUTED))
                            .fill(Color32::TRANSPARENT)
                            .stroke(Stroke::new(1.0_f32, LINE_STRONG)),
                    )
                    .clicked()
                {
                    ui.ctx().send_viewport_cmd(egui::ViewportCommand::Close);
                }
            });
            ui.add_space(7.0);
            ui.label(
                RichText::new("Setup only contacts GitHub for the release it installs. No account, no telemetry.")
                    .size(8.5)
                    .color(FAINT),
            );
        });
    }

    fn installing(&mut self, ui: &mut egui::Ui) {
        self.header(ui);
        ui.label(
            RichText::new("Making room for a penguin.")
                .font(FontId::new(37.0, FontFamily::Name("display".into())))
                .color(TEXT),
        );
        ui.add_space(7.0);
        ui.label(RichText::new(&self.stage).size(12.0).color(MUTED));
        ui.add_space(22.0);

        ui.horizontal(|ui| {
            ui.label(
                RichText::new(format!("{:.0}%", self.progress))
                    .font(FontId::new(32.0, FontFamily::Name("display".into())))
                    .color(ICE),
            );
            ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                ui.label(
                    RichText::new("DOWNLOAD · VERIFY · UNPACK · SHORTCUT")
                        .font(FontId::new(7.5, FontFamily::Monospace))
                        .color(FAINT),
                );
            });
        });
        ui.add_space(6.0);
        let (rect, _) = ui.allocate_exact_size(Vec2::new(ui.available_width(), 8.0), Sense::hover());
        ui.painter().rect_filled(rect, CornerRadius::same(4), Color32::from_rgb(15, 31, 48));
        let filled = egui::Rect::from_min_size(
            rect.min,
            Vec2::new(rect.width() * (self.progress / 100.0).clamp(0.0, 1.0), rect.height()),
        );
        ui.painter().rect_filled(filled, CornerRadius::same(4), ICE);
        ui.add_space(20.0);

        section_label(ui, "SETUP LOG");
        egui::Frame::NONE
            .fill(Color32::from_rgb(3, 8, 14))
            .stroke(Stroke::new(1.0_f32, LINE))
            .corner_radius(CornerRadius::same(10))
            .inner_margin(Margin::same(12))
            .show(ui, |ui| {
                egui::ScrollArea::vertical()
                    .auto_shrink([false, false])
                    .max_height(190.0)
                    .stick_to_bottom(true)
                    .show(ui, |ui| {
                        if self.logs.is_empty() {
                            ui.label(
                                RichText::new("Waiting for the first byte…")
                                    .font(FontId::new(9.5, FontFamily::Monospace))
                                    .color(FAINT),
                            );
                        }
                        for line in &self.logs {
                            ui.label(
                                RichText::new(line)
                                    .font(FontId::new(9.5, FontFamily::Monospace))
                                    .color(MUTED),
                            );
                        }
                    });
            });

        ui.with_layout(Layout::bottom_up(Align::LEFT), |ui| {
            if ui
                .add_sized(
                    [116.0, 36.0],
                    egui::Button::new(RichText::new("Cancel").size(10.5).color(MUTED))
                        .fill(Color32::TRANSPARENT)
                        .stroke(Stroke::new(1.0_f32, LINE_STRONG)),
                )
                .clicked()
            {
                self.cancel.store(true, Ordering::Relaxed);
                self.stage = "Cancelling after the current step…".into();
            }
            ui.add_space(6.0);
            ui.label(
                RichText::new("Keep this window open while the game downloads. The installer verifies the release digest before touching your files.")
                    .size(8.5)
                    .color(FAINT),
            );
        });
    }

    fn complete(&mut self, ui: &mut egui::Ui) {
        self.header(ui);
        let (rect, _) = ui.allocate_exact_size(Vec2::new(64.0, 64.0), Sense::hover());
        ui.painter().circle_filled(rect.center(), 29.0, Color32::from_rgba_unmultiplied(111, 240, 196, 28));
        ui.painter().circle_stroke(rect.center(), 29.0, Stroke::new(1.5_f32, AURORA));
        let tick = vec![
            rect.center() + Vec2::new(-10.0, 0.0),
            rect.center() + Vec2::new(-2.0, 9.0),
            rect.center() + Vec2::new(12.0, -8.0),
        ];
        ui.painter().add(egui::Shape::line(tick, Stroke::new(2.4_f32, AURORA)));
        ui.add_space(10.0);
        ui.label(
            RichText::new("Tux has landed.")
                .font(FontId::new(40.0, FontFamily::Name("display".into())))
                .color(TEXT),
        );
        ui.add_space(6.0);
        ui.label(
            RichText::new("SuperTux Remastered is installed and ready to play. Penny is still waiting, by the way.")
                .size(12.0)
                .color(MUTED),
        );
        ui.add_space(22.0);

        section_label(ui, "INSTALLED TO");
        egui::Frame::NONE
            .fill(PANEL)
            .stroke(Stroke::new(1.0_f32, LINE))
            .corner_radius(CornerRadius::same(10))
            .inner_margin(Margin::symmetric(12, 10))
            .show(ui, |ui| {
                ui.horizontal(|ui| {
                    ui.label(
                        RichText::new(
                            self.installed_path
                                .as_ref()
                                .map(|p| p.display().to_string())
                                .unwrap_or_default(),
                        )
                        .font(FontId::new(9.5, FontFamily::Monospace))
                        .color(MUTED),
                    );
                    ui.with_layout(Layout::right_to_left(Align::Center), |ui| {
                        if ui
                            .add_sized(
                                [90.0, 28.0],
                                egui::Button::new(RichText::new("Open folder").size(9.0).color(TEXT))
                                    .fill(PANEL_2)
                                    .stroke(Stroke::new(1.0_f32, LINE)),
                            )
                            .clicked()
                        {
                            self.open_folder();
                        }
                    });
                });
            });

        ui.add_space(16.0);
        egui::Frame::NONE
            .fill(Color32::from_rgba_unmultiplied(111, 240, 196, 8))
            .stroke(Stroke::new(1.0_f32, Color32::from_rgba_unmultiplied(111, 240, 196, 38)))
            .corner_radius(CornerRadius::same(9))
            .inner_margin(Margin::symmetric(12, 9))
            .show(ui, |ui| {
                ui.label(
                    RichText::new("A menu shortcut was added. An uninstaller lives inside the install folder. Your save files were left alone.")
                        .size(9.0)
                        .color(Color32::from_rgb(183, 239, 220)),
                );
            });

        ui.with_layout(Layout::bottom_up(Align::LEFT), |ui| {
            ui.horizontal(|ui| {
                if ui
                    .add_sized(
                        [148.0, 42.0],
                        egui::Button::new(
                            RichText::new("Launch game").size(12.0).color(Color32::from_rgb(26, 18, 5)),
                        )
                        .fill(GOLD)
                        .stroke(Stroke::new(1.0_f32, GOLD_BRIGHT)),
                    )
                    .clicked()
                {
                    if let Err(error) = self.launch_game() {
                        self.toast = Some((error, Instant::now()));
                    }
                }
                ui.add_space(6.0);
                if ui
                    .add_sized(
                        [90.0, 42.0],
                        egui::Button::new(RichText::new("Done").size(11.0).color(MUTED))
                            .fill(Color32::TRANSPARENT)
                            .stroke(Stroke::new(1.0_f32, LINE_STRONG)),
                    )
                    .clicked()
                {
                    ui.ctx().send_viewport_cmd(egui::ViewportCommand::Close);
                }
            });
            ui.add_space(8.0);
            ui.label(
                RichText::new("If the game does not start, run the installer again and check the runtime warning.")
                    .size(8.5)
                    .color(FAINT),
            );
        });
    }

    fn error(&mut self, ui: &mut egui::Ui) {
        self.header(ui);
        let (rect, _) = ui.allocate_exact_size(Vec2::new(56.0, 56.0), Sense::hover());
        ui.painter().circle_filled(rect.center(), 26.0, Color32::from_rgba_unmultiplied(255, 112, 92, 24));
        ui.painter().circle_stroke(rect.center(), 26.0, Stroke::new(1.5_f32, DANGER));
        ui.painter().text(
            rect.center(),
            Align2::CENTER_CENTER,
            "!",
            FontId::new(25.0, FontFamily::Name("display".into())),
            DANGER,
        );
        ui.add_space(10.0);
        ui.label(
            RichText::new("That didn’t go to plan.")
                .font(FontId::new(36.0, FontFamily::Name("display".into())))
                .color(TEXT),
        );
        ui.add_space(12.0);
        egui::Frame::NONE
            .fill(Color32::from_rgb(3, 9, 16))
            .stroke(Stroke::new(1.0_f32, Color32::from_rgba_unmultiplied(255, 112, 92, 60)))
            .corner_radius(CornerRadius::same(9))
            .inner_margin(Margin::same(14))
            .show(ui, |ui| {
                ui.add(
                    egui::Label::new(
                        RichText::new(self.error.clone().unwrap_or_default())
                            .font(FontId::new(10.0, FontFamily::Monospace))
                            .color(Color32::from_rgb(244, 183, 174)),
                    )
                    .wrap(),
                );
            });
        ui.add_space(10.0);
        ui.label(
            RichText::new("Nothing outside the chosen folder was changed. You can fix the issue and try again, or use the command-line fallback on the website.")
                .size(9.5)
                .color(MUTED),
        );

        ui.with_layout(Layout::bottom_up(Align::LEFT), |ui| {
            ui.horizontal(|ui| {
                if ui
                    .add_sized(
                        [120.0, 40.0],
                        egui::Button::new(
                            RichText::new("Try again").size(11.5).color(Color32::from_rgb(26, 18, 5)),
                        )
                        .fill(GOLD)
                        .stroke(Stroke::new(1.0_f32, GOLD_BRIGHT)),
                    )
                    .clicked()
                {
                    self.reset();
                }
                ui.add_space(6.0);
                if ui
                    .add_sized(
                        [96.0, 40.0],
                        egui::Button::new(RichText::new("Open log").size(10.5).color(MUTED))
                            .fill(Color32::TRANSPARENT)
                            .stroke(Stroke::new(1.0_f32, LINE_STRONG)),
                    )
                    .clicked()
                {
                    self.toast = Some(("Setup logs are shown in the terminal when run with --cli.".into(), Instant::now()));
                }
            });
        });
    }
}

fn install_fonts(ctx: &egui::Context) {
    let mut fonts = FontDefinitions::default();
    fonts.font_data.insert("inter".into(), Arc::new(FontData::from_static(INTER)));
    fonts.font_data.insert("display".into(), Arc::new(FontData::from_static(BRICOLAGE)));
    fonts.font_data.insert("mono".into(), Arc::new(FontData::from_static(JETBRAINS)));

    if let Some(family) = fonts.families.get_mut(&FontFamily::Proportional) {
        family.insert(0, "inter".into());
    }
    if let Some(family) = fonts.families.get_mut(&FontFamily::Monospace) {
        family.insert(0, "mono".into());
    }
    fonts.families.insert(
        FontFamily::Name("display".into()),
        vec!["display".into(), "inter".into()],
    );
    ctx.set_fonts(fonts);
}

fn apply_style(ctx: &egui::Context) {
    let mut style = (*ctx.style()).clone();
    style.visuals = egui::Visuals::dark();
    style.visuals.panel_fill = BG;
    style.visuals.window_fill = PANEL;
    style.visuals.extreme_bg_color = Color32::from_rgb(4, 10, 18);
    style.visuals.faint_bg_color = Color32::from_rgb(9, 20, 33);
    style.visuals.override_text_color = Some(TEXT);
    style.visuals.selection.bg_fill = Color32::from_rgba_unmultiplied(255, 181, 46, 80);
    style.visuals.selection.stroke = Stroke::new(1.0_f32, GOLD);
    style.visuals.widgets.noninteractive.bg_fill = PANEL;
    style.visuals.widgets.noninteractive.bg_stroke = Stroke::new(1.0_f32, LINE);
    style.visuals.widgets.inactive.bg_fill = PANEL_2;
    style.visuals.widgets.inactive.bg_stroke = Stroke::new(1.0_f32, LINE);
    style.visuals.widgets.hovered.bg_fill = Color32::from_rgb(20, 41, 62);
    style.visuals.widgets.hovered.bg_stroke = Stroke::new(1.0_f32, LINE_STRONG);
    style.visuals.widgets.active.bg_fill = Color32::from_rgb(24, 48, 70);
    style.visuals.widgets.active.bg_stroke = Stroke::new(1.0_f32, ICE);
    style.visuals.widgets.inactive.corner_radius = CornerRadius::same(7);
    style.visuals.widgets.hovered.corner_radius = CornerRadius::same(7);
    style.visuals.widgets.active.corner_radius = CornerRadius::same(7);
    style.visuals.window_corner_radius = CornerRadius::same(12);
    style.spacing.item_spacing = Vec2::new(8.0, 8.0);
    style.spacing.button_padding = Vec2::new(10.0, 6.0);
    ctx.set_style(style);
}

fn load_texture(ctx: &egui::Context, name: &str, bytes: &[u8]) -> egui::TextureHandle {
    let image = image::load_from_memory(bytes)
        .unwrap_or_else(|_| image::RgbaImage::new(2, 2).into())
        .to_rgba8();
    let size = [image.width() as usize, image.height() as usize];
    let pixels = image.into_raw();
    ctx.load_texture(
        name,
        egui::ColorImage::from_rgba_unmultiplied(size, &pixels),
        egui::TextureOptions::LINEAR,
    )
}

fn paint_background(painter: &egui::Painter, rect: egui::Rect, texture: &egui::TextureHandle) {
    let image_size = texture.size_vec2();
    let scale = (rect.width() / image_size.x).max(rect.height() / image_size.y);
    let displayed = image_size * scale;
    let min = rect.center() - displayed * 0.5;
    let image_rect = egui::Rect::from_min_size(min, displayed);
    let uv = egui::Rect::from_min_max(
        egui::pos2(
            ((rect.left() - image_rect.left()) / displayed.x).clamp(0.0, 1.0),
            ((rect.top() - image_rect.top()) / displayed.y).clamp(0.0, 1.0),
        ),
        egui::pos2(
            ((rect.right() - image_rect.left()) / displayed.x).clamp(0.0, 1.0),
            ((rect.bottom() - image_rect.top()) / displayed.y).clamp(0.0, 1.0),
        ),
    );
    painter.image(texture.id(), rect, uv, Color32::WHITE);
    painter.rect_filled(rect, CornerRadius::ZERO, Color32::from_rgba_unmultiplied(4, 9, 16, 208));
    painter.rect_filled(
        egui::Rect::from_min_max(rect.left_top(), egui::pos2(rect.left() + 210.0, rect.bottom())),
        CornerRadius::ZERO,
        Color32::from_rgba_unmultiplied(4, 9, 16, 95),
    );
}

fn section_label(ui: &mut egui::Ui, text: &str) {
    ui.label(
        RichText::new(text)
            .font(FontId::new(8.0, FontFamily::Monospace))
            .color(ICE),
    );
    ui.add_space(7.0);
}

fn dot(ui: &mut egui::Ui, color: Color32) {
    let (rect, _) = ui.allocate_exact_size(Vec2::new(8.0, 8.0), Sense::hover());
    ui.painter().circle_filled(rect.center(), 3.0, color);
}

#[allow(dead_code)]
fn _keep_path(_: &Path) {}
