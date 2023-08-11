use colored::{ColoredString, Colorize};
use indicatif::{ProgressBar, ProgressStyle};
use std::{
  io::{self, Write},
  time::Duration,
};

pub fn start_simple_progress_bar(msg: &str) -> ProgressBar {
  let pb = ProgressBar::new_spinner();
  pb.set_message(msg.to_string());
  pb.set_style(
    ProgressStyle::default_spinner()
      .template("{spinner:.green} {msg}")
      .expect("Failed to create spinner"),
  );
  pb.enable_steady_tick(Duration::from_millis(100));
  pb
}

pub fn confirm(prompt: ColoredString) -> bool {
  print!("{} [y/n]: ", prompt.bold().red());
  io::stdout().flush().unwrap();

  let mut input = String::new();
  io::stdin().read_line(&mut input).unwrap();

  // Check if the user's response starts with 'y' or 'Y'
  input.trim().to_lowercase().starts_with('y')
}
