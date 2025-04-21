import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base, get_db
from app.core.security import create_access_token
from main import app

# Set up test database
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def test_db():
    # Create test database
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Drop test database after tests
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(test_db):
    # Override the get_db dependency to use the test database
    def override_get_db():
        try:
            yield test_db
        finally:
            test_db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides = {}

@pytest.fixture
def test_user(test_db):
    # Create a test user
    from app.db.models import User
    from app.core.security import get_password_hash
    
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Test User",
        is_agent=True
    )
    test_db.add(user)
    test_db.commit()
    test_db.refresh(user)
    return user

@pytest.fixture
def auth_headers(test_user):
    # Create authentication headers with JWT token
    token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}

# Test user registration endpoint
def test_register_user(client):
    response = client.post(
        "/api/users/register",
        json={
            "email": "new@example.com",
            "password": "newpassword123",
            "full_name": "New User"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert "id" in data

# Test user login endpoint
def test_login_user(client, test_user):
    response = client.post(
        "/api/users/login",
        data={
            "username": test_user.email,
            "password": "password123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

# Test creating an inquiry
def test_create_inquiry(client, auth_headers):
    response = client.post(
        "/api/inquiries/",
        headers=auth_headers,
        json={
            "title": "Test Inquiry",
            "content": "This is a test inquiry content."
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Inquiry"
    assert "id" in data

# Test getting inquiries list
def test_get_inquiries(client, auth_headers):
    # First create an inquiry
    client.post(
        "/api/inquiries/",
        headers=auth_headers,
        json={
            "title": "Test Inquiry",
            "content": "This is a test inquiry content."
        }
    )
    
    # Now get the list of inquiries
    response = client.get("/api/inquiries/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
