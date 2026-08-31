package com.luiscadn.duckhunt.view;

import com.luiscadn.duckhunt.DuckHuntApp;
import com.luiscadn.duckhunt.controller.LoginController;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Parent;
import javafx.scene.control.Button;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.scene.image.Image;
import javafx.scene.layout.*;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.scene.text.FontWeight;
import javafx.scene.text.Text;

import java.io.InputStream;

/**
 * View component for the Login screen.
 */
public class LoginView {
    private final LoginController controller;

    public LoginView(DuckHuntApp main) {
        this.controller = new LoginController();
        this.controller.setMainApp(main);
    }

    public Parent load() {
        VBox container = new VBox();
        container.setAlignment(Pos.CENTER);
        container.setSpacing(20);
        container.setPadding(new Insets(40));

        try (InputStream bgStream = getClass().getResourceAsStream("/com/luiscadn/duckhunt/login.jpg")) {
            if (bgStream != null) {
                Image backgroundImage = new Image(bgStream);
                BackgroundSize backgroundSize = new BackgroundSize(BackgroundSize.AUTO, BackgroundSize.AUTO, false, false, true, false);
                BackgroundImage backgroundImg = new BackgroundImage(backgroundImage, BackgroundRepeat.NO_REPEAT, BackgroundRepeat.NO_REPEAT, BackgroundPosition.CENTER, backgroundSize);
                container.setBackground(new Background(backgroundImg));
            }
        } catch (Exception e) {
            container.setStyle("-fx-background-color: #2c3e50;");
        }

        Text titleText = new Text("DUCK HUNT");
        titleText.setFont(Font.font("Arial", FontWeight.BOLD, 36));
        titleText.setFill(Color.WHITE);

        TextField codeField = new TextField();
        codeField.setPromptText("Usuario / Código");
        codeField.setMaxWidth(260);

        PasswordField passwordField = new PasswordField();
        passwordField.setPromptText("Contraseña");
        passwordField.setMaxWidth(260);

        Button logButton = new Button("Iniciar Sesión");
        logButton.setStyle("-fx-background-color: #27ae60; -fx-text-fill: white; -fx-font-weight: bold; -fx-padding: 8 16;");

        Button registerButton = new Button("Crear Cuenta");
        registerButton.setStyle("-fx-background-color: transparent; -fx-border-color: white; -fx-text-fill: white; -fx-padding: 8 16;");

        HBox buttonBox = new HBox(12);
        buttonBox.setAlignment(Pos.CENTER);
        buttonBox.getChildren().addAll(logButton, registerButton);

        container.getChildren().addAll(titleText, codeField, passwordField, buttonBox);

        logButton.setOnAction(e -> controller.onLoginClick(codeField.getText(), passwordField.getText()));
        registerButton.setOnAction(e -> controller.onRegisterClick());

        // Allow pressing Enter in password field to submit
        passwordField.setOnAction(e -> controller.onLoginClick(codeField.getText(), passwordField.getText()));

        return container;
    }

    public LoginController getController() {
        return controller;
    }
}
