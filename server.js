const exporter = require("highcharts-export-server");
const express = require("express");
const pdf2base64 = require("pdf-to-base64");
const morgan = require("morgan");
const app = express();
const PORT = 8000;

app.listen(PORT, () => {
  console.log("server running on port " + PORT);
});

app.use(morgan("combined"));
app.use(express.json());

app.post("/", (req, res) => {
  
  // var exportSettings = req.body
  // console.log(exportSettings)
  var rawData = req.body;
  rawDataJSONArray = rawData["Data"];
  let data = []
  let keys = [];

  for (key in rawDataJSONArray[0]) {
    keys.push(key);
  }

  for (x of rawDataJSONArray) {
    var obj = {
      name: x[keys[0]],
      y: x[keys[1]],
    };
    data.push(obj);
  }

//   console.log(data);

  var exportSettings = {
      type:"jpeg",
      options : {
        chart: {
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false,
            type: 'pie'
        },
        title: {
            text: 'Browser market shares in January, 2018'
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        accessibility: {
            point: {
                valueSuffix: '%'
            }
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                }
            }
        },
        series: [{
            name: 'Brands',
            colorByPoint: true,
            data: data
        }]
      }

  }

//   console.log(exportSettings)


  exporter.initPool();
  const getData = (exportSettings) => {
    return new Promise((resolve, reject) => {
      exporter.export(exportSettings, function (err, response) {
        //The export result is now in res.
        //If the output is not PDF or SVG, it will be base64 encoded (res.data).
        //If the output is a PDF or SVG, it will contain a filename (res.filename).

        let data = response.data;

        if (exportSettings["type"] == "pdf") {
          fileName = response.filename;

          const getBase64 = async (fileName) => {
            return new Promise((resolve, reject) => {
              pdf2base64(fileName)
                .then((base64res) => {
                  data = base64res;
                  require("fs");
                  resolve({ data });
                })
                .catch((error) => {
                  console.log(error);
                  reject();
                });
            });
          };

          let pdfToBase64 = async (fileName) => {
            const base64 = await getBase64(fileName);
            // console.log(data);
            return base64;
          };
          pdfToBase64(fileName)
            .then((data) => {
              resolve({ data });
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          if (err) {
            reject();
          } else {
            resolve({ data });
            return { data };
          }
        }
        // console.log(data);
        exporter.killPool();
      });
    });
  };

  // definition of wrapper function it is async therefore returns promise
  const wrapper = async (exportSettings) => {
    const data = await getData(exportSettings);
    return data; //promise as received from getdata function
  };

  // calling wrapper function
  wrapper(exportSettings)
    .then((data) => res.json(data))
    .catch((err) => {
      res.json({ error: err });
    });
});
