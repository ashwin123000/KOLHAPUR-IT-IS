"""Regression tests for the unrestricted SHA256 password hashing flow."""

import sys

from utils.security import hash_password, verify_password


def test_case_1_short_password():
    """Test Case 1: Short password should work."""
    print("\n" + "=" * 70)
    print("TEST 1: Short Password (abc123XY)")
    print("=" * 70)
    try:
        password = "abc123XY"
        hashed = hash_password(password)
        verified = verify_password(password, hashed)

        print(f"Password hashed: {hashed[:50]}...")
        print(f"Password verified: {verified}")
        assert verified, "Password verification failed!"
        print("TEST 1 PASSED\n")
        return True
    except Exception as exc:
        print(f"TEST 1 FAILED: {exc}\n")
        return False


def test_case_2_long_password():
    """Test Case 2: Long password (200+ chars) must not crash."""
    print("=" * 70)
    print("TEST 2: Long Password (200+ characters)")
    print("=" * 70)
    try:
        password = "Aa1" + "x" * 197
        print(f"Password length: {len(password)} chars")

        hashed = hash_password(password)
        verified = verify_password(password, hashed)

        print(f"Password hashed: {hashed[:50]}...")
        print(f"Password verified: {verified}")
        assert verified, "Password verification failed!"
        print("TEST 2 PASSED\n")
        return True
    except Exception as exc:
        print(f"TEST 2 FAILED: {exc}\n")
        return False


def test_case_3_emoji_password():
    """Test Case 3: Password with Unicode and emoji must not crash."""
    print("=" * 70)
    print("TEST 3: Password with Unicode Characters")
    print("=" * 70)
    try:
        password = "Aa1🔐🚀Test123"
        print("Password contains unicode and emoji characters")
        print(f"UTF-8 byte length: {len(password.encode('utf-8'))} bytes")

        hashed = hash_password(password)
        verified = verify_password(password, hashed)

        print(f"Password hashed: {hashed[:50]}...")
        print(f"Password verified: {verified}")
        assert verified, "Password verification failed!"
        print("TEST 3 PASSED\n")
        return True
    except Exception as exc:
        print(f"TEST 3 FAILED: {exc}\n")
        return False


def test_case_4_very_long_password():
    """Test Case 4: Very long password remains supported."""
    print("=" * 70)
    print("TEST 4: Very Long Password")
    print("=" * 70)
    try:
        password = "Aa1" + ("x" * 997)
        print(f"Password length: {len(password)} chars")

        hashed = hash_password(password)
        verified = verify_password(password, hashed)

        print(f"Password hashed: {hashed[:50]}...")
        print(f"Password verified: {verified}")
        assert verified, "Password verification failed!"
        print("TEST 4 PASSED\n")
        return True
    except Exception as exc:
        print(f"TEST 4 FAILED: {exc}\n")
        return False


def test_case_5_mismatch_detection():
    """Test Case 5: Verify that wrong password is rejected."""
    print("=" * 70)
    print("TEST 5: Wrong Password Detection")
    print("=" * 70)
    try:
        password1 = "CorrectPassword123"
        password2 = "WrongPassword456"

        hashed = hash_password(password1)
        verified_correct = verify_password(password1, hashed)
        verified_wrong = verify_password(password2, hashed)

        print(f"Correct password verified: {verified_correct}")
        print(f"Wrong password rejected: {not verified_wrong}")
        assert verified_correct, "Correct password should verify!"
        assert not verified_wrong, "Wrong password should not verify!"
        print("TEST 5 PASSED\n")
        return True
    except Exception as exc:
        print(f"TEST 5 FAILED: {exc}\n")
        return False


def test_case_6_empty_password():
    """Test Case 6: Empty password is allowed."""
    print("=" * 70)
    print("TEST 6: Empty Password")
    print("=" * 70)
    try:
        password = ""
        hashed = hash_password(password)
        verified = verify_password(password, hashed)

        print(f"Empty password hash: {hashed}")
        print(f"Empty password verified: {verified}")
        assert verified, "Empty password should verify!"
        print("TEST 6 PASSED\n")
        return True
    except Exception as exc:
        print(f"TEST 6 FAILED: {exc}\n")
        return False


def test_case_7_unicode_and_emoji():
    """Test Case 7: Large Unicode and emoji passwords are supported."""
    print("=" * 70)
    print("TEST 7: Unicode and Emoji Password")
    print("=" * 70)
    try:
        password = "🔐🚀🌟" * 20
        hashed = hash_password(password)
        verified = verify_password(password, hashed)

        print(f"Password length: {len(password)} chars")
        print(f"UTF-8 byte length: {len(password.encode('utf-8'))} bytes")
        print(f"Password verified: {verified}")
        assert verified, "Unicode password should verify!"
        print("TEST 7 PASSED\n")
        return True
    except Exception as exc:
        print(f"TEST 7 FAILED: {exc}\n")
        return False


def main():
    """Run all test cases."""
    print("\n" + "#" * 70)
    print("# PASSWORD HASHING SYSTEM - TEST SUITE")
    print("# Testing unrestricted SHA256 password hashing")
    print("#" * 70)

    tests = [
        test_case_1_short_password,
        test_case_2_long_password,
        test_case_3_emoji_password,
        test_case_4_very_long_password,
        test_case_5_mismatch_detection,
        test_case_6_empty_password,
        test_case_7_unicode_and_emoji,
    ]

    results = [test_func() for test_func in tests]

    print("#" * 70)
    print("# TEST SUMMARY")
    print("#" * 70)
    passed = sum(results)
    total = len(results)
    print(f"Passed: {passed}/{total}")

    if passed == total:
        print("ALL TESTS PASSED - SHA256 password system is working!\n")
        return 0

    print(f"{total - passed} test(s) failed.\n")
    return 1


if __name__ == "__main__":
    sys.exit(main())
