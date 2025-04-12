import React, { useState, useEffect, useRef } from "react";
import { Layout, Typography, List, Button, Input, Popconfirm } from "antd";
import { MenuOutlined, DeleteOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

const { Sider } = Layout;
const { Title } = Typography;

const LeftSidebar = ({
  sidebarConversations,
  activeCaseId,
  updateConversationName,
  deleteConversation,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [tempName, setTempName] = useState("");
  // Create a ref for the list container to auto-scroll to latest item.
  const sidebarListRef = useRef(null);

  const toggleSidebar = () => setCollapsed(!collapsed);

  // When the conversation list updates, scroll to the bottom so the latest conversation is in view.
  useEffect(() => {
    if (sidebarListRef.current) {
      sidebarListRef.current.scrollTop = sidebarListRef.current.scrollHeight;
    }
  }, [sidebarConversations]);

  const startEditing = (id, currentName) => {
    setEditingId(id);
    setTempName(currentName);
  };

  const finishEditing = (id) => {
    updateConversationName(id, tempName);
    setEditingId(null);
    setTempName("");
  };

  return (
    <>
      <Button onClick={toggleSidebar} style={{ position: "fixed", top: 15, left: 15, zIndex: 1000 }} icon={<MenuOutlined />} />
      {!collapsed && (
        <Sider
          width={250}
          style={{
            background: "#f0f2f5",
            padding: "20px",
            marginLeft: "60px",
            height: "100vh",         // Fill viewport height
            overflowY: "auto",       // Enable vertical scrolling
          }}
        >
          <Title level={4}>Previous Cases</Title>
          {/* Wrap the List in a scrollable container */}
          <div ref={sidebarListRef}>
            <List
              dataSource={sidebarConversations}
              renderItem={(item) => {
                const isActive = String(item.id) === String(activeCaseId);
                const itemStyle = {
                  backgroundColor: isActive ? "#bae7ff" : "transparent",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  margin: "4px 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                };

                return (
                  <List.Item style={itemStyle}>
                    {editingId === item.id ? (
                      <Input
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={() => finishEditing(item.id)}
                        onPressEnter={() => finishEditing(item.id)}
                        autoFocus
                      />
                    ) : (
                      <div style={{ flexGrow: 1 }} onDoubleClick={() => startEditing(item.id, item.title)}>
                        <Link to={`/conversation/${item.id}`}>{item.title}</Link>
                      </div>
                    )}
                    <Popconfirm
                      title="Are you sure you want to delete this conversation?"
                      onConfirm={() => deleteConversation(item.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button type="text" icon={<DeleteOutlined />} danger />
                    </Popconfirm>
                  </List.Item>
                );
              }}
            />
          </div>
        </Sider>
      )}
    </>
  );
};

export default LeftSidebar;