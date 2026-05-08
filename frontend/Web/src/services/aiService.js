import axios from "axios";

const API_URL = "http://localhost:5000/api/chat";

export const askAI = async (prompt) => {
try {
const response = await axios.post(API_URL, {
prompt,
});

```
return response.data.reply;
```

} catch (error) {
console.error("AI ERROR:", error);

```
return "Sorry, I couldn't answer right now.";
```

}
};
