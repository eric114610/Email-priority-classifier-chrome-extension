from pydantic import BaseModel

class RecordInput(BaseModel):
    SenderEmail: list[str]
    SenderName: list[str]
    SenderSubject: list[str]
    SenderPreview: list[str]
    EmailDate: list[str]
    UserEmail: str

class ThreadInput(BaseModel):
    Email: str
    Name: str
    Subject: str
    Preview: str
    Date: str
    Index: int

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

class RecordsToProcessInput(BaseModel):
    UserEmail: str
    RecordsToProcess: int
