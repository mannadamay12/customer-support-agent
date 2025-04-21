import pytest
from unittest.mock import patch, MagicMock
from app.llm.classifier import InquiryClassifier
from app.llm.response_generator import ResponseGenerator
from app.llm.followup import FollowUpGenerator

# Test the inquiry classifier
@pytest.fixture
def mock_classifier():
    with patch('app.llm.classifier.ChatOpenAI') as mock_chat:
        # Set up the mock to return a predictable response
        mock_instance = MagicMock()
        mock_chat.return_value = mock_instance
        mock_instance.invoke.return_value.content = "technical"
        yield InquiryClassifier()

def test_classify_inquiry(mock_classifier):
    # Test that the classifier returns the expected category
    inquiry = MagicMock()
    inquiry.content = "I'm having trouble with my internet connection"
    
    result = mock_classifier.classify(inquiry)
    assert result == "technical"

# Test the response generator
@pytest.fixture
def mock_response_generator():
    with patch('app.llm.response_generator.ChatOpenAI') as mock_chat:
        mock_instance = MagicMock()
        mock_chat.return_value = mock_instance
        mock_instance.invoke.return_value.content = "Here is your AI-generated response"
        yield ResponseGenerator()

def test_generate_response(mock_response_generator):
    # Test that the response generator returns the expected response
    inquiry = MagicMock()
    inquiry.content = "How do I reset my password?"
    
    result = mock_response_generator.generate_response(inquiry)
    assert "Here is your AI-generated response" in result

# Test the followup generator
@pytest.fixture
def mock_followup_generator():
    with patch('app.llm.followup.ChatOpenAI') as mock_chat:
        mock_instance = MagicMock()
        mock_chat.return_value = mock_instance
        mock_instance.invoke.return_value.content = '{"inquiry_id": 1, "content": "Follow-up message", "scheduled_at": "2025-04-22T12:00:00"}'
        yield FollowUpGenerator()

def test_should_generate_followup(mock_followup_generator):
    # Test the logic that determines if a follow-up should be generated
    inquiry = MagicMock()
    inquiry.updated_at.timestamp.return_value = 0  # Long time ago
    responses = [MagicMock()]
    responses[0].created_at.timestamp.return_value = 0  # Long time ago
    
    result = mock_followup_generator.should_generate_followup(inquiry, responses)
    assert result is True

def test_generate_followup(mock_followup_generator):
    # Test that the follow-up generator returns the expected structure
    inquiry = MagicMock()
    inquiry.id = 1
    responses = [MagicMock()]
    
    result = mock_followup_generator.generate_followup(inquiry, responses)
    assert result.get("inquiry_id") == 1
    assert "content" in result
    assert "scheduled_at" in result
