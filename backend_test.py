#!/usr/bin/env python3
"""
Backend Authentication System Test Suite
Tests all authentication endpoints and JWT functionality
"""

import requests
import json
import time
from datetime import datetime, timezone

# Configuration
BASE_URL = "https://boost-campaigns.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

# Test data
TEST_USERS = [
    {
        "name": "Sarah Martinez",
        "email": "sarah.martinez@afroboost.com", 
        "password": "SecurePass123!"
    },
    {
        "name": "David Johnson",
        "email": "david.johnson@afroboost.com",
        "password": "MyPassword456@"
    }
]

class AuthTestSuite:
    def __init__(self):
        self.session = requests.Session()
        self.admin_token = None
        self.user_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_register_first_user_admin(self):
        """Test registering first user - should become admin"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                headers=HEADERS,
                json=TEST_USERS[0]
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                if "user" in data and "token" in data:
                    user = data["user"]
                    
                    # Verify user is admin
                    if user.get("role") == "admin":
                        self.admin_token = data["token"]
                        self.log_test(
                            "Register First User (Admin)",
                            True,
                            f"Successfully registered admin user: {user['name']}",
                            {"user_id": user["id"], "email": user["email"], "role": user["role"]}
                        )
                        return True
                    else:
                        self.log_test(
                            "Register First User (Admin)",
                            False,
                            f"First user should be admin but got role: {user.get('role')}",
                            {"response": data}
                        )
                else:
                    self.log_test(
                        "Register First User (Admin)",
                        False,
                        "Response missing user or token fields",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Register First User (Admin)",
                    False,
                    f"Registration failed with status {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Register First User (Admin)",
                False,
                f"Exception during registration: {str(e)}"
            )
        
        return False
    
    def test_register_second_user_regular(self):
        """Test registering second user - should be regular user"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                headers=HEADERS,
                json=TEST_USERS[1]
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "user" in data and "token" in data:
                    user = data["user"]
                    
                    # Verify user is regular user
                    if user.get("role") == "user":
                        self.user_token = data["token"]
                        self.log_test(
                            "Register Second User (Regular)",
                            True,
                            f"Successfully registered regular user: {user['name']}",
                            {"user_id": user["id"], "email": user["email"], "role": user["role"]}
                        )
                        return True
                    else:
                        self.log_test(
                            "Register Second User (Regular)",
                            False,
                            f"Second user should be regular user but got role: {user.get('role')}",
                            {"response": data}
                        )
                else:
                    self.log_test(
                        "Register Second User (Regular)",
                        False,
                        "Response missing user or token fields",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Register Second User (Regular)",
                    False,
                    f"Registration failed with status {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Register Second User (Regular)",
                False,
                f"Exception during registration: {str(e)}"
            )
        
        return False
    
    def test_duplicate_email_registration(self):
        """Test registering with duplicate email - should fail"""
        try:
            response = self.session.post(
                f"{BASE_URL}/auth/register",
                headers=HEADERS,
                json=TEST_USERS[0]  # Same email as first user
            )
            
            if response.status_code == 400:
                data = response.json()
                if "already registered" in data.get("detail", "").lower():
                    self.log_test(
                        "Duplicate Email Registration",
                        True,
                        "Correctly rejected duplicate email registration",
                        {"status_code": response.status_code, "message": data.get("detail")}
                    )
                    return True
                else:
                    self.log_test(
                        "Duplicate Email Registration",
                        False,
                        "Got 400 status but wrong error message",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Duplicate Email Registration",
                    False,
                    f"Expected 400 status but got {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Duplicate Email Registration",
                False,
                f"Exception during duplicate registration test: {str(e)}"
            )
        
        return False
    
    def test_login_success(self):
        """Test successful login with correct credentials"""
        try:
            login_data = {
                "email": TEST_USERS[0]["email"],
                "password": TEST_USERS[0]["password"]
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if "user" in data and "token" in data:
                    user = data["user"]
                    token = data["token"]
                    
                    # Verify user data
                    if (user.get("email") == TEST_USERS[0]["email"] and 
                        user.get("role") == "admin" and
                        "last_login" in user):
                        
                        self.log_test(
                            "Login Success",
                            True,
                            f"Successfully logged in user: {user['name']}",
                            {"user_id": user["id"], "last_login": user["last_login"]}
                        )
                        return True
                    else:
                        self.log_test(
                            "Login Success",
                            False,
                            "Login successful but user data incorrect",
                            {"response": data}
                        )
                else:
                    self.log_test(
                        "Login Success",
                        False,
                        "Response missing user or token fields",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Login Success",
                    False,
                    f"Login failed with status {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Login Success",
                False,
                f"Exception during login: {str(e)}"
            )
        
        return False
    
    def test_login_wrong_password(self):
        """Test login with wrong password - should fail"""
        try:
            login_data = {
                "email": TEST_USERS[0]["email"],
                "password": "WrongPassword123!"
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json=login_data
            )
            
            if response.status_code == 401:
                data = response.json()
                if "invalid" in data.get("detail", "").lower():
                    self.log_test(
                        "Login Wrong Password",
                        True,
                        "Correctly rejected login with wrong password",
                        {"status_code": response.status_code, "message": data.get("detail")}
                    )
                    return True
                else:
                    self.log_test(
                        "Login Wrong Password",
                        False,
                        "Got 401 status but wrong error message",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Login Wrong Password",
                    False,
                    f"Expected 401 status but got {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Login Wrong Password",
                False,
                f"Exception during wrong password test: {str(e)}"
            )
        
        return False
    
    def test_login_nonexistent_email(self):
        """Test login with non-existent email - should fail"""
        try:
            login_data = {
                "email": "nonexistent@afroboost.com",
                "password": "SomePassword123!"
            }
            
            response = self.session.post(
                f"{BASE_URL}/auth/login",
                headers=HEADERS,
                json=login_data
            )
            
            if response.status_code == 401:
                data = response.json()
                if "invalid" in data.get("detail", "").lower():
                    self.log_test(
                        "Login Nonexistent Email",
                        True,
                        "Correctly rejected login with nonexistent email",
                        {"status_code": response.status_code, "message": data.get("detail")}
                    )
                    return True
                else:
                    self.log_test(
                        "Login Nonexistent Email",
                        False,
                        "Got 401 status but wrong error message",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Login Nonexistent Email",
                    False,
                    f"Expected 401 status but got {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Login Nonexistent Email",
                False,
                f"Exception during nonexistent email test: {str(e)}"
            )
        
        return False
    
    def test_get_me_valid_token(self):
        """Test /me endpoint with valid JWT token"""
        if not self.admin_token:
            self.log_test(
                "Get Me Valid Token",
                False,
                "No admin token available for testing"
            )
            return False
        
        try:
            headers = {
                **HEADERS,
                "Authorization": f"Bearer {self.admin_token}"
            }
            
            response = self.session.get(
                f"{BASE_URL}/auth/me",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify user data
                if (data.get("email") == TEST_USERS[0]["email"] and 
                    data.get("role") == "admin" and
                    "id" in data and "name" in data):
                    
                    self.log_test(
                        "Get Me Valid Token",
                        True,
                        f"Successfully retrieved user info: {data['name']}",
                        {"user_id": data["id"], "email": data["email"], "role": data["role"]}
                    )
                    return True
                else:
                    self.log_test(
                        "Get Me Valid Token",
                        False,
                        "Response data incorrect",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Get Me Valid Token",
                    False,
                    f"/me endpoint failed with status {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Get Me Valid Token",
                False,
                f"Exception during /me test: {str(e)}"
            )
        
        return False
    
    def test_get_me_invalid_token(self):
        """Test /me endpoint with invalid JWT token"""
        try:
            headers = {
                **HEADERS,
                "Authorization": "Bearer invalid.jwt.token.here"
            }
            
            response = self.session.get(
                f"{BASE_URL}/auth/me",
                headers=headers
            )
            
            if response.status_code == 401:
                data = response.json()
                if "invalid" in data.get("detail", "").lower() or "token" in data.get("detail", "").lower():
                    self.log_test(
                        "Get Me Invalid Token",
                        True,
                        "Correctly rejected invalid token",
                        {"status_code": response.status_code, "message": data.get("detail")}
                    )
                    return True
                else:
                    self.log_test(
                        "Get Me Invalid Token",
                        False,
                        "Got 401 status but wrong error message",
                        {"response": data}
                    )
            else:
                self.log_test(
                    "Get Me Invalid Token",
                    False,
                    f"Expected 401 status but got {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Get Me Invalid Token",
                False,
                f"Exception during invalid token test: {str(e)}"
            )
        
        return False
    
    def test_get_me_no_token(self):
        """Test /me endpoint without token"""
        try:
            response = self.session.get(
                f"{BASE_URL}/auth/me",
                headers=HEADERS
            )
            
            if response.status_code == 403:
                self.log_test(
                    "Get Me No Token",
                    True,
                    "Correctly rejected request without token",
                    {"status_code": response.status_code}
                )
                return True
            else:
                self.log_test(
                    "Get Me No Token",
                    False,
                    f"Expected 403 status but got {response.status_code}",
                    {"response": response.text}
                )
                
        except Exception as e:
            self.log_test(
                "Get Me No Token",
                False,
                f"Exception during no token test: {str(e)}"
            )
        
        return False
    
    def test_jwt_token_structure(self):
        """Test JWT token structure and content"""
        if not self.admin_token:
            self.log_test(
                "JWT Token Structure",
                False,
                "No admin token available for testing"
            )
            return False
        
        try:
            # JWT tokens have 3 parts separated by dots
            parts = self.admin_token.split('.')
            
            if len(parts) == 3:
                self.log_test(
                    "JWT Token Structure",
                    True,
                    "JWT token has correct structure (3 parts)",
                    {"token_parts": len(parts)}
                )
                return True
            else:
                self.log_test(
                    "JWT Token Structure",
                    False,
                    f"JWT token should have 3 parts but has {len(parts)}",
                    {"token_parts": len(parts)}
                )
                
        except Exception as e:
            self.log_test(
                "JWT Token Structure",
                False,
                f"Exception during JWT structure test: {str(e)}"
            )
        
        return False
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 Starting Authentication System Test Suite")
        print(f"📍 Testing against: {BASE_URL}")
        print("=" * 60)
        
        # Test sequence as specified in the review request
        tests = [
            self.test_register_first_user_admin,
            self.test_login_success,
            self.test_get_me_valid_token,
            self.test_register_second_user_regular,
            self.test_duplicate_email_registration,
            self.test_login_wrong_password,
            self.test_login_nonexistent_email,
            self.test_get_me_invalid_token,
            self.test_get_me_no_token,
            self.test_jwt_token_structure
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            success = test()
            if success:
                passed += 1
            time.sleep(0.5)  # Small delay between tests
        
        print("=" * 60)
        print(f"📊 Test Results: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All authentication tests PASSED!")
            return True
        else:
            print(f"⚠️  {total - passed} tests FAILED")
            return False
    
    def get_summary(self):
        """Get test summary"""
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        summary = {
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "success_rate": (passed / total * 100) if total > 0 else 0,
            "results": self.test_results
        }
        
        return summary

def main():
    """Main test execution"""
    test_suite = AuthTestSuite()
    
    try:
        success = test_suite.run_all_tests()
        summary = test_suite.get_summary()
        
        # Save detailed results
        with open('/app/auth_test_results.json', 'w') as f:
            json.dump(summary, f, indent=2, default=str)
        
        print(f"\n📄 Detailed results saved to: /app/auth_test_results.json")
        
        return success
        
    except Exception as e:
        print(f"❌ Test suite failed with exception: {str(e)}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)