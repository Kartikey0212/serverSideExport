import pptxgen from "pptxgenjs";
import { jsPDF } from "jspdf";
import express from "express"
import exporter from "highcharts-export-server"
// const exporter = require("highcharts-export-server");
// const express = require("express");
const winston = require('winston');
const expressWinston = require('express-winston');
const app = express();
const dotenv = require("dotenv");
var sizeOf = require('image-size');

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
        var resultArray = new Array(toBeDone);
        for(let i = 0; i < toBeDone; i++){
            var rawData = reqJSONArray[i];
            var exportSettings = getExportSettings(rawData);
            
            exportToImg(exportSettings).then(response => {
                resultArray[i] = response;
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

    var properties = "img/png;base64,";
    for(let i = 0; i < imgArrayBase64.length; i++){
        let slide = pres.addSlide();
        slide.addImage({  
            x: 0, 
            y: 0, 
            w: "100%", 
            h: "100%", 
            data: properties + imgArrayBase64[i] 
        });
    }

    pres.writeFile();
}

const exportToPDF = (imgArrayBase64)=>{
    // addImage(imageData, format, x, y, width, height, alias, compression, rotation)
    const doc = new jsPDF({
        orientation: "landscape",
        // unit: "in",
        // format: [4, 2]
      });
    
    var img = Buffer.from(imgArrayBase64[0], 'base64');
    var dimensions = sizeOf(img);
    console.log(dimensions.width, dimensions.height);
    doc.addImage(imgArrayBase64[0], 'JPEG', 0, 0, 150, 150);
    doc.addImage(imgArrayBase64[1], 'JPEG', 150, 0, 150, 150);
    doc.save('a4.pdf');
}


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
