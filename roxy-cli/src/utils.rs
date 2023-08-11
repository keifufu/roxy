use colored::Colorize;
use path_clean::PathClean;
use rand::Rng;
use std::io::Write;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::time::Duration;
use std::{env, fs};
use std::{fs::File, path::Path};

pub fn create_url(path: &str) -> String {
  let install_info = InstallInfo::get();
  if !install_info.installed {
    return String::new();
  }

  match std::fs::read_to_string(install_info.path.join("roxy.json")) {
    Ok(contents) => {
      let v: serde_json::Value = serde_json::from_str(&contents).unwrap();
      let port = v["port"].as_str().unwrap();
      let use_https = v["useHttps"].as_bool().unwrap();

      format!(
        "{}://localhost:{}{}",
        if use_https { "https" } else { "http" },
        port,
        path
      )
    }
    Err(_) => String::new(),
  }
}

pub fn is_running() -> bool {
  let client = reqwest::blocking::Client::new();
  let response = client
    .get(create_url("/alive"))
    .timeout(Duration::from_secs(1))
    .send();

  response.is_ok()
}

pub fn download_file(url: &str, path: &PathBuf) {
  let response =
    reqwest::blocking::get(url).unwrap_or_else(|_| panic!("Failed to download {}", url));
  let mut file = File::create(path).unwrap();
  let content = response
    .bytes()
    .unwrap_or_else(|_| panic!("Failed to get the bytes from {}", url));

  std::io::copy(&mut content.as_ref(), &mut file).unwrap();
}

pub fn unzip_file(file: &Path, dest: &Path) {
  Command::new("tar")
    .args(["-xf", file.to_str().unwrap(), "-C", dest.to_str().unwrap()])
    .stdout(Stdio::null())
    .output()
    .expect("Failed to extract roxy with tar");
}

pub fn generate_token(length: usize) -> String {
  const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let mut rng = rand::thread_rng();

  let token: String = (0..length)
    .map(|_| {
      let idx = rng.gen_range(0..CHARSET.len());
      CHARSET[idx] as char
    })
    .collect();

  token
}

pub struct InstallInfo {
  pub installed: bool,
  pub version: String,
  pub path: PathBuf,
  pub termination_token: String,
}

impl InstallInfo {
  fn default() -> Self {
    Self {
      installed: false,
      version: String::from("---"),
      path: Self::get_default_path(),
      termination_token: String::new(),
    }
  }

  pub fn with_or_default(p: Option<String>) -> Self {
    Self {
      installed: false,
      version: String::from("---"),
      path: if let Some(p) = p {
        let path = PathBuf::from(p);
        if path.is_absolute() {
          path
        } else {
          env::current_dir().unwrap().join(path)
        }
        .clean()
      } else {
        Self::get_default_path()
      },
      termination_token: String::new(),
    }
  }

  pub fn get() -> Self {
    let config_path = Self::get_cli_config_path();

    if std::path::Path::new(&config_path).exists() {
      match std::fs::read_to_string(config_path) {
        Ok(contents) => {
          let v: serde_json::Value = serde_json::from_str(&contents).unwrap();
          let path = v["path"].as_str().unwrap();
          let valid_path = Path::new(&path).exists();

          Self {
            installed: valid_path,
            path: PathBuf::from(path),
            version: if valid_path {
              v["version"].as_str().unwrap().to_string()
            } else {
              String::from("---")
            },
            termination_token: v["termination_token"].as_str().unwrap().to_string(),
          }
        }
        Err(_) => Self::default(),
      }
    } else {
      Self::default()
    }
  }

  pub fn write(path: PathBuf, version: &str, termination_token: String) {
    let config_path = Self::get_cli_config_path();

    let json = serde_json::json!({
      "path": path,
      "version": version,
      "termination_token": termination_token
    });

    if let Some(parent_dir) = Path::new(&config_path).parent() {
      if let Err(err) = std::fs::create_dir_all(parent_dir) {
        panic!("Failed to create directories: {}", err);
      }
    }

    match File::create(config_path) {
      Ok(mut file) => {
        if let Err(err) = file.write_all(json.to_string().as_bytes()) {
          panic!("Failed to write file: {}", err);
        }
      }
      Err(err) => {
        panic!("Failed to create file: {}", err);
      }
    }
  }

