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

    # 回显用户输入的内容
    return {
        "answer": response.content,
        "sources": sources
    }
    
conversation_store = [
    {"username": "alice", "thread_id": "abc123", "name": "Alice's Asylum Case"},
    {"username": "alice", "thread_id": "xyz456", "name": "Family Emergency"},
    {"username": "bob", "thread_id": "bob999", "name": "Visa Support"}
]

@app.get("/user-conversations")
def get_user_conversations(username: str = Query(..., description="Username to search")):
    results = [conv for conv in conversation_store if conv["username"] == username]
    return results