from models import Base, User, Conversation, Message
from db import engine, SessionLocal
from datetime import datetime
from sqlalchemy.orm import Session

def create_tables():
    Base.metadata.create_all(bind=engine)

def seed_data():
    db: Session = SessionLocal()

    if not db.query(User).filter_by(username="alice").first():
        user = User(username="alice")
        db.add(user)
        db.commit()
        db.refresh(user)

        conversation = Conversation(
            user_id=user.id,
            name="Alice's Asylum Case",
            thread_id="alice-thread-001",
            created_at=datetime.utcnow()
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

        db.add_all([
            Message(
                conversation_id=conversation.id,
                role="user",
                content="What are my chances of asylum?",
                source_json="[]"
            ),
            Message(
                conversation_id=conversation.id,
                role="assistant",
                content="Based on the documents, you have a reasonable case.",
                source_json='[{"source": "asylum_policy.pdf", "chunk": 2}]'
            )
        ])
        db.commit()

    db.close()
