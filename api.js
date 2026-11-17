
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const conversations = new Map();

app.get("/", (req, res) => {
  res.send("Buddy AI is running!");
});

app.post("/chat", async (req, res) => {
  try {
    const { message, chatId = "default" } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required"
      });
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "Groq API key is missing"
      });
    }

    if (!conversations.has(chatId)) {
      conversations.set(chatId, [
        {
          role: "system",
          content:
            "You are Buddy AI, a helpful and intelligent assistant. Reply in the same language as the user. Help with coding, learning, writing and everyday tasks. Give clear and useful answers."
        }
      ]);
    }

    const history = conversations.get(chatId);

    history.push({
      role: "user",
      content: message
    });

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b",
          messages: history,
          temperature: 0.7,
          max_completion_tokens: 2048
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      history.pop();
      console.error("Groq Error:", data);

      return res.status(response.status).json({
        error: data.error?.message || "Groq AI service error"
      });
    }

    const reply =
      data.choices?.[0]?.message?.content;

    if (!reply) {
      history.pop();
      return res.status(500).json({
        error: "No AI reply received"
      });
    }

    history.push({
      role: "assistant",
      content: reply
    });

    // Keep recent conversation within memory limits
    if (history.length > 21) {
      history.splice(1, history.length - 21);
    }

    res.json({ reply });

  } catch (error) {
    console.error("Server Error:", error);

    res.status(500).json({
      error: "Server error"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Buddy AI running on port " + PORT);
});
