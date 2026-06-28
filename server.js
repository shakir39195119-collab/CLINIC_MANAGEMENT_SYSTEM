import { createApp } from "./src/app.js";

const port = Number(process.env.PORT || 8000);
const app = createApp();

app.listen(port, () => {
  console.log(`Clinic management system running on http://localhost:${port}`);
});
