mod args;
mod console;
mod ops;
mod utils;
use args::{AutostartSubcommand, RoxyCliArgs, RoxySubcommand};
use clap::Parser;

// Paths:
// roxy-cli "memory" file:
// - Windows: %LocalAppData%\roxy-cli\roxy-cli.json
// - Linux: ~/.roxy-cli/roxy-cli.json
//
// Roxy default paths:
// - Windows: %LocalAppData%\roxy\
// - Linux: ~/roxy/

fn main() {
  let args = RoxyCliArgs::parse();

  match args.command {
    RoxySubcommand::Status => ops::status(),
    RoxySubcommand::Install(props) => ops::install(props.path),
    RoxySubcommand::Uninstall => ops::uninstall(),
    RoxySubcommand::Update => ops::update(),
    RoxySubcommand::Start => ops::start(),
    RoxySubcommand::Restart => ops::restart(),
    RoxySubcommand::Stop => ops::stop(),
    RoxySubcommand::Autostart(sc) => match sc.command {
      AutostartSubcommand::Enable => ops::autostart_enable(),
      AutostartSubcommand::Disable => ops::autostart_disable(),
      AutostartSubcommand::Status => ops::autostart_status(),
    },
    RoxySubcommand::Config => ops::config(),
    RoxySubcommand::Logs => ops::logs(),
  }
}
