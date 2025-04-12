import React, { useState, useEffect, useRef } from "react"; //check
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Layout, Typography, Button, message } from "antd";
import PdfUploader from "./components/PdfUploader";
import ChatComponent from "./components/ChatComponent";
import RenderQA from "./components/RenderQA";
import LeftSidebar from "./components/LeftSidebar";
import FileUploadButton from "./components/FileUploadButton";

const { Header, Content } = Layout;
const { Title } = Typography;

// Adjust the PDF uploader style if needed
const pdfUploaderStyle = {
  margin: "auto",
  paddingTop: "20px",
};

// Updated renderQAStyle makes the conversation area scrollable
const renderQAStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "10px",
  background: "#fff",
  border: "1px solid #e8e8e8",
  borderRadius: "4px",
  marginTop: "10px",
};

// The chat container sits at the bottom of the page (you can adjust as needed)
const chatContainerStyle = {
  position: "sticky",
  bottom: 0,
  background: "white",
  padding: "10px 0",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "15px",
};

const CaseDetails = ({ conversationCases }) => {
  const { id } = useParams();
  const selectedCase = conversationCases.find((c) => String(c.id) === id);
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "20px" }}>
      <h2>{selectedCase ? selectedCase.name : "Case Details"}</h2>
      <div style={renderQAStyle}>
        <RenderQA
          conversation={selectedCase ? selectedCase.conversation : []}
          isLoading={false}
        />
      </div>
    </div>
  );
};

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // Ref for auto-scroll in the conversation area.
  const conversationEndRef = useRef(null);

  // Each conversation case has an id, a Q/A array, and a name.
  const [conversationCases, setConversationCases] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load stored conversation cases and activeCaseId from localStorage on mount.
  useEffect(() => {
    const storedCases = localStorage.getItem("conversationCases");
    if (storedCases) {
      setConversationCases(JSON.parse(storedCases));
    }
    const storedActiveCase = localStorage.getItem("activeCaseId");
    if (storedActiveCase) {
      setActiveCaseId(Number(storedActiveCase));
    }
  }, []);

  // Persist conversationCases and activeCaseId.
  useEffect(() => {
    localStorage.setItem("conversationCases", JSON.stringify(conversationCases));
    if (activeCaseId !== null) {
      localStorage.setItem("activeCaseId", activeCaseId);
    }
  }, [conversationCases, activeCaseId]);

  // Update activeCaseId based on URL changes.
  useEffect(() => {
    const match = location.pathname.match(/\/conversation\/(\d+)/);
    if (match) {
      const id = match[1];
      if (id !== String(activeCaseId)) {
        setActiveCaseId(Number(id));
      }
    }
  }, [location.pathname, activeCaseId]);

  // Prepare conversation list for LeftSidebar.
  const sidebarConversations = conversationCases.map((c) => ({
    key: c.id,
    title: c.name,
    id: c.id,
  }));

  // Function called when the chat sends a new Q/A pair.
  const handleResp = (question, answer) => {
    if (activeCaseId === null || conversationCases.length === 0) {
      const newCase = {
        id: new Date().valueOf(), // unique timestamp id.
        conversation: [{ question, answer }],
        name: "New Conversation",
      };
      setConversationCases((prev) => [...prev, newCase]);
      setActiveCaseId(newCase.id);
      navigate(`/conversation/${newCase.id}`);
    } else {
      setConversationCases((prev) =>
        prev.map((c) =>
          c.id === activeCaseId
            ? { ...c, conversation: [...c.conversation, { question, answer }] }
            : c
        )
      );
    }
  };

  // Auto-scroll to the latest conversation when new messages are added.
  useEffect(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationCases, activeCaseId]);

  // The ActiveConversation component wrapped in a scrollable flex container.
  const ActiveConversation = () => {
    const activeCase = conversationCases.find((c) => c.id === activeCaseId);
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 150px)" }}>
        {conversationCases.length === 0 ? (
          <div style={pdfUploaderStyle}>
            <PdfUploader />
          </div>
        ) : null}
        <div style={renderQAStyle}>
          <RenderQA
            conversation={activeCase ? activeCase.conversation : []}
            isLoading={isLoading}
          />
          {/* Dummy element for auto-scroll */}
          <div ref={conversationEndRef} />
        </div>
      </div>
    );
  };

  // "New Conversation" button handler.
  const newConversation = () => {
    const newCase = {
      id: new Date().valueOf(),
      conversation: [],
      name: "New Conversation",
    };
    setConversationCases((prev) => [...prev, newCase]);
    setActiveCaseId(newCase.id);
    navigate(`/conversation/${newCase.id}`);
  };

  // Function to delete a conversation.
  const deleteConversation = (id) => {
    setConversationCases((prev) => {
      const newCases = prev.filter((c) => c.id !== id);
      message.success("Conversation deleted.");
      if (activeCaseId === id) {
        if (newCases.length > 0) {
          setActiveCaseId(newCases[0].id);
          navigate(`/conversation/${newCases[0].id}`);
        } else {
          setActiveCaseId(null);
          navigate(`/`);
        }
      }
      return newCases;
    });
  };

  return (
    <Layout style={{ height: "100vh", backgroundColor: "white" }}>
      <LeftSidebar
        sidebarConversations={sidebarConversations}
        activeCaseId={activeCaseId}
        updateConversationName={(id, newName) =>
          setConversationCases((prev) =>
            prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
          )
        }
        deleteConversation={deleteConversation}
      />
      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#1677FF",
          }}
        >
          <Title style={{ color: "white", margin: 0 }}>Paralegal RAG</Title>
        </Header>
        {/* Main content area set as a scrollable flex container */}
        <Content style={{ margin: "20px", display: "flex", flexDirection: "column", height: "calc(100vh - 112px)" }}>
          <Routes>
            <Route path="/" element={<ActiveConversation />} />
            <Route
              path="/conversation/:id"
              element={<CaseDetails conversationCases={conversationCases} />}
            />
          </Routes>
          {/* Chat area container at the bottom */}
          <div style={chatContainerStyle}>
            <Button
              size="large"
              type="primary"
              onClick={newConversation}
              style={{ marginRight: "15px" }}
            >
              New Conversation
            </Button>
            <FileUploadButton />
            <ChatComponent
              handleResp={handleResp}
              isLoading={isLoading}
              setIsLoading={setIsLoading}
            />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;