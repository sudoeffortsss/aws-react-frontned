import React from "react";
import { Button, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import axios from "axios";

const DOMAIN = "http://localhost:8000";

const FileUploadButton = () => {
  const props = {
    name: "file",
    action: `${DOMAIN}/upload`,
    headers: {
      authorization: "authorization-text",
    },
    showUploadList: false,
    onChange(info) {
      const { status } = info.file;
      if (status !== "uploading") {
        console.log(info.file, info.fileList);
      }
      if (status === "done") {
        message.success(`${info.file.name} file uploaded successfully.`);
      } else if (status === "error") {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  return (
    <Upload {...props}>
      <Button size="large" icon={<UploadOutlined />} style={{ padding: "10px 20px" }}>
        Upload Files
      </Button>
    </Upload>
  );
};

export default FileUploadButton;
