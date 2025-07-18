from pydantic import BaseModel

class BackendInput(BaseModel):
    SenderEmail: str
    SenderName: str
    SenderSubject: str
    SenderPreview: str
    UserEmail: str

class ThreadInput(BaseModel):
    Email: str
    Name: str
    Subject: str
    Preview: str

class UserData(BaseModel):
    Email: str

class PromptInput(BaseModel):
    UserEmail: str
    CustomPrompt: str
    reRun: bool = False