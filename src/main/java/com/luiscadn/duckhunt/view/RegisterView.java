package com.luiscadn.duckhunt.view;

import com.luiscadn.duckhunt.DuckHuntApp;
import com.luiscadn.duckhunt.controller.RegisterController;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Parent;
import javafx.scene.control.*;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.layout.*;

import java.io.InputStream;

/**
 * View component for the User Registration screen.
 */
public class RegisterView {
    private final RegisterController controller;

    public RegisterView(DuckHuntApp main) {
        this.controller = new RegisterController();
        this.controller.setMainApp(main);
    }

    public Parent load() {
        VBox container = new VBox();
        container.setAlignment(Pos.CENTER);
        container.setSpacing(16);
        container.setPadding(new Insets(30, 40, 30, 40));
        container.setStyle("-fx-background-color: #f4f6f8;");

        Label titleLabel = new Label("Registro de Jugador");
        titleLabel.setStyle("-fx-font-size: 22px; -fx-font-weight: bold; -fx-text-fill: #2c3e50;");

        GridPane formGrid = new GridPane();
        formGrid.setAlignment(Pos.CENTER);
        formGrid.setHgap(10);
        formGrid.setVgap(12);

        TextField codeField = new TextField();
        codeField.setPromptText("Ej: cazador01");

        PasswordField passwordField = new PasswordField();
        passwordField.setPromptText("Contraseña");

        TextField nameField = new TextField();
        nameField.setPromptText("Tu nombre");

        TextField lastnameField = new TextField();
        lastnameField.setPromptText("Tu apellido");

        Button registerButton = new Button("Registrarse");
        registerButton.setStyle("-fx-background-color: #27ae60; -fx-text-fill: white; -fx-font-weight: bold; -fx-padding: 8 16;");
        try (InputStream iconStream = getClass().getResourceAsStream("/com/luiscadn/duckhunt/register_icon.png")) {
            if (iconStream != null) {
                ImageView registerIcon = new ImageView(new Image(iconStream));
                registerIcon.setFitWidth(16);
                registerIcon.setFitHeight(16);
                registerButton.setGraphic(registerIcon);
            }
        } catch (Exception ignored) {}

        Button logButton = new Button("¿Ya tienes cuenta? Iniciar Sesión");
        logButton.setStyle("-fx-background-color: #2980b9; -fx-text-fill: white; -fx-padding: 6 12;");
        try (InputStream iconStream = getClass().getResourceAsStream("/com/luiscadn/duckhunt/login_icon.png")) {
            if (iconStream != null) {
                ImageView logIcon = new ImageView(new Image(iconStream));
                logIcon.setFitWidth(16);
                logIcon.setFitHeight(16);
                logButton.setGraphic(logIcon);
            }
        } catch (Exception ignored) {}

        registerButton.setOnAction(e -> controller.onRegisterClick(
                codeField.getText(), passwordField.getText(), nameField.getText(), lastnameField.getText()));
        logButton.setOnAction(e -> controller.onLoginClick());

        formGrid.addRow(0, new Label("Código / ID:"), codeField);
        formGrid.addRow(1, new Label("Contraseña:"), passwordField);
        formGrid.addRow(2, new Label("Nombre:"), nameField);
        formGrid.addRow(3, new Label("Apellido:"), lastnameField);

        HBox actionBox = new HBox(registerButton);
        actionBox.setAlignment(Pos.CENTER);
        formGrid.add(actionBox, 0, 4, 2, 1);

        HBox loginLinkBox = new HBox(logButton);
        loginLinkBox.setAlignment(Pos.CENTER);
        formGrid.add(loginLinkBox, 0, 5, 2, 1);

        container.getChildren().addAll(titleLabel, formGrid);
        return container;
    }

    public RegisterController getController() {
        return controller;
    }
}
