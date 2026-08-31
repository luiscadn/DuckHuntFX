package com.luiscadn.duckhunt.controller;

import com.luiscadn.duckhunt.DuckHuntApp;
import javafx.animation.KeyFrame;
import javafx.animation.PauseTransition;
import javafx.animation.Timeline;
import javafx.animation.TranslateTransition;
import javafx.application.Platform;
import javafx.event.ActionEvent;
import javafx.fxml.FXML;
import javafx.scene.Cursor;
import javafx.scene.Node;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.image.Image;
import javafx.scene.image.ImageView;
import javafx.scene.input.MouseEvent;
import javafx.scene.layout.AnchorPane;
import javafx.util.Duration;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Controller managing game state, duck spawns, special abilities, and score tracking.
 */
public class GameController {
    @FXML
    private AnchorPane gamePane;

    @FXML
    private Label scoreLabel;

    @FXML
    private Label ammoLabel;

    @FXML
    private ImageView heart1, heart2, heart3, weapon;

    @FXML
    private ImageView bullet1, bullet2, bullet3, bullet4, bullet5;

    @FXML
    private ImageView background;

    @FXML
    private Button freezeTimeButton;

    @FXML
    private Button doubleShotButton;

    @FXML
    private Button clearDucksButton;

    private int score = 0;
    private int level = 1;
    private double duckSpeed = 3.0;
    private int lives = 3;
    private int ammo = 5;
    private int pointsToNextLevel = 5;
    private boolean doubleShot = false;
    private boolean freezeTime = false;
    private boolean clearDucks = false;
    private boolean isTimeFrozen = false;
    private boolean duckClicked = false;

    private DuckHuntApp mainApp;
    private ScheduledExecutorService scheduler;
    private final List<TranslateTransition> activeDuckAnimations = new ArrayList<>();
    private ImageView customCursor;
    private final Random random = new Random();

    @FXML
    public void initialize() {
        if (scheduler == null || scheduler.isShutdown()) {
            scheduler = Executors.newScheduledThreadPool(2);
        }

        gamePane.setOnMouseClicked(this::handleMiss);
        showHearts();
        showAmmo();

        freezeTimeButton.setDisable(true);
        doubleShotButton.setDisable(true);
        clearDucksButton.setDisable(true);

        setupCustomCursor();
        startLevel();
    }

    private void pauseDuckAnimations() {
        for (TranslateTransition animation : activeDuckAnimations) {
            animation.pause();
        }
    }

    private void resumeDuckAnimations() {
        for (TranslateTransition animation : activeDuckAnimations) {
            animation.play();
        }
    }

    private void restartGame() {
        stop();

        score = 0;
        level = 1;
        duckSpeed = 3.0;
        lives = 3;
        ammo = 5;
        pointsToNextLevel = 5;
        doubleShot = false;
        freezeTime = false;
        isTimeFrozen = false;
        clearDucks = false;

        gamePane.getChildren().clear();

        // Reconstruir elementos del juego
        if (background != null) gamePane.getChildren().add(background);
        gamePane.getChildren().addAll(
                heart1, heart2, heart3, weapon,
                bullet1, bullet2, bullet3, bullet4, bullet5,
                scoreLabel, ammoLabel,
                freezeTimeButton, doubleShotButton, clearDucksButton
        );

        scoreLabel.setText("Puntuación: 0");
        initialize();
    }

    private void handleMiss(MouseEvent event) {
        duckClicked = false;

        if (event.getTarget() instanceof ImageView targetView) {
            if ("duck".equals(targetView.getId())) {
                handleDuckClick(targetView);
                duckClicked = true;
                return;
            }
        }
        handleMissedClick();
    }

