from fastapi import FastAPI, UploadFile, Form,HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import getpass
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_community.document_loaders import TextLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain_openai import ChatOpenAI
from langchain.chains import RetrievalQA
from pinecone import Pinecone, ServerlessSpec
from langchain.agents.openai_assistant import OpenAIAssistantRunnable
from langchain.agents import AgentExecutor
from langchain.schema import Document
from fastapi import Body
from fastapi import UploadFile, File
from langchain.prompts import PromptTemplate 
from dotenv import load_dotenv

from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base, User, SearchHistory
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr




app = FastAPI()
load_dotenv()

# 设置数据库
DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)

# 密码哈希设置
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT 设置
SECRET_KEY = "666666"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
openai_key = os.getenv("OPENAI_API_KEY")
pinecone_api_key = os.getenv("PINECONE_API_KEY")
pinecone_environment = 'us-east-1'
pc = Pinecone(api_key=pinecone_api_key)
index_name = "docs-rag-chatbot" 
embeddings = OpenAIEmbeddings(model="text-embedding-3-large")
custom_prompt = PromptTemplate.from_template("""
You are Themis paralegal AI, You are helping law specialist in dealing with
their text document processing.Please anwser the question stricly based on
the context the user provided. Please pay attention to names, location, time, relationships and logic data.
Only Anlysis and Answers in English!

[Relevant context]:
{context}

[Question]:
{question}
""")


@app.post("/upload/")
async def uploadFile(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode('utf-8')
    document = Document(page_content=text)
    text_splitter = CharacterTextSplitter(chunk_size=2000, chunk_overlap=20)
    docs = text_splitter.split_documents([document])

    existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]

    if index_name not in existing_indexes:
        pc.create_index(
            name=index_name,
            dimension=3072,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1"),
        )
        while not pc.describe_index(index_name).status["ready"]:
            time.sleep(1)

    index = pc.Index(index_name)
    vectorstore_from_docs = PineconeVectorStore.from_documents(
        docs,
        index_name=index_name,
        embedding=embeddings
    )
    return {"message": "File uploaded successfully,Vector Store created"}

@app.post("/ask/")
async def ask_question(data: dict = Body(...)):
    existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]
    if index_name not in existing_indexes:
        pc.create_index(
            name=index_name,
            dimension=3072,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )
        while not pc.describe_index(index_name).status["ready"]:
            time.sleep(1)
    """处理单次问答"""
    query = data.get("query")
    index = pc.Index(index_name)
    vector_store = PineconeVectorStore(index=index, embedding=embeddings)
    llm = ChatOpenAI(  
        openai_api_key=openai_key,  
        model_name='gpt-4o',  
        temperature=0.0
         
    )  
    # qa = RetrievalQA.from_chain_type(  
    # llm=llm,  
    # chain_type="stuff",  
    # retriever=vector_store.as_retriever()
    # )  
    retrieved_docs = vector_store.similarity_search(query, k=5)
    context = "\n\n".join([doc.page_content for doc in retrieved_docs])

    final_prompt = custom_prompt.format(
        context=context,
        question=query
    )
    response = llm.invoke(final_prompt)

    
    if not query:
        return {"error": "Query is required"}

    # 回显用户输入的内容
    return {"answer": response.content}

# PostgreSQL 连接配置（来自环境变量）
DB_HOST = os.getenv('DB_HOST', 'db')
DB_NAME = os.getenv('DB_NAME', 'your_db')
DB_USER = os.getenv('DB_USER', 'your_user')
DB_PASS = os.getenv('DB_PASS', 'your_password')
DB_PORT = os.getenv('DB_PORT', '5432')


class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class SearchRequest(BaseModel):
    question: str

class SearchResponse(BaseModel):
    answer: str

class SearchRecord(BaseModel):
    question: str
    answer: str
    timestamp: datetime

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pw = hash_password(user.password)
    new_user = User(username=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"msg": "User created successfully"}

@app.post("/login", response_model=Token)
def login(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}


@app.post("/search", response_model=SearchResponse)
def search(request: SearchRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 临时模拟回答
    answer = f"This is the answer for '{request.question}' "

    # 保存历史记录
    history = SearchHistory(
        question=request.question,
        answer=answer,
        user_id=current_user.id
    )
    db.add(history)
    db.commit()

    return {"answer": answer}

@app.get("/history", response_model=list[SearchRecord])
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    history = db.query(SearchHistory).filter(SearchHistory.user_id == current_user.id).order_by(SearchHistory.timestamp.desc()).all()
    return history

