import pptxgen from "pptxgenjs";
const exporter = require("highcharts-export-server");
const express = require("express");
const winston = require('winston');
const expressWinston = require('express-winston');
const app = express();
const dotenv = require("dotenv");

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


const getExportSettings = (objectifiedJSONData)=>{

    const rawDataJSONArray = objectifiedJSONData["Data"];
    let data = []
    let keys = [];
    
    for (let key in rawDataJSONArray[0]) {
      keys.push(key);
    }
  
    for (let x of rawDataJSONArray) {
      var obj = {
        name: x[keys[0]],
        y: x[keys[1]],
      };
      data.push(obj);
    }

    let exportSettings = {
        type : objectifiedJSONData["type"],
        scale : objectifiedJSONData["scale"],
        options : objectifiedJSONData["options"],
    }
    exportSettings.options["series"] = [{
        data:data
    }]
    return exportSettings
}

const exportToImg = (exportSettings)=>{
    return new Promise((resolve, reject)=>{
        
        exporter.export(exportSettings, function (err, res) {
            //If the output is not PDF or SVG, it will be base64 encoded (res.data).
            //If the output is a PDF or SVG, it will contain a filename (res.filename).
            
            if(res.data){
                resolve(res.data);
            }
            else{
                reject(err);
            }
            // console.log(res.data)
            
        });
    })
}

const exportLoop = (reqJSONArray)=>{
    return new Promise((resolve, reject)=>{
        const toBeDone = reqJSONArray.length;
        var done = 0;
        var resultArray = [];
        for(let i = 0; i < toBeDone; i++){
            var rawData = reqJSONArray[i];
            var exportSettings = getExportSettings(rawData);
            
            exportToImg(exportSettings).then(response => {
                resultArray.push(response);
                console.log("done", i);
                done += 1;
                if(done === toBeDone){
                    resolve(resultArray);
                }
            })
            .catch((err)=>{
                console.log(err);
                reject(err);
            })
        }
    })
    
}

const exportToPPT = (imgArrayBase64)=>{
    let pres = new pptxgen();

    // 2. Add a Slide
    let slide = pres.addSlide();

    // 3. Add one or more objects (Tables, Shapes, Images, Text and Media) to the Slide
    // let textboxText = "Hello World from PptxGenJS!";
    // let textboxOpts = { x: 1, y: 1, color: "363636" };
    // slide.addText(textboxText, textboxOpts);
    var properties = "image/png;base64,"
    slide.addImage({  x: 0, y: 0, w:"95%", h: "95%", data: properties + imgArrayBase64[0] });
    // 4. Save the Presentation

    pres.writeFile();
}



app.post("/", (req, res) => {

    var reqJSONArray = req.body["dataArray"];
    exporter.initPool();

    exportLoop(reqJSONArray).then(response => {
        exportToPPT(response)
        res.json({data : response});
    }).catch(err=>{
        console.log(err);
        res.json({notOk : true})
    })

    // exporter.killPool();
});