  pub fn reset() {
    fs::remove_file(Self::get_cli_config_path()).expect("Failed to delete roxy-cli config");
  }

  pub fn app_path(&self) -> PathBuf {
    self.path.join("app")
  }

  pub fn node_path(&self) -> PathBuf {
    self.app_path().join("node")
  }

  pub fn roxy_path(&self) -> PathBuf {
    self.app_path().join("roxy")
  }

  pub fn get_roxy_cli_path() -> PathBuf {
    let result;
    #[cfg(target_os = "windows")]
    {
      let local_app_data =
        env::var("LOCALAPPDATA").expect("Failed to retrieve LOCALAPPDATA environment variable");
      let mut path = PathBuf::from(local_app_data);
      path.push("roxy-cli");
      result = path;
    }

    #[cfg(target_os = "linux")]
    {
      let home_dir = env::var("HOME").expect("Failed to retrieve HOME environment variable");
      let mut path = PathBuf::from(home_dir);
      path.push(".roxy-cli");
      result = path;
    }

    result
  }

  fn get_cli_config_path() -> PathBuf {
    Self::get_roxy_cli_path().join("roxy-cli.json")
  }

  fn get_default_path() -> PathBuf {
    let result;

    #[cfg(target_os = "windows")]
    {
      let local_app_data =
        env::var("LOCALAPPDATA").expect("Failed to retrieve LOCALAPPDATA environment variable");
      let mut path = PathBuf::from(local_app_data);
      path.push("roxy");
      result = path;
    }

    #[cfg(target_os = "linux")]
    {
      let home_dir = env::var("HOME").expect("Failed to retrieve HOME environment variable");
      let mut path = PathBuf::from(home_dir);
      path.push("roxy");
      result = path;
    }

    result
  }
}

pub struct Autostart {}

// Only supports Windows and Ubuntu
impl Autostart {
  pub fn is_enabled() -> bool {
    #[cfg(target_os = "windows")]
    {
      let output = Command::new("reg")
        .args([
          "query",
          "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
          "/v",
          "Roxy",
        ])
        .output()
        .expect("Failed to check Windows autostart status");

      output.status.success()
    }
    #[cfg(target_os = "linux")]
    std::path::Path::new("~/.config/autostart/roxy").exists()
  }

  pub fn enable() {
    let install_info = InstallInfo::get();
    if !install_info.installed {
      println!("{}", "Roxy is not installed".red().bold());
      return;
    }

    #[cfg(target_os = "windows")]
    {
      let self_path = env::current_exe().expect("Failed to get current executable path");
      let dest = InstallInfo::get_roxy_cli_path().join("roxy-cli.exe");
      fs::copy(self_path, &dest).expect("Failed to copy executable");

      // {:?} nicely provides us with quotation marks lol
      let command = format!("{:?} start", dest);
      Command::new("reg")
        .args([
          "add",
          "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
          "/v",
          "Roxy",
          "/d",
          command.as_str(),
          "/f",
        ])
        .output()
        .expect("Failed to enable autostart");
    }

    #[cfg(target_os = "linux")]
    {
      let self_path = env::current_exe().expect("Failed to get current executable path");
      let dest = InstallInfo::get_roxy_cli_path().join("roxy-cli");
      fs::copy(self_path, &dest).expect("Failed to copy executable");

      // {:?} nicely provides us with quotation marks lol
      let command = format!("{:?} start", dest);
      Command::new("sh")
        .args(&[
          "-c",
          format!("echo '{}' >> ~/.config/autostart/roxy", command.as_str()).as_str(),
        ])
        .output()
        .expect("Failed to enable autostart");
    }
  }

  pub fn disable() {
    #[cfg(windows)]
    Command::new("reg")
      .args([
        "delete",
        "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "/v",
        "Roxy",
        "/f",
      ])
      .output()
      .expect("Failed to disable autostart");

    #[cfg(unix)]
    Command::new("rm")
      .args(&["~/.config/autostart/roxy"])
      .output()
      .expect("Failed to disable autostart");
  }
}
