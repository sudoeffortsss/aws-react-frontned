// import React from "react";
// import { Spin } from "antd";

// const containerStyle = {
//   display: "flex",
//   justifyContent: "space-between",
//   flexDirection: "column",
//   marginBottom: "20px",
// };

// const userContainer = {
//   textAlign: "right",
// };

// const agentContainer = {
//   textAlign: "left",
// };

// const userStyle = {
//   maxWidth: "50%",
//   textAlign: "left",
//   backgroundColor: "#1677FF",
//   color: "white",
//   display: "inline-block",
//   borderRadius: "10px",
//   padding: "10px",
//   marginBottom: "10px",
// };

// const agentStyle = {
//   maxWidth: "50%",
//   textAlign: "left",
//   backgroundColor: "#F9F9FE",
//   color: "black",
//   display: "inline-block",
//   borderRadius: "10px",
//   padding: "10px",
//   marginBottom: "10px",
// };

// const RenderQA = (props) => {
//   const { conversation, isLoading } = props;

//   return (
//     <>
//       {conversation?.map((each, index) => {
//         return (
//           <div key={index} style={containerStyle}>
//             <div style={userContainer}>
//               <div style={userStyle}>{each.question}</div>
//             </div>
//             <div style={agentContainer}>
//               <div style={agentStyle}>{each.answer}</div>
//             </div>
//           </div>
//         );
//       })}
//       {isLoading && <Spin size="large" style={{ margin: "10px" }} />}
//     </>
//   );
// };

// export default RenderQA;

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
