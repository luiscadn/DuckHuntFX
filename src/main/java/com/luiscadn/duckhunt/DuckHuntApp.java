package com.luiscadn.duckhunt;

import com.luiscadn.duckhunt.controller.GameController;
import com.luiscadn.duckhunt.controller.MenuController;
import com.luiscadn.duckhunt.view.LoginView;
import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.image.Image;
import javafx.stage.Stage;

import java.io.IOException;
import java.io.InputStream;

/**
 * Main application entrypoint for DuckHuntFX.
 */
public class DuckHuntApp extends Application {
    private Stage stage;
    private GameController activeGameController;

    @Override
    public void start(Stage stage) {
        this.stage = stage;
        this.stage.setTitle("Duck Hunt FX");

        try (InputStream iconStream = getClass().getResourceAsStream("/com/luiscadn/duckhunt/icon.png")) {
            if (iconStream != null) {
                stage.getIcons().add(new Image(iconStream));
            }
        } catch (Exception e) {
            System.err.println("Could not load application icon: " + e.getMessage());
        }

        stage.setResizable(false);
        stage.setOnCloseRequest(event -> shutdown());

        showLoginScene();
        stage.show();
    }

    public void setScene(Scene scene) {
        this.stage.setScene(scene);
    }

    public void showLoginScene() {
        LoginView loginView = new LoginView(this);
        Scene sceneLogin = new Scene(loginView.load(), 400, 500);
        setScene(sceneLogin);
        stage.sizeToScene();
        stage.centerOnScreen();
    }

    public void showMenuAfterLogin() {
        loadMenu();
    }

    public void loadMenu() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/com/luiscadn/duckhunt/menu-view.fxml"));
            Parent root = loader.load();

            MenuController controller = loader.getController();
            if (controller != null) {
                controller.setMainApp(this);
            }

            Scene menuScene = new Scene(root, 700, 600);
            setScene(menuScene);
            stage.sizeToScene();
            stage.centerOnScreen();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void startGame() {
        try {
            FXMLLoader fxmlLoader = new FXMLLoader(getClass().getResource("/com/luiscadn/duckhunt/game-view.fxml"));
            Parent root = fxmlLoader.load();

            activeGameController = fxmlLoader.getController();
            if (activeGameController == null) {
                throw new IllegalStateException("GameController failed to load from FXML");
            }
            activeGameController.setMainApp(this);

            Scene gameScene = new Scene(root, 800, 600);
            setScene(gameScene);
            stage.sizeToScene();
            stage.centerOnScreen();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public void viewScores() {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Leaderboard");
        alert.setHeaderText("Top Hunters");
        alert.setContentText("1. Luis - 1250 pts\n2. Hunter99 - 950 pts\n3. RetroGamer - 720 pts");
        alert.showAndWait();
    }

    public void shutdown() {
        if (activeGameController != null) {
            activeGameController.stop();
        }
    }

    public static void main(String[] args) {
        launch(args);
    }
}
