use colored::Colorize;
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use std::process::{Command, Stdio};
use std::time::Duration;

use crate::console::{confirm, start_simple_progress_bar};
use crate::utils::{
  create_url, download_file, generate_token, is_running, unzip_file, Autostart, InstallInfo,
};

pub fn status() {
  let pb = start_simple_progress_bar("Loading...");

  let install_info = InstallInfo::get();
  let is_running = is_running();

  pb.finish_and_clear();

  let installed_text = if install_info.installed {
    "Installed".green()
  } else {
    "Not Installed".red()
  };
  let path_text = if install_info.installed {
    format!("({:?})", install_info.path)
  } else {
    String::new()
  };
  let status_text = if is_running {
    "Running".green()
  } else {
    "Stopped".red()
  };

  println!(
    "{}: {} {}",
    "Installation".bold(),
    installed_text,
    path_text
  );
  println!("{}: {}", "Version".bold(), install_info.version);
  println!("{}: {}", "Status".bold(), status_text);
}

pub fn install(path: Option<String>) {
  if InstallInfo::get().installed {
    println!("{}", "Roxy is already installed".bold().red());
    return;
  }

  let install_info = InstallInfo::with_or_default(path);
  if !confirm(
    format!(
      "Are you sure you want to install roxy to: {:?}",
      install_info.path
    )
    .bold(),
  ) {
    return;
  }

  if Path::new(&install_info.app_path()).exists() {
    fs::remove_dir_all(&install_info.app_path()).expect("Failed to clean up existing installation");
  }

  let pb = start_simple_progress_bar("Downloading Node.js...");

  fs::create_dir_all(install_info.app_path()).expect("Failed to create app folder");

  let node_url;
  let node_path;

  #[cfg(target_os = "windows")]
  {
    node_url = "https://nodejs.org/dist/v18.16.0/node-v18.16.0-win-x64.zip";
    node_path = install_info.app_path().join("node.zip")
  }

  #[cfg(target_os = "linux")]
  {
    node_url = "https://nodejs.org/dist/v18.16.0/node-v18.16.0-linux-x64.tar.gz";
    node_path = install_info.app_path().join("node.tar.gz")
  }

  download_file(node_url, &node_path);
  unzip_file(&node_path, &install_info.app_path());
  fs::remove_file(node_path).expect("Failed to delete Node.js zip");

  // Names are different on linux and windows so we just find it on runtime
  let entries = fs::read_dir(install_info.app_path()).expect("Failed to read app directory");
  for entry in entries {
    let entry = entry.unwrap();
    if entry.file_type().unwrap().is_dir() && entry.file_name().to_string_lossy().contains("node") {
      fs::rename(entry.path(), entry.path().with_file_name("node"))
        .expect("Failed to rename node folder");
    }
  }

  pb.set_message("Downloading roxy...");

  let roxy_url;
  let roxy_zip_path;

  #[cfg(target_os = "windows")]
  {
    roxy_url = "https://github.com/keifufu/roxy/archive/main.zip";
    roxy_zip_path = install_info.app_path().join("roxy.zip")
  }

  #[cfg(target_os = "linux")]
  {
    roxy_url = "https://github.com/keifufu/roxy/archive/main.tar.gz";
    roxy_zip_path = install_info.app_path().join("roxy.tar.gz")
  }

  download_file(roxy_url, &roxy_zip_path);
  unzip_file(&roxy_zip_path, &install_info.app_path());
  fs::remove_file(roxy_zip_path).expect("Failed to delete roxy zip");

  // roxy-main/roxy -> roxy
  fs::rename(
    install_info.app_path().join("roxy-main").join("roxy"),
    install_info.roxy_path(),
  )
  .expect("Failed to rename roxy folder");

  fs::remove_dir_all(install_info.app_path().join("roxy-main"))
    .expect("Failed to delete roxy folder");

  pb.set_message("Building...");

  let termination_token = generate_token(24);
  let dot_env_contents = format!(
    "DATA_PATH={}\nTERMINATION_TOKEN={}",
    install_info.path.to_string_lossy().to_string(),
    termination_token
  );
  match File::create(install_info.roxy_path().join(".env")) {
    Ok(mut file) => {
      if let Err(err) = file.write_all(dot_env_contents.as_bytes()) {
        panic!("Failed to write file: {}", err);
      }
    }
    Err(err) => {
      panic!("Failed to create file: {}", err);
    }
  }

  #[cfg(target_os = "windows")]
  {
    Command::new(install_info.node_path().join("npm.cmd"))
      .args(["install"])
      .current_dir(install_info.roxy_path())
      .output()
      .expect("Failed to install dependencies with npm");

    Command::new(install_info.node_path().join("npm.cmd"))
      .args(["run", "build"])
      .current_dir(install_info.roxy_path())
      .output()
      .expect("Failed to build roxy with npm");
  }

  #[cfg(target_os = "linux")]
  {
    use std::os::unix::fs::PermissionsExt;
    let build_sh_contents = r#"
      #!/bin/bash
      export PATH="../node/bin:$PATH"
      export NODE_PATH="../node/lib/node_modules"
      npm run build
    "#;

    let build_sh_path = install_info.roxy_path().join("build.sh");

    match File::create(&build_sh_path) {
      Ok(mut file) => {
        if let Err(err) = file.write_all(build_sh_contents.as_bytes()) {
          panic!("Failed to write file: {}", err);
        }
      }
      Err(err) => {
        panic!("Failed to create file: {}", err);
      }
    }

    let mut permissions = fs::metadata(&build_sh_path)
      .expect("Failed to retrieve permissions from build.sh")
      .permissions();
    let mode = permissions.mode() | 0o755;
    permissions.set_mode(mode);
    fs::set_permissions(&build_sh_path, permissions)
      .expect("Failed to set file permissions for build.sh");

    Command::new(install_info.node_path().join("bin").join("node"))
      .args([
        install_info
          .node_path()
          .join("bin")
          .join("npm")
          .to_str()
          .unwrap(),
        "install",
      ])
      .current_dir(install_info.roxy_path())
      .output()
      .expect("Failed to install dependencies with npm");

    Command::new("sh")
      .arg(&build_sh_path)
      .current_dir(install_info.roxy_path())
      .output()
      .expect("Failed to build roxy with build.sh");
  }

  let mut file =
    File::open(install_info.roxy_path().join("package.json")).expect("Failed to open package.json");
  let mut contents = String::new();
  file
    .read_to_string(&mut contents)
    .expect("Failed to read package.json");

  let json: serde_json::Value =
    serde_json::from_str(&contents).expect("Failed to parse package.json");

  InstallInfo::write(
    install_info.path,
    json["version"].as_str().unwrap(),
    termination_token,
  );

  pb.finish_and_clear();
  println!("{}", "Successfully installed roxy!".green().bold());

  autostart_enable();
  start();
}

