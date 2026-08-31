package com.luiscadn.duckhunt.model;

import java.io.Serializable;
import java.util.Objects;

/**
 * Domain entity representing a registered player/user in the system.
 */
public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private String code;
    private String password;
    private String name;
    private String lastname;

    public User(String code, String password, String name, String lastname) {
        this.code = code;
        this.password = password;
        this.name = name;
        this.lastname = lastname;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getLastname() {
        return lastname;
    }

    public void setLastname(String lastname) {
        this.lastname = lastname;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(code, user.code);
    }

    @Override
    public int hashCode() {
        return Objects.hash(code);
    }

    @Override
    public String toString() {
        return "User{" +
                "code='" + code + '\'' +
                ", name='" + name + '\'' +
                ", lastname='" + lastname + '\'' +
                '}';
    }
}
