const express = require("express");
const path = require("path");
const { requestLogger } = require("./logger");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(requestLogger);

app.use("/api", require("./harnessRoutes"));
app.use("/api", require("./capabilities/routes"));
app.use("/", require("./domRoutes"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`QuickBook listening on http://localhost:${PORT}`));
