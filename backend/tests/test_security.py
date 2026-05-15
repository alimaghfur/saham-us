"""Tests for security utilities."""
from __future__ import annotations

import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)


def test_password_hashing():
    """Password hashing and verification works."""
    plain = "MySecretPassword123!"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True
    assert verify_password("wrong", hashed) is False


def test_access_token_creation():
    """Access token can be created and decoded."""
    token = create_access_token("user-123")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-123"
    assert payload["type"] == "access"


def test_refresh_token_creation():
    """Refresh token can be created and decoded."""
    token = create_refresh_token("user-456")
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "user-456"
    assert payload["type"] == "refresh"


def test_decode_invalid_token():
    """Invalid token returns None."""
    result = decode_token("not.a.valid.token")
    assert result is None


def test_decode_empty_token():
    """Empty token returns None."""
    result = decode_token("")
    assert result is None
