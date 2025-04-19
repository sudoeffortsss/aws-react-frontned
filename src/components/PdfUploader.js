import React, { useState } from "react";
import { Upload, message, List } from "antd";
import { InboxOutlined, FileOutlined } from "@ant-design/icons";
import axios from "axios";

const DOMAIN = "http://localhost:8000";

const PdfUploader = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const customRequest = async ({ file, onSuccess, onError }) => {
    console.log("[DEBUG] Starting upload...", file);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${DOMAIN}/upload/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log("[DEBUG] Upload success", response);
      // Update state to include this uploaded file
      setUploadedFiles(prev => [...prev, { name: file.name, uid: file.uid }]);
      onSuccess(response.data);
    } catch (error) {
      console.error("[DEBUG] Upload error", error.response || error.message);
      onError(error);
    }
  };

  return (
    <div>
      <Upload.Dragger
        name="file"
        customRequest={customRequest}
        multiple={false}
        showUploadList={false}
        onChange={(info) => {
          const { status } = info.file;
          if (status === "done") {
            message.success(`${info.file.name} file uploaded successfully`);
          } else if (status === "error") {
            message.error(`${info.file.name} file upload failed`);
          }
        }}
        onDrop={(e) => {
          console.log("Dropped files", e.dataTransfer.files);
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Click or drag file to upload</p>
        <p className="ant-upload-hint">
          Supports a single UTF-8 text file for now.
        </p>
      </Upload.Dragger>
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h3>Uploaded Files</h3>
          <List
            dataSource={uploadedFiles}
            renderItem={item => (
              <List.Item>
                <FileOutlined style={{ marginRight: 8 }} />
                {item.name}
              </List.Item>
            )}
          />
        </div>
      )}
    </div>
  );
};

export default PdfUploader;