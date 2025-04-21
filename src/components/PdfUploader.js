import React from "react";
import { Upload, message, Button } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import axios from "axios";

const DOMAIN = "http://localhost:8000";

const PdfUploader = () => {
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
      onSuccess(response.data); // ✅
    } catch (error) {
      console.error("[DEBUG] Upload error", error.response || error.message);
      onError(error); // ✅
    }
  };

  return (
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
  );
};

export default PdfUploader;