    private void handleDuckClick(ImageView duck) {
        if (duckClicked && ammo > 0) {
            ammo--;
            showAmmo();
        }
        score += doubleShot ? 2 : 1;
        scoreLabel.setText("Puntuación: " + score);

        try (InputStream deadStream = getClass().getResourceAsStream("/com/luiscadn/duckhunt/duck_dead.png")) {
            if (deadStream != null) {
                ImageView duckDead = new ImageView(new Image(deadStream));
                duckDead.setFitWidth(60);
                duckDead.setFitHeight(60);
                duckDead.setLayoutX(duck.getLayoutX());
                duckDead.setLayoutY(duck.getLayoutY());
                gamePane.getChildren().remove(duck);
                gamePane.getChildren().add(duckDead);

                TranslateTransition fall = new TranslateTransition(Duration.seconds(1), duckDead);
                fall.setByY(300);
                fall.setOnFinished(e -> gamePane.getChildren().remove(duckDead));
                fall.play();
            } else {
                gamePane.getChildren().remove(duck);
            }
        } catch (Exception e) {
            gamePane.getChildren().remove(duck);
        }

        if (score >= pointsToNextLevel) {
            nextLevel();
        } else {
            generateDuckWithDelay(1000);
        }
    }

    private void handleMissedClick() {
        if (!duckClicked && ammo > 0) {
            ammo--;
            showAmmo();
        } else if (ammo <= 0) {
            loseLife();
            showDogLaughing();
        }
    }

    private void showAmmo() {
        ammoLabel.setText("Munición: " + ammo);
        bullet1.setVisible(ammo >= 1);
        bullet2.setVisible(ammo >= 2);
        bullet3.setVisible(ammo >= 3);
        bullet4.setVisible(ammo >= 4);
        bullet5.setVisible(ammo >= 5);
    }

    private void startLevel() {
        showLevelScreen();
        int maxDucks = 5 + level * 2;
        for (int i = 0; i < maxDucks; i++) {
            generateDuckWithDelay(i * 1000L);
        }
    }

    private void generateDuckWithDelay(long delay) {
        if (scheduler == null || scheduler.isShutdown()) return;
        scheduler.schedule(this::createDuck, delay, TimeUnit.MILLISECONDS);
    }

    private void showLevelScreen() {
        Label levelLabel = new Label("Nivel " + level);
        levelLabel.setStyle("-fx-font-size: 48px; -fx-font-weight: bold; -fx-text-fill: white; -fx-effect: dropshadow(gaussian, black, 8, 0, 2, 2);");
        gamePane.getChildren().add(levelLabel);

        Platform.runLater(() -> {
            levelLabel.setLayoutX(Math.max(10, gamePane.getWidth() / 2 - 80));
            levelLabel.setLayoutY(Math.max(10, gamePane.getHeight() / 2 - 40));
        });

        PauseTransition pause = new PauseTransition(Duration.seconds(2));
        pause.setOnFinished(event -> gamePane.getChildren().remove(levelLabel));
        pause.play();
    }

    private void animateDuck(ImageView duck) {
        try {
            Image duck1 = new Image(getClass().getResourceAsStream("/com/luiscadn/duckhunt/duck1.png"));
            Image duck2 = new Image(getClass().getResourceAsStream("/com/luiscadn/duckhunt/duck2.png"));
            Image duck3 = new Image(getClass().getResourceAsStream("/com/luiscadn/duckhunt/duck3.png"));

            Timeline timeline = new Timeline(
                    new KeyFrame(Duration.millis(200), e -> duck.setImage(duck1)),
                    new KeyFrame(Duration.millis(400), e -> duck.setImage(duck2)),
                    new KeyFrame(Duration.millis(600), e -> duck.setImage(duck3))
            );
            timeline.setCycleCount(Timeline.INDEFINITE);
            timeline.play();
        } catch (Exception ignored) {}
    }

    private void createDuck() {
        if (isTimeFrozen) return;

        Platform.runLater(() -> {
            double paneWidth = gamePane.getWidth() > 100 ? gamePane.getWidth() : 800;
            double paneHeight = gamePane.getHeight() > 100 ? gamePane.getHeight() : 600;

            double x = random.nextInt(Math.max(1, (int) paneWidth - 100));
            double y = random.nextInt(Math.max(1, (int) (paneHeight * 0.6)));

            Image duckImg = new Image(getClass().getResourceAsStream("/com/luiscadn/duckhunt/duck.png"));
            ImageView duck = new ImageView(duckImg);
            duck.setFitWidth(60);
            duck.setFitHeight(60);
            duck.setLayoutX(x);
            duck.setLayoutY(y);
            duck.setId("duck");
            gamePane.getChildren().add(duck);

            duck.setOnMouseClicked(event -> {
                handleDuckClick(duck);
                event.consume();
            });

            animateDuck(duck);

            TranslateTransition fly = new TranslateTransition(Duration.seconds(duckSpeed), duck);
            fly.setByX(random.nextInt(300) - 150);
            fly.setByY(random.nextInt(200) - 100);
            fly.setOnFinished(event -> {
                gamePane.getChildren().remove(duck);
                activeDuckAnimations.remove(fly);
            });
            activeDuckAnimations.add(fly);
            fly.play();
        });
    }

