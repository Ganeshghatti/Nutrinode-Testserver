const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(bodyParser.json());
app.use(cors());
app.get("/", async (req, res) => {
    res.send("Success")
})
app.post("/user/detect-food", async (req, res) => {
  try {
    const { email, link } = req.body;

    // Validate incoming request data
    if (!email || !link) {
      return res.status(400).json({ error: "Missing required data" });
    }

    const image = await loadImage(link);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    // Convert the canvas to a data URL with JPEG format
    const dataUrl = canvas.toDataURL("image/jpeg");
    console.log(dataUrl);
    console.log(process.env.API_KEY)
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Identify the object in this image.---If Given object is food then write 2-3 words for 1):name: and 2):description: of image. Then estimate the number of grams 3):protien: 4):fats: 5):carbs: 6):calories: in that food.protien,fats,carbs and calories should strictly in number. If given object isn't food item then return :name:=not a food item and end. All the responses should be strictly in JSON format and the variable names should exactly match with params inside :: quotes. Output should be strictly in parsable JSON Format ONLY without unwanted symbols and back ticks(your output should be in such a way that when applied JSON.parse() to your string output it should return JSON)",
              },
              {
                type: "image_url",
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response.data.choices[0].message.content);
    const items = JSON.parse(response.data.choices[0].message.content);

    res.status(200).json({
      items: {
        description:
          items.description || "Object couldn't be detected accurately",
        name: items.name || "Unidentified object",
        calories: items.calories || "0",
        fat: items.fat || "0",
        protein: items.protein || "0",
        carbs: items.carbs || "0",
      },
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
