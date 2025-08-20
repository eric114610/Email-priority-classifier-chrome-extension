import google.generativeai as genai
import os

from backend.app.schemas import ThreadInput

if not os.getenv("GEMINI_API_KEY"):
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

def generate_mail_class(input: list[ThreadInput], userPrompt:str, processCount: int) -> str:
    # prompt = f"Summarize and generate a short professional reply:\n\n{text}"
    # prompt = f"I'm going to give you informations from an email sent to user and the user's custom prompt.\
    # Please read through the custom prompt and the email to consider the email's importancy and urgency to give me a 1 word only response,\
    # which is in one of (Optional,Notable,Important,Urgent,Critical).\n\n\
    # The user's custom prompt is top priority for classifying email's importancy and urgency.\n\
    # But still remain common sense to classify other important emails\n\n\
    # Here is the custom prompt:\n\
    # {userPrompt}\n\n\
    # Here is the email:\n\
    # Email from {input.Name} ({input.Email}) with subject '{input.Subject}'.\n\n\
    # Preview:\n\n\
    # {input.Preview}\n\n."

    prompt = f"You now are an email classifier, which for each email, you will classify it based on its importancy and urgency.\n\
    Each email you will classify it into one of the (Optional,Notable,Important,Urgent,Critical) class.\n\
    I will first give you the user's custom prompt, which specify their thoughts on how to customize the classification result for all following enails.\n\
    Then, I will give you total {processCount} emails, which contains the sender's name, sender's email address, subject and preview of it.\
    Each email will be seperated with this: \"---------------------------------\", and will have its own index\n\
    Please read through the custom prompt and the emails to consider those email's importancy and urgency.\n\
    Then, for each email, give me a response in each line ending in \\n in the format of: index:class\n\
    Example output: 3:Important\n\
    The user's custom prompt is top priority for classifying email's importancy and urgency.\n\
    But still remain common sense to classify other important emails\n\n\
    Here is the custom prompt:\n\
    {userPrompt}\n\n\
    Here are the emails:\n"

    for thread in input:
        prompt += f"Email index: {thread.Index}\n\
        Email from {thread.Name} ({thread.Email}) with subject '{thread.Subject}'.\n\n\
        Preview:\n\n\
        {thread.Preview}\n\n\
        ---------------------------------\n\n"
    

    response = model.generate_content(prompt)
    return response.text
