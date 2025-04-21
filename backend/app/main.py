from fastapi import FastAPI, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import getpass
from pinecone import Pinecone, ServerlessSpec
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
from uuid import uuid4
from fastapi import Query
from typing import List
from fastapi import Depends, Query
from sqlalchemy.orm import Session
from models import User, Conversation
from db import get_db
from init_db import create_tables, seed_data
from db import SessionLocal
from models import Message
import json
from fastapi import HTTPException






app = FastAPI()

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

#init db
create_tables()
seed_data()

@app.post("/upload/")
async def uploadFile(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode('utf-8')
    text_splitter = CharacterTextSplitter(chunk_size=2000, chunk_overlap=20)
    chunks = text_splitter.split_text(text)
    documents = []
    for i, chunk in enumerate(chunks):
        metadata = {
            "source": file.filename,
            "chunk": i
        }
        documents.append(Document(page_content=chunk, metadata=metadata))
        
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
        documents,
        index_name=index_name,
        embedding=embeddings
    )
    return {"message": "File uploaded successfully,Vector Store created"}

@app.post("/ask/")
async def ask_question(data: dict = Body(...)):
    query = data.get("query")
    username = data.get("username")
    name = data.get("name")
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
    
    sources = [
        {
            "source": doc.metadata.get("source", "unknown"),
            "chunk_id": doc.metadata.get("chunk", -1)
        }
        for doc in retrieved_docs
    ]
    
    final_prompt = custom_prompt.format(
        context=context,
        question=query
    )
    response = llm.invoke(final_prompt)

    
    if not query:
        return {"error": "Query is required"}
    session = SessionLocal()
    try:
        # 1. 确保 user 存在
        user = session.query(User).filter_by(username=username).first()
        if not user:
            user = User(username=username)
            session.add(user)
            session.commit()
            session.refresh(user)  

        # 2. 确保 conversation 存在
        conversation = session.query(Conversation).filter_by(name=name).first()
        if not conversation:
            conversation = Conversation(name=name, user_id=user.id, thread_id=f"{username}-{int(time.time())}")
            session.add(conversation)
            session.commit()
            session.refresh(conversation)  # 获取 conversation.id

        # 3. 存储消息
        session.add_all([
            Message(
                conversation_id=conversation.id,
                role="user",
                content=query,
                source_json=None
            ),
            Message(
                conversation_id=conversation.id,
                role="assistant",
                content=response.content,
                source_json=json.dumps(sources)
            )
        ])
        session.commit()

    finally:
        session.close()

    return {
        "answer": response.content,
        "sources": sources
    }


@app.get("/user-conversations")
def get_user_conversations(username: str = Query(...), db: Session = Depends(get_db)):
    user = db.query(User).filter_by(username=username).first()
    if not user:
        return []

    conversations = (
        db.query(Conversation)
        .filter_by(user_id=user.id)
        .order_by(Conversation.created_at.desc())
        .all()
    )

    return [
        {
            "thread_id": c.thread_id,
            "name": c.name,
            "created_at": c.created_at.isoformat()
        }
        for c in conversations
    ]


@app.get("/conversation-messages")
def get_conversation_messages(name: str = Query(...)):
    session: Session = SessionLocal()
    try:
        conversation = session.query(Conversation).filter(Conversation.name == name).first()
        if not conversation:
            return []

        messages = (
            session.query(Message)
            .filter(Message.conversation_id == conversation.id)
            .order_by(Message.timestamp)
            .all()
        )

        paired = []
        current_question = None

        for msg in messages:
            if msg.role == "user":
                current_question = msg.content
            elif msg.role == "assistant" and current_question is not None:
                paired.append({
                    "question": current_question,
                    "answer": msg.content,
                    "sources": json.loads(msg.source_json) if msg.source_json else []
                })
                current_question = None

        return paired  
    finally:
        session.close()
@app.post("/create-conversation")
def create_conversation(data: dict = Body(...)):
    session = SessionLocal()
    try:
        username = data.get("username")
        name = data.get("name")
        thread_id = data.get("thread_id")

        user = session.query(User).filter_by(username=username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        conversation = Conversation(
            user_id=user.id,
            name=name,
            thread_id=thread_id
        )
        session.add(conversation)
        session.commit()
        return {"message": "Conversation created"}
    finally:
        session.close()

@app.delete("/delete-conversation")
def delete_conversation(name: str = Query(...)):
    session = SessionLocal()
    try:
        conversation = session.query(Conversation).filter_by(name=name).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")

        # 删除关联的消息
        session.query(Message).filter_by(conversation_id=conversation.id).delete()

        # 删除会话
        session.delete(conversation)
        session.commit()
        return {"status": "success", "message": f"Conversation '{name}' deleted."}
    finally:
        session.close()