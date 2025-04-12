import React, { useState, useEffect } from "react";
import axios from "axios";
import { Button, Input } from "antd";
import { AudioOutlined } from "@ant-design/icons";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import Speech from "speak-tts";

const { Search } = Input;
const DOMAIN = "http://localhost:5001";

// For adjusting the size of the search bar
const searchContainer = {
  display: "flex",
  justifyContent: "center",
  width: "70%"
};

const ChatComponent = (props) => {
  const { handleResp, isLoading, setIsLoading } = props;
  const [searchValue, setSearchValue] = useState("");
  const [isChatModeOn, setIsChatModeOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speech, setSpeech] = useState();

  // Set up speech recognition
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  useEffect(() => {
    const speechInstance = new Speech();
    speechInstance
      .init({
        volume: 1,
        lang: "en-US",
        rate: 1,
        pitch: 1,
        voice: "Google US English",
        splitSentences: true,
      })
      .then((data) => {
        console.log("Speech is ready, voices are available", data);
        setSpeech(speechInstance);
      })
      .catch((e) => {
        console.error("An error occurred while initializing:", e);
      });
  }, []);

  // onSearch sends the question to the backend via axios, then passes
  // the Q/A to App.js via handleResp. Note that if no conversation exists,
  // handleResp (in App.js) creates a new conversation and persists it.
  const onSearch = async (question) => {
    if (!question.trim()) return;
    console.log("onSearch called with question:", question);
    setSearchValue("");
    setIsLoading(true);
    try {
      const response = await axios.get(`${DOMAIN}/chat`, {
        params: { question },
      });
      // Pass the question and answer upward
      handleResp(question, response.data);
    } catch (error) {
      console.error("Error during chat request: ", error);
      handleResp(question, error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    setSearchValue(e.target.value);
  };

  // Toggle chat mode (which may trigger voice synthesis)
  const chatModeClickHandler = () => {
    setIsChatModeOn(!isChatModeOn);
    setIsRecording(false);
    SpeechRecognition.stopListening();
  };

  const recordingClickHandler = () => {
    if (isRecording) {
      setIsRecording(false);
      SpeechRecognition.stopListening();
      onSearch(transcript);
    } else {
      setIsRecording(true);
      SpeechRecognition.startListening();
    }
  };

  return (
    <div style={searchContainer}>
      {!isChatModeOn && (
        <Search
          placeholder="Input search text"
          enterButton="Ask"
          size="large"
          onSearch={onSearch}
          loading={isLoading}
          value={searchValue}
          onChange={handleChange}
        />
      )}
      <Button
        type="primary"
        size="large"
        danger={isChatModeOn}
        onClick={chatModeClickHandler}
        style={{ marginLeft: "5px" }}
      >
        Chat Mode: {isChatModeOn ? "On" : "Off"}
      </Button>
      {isChatModeOn && (
        <Button
          type="primary"
          icon={<AudioOutlined />}
          size="large"
          danger={isRecording}
          onClick={recordingClickHandler}
          style={{ marginLeft: "5px" }}
        >
          {isRecording ? "Recording..." : "Click to record"}
        </Button>
      )}
    </div>
  );
};

export default ChatComponent;