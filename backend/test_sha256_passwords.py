"""Test SHA256 password system with no password length restrictions."""

from utils.security import hash_password, verify_password

print("=" * 70)
print("SHA256 PASSWORD SYSTEM TEST")
print("=" * 70)

# Test 1: Empty password
print("\nTest 1: Empty password")
empty_hash = hash_password("")
verified = verify_password("", empty_hash)
print(f"  Empty password hash: {empty_hash}")
print(f"  Verified: {verified}")
assert verified, "Empty password should verify"

# Test 2: Simple password
print("\nTest 2: Simple password")
simple = "HelloWorld123"
simple_hash = hash_password(simple)
verified = verify_password(simple, simple_hash)
print(f"  Password: {simple}")
print(f"  Hash: {simple_hash}")
print(f"  Verified: {verified}")
assert verified, "Simple password should verify"

# Test 3: 500+ character password
print("\nTest 3: Long password (500+ characters)")
long_pw = "A" * 500
long_hash = hash_password(long_pw)
verified = verify_password(long_pw, long_hash)
print(f"  Password length: {len(long_pw)} chars")
print(f"  Hash: {long_hash}")
print(f"  Verified: {verified}")
assert verified, "Long password should verify"

# Test 4: Unicode/Emoji
print("\nTest 4: Unicode/Emoji password")
emoji_pw = "Password123🔐🚀🌟"
emoji_hash = hash_password(emoji_pw)
verified = verify_password(emoji_pw, emoji_hash)
print(f"  UTF-8 byte length: {len(emoji_pw.encode('utf-8'))} bytes")
print(f"  Hash: {emoji_hash}")
print(f"  Verified: {verified}")
assert verified, "Emoji password should verify"

# Test 5: Wrong password rejected
print("\nTest 5: Wrong password rejection")
correct = "CorrectPassword123"
wrong = "WrongPassword456"
correct_hash = hash_password(correct)
verified_correct = verify_password(correct, correct_hash)
verified_wrong = verify_password(wrong, correct_hash)
print(f"  Correct verified: {verified_correct}")
print(f"  Wrong rejected: {not verified_wrong}")
assert verified_correct and not verified_wrong, "Wrong password should not verify"

print("\n" + "=" * 70)
print("ALL TESTS PASSED - SHA256 system working!")
print("=" * 70)
print("\nSummary:")
print("Empty passwords accepted")
print("Any length accepted (tested 500+ chars)")
print("Unicode/emoji supported")
print("Wrong passwords rejected correctly")
print("No bcrypt errors")
print("No crash on any password")
