from pydantic import BaseModel

class RecordInput(BaseModel):
    SenderEmail: str
    SenderName: str
    SenderSubject: str
    SenderPreview: str
    EmailDate: str
    UserEmail: str

class ThreadInput(BaseModel):
    Email: str
    Name: str
    Subject: str
    Preview: str
    Date: str

class UserData(BaseModel):
    Email: str

class PromptInput(BaseModel):
    UserEmail: str
    CustomPrompt: str
    reRun: bool = False

class DeleteInput(BaseModel):
    UserEmail: str
    DeleteCount: int
    DeleteCategory: str