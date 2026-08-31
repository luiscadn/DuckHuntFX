package com.luiscadn.duckhunt.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("UserService Authentication and Registration Tests")
class UserServiceTest {

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = UserService.getInstance();
    }

    @Test
    @DisplayName("Should successfully authenticate existing default player")
    void testDefaultPlayerLogin() {
        boolean authenticated = userService.logIn("player1", "1234");
        assertTrue(authenticated, "Default player1 should log in with correct password");
    }

    @Test
    @DisplayName("Should reject login with invalid password")
    void testInvalidPasswordLogin() {
        boolean authenticated = userService.logIn("player1", "wrong_password");
        assertFalse(authenticated, "Login should fail with incorrect password");
    }

    @Test
    @DisplayName("Should reject login with non-existent user")
    void testNonExistentUserLogin() {
        boolean authenticated = userService.logIn("unknown_user", "password");
        assertFalse(authenticated, "Non-existent user should not be able to log in");
    }

    @Test
    @DisplayName("Should register a new user and allow login")
    void testAddNewUser() {
        String testCode = "tester_" + System.currentTimeMillis();
        userService.addUser(testCode, "mypassword", "Test", "User");

        assertTrue(userService.userExists(testCode));
        assertTrue(userService.logIn(testCode, "mypassword"));
    }

    @Test
    @DisplayName("Should throw exception when attempting to register duplicate user code")
    void testDuplicateUserRegistration() {
        String duplicateCode = "dup_" + System.currentTimeMillis();
        userService.addUser(duplicateCode, "pass1", "First", "User");

        IllegalArgumentException thrown = assertThrows(IllegalArgumentException.class, () -> {
            userService.addUser(duplicateCode, "pass2", "Second", "User");
        });

        assertTrue(thrown.getMessage().contains("already exists"));
    }

    @Test
    @DisplayName("Should validate empty code or password upon registration")
    void testInvalidRegistrationInputs() {
        assertThrows(IllegalArgumentException.class, () -> {
            userService.addUser("", "validPass", "Name", "Lastname");
        });

        assertThrows(IllegalArgumentException.class, () -> {
            userService.addUser("validCode", "", "Name", "Lastname");
        });
    }
}
