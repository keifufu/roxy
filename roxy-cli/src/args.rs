use clap::{Args, Parser, Subcommand};

#[derive(Debug, Parser)]
#[clap(author = "keifufu", version)]
pub struct RoxyCliArgs {
  #[clap(subcommand)]
  pub command: RoxySubcommand,
}

#[derive(Debug, Subcommand)]
pub enum RoxySubcommand {
  Status,
  Install(InstallCommand),
  Uninstall,
  Update,
  Start,
  Restart,
  Stop,
  Autostart(AutostartCommand),
  Config,
  Logs,
}

#[derive(Debug, Args)]
pub struct InstallCommand {
  /// Program and data path.
  /// Defaults to:
  /// - Windows: %LocalAppData%\roxy
  /// - Linux: /home/<user>/.roxy
  pub path: Option<String>,
}

#[derive(Debug, Args)]
pub struct AutostartCommand {
  #[clap(subcommand)]
  pub command: AutostartSubcommand,
}

#[derive(Debug, Subcommand)]
pub enum AutostartSubcommand {
  Enable,
  Disable,
  Status,
}
