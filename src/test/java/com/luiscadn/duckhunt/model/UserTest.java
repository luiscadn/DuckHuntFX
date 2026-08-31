package com.luiscadn.duckhunt.model;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("User Domain Model Tests")
class UserTest {

    private User user;

    @BeforeEach
    void setUp() {
        user = new User("hunter01", "secret123", "Luis", "Developer");
    }

    @Test
    @DisplayName("Should create user with correct initial properties")
    void testUserInitialization() {
        assertEquals("hunter01", user.getCode());
        assertEquals("secret123", user.getPassword());
        assertEquals("Luis", user.getName());
        assertEquals("Developer", user.getLastname());
    }

    @Test
    @DisplayName("Should update user properties correctly")
    void testSetters() {
        user.setCode("hunter99");
        user.setPassword("newPass");
        user.setName("Carlos");
        user.setLastname("Cadena");

        assertEquals("hunter99", user.getCode());
        assertEquals("newPass", user.getPassword());
        assertEquals("Carlos", user.getName());
        assertEquals("Cadena", user.getLastname());
    }

    @Test
    @DisplayName("Users with same code should be equal")
    void testEquality() {
        User sameUser = new User("hunter01", "otherPass", "Other", "Name");
        User diffUser = new User("hunter02", "secret123", "Luis", "Developer");

        assertEquals(user, sameUser);
        assertNotEquals(user, diffUser);
        assertEquals(user.hashCode(), sameUser.hashCode());
    }
}
