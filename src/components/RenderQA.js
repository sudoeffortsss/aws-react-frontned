import React from "react";
import { Spin } from "antd";

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  marginBottom: "20px",
};

const userContainerStyle = {
  display: "flex",
  justifyContent: "flex-end",
};

const agentContainerStyle = {
  display: "flex",
  justifyContent: "flex-start",
  flexDirection: "column"
};

const userBubbleStyle = {
  maxWidth: "70%",
  backgroundColor: "#1677FF",
  color: "white",
  borderRadius: "10px",
  padding: "10px",
};

const agentBubbleStyle = {
  maxWidth: "70%",
  backgroundColor: "#F9F9FE",
  color: "black",
  borderRadius: "10px",
  padding: "10px",
};

const sourcesStyle = {
  fontSize: "0.85em",
  color: "#666",
  marginTop: "5px",
};

const spinnerContainerStyle = {
  display: "flex",
  justifyContent: "center",
  margin: "10px",
};

const RenderQA = ({ conversation, isLoading }) => {
  return (
    <div>
      {conversation?.map((each, index) => (
        <div key={index} style={containerStyle}>
          <div style={userContainerStyle}>
            <div style={userBubbleStyle}>{each.question}</div>
          </div>
          <div style={agentContainerStyle}>
            <div style={agentBubbleStyle}>{each.answer}</div>

            {/* ✅ 展示 sources */}
            {each.sources && each.sources.length > 0 && (
              <div style={sourcesStyle}>
                <strong>Sources:</strong>
                <ul style={{ margin: "5px 0", paddingLeft: "18px" }}>
                  {each.sources.map((src, i) => (
                    <li key={i}>
                      {src.source}
                      {src.chunk !== undefined && ` (chunk ${src.chunk})`}
                      {src.chunk_id !== undefined && ` (chunk ${src.chunk_id})`}
                      {src.page !== undefined && ` (page ${src.page})`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
        <div style={spinnerContainerStyle}>
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default RenderQA;