pub fn uninstall() {
  let install_info = InstallInfo::get();

  if !install_info.installed {
    println!("{}", "Roxy is not installed".bold().red());
    return;
  }

  if !confirm("Are you sure you want to uninstall roxy?".normal()) {
    return;
  }

  let delete_all = confirm("Do you want to delete the database and uploaded files too? (There will be no more confirmations)".normal());

  let pb = start_simple_progress_bar("Loading...");

  if is_running() {
    stop();
  }

  pb.set_message("Deleting roxy...");

  let bin_path = install_info.path.join("app");
  fs::remove_dir_all(bin_path).expect("Failed to delete roxy");

  if delete_all {
    pb.set_message("Deleting database and uploaded files...");
    fs::remove_dir_all(&install_info.path).expect("Failed to delete database and uploaded files");
  }

  pb.finish_and_clear();
  InstallInfo::reset();
  println!(
    "{}\n{}",
    "Successfully uninstalled roxy!".bold().green(),
    if delete_all {
      "(Database and uploaded files were deleted)".bold().green()
    } else {
      "(Database and uploaded files were kept)".bold().green()
    },
  );
  if !delete_all {
    println!("Data path: {:?}", install_info.path);
  }
}

pub fn update() {
  println!("Update: not yet implemented");
}

pub fn start() {
  let install_info = InstallInfo::get();
  if !install_info.installed {
    println!("{}", "Roxy is not installed".red().bold());
    return;
  }

  if is_running() {
    println!("{}", "Roxy is already running".red().bold());
    return;
  }

  #[cfg(target_os = "windows")]
  {
    Command::new(install_info.node_path().join("node.exe"))
      .args([install_info.roxy_path().join("dist").join("index.js")])
      .stdout(Stdio::null())
      .stdin(Stdio::null())
      .spawn()
      .expect("Failed to start roxy");
  }

  #[cfg(target_os = "linux")]
  {
    Command::new(install_info.node_path().join("bin").join("node"))
      .args([install_info.roxy_path().join("dist").join("index.js")])
      .stdout(Stdio::null())
      .stdin(Stdio::null())
      .spawn()
      .expect("Failed to start roxy");
  }

  println!("{}", "Roxy has been started!".green().bold());
}

pub fn restart() {
  if is_running() {
    stop();
  }
  start();
}

pub fn stop() {
  let pb = start_simple_progress_bar("Loading...");

  if !is_running() {
    pb.finish_and_clear();
    println!("{}", "Roxy is not running".bold().red());
    return;
  }

  let client = reqwest::blocking::Client::new();
  let response = client
    .post(create_url("/terminate"))
    .body(
      serde_json::json!({
        "termination_token": InstallInfo::get().termination_token
      })
      .to_string(),
    )
    .timeout(Duration::from_secs(1))
    .send();

  pb.finish_and_clear();
  match response {
    Ok(_) => println!("{}", "Successfully stopped roxy".bold().green()),
    Err(_) => println!("{}", "Failed to stop roxy".bold().red()),
  }
}

pub fn autostart_enable() {
  if Autostart::is_enabled() {
    println!("{}", "Autostart already enabled".red().bold());
    return;
  }
  Autostart::enable();
  println!("{}", "Enabled autostart".green().bold());
}

pub fn autostart_disable() {
  if !Autostart::is_enabled() {
    println!("{}", "Autostart not enabled".red().bold());
    return;
  }
  Autostart::disable();
  println!("{}", "Disabled autostart".green().bold());
}

pub fn autostart_status() {
  if Autostart::is_enabled() {
    println!("{}: {}", "Status".bold(), "Enabled".green().bold());
  } else {
    println!("{}: {}", "Status".bold(), "Disabled".red().bold());
  }
}

pub fn config() {
  let install_info = InstallInfo::get();
  if !install_info.installed {
    println!("{}", "Roxy is not installed".red().bold());
    return;
  }

  open::that_detached(install_info.path.join("roxy.json")).expect("Failed to open roxy.json");
}

pub fn logs() {
  let install_info = InstallInfo::get();
  if !install_info.installed {
    println!("{}", "Roxy is not installed".red().bold());
    return;
  }

  open::that_detached(install_info.path.join("roxy.log")).expect("Failed to open roxy.log");
}
