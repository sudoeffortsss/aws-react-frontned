import os
import time
from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
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
from langchain.prompts import PromptTemplate 
from dotenv import load_dotenv
import PyPDF2
from io import BytesIO

# For OCR support for images
from PIL import Image
import pytesseract

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
their text document processing. Please answer the question strictly based on
the context the user provided. Please pay attention to names, location, time, relationships and logic data.
Only Analysis and Answers in English!

[Relevant context]:
{context}

[Question]:
{question}
""")

@app.post("/upload/")
async def uploadFile(file: UploadFile = File(...)):
    filename = file.filename.lower()
    if filename.endswith(".pdf"):
        content = await file.read()
        reader = PyPDF2.PdfReader(BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
    elif filename.endswith(('.jpeg', '.jpg', '.png')):
        # Use OCR to read text from image
        content = await file.read()
        image = Image.open(BytesIO(content))
        text = pytesseract.image_to_string(image)
    else:
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
            spec=ServerlessSpec(cloud="aws", region=pinecone_environment),
        )
        while not pc.describe_index(index_name).status["ready"]:
            time.sleep(1)

    index = pc.Index(index_name)
    vectorstore_from_docs = PineconeVectorStore.from_documents(
        docs,
        index_name=index_name,
        embedding=embeddings
    )
    return {"message": "File uploaded successfully, Vector Store created"}

@app.post("/ask/")
async def ask_question(data: dict = Body(...)):
    query = data.get("query")
    if not query:
        return {"error": "Query is required"}
    
    existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]
    if index_name not in existing_indexes:
        pc.create_index(
            name=index_name,
            dimension=3072,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=pinecone_environment)
        )
        while not pc.describe_index(index_name).status["ready"]:
            time.sleep(1)
    index = pc.Index(index_name)
    vector_store = PineconeVectorStore(index=index, embedding=embeddings)
    llm = ChatOpenAI(
        openai_api_key=openai_key,
        model_name='gpt-4o',
        temperature=0.0
    )
    
    retrieved_docs = vector_store.similarity_search(query, k=5)
    context = "\n\n".join([doc.page_content for doc in retrieved_docs])
    
    final_prompt = custom_prompt.format(
        context=context,
        question=query
    )
    response = llm.invoke(final_prompt)
    
    return {"answer": response.content}

@app.post("/clear-memory/")
async def clear_memory():
    existing_indexes = [index_info["name"] for index_info in pc.list_indexes()]
    if index_name in existing_indexes:
        pc.delete_index(index_name)
        return {"message": f"Index {index_name} deleted. Memory cleared."}
    else:
        return {"message": "Index not found, nothing to clear."}