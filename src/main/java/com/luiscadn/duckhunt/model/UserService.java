package com.luiscadn.duckhunt.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Service managing user registration and authentication.
 */
public class UserService {
    private static final UserService INSTANCE = new UserService();
    private final List<User> users = new ArrayList<>();

    private UserService() {
        // Pre-populate with a demo user for quick testing if needed
        users.add(new User("player1", "1234", "Luis", "Player"));
    }

    public static UserService getInstance() {
        return INSTANCE;
    }

    public synchronized void addUser(String code, String password, String name, String lastname) throws IllegalArgumentException {
        if (code == null || code.trim().isEmpty()) {
            throw new IllegalArgumentException("User code cannot be empty.");
        }
        if (password == null || password.trim().isEmpty()) {
            throw new IllegalArgumentException("Password cannot be empty.");
        }
        if (findUserByCode(code).isPresent()) {
            throw new IllegalArgumentException("User with code '" + code + "' already exists.");
        }
        users.add(new User(code.trim(), password, name != null ? name.trim() : "", lastname != null ? lastname.trim() : ""));
    }

    public synchronized boolean logIn(String code, String password) {
        if (code == null || password == null) {
            return false;
        }
        return users.stream()
                .anyMatch(u -> u.getCode().equalsIgnoreCase(code.trim()) && u.getPassword().equals(password));
    }

    public synchronized Optional<User> findUserByCode(String code) {
        if (code == null) return Optional.empty();
        return users.stream()
                .filter(u -> u.getCode().equalsIgnoreCase(code.trim()))
                .findFirst();
    }

    public synchronized boolean userExists(String code) {
        return findUserByCode(code).isPresent();
    }

    public synchronized List<User> getAllUsers() {
        return Collections.unmodifiableList(new ArrayList<>(users));
    }
}
