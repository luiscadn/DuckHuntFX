module com.luiscadn.duckhunt {
    requires javafx.controls;
    requires javafx.fxml;

    opens com.luiscadn.duckhunt to javafx.fxml;
    opens com.luiscadn.duckhunt.controller to javafx.fxml;
    opens com.luiscadn.duckhunt.model to javafx.fxml;
    opens com.luiscadn.duckhunt.view to javafx.fxml;

    exports com.luiscadn.duckhunt;
    exports com.luiscadn.duckhunt.controller;
    exports com.luiscadn.duckhunt.model;
    exports com.luiscadn.duckhunt.view;
}