import express from "express";
const app = express();
const PORT = 8000

app.listen(8000, () => {
  console.log("server running on port " + PORT);
});

app.use(expressWinston.logger({
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'combined.log' })
    ],
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.json(),
    ),
    meta: false,
    msg: "HTTP  ",
    expressFormat: true,
    colorize: true,
    ignoreRoute: function (req, res) { return false; }
  }));
app.use(express.json());

app.post("/", (req, res) => {

    var reqJSONArray = req.body["dataArray"];
    exporter.initPool();

    exportLoop(reqJSONArray).then(response => {
        exportToPPT(response)
        exportToPDF(response)
        res.json({data : response});
    }).catch(err=>{
        console.log(err);
        res.json({notOk : true})
    })

    // exporter.killPool();
});