package com.luiscadn.duckhunt.controller;

import com.luiscadn.duckhunt.DuckHuntApp;
import com.luiscadn.duckhunt.model.UserService;
import com.luiscadn.duckhunt.view.LoginView;
import javafx.scene.Scene;
import javafx.scene.control.Alert;

/**
 * Controller handling new user registration.
 */
public class RegisterController {
    private DuckHuntApp mainApp;

    public void setMainApp(DuckHuntApp mainApp) {
        this.mainApp = mainApp;
    }

    public void onRegisterClick(String code, String password, String name, String lastname) {
        try {
            UserService.getInstance().addUser(code, password, name, lastname);
            showRegistrationSuccessAlert();
            goToLogin();
        } catch (IllegalArgumentException ex) {
            showRegistrationErrorAlert(ex.getMessage());
        } catch (Exception ex) {
            showRegistrationErrorAlert("Error inesperado: " + ex.getMessage());
        }
    }

    public void onLoginClick() {
        goToLogin();
    }

    private void goToLogin() {
        if (mainApp != null) {
            mainApp.showLoginScene();
        }
    }

    private void showRegistrationSuccessAlert() {
        Alert alert = new Alert(Alert.AlertType.INFORMATION);
        alert.setTitle("Registro Exitoso");
        alert.setHeaderText(null);
        alert.setContentText("¡Cuenta creada correctamente! Ahora puedes iniciar sesión.");
        alert.showAndWait();
    }

    private void showRegistrationErrorAlert(String errorMessage) {
        Alert alert = new Alert(Alert.AlertType.ERROR);
        alert.setTitle("Error de Registro");
        alert.setHeaderText(null);
        alert.setContentText(errorMessage);
        alert.showAndWait();
    }
}
