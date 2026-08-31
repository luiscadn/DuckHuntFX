package com.luiscadn.duckhunt.controller;

import com.luiscadn.duckhunt.DuckHuntApp;
import javafx.fxml.FXML;
import javafx.scene.control.Alert;
import javafx.scene.text.Text;

/**
 * Controller for the main menu screen.
 */
public class MenuController {
    private DuckHuntApp mainApp;

    @FXML
    private Text welcomeText;

    public void setMainApp(DuckHuntApp mainApp) {
        this.mainApp = mainApp;
    }

    @FXML
    protected void initialize() {
        if (welcomeText != null) {
            welcomeText.setText("¡Bienvenido a Duck Hunt!");
        }
    }

    @FXML
    protected void onStartGameButtonClick() {
        if (mainApp == null) {
            showError("Error de Aplicación", "La aplicación no está inicializada correctamente.");
            return;
        }
        mainApp.startGame();
    }

    @FXML
    protected void onViewScoreButtonClick() {
        if (mainApp != null) {
            mainApp.viewScores();
        }
    }

    @FXML
    protected void onExitButtonClick() {
        if (mainApp != null) {
            mainApp.shutdown();
        }
        System.exit(0);
    }

    private void showError(String title, String message) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }
}
