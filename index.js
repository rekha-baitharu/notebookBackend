var express = require("express");
var mongoClient = require("mongodb").MongoClient;
var app = express();
var bodyParser = require("body-parser");
var fileUpload = require("express-fileupload");
const { json } = require("body-parser");
var cors = require("cors");
var userrouter = require("./routes/user_router.js");
// var maths = require("./routes/maths.js");
var ObjectID = require("mongodb").ObjectID;
var mongoose = require('mongoose');
// var uniqueValidator = require('mongoose-unique-validator');
var jwt = require("jsonwebtoken");
// const bcrypt = require("bcryptjs");

app.set("port", process.env.PORT || 5000);
app.use(cors());
app.listen(app.get("port"), function () {
    console.log("app is running on port " + app.get("port"))
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(fileUpload());




mongoClient.connect("mongodb://localhost:27017/notebook", function (err, database) {
    userrouter.configure(app, database);
    // maths.configure(app, database);


    app.get("/", function (req, res) {
        res.send("welcome to the page");
    })

   


});