    private void loseLife() {
        lives--;
        showHearts();
        ammo = 5;
        showAmmo();
        if (lives <= 0) {
            endGame();
        }
    }

    private void showHearts() {
        heart1.setVisible(lives >= 1);
        heart2.setVisible(lives >= 2);
        heart3.setVisible(lives >= 3);
    }

    private void showDogLaughing() {
        try (InputStream dogStream = getClass().getResourceAsStream("/com/luiscadn/duckhunt/dogRiendo.png")) {
            if (dogStream == null) return;
            ImageView dogLaughing = new ImageView(new Image(dogStream));
            dogLaughing.setFitWidth(180);
            dogLaughing.setFitHeight(140);
            dogLaughing.setLayoutX(310);
            dogLaughing.setLayoutY(gamePane.getHeight() > 200 ? gamePane.getHeight() - 210 : 390);
            gamePane.getChildren().add(dogLaughing);

            PauseTransition pause = new PauseTransition(Duration.seconds(2));
            pause.setOnFinished(event -> gamePane.getChildren().remove(dogLaughing));
            pause.play();
        } catch (Exception ignored) {}
    }

    private void showDog() {
        try (InputStream dogStream = getClass().getResourceAsStream("/com/luiscadn/duckhunt/dog1.png")) {
            if (dogStream == null) return;
            ImageView dog = new ImageView(new Image(dogStream));
            dog.setFitWidth(180);
            dog.setFitHeight(140);
            dog.setLayoutX(310);
            dog.setLayoutY(gamePane.getHeight() > 200 ? gamePane.getHeight() - 210 : 390);
            gamePane.getChildren().add(dog);

            PauseTransition pause = new PauseTransition(Duration.seconds(2));
            pause.setOnFinished(event -> gamePane.getChildren().remove(dog));
            pause.play();
        } catch (Exception ignored) {}
    }

    @FXML
    public void handleDoubleShotButtonClick(ActionEvent event) {
        if (level >= 2 && !doubleShot) {
            doubleShot = true;
            doubleShotButton.setDisable(true);
            if (scheduler != null && !scheduler.isShutdown()) {
                scheduler.schedule(() -> {
                    doubleShot = false;
                    Platform.runLater(() -> doubleShotButton.setDisable(false));
                }, 10, TimeUnit.SECONDS);
            }
        }
    }

    @FXML
    private void handleClearDucksButtonClick() {
        if (clearDucks && !clearDucksButton.isDisable()) {
            clearDucksButton.setDisable(true);
            activateClearDucks();

            if (scheduler != null && !scheduler.isShutdown()) {
                scheduler.schedule(() -> {
                    Platform.runLater(() -> clearDucksButton.setDisable(false));
                }, 5, TimeUnit.SECONDS);
            }
        }
    }

    private void activateClearDucks() {
        List<Node> ducksToRemove = new ArrayList<>();
        for (Node node : gamePane.getChildren()) {
            if (node instanceof ImageView && "duck".equals(node.getId())) {
                ducksToRemove.add(node);
                score += doubleShot ? 2 : 1;
            }
        }
        gamePane.getChildren().removeAll(ducksToRemove);
        scoreLabel.setText("Puntuación: " + score);
    }

    private void acquireSpecialAbility() {
        switch (level) {
            case 2 -> doubleShotButton.setDisable(false);
            case 3 -> {
                freezeTime = true;
                freezeTimeButton.setDisable(false);
            }
            case 4 -> {
                clearDucks = true;
                clearDucksButton.setDisable(false);
            }
            default -> {}
        }
    }

