from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.chat_models import ChatOpenAI
from app.core.config import settings
from app.db.models import InquiryType

# Define classifier prompt template
classifier_template = """
You are an AI assistant classifying customer support inquiries for appropriate routing.
Based on the inquiry below, determine the most appropriate category from the following options:
- TECHNICAL: Questions about how to use the product, bug reports, or technical difficulties
- BILLING: Questions about pricing, subscriptions, refunds, or payment issues
- GENERAL: General questions about the company or product
- FEATURE_REQUEST: Suggestions for new features or improvements
- COMPLAINT: Expressions of dissatisfaction with the product or service
- OTHER: Anything that doesn't fit the above categories

Additionally, analyze whether this inquiry should be escalated to a human agent based on:
- Complexity (requires specialized knowledge)
- Urgency (time-sensitive issues)
- Emotion (customer appears upset or frustrated)
- Business critical (involves large accounts or potential legal issues)

Customer Inquiry: {inquiry}

Classification Analysis:
"""

class InquiryClassifier:
    def __init__(self):
        # Initialize OpenAI LLM
        self.llm = ChatOpenAI(
            temperature=0,
            model_name=settings.LLM_MODEL,
            openai_api_key=settings.OPENAI_API_KEY
        )
        
        # Create the prompt template
        self.prompt = PromptTemplate(
            input_variables=["inquiry"],
            template=classifier_template
        )
        
        # Create the classification chain
        self.chain = LLMChain(llm=self.llm, prompt=self.prompt)
    
    def classify(self, inquiry_text):
        """
        Classify the inquiry and determine if it needs escalation
        
        Args:
            inquiry_text (str): The customer inquiry text
            
        Returns:
            dict: Classification result with type, confidence, escalation info
        """
        # Get raw classification output
        raw_output = self.chain.run(inquiry=inquiry_text)
        
        # Parse classification results
        # In a production system, you would implement more robust parsing
        # This is a simplified example
        lines = raw_output.strip().split('\n')
        
        # Default values
        inquiry_type = InquiryType.GENERAL
        confidence = 0.5
        should_escalate = False
        escalation_reason = None
        
        # Extract type and confidence
        for line in lines:
            if "Category:" in line or "Type:" in line or "Classification:" in line:
                for type_option in InquiryType:
                    if type_option.value.upper() in line.upper():
                        inquiry_type = type_option
                        # Extract confidence if available
                        if "confidence" in line.lower() and "%" in line:
                            try:
                                confidence = float(line.split("%")[0].split()[-1]) / 100
                            except:
                                pass
                        break
            
            # Check for escalation recommendation
            if "escalate" in line.lower():
                if "should" in line.lower() and "not" not in line.lower():
                    should_escalate = True
                    # Try to extract the reason
                    if "because" in line.lower() or "reason" in line.lower():
                        escalation_reason = line.split(":", 1)[1].strip() if ":" in line else line
        
        # If confidence is below threshold, recommend escalation
        if confidence < settings.ESCALATION_THRESHOLD and not should_escalate:
            should_escalate = True
            escalation_reason = f"Low classification confidence ({confidence:.2%})"
        
        return {
            "type": inquiry_type,
            "confidence": confidence,
            "should_escalate": should_escalate,
            "escalation_reason": escalation_reason
        }