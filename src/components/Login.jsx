import React, { useState } from "react";
import { Form, Input, Button, Typography, message } from "antd";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const { Title } = Typography;

const Login = ({ setIsAuthenticated }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post("/api/login", values);
      // Assuming your API returns a token on successful login
      localStorage.setItem("authToken", response.data.token);
      setIsAuthenticated(true);
      navigate("/");
    } catch (error) {
      message.error("Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "100px auto", padding: "20px", border: "1px solid #e8e8e8", borderRadius: 4 }}>
      <Title level={2} style={{ textAlign: "center" }}>Login</Title>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item 
          name="email" 
          label="Email" 
          rules={[{ required: true, type: "email", message: "Please enter a valid email" }]}
        >
          <Input placeholder="Enter your email" />
        </Form.Item>
        <Form.Item 
          name="password" 
          label="Password" 
          rules={[{ required: true, message: "Please enter your password" }]}
        >
          <Input.Password placeholder="Enter your password" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Login
          </Button>
        </Form.Item>
        <Form.Item>
          <span>
            Don't have an account? <Link to="/register">Register here</Link>
          </span>
        </Form.Item>
      </Form>
    </div>
  );
};

export default Login;