    @FXML
    private void handleFreezeTimeButtonClick() {
        if (freezeTime && !isTimeFrozen) {
            freezeTimeButton.setDisable(true);
            isTimeFrozen = true;
            pauseDuckAnimations();

            if (scheduler != null && !scheduler.isShutdown()) {
                scheduler.schedule(() -> Platform.runLater(() -> {
                    isTimeFrozen = false;
                    resumeDuckAnimations();
                    freezeTimeButton.setDisable(false);
                }), 10, TimeUnit.SECONDS);
            }
        }
    }

    private void endGame() {
        stop();
        gamePane.setOnMouseClicked(null);
        if (level > 5) {
            showVictoryScreen();
        } else {
            showGameOverScreen();
        }
    }

    private void showGameOverScreen() {
        Label gameOverLabel = new Label("Game Over");
        gameOverLabel.setStyle("-fx-font-size: 48px; -fx-text-fill: #e74c3c; -fx-font-weight: bold; -fx-effect: dropshadow(gaussian, black, 8, 0, 2, 2);");
        gamePane.getChildren().add(gameOverLabel);
        gameOverLabel.setLayoutX(gamePane.getWidth() / 2 - 130);
        gameOverLabel.setLayoutY(gamePane.getHeight() / 2 - 60);

        Button retryButton = new Button("Jugar de nuevo");
        retryButton.setStyle("-fx-font-size: 20px; -fx-background-color: #27ae60; -fx-text-fill: white; -fx-padding: 8 16;");
        retryButton.setLayoutX(gamePane.getWidth() / 2 - 90);
        retryButton.setLayoutY(gamePane.getHeight() / 2 + 20);
        retryButton.setOnAction(event -> restartGame());
        gamePane.getChildren().add(retryButton);
    }

    private void showVictoryScreen() {
        Label victoryLabel = new Label("¡Victoria!");
        victoryLabel.setStyle("-fx-font-size: 48px; -fx-text-fill: #2ecc71; -fx-font-weight: bold; -fx-effect: dropshadow(gaussian, black, 8, 0, 2, 2);");
        gamePane.getChildren().add(victoryLabel);
        victoryLabel.setLayoutX(gamePane.getWidth() / 2 - 100);
        victoryLabel.setLayoutY(gamePane.getHeight() / 2 - 60);

        Button retryButton = new Button("Jugar de nuevo");
        retryButton.setStyle("-fx-font-size: 20px; -fx-background-color: #27ae60; -fx-text-fill: white; -fx-padding: 8 16;");
        retryButton.setLayoutX(gamePane.getWidth() / 2 - 90);
        retryButton.setLayoutY(gamePane.getHeight() / 2 + 20);
        retryButton.setOnAction(event -> restartGame());
        gamePane.getChildren().add(retryButton);
    }

    public void setMainApp(DuckHuntApp mainApp) {
        this.mainApp = mainApp;
    }

    private void showLevelTransition() {
        showLevelScreen();
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.scheduleAtFixedRate(this::createDuck, 2, 1, TimeUnit.SECONDS);
        }
    }

    public void stop() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdownNow();
        }
        for (TranslateTransition anim : activeDuckAnimations) {
            anim.stop();
        }
        activeDuckAnimations.clear();
    }

    private void nextLevel() {
        level++;
        pointsToNextLevel += 5;
        duckSpeed *= 0.9;
        ammo += 5;
        acquireSpecialAbility();
        if (level > 5) {
            endGame();
        } else {
            showLevelTransition();
            if (level > 1) {
                showDog();
            }
        }
    }

    private void setupCustomCursor() {
        try (InputStream cursorStream = getClass().getResourceAsStream("/com/luiscadn/duckhunt/pointer.png")) {
            if (cursorStream == null) return;
            customCursor = new ImageView(new Image(cursorStream));
            customCursor.setFitWidth(40);
            customCursor.setFitHeight(40);
            customCursor.setMouseTransparent(true);
            gamePane.getChildren().add(customCursor);

            gamePane.setCursor(Cursor.NONE);
            gamePane.setOnMouseMoved(event -> {
                customCursor.setLayoutX(event.getX() - customCursor.getFitWidth() / 2);
                customCursor.setLayoutY(event.getY() - customCursor.getFitHeight() / 2);
            });
        } catch (Exception ignored) {}
    }
}
