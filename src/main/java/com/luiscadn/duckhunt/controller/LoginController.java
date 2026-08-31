package com.luiscadn.duckhunt.controller;

import com.luiscadn.duckhunt.DuckHuntApp;
import com.luiscadn.duckhunt.model.UserService;
import com.luiscadn.duckhunt.view.RegisterView;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.ButtonType;
import javafx.scene.layout.Background;
import javafx.scene.layout.BackgroundFill;
import javafx.scene.layout.CornerRadii;
import javafx.scene.paint.Color;

/**
 * Controller handling user authentication and navigation to registration.
 */
public class LoginController {
    private DuckHuntApp mainApp;

    public void setMainApp(DuckHuntApp mainApp) {
        this.mainApp = mainApp;
    }

    public void onLoginClick(String code, String password) {
        if (code == null || code.trim().isEmpty() || password == null || password.trim().isEmpty()) {
            showErrorAlert("Por favor ingresa tanto el código como la contraseña.");
            return;
        }

        if (UserService.getInstance().logIn(code, password)) {
            showInfoAlert("¡Inicio de sesión exitoso!");
            mainApp.showMenuAfterLogin();
        } else {
            showErrorAlert("Credenciales incorrectas. Verifica tu código y contraseña.");
        }
    }

    public void onRegisterClick() {
        if (mainApp != null) {
            Scene scene = new Scene(new RegisterView(mainApp).load(), 400, 520);
            mainApp.setScene(scene);
        }
    }

    private void showInfoAlert(String message) {
        showAlert(Alert.AlertType.INFORMATION, "Información", message);
    }

    private void showErrorAlert(String message) {
        showAlert(Alert.AlertType.ERROR, "Error", message);
    }

    private void showAlert(Alert.AlertType type, String title, String message) {
        Alert alert = new Alert(type, message, ButtonType.OK);
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.getDialogPane().setBackground(new Background(new BackgroundFill(Color.WHITE, new CornerRadii(10), null)));
        alert.getDialogPane().setStyle("-fx-border-color: #3498db; -fx-border-width: 2px;");
        alert.getDialogPane().lookupButton(ButtonType.OK).setStyle("-fx-background-color: #3498db; -fx-text-fill: white;");
        alert.showAndWait();
    }
}
