import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useLocation,
  Link,
} from "react-router-dom";
import { Layout, Typography, Button, message } from "antd";
import PdfUploader from "./components/PdfUploader";
import ChatComponent from "./components/ChatComponent";
import RenderQA from "./components/RenderQA";
import LeftSidebar from "./components/LeftSidebar";
import FileUploadButton from "./components/FileUploadButton";
import Login from "./components/Login";
import Register from "./components/Register";

const { Header, Content } = Layout;
const { Title } = Typography;

const pdfUploaderStyle = {
  margin: "auto",
  paddingTop: "20px",
};

const renderQAStyle = {
  flex: 1,
  overflowY: "auto",
  padding: "10px",
  background: "#fff",
  border: "1px solid #e8e8e8",
  borderRadius: "4px",
  marginTop: "10px",
};

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

export const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [conversationCases, setConversationCases] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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

  useEffect(() => {
    localStorage.setItem("conversationCases", JSON.stringify(conversationCases));
    if (activeCaseId !== null) {
      localStorage.setItem("activeCaseId", activeCaseId);
    }
  }, [conversationCases, activeCaseId]);

  useEffect(() => {
    const match = location.pathname.match(/\/conversation\/(\d+)/);
    if (match) {
      const id = match[1];
      if (id !== String(activeCaseId)) {
        setActiveCaseId(Number(id));
      }
    }
  }, [location.pathname, activeCaseId]);

  const sidebarConversations = conversationCases.map((c) => ({
    key: c.id,
    title: c.name,
    id: c.id,
  }));

  const handleResp = (question, answer) => {
    if (activeCaseId === null || conversationCases.length === 0) {
      const newCase = {
        id: new Date().valueOf(),
        conversation: [{ question, answer }],
        name: "New Conversation",
      };
      setConversationCases((prev) => [newCase, ...prev]);
      setActiveCaseId(newCase.id);
      navigate(`/conversation/${newCase.id}`);
    } else {
      setConversationCases((prev) =>
        prev.map((c) =>
          c.id === activeCaseId
            ? { ...c, conversation: [{ question, answer }, ...c.conversation] }
            : c
        )
      );
    }
  };

  const ActiveConversation = () => {
    const activeCase = conversationCases.find((c) => c.id === activeCaseId);
    const containerRef = useRef(null);
    useEffect(() => {
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }, [activeCase?.conversation]);
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 150px)" }}>
        {conversationCases.length === 0 ? (
          <div style={pdfUploaderStyle}>
            <PdfUploader />
          </div>
        ) : null}
        <div ref={containerRef} style={renderQAStyle}>
          <RenderQA
            conversation={activeCase ? activeCase.conversation : []}
            isLoading={isLoading}
          />
        </div>
      </div>
    );
  };

  const newConversation = () => {
    const newCase = {
      id: new Date().valueOf(),
      conversation: [],
      name: "New Conversation",
    };
    setConversationCases((prev) => [newCase, ...prev]);
    setActiveCaseId(newCase.id);
    navigate(`/conversation/${newCase.id}`);
  };

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
          <div>
            {localStorage.getItem("authToken") ? (
              <Button
                onClick={() => {
                  localStorage.removeItem("authToken");
                  window.location.reload();
                }}
                type="default"
              >
                Logout
              </Button>
            ) : (
              <>
                <Button
                  style={{
                    backgroundColor: "white",
                    borderColor: "white",
                    color: "black",
                    marginRight: 10,
                  }}
                >
                  <Link to="/login" style={{ color: "inherit" }}>
                    Login
                  </Link>
                </Button>
                <Button
                  style={{
                    backgroundColor: "#white",
                    borderColor: "#white",
                    color: "black",
                  }}
                >
                  <Link to="/register" style={{ color: "inherit" }}>
                    Register
                  </Link>
                </Button>
              </>
            )}
          </div>
        </Header>
        <Content style={{ margin: "20px", display: "flex", flexDirection: "column", height: "calc(100vh - 112px)" }}>
          <Routes>
            <Route path="/" element={<ActiveConversation />} />
            <Route path="/conversation/:id" element={<CaseDetails conversationCases={conversationCases} />} />
          </Routes>
          <div style={chatContainerStyle}>
            <Button size="large" type="primary" onClick={newConversation} style={{ marginRight: "15px" }}>
              New Conversation
            </Button>
            <FileUploadButton />
            <ChatComponent handleResp={handleResp} isLoading={isLoading} setIsLoading={setIsLoading} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    setIsAuthenticated(!!token);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/register" element={<Register setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </Router>
  );
};

export default App;