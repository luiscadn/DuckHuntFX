# 🦆 Duck Hunt FX

[![Java](https://img.shields.io/badge/Java-21-orange.svg?style=flat&logo=openjdk)](https://openjdk.org/)
[![JavaFX](https://img.shields.io/badge/JavaFX-21-blue.svg?style=flat)](https://openjfx.io/)
[![Build Tool](https://img.shields.io/badge/Maven-3.9-C71A36.svg?style=flat&logo=apachemaven)](https://maven.apache.org/)
[![Tests](https://img.shields.io/badge/JUnit-5.10-25A162.svg?style=flat&logo=junit5)](https://junit.org/junit5/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A modern desktop remake of the classic retro NES arcade game **Duck Hunt**, built with **Java 21** and **JavaFX 21**. Features custom crosshair mechanics, animated sprite physics, special tactical power-ups, multi-level difficulty progression, and player authentication.

---

## 🎮 Gameplay & Key Features

- **Retro Arcade Mechanics:** Faithful recreation of sprite animations (flying ducks, falling animation, custom shotgun crosshair).
- **Tactical Special Abilities:**
  - ⏱️ **Freeze Time:** Pauses all flying ducks for 10 seconds to line up easy shots.
  - 💥 **Double Shot:** Multiplies points earned per hit for a limited duration.
  - 💣 **Clear Ducks:** Tactical nuke clearing all active targets on screen simultaneously.
- **Dynamic Difficulty:** Flying speed and ducks per wave scale dynamically with each level.
- **Classic Nostalgia:** Includes the infamous hunting dog laughing at missed shots.
- **User Authentication:** Player profile registration and login system with domain validation.
- **Automated Testing:** Unit test suite with JUnit 5 covering model and service layers.

---

## 🛠️ Tech Stack & Architecture

- **Language:** Java 21 (LTS)
- **UI Framework:** JavaFX 21 (Modular FXML + Programmatic Views)
- **Build System:** Apache Maven (with included cross-platform wrapper `./mvnw`)
- **Testing:** JUnit 5 Jupiter
- **CI/CD:** GitHub Actions Continuous Integration

### Architecture Overview

```
com.luiscadn.duckhunt/
├── DuckHuntApp.java       # Application entry point and stage lifecycle manager
├── controller/            # MVC Controllers
│   ├── GameController.java       # Game loop, sprite updates, abilities & collision
│   ├── MenuController.java       # Main menu and navigation
│   ├── LoginController.java      # Authentication logic
│   └── RegisterController.java   # Player registration
├── model/                 # Domain Entities & Business Services
│   ├── User.java                 # Player domain model
│   └── UserService.java          # Authentication & player registry service
└── view/                  # Presentation Layer
    ├── LoginView.java            # Login UI
    └── RegisterView.java         # Registration UI
```

---

## 🚀 Getting Started

### Prerequisites

- **JDK 21 or later** installed.
  - On macOS (via Homebrew):
    ```bash
    brew install openjdk@21
    ```
  - On Linux (Ubuntu/Debian):
    ```bash
    sudo apt install openjdk-21-jdk
    ```
  - On Windows: Download from [Adoptium Temurin](https://adoptium.net/).

### Building from Source

Clone the repository and build using the included Maven Wrapper:

```bash
git clone https://github.com/luiscadn/DuckHuntFX.git
cd DuckHuntFX

# Ensure the Maven wrapper is executable (Linux/macOS)
chmod +x mvnw

# Run automated tests and package
./mvnw clean package
```

### Running the Game

**Option 1: Using the JavaFX Maven plugin (Recommended)**
```bash
./mvnw javafx:run
```

**Option 2: Running the packaged JAR directly**
```bash
java -jar target/duckhunt-fx-1.0.0.jar
```

---

## 🕹️ Controls

| Action | Control |
| :--- | :--- |
| **Aim** | Move Mouse (Custom Crosshair) |
| **Shoot** | Left Mouse Click |
| **Freeze Time** | Ability Button (Level 3+) |
| **Double Shot** | Ability Button (Level 2+) |
| **Clear Ducks** | Ability Button (Level 4+) |

---

## 🧪 Testing

Run the automated JUnit 5 test suite:

```bash
./mvnw test
```

Test reports are generated automatically under `target/surefire-reports/`.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
