module.exports = {
    configure: function (app, database) {
      var ObjectID = require("mongodb").ObjectID;
      var jwt = require("jsonwebtoken");
      const bcrypt = require("bcryptjs");
      var multer = require("multer");
      var user_module = require("../modules/user_module")(database);
      var storage = multer.diskStorage({
        destination: function (req, file, cb) {
          cb(null, './public/upload/')
        },
        filename: function (req, file, cb) {
          cb(null, Date.now() + file.originalname)
        }
      });
  
      const fileFilter = (req, file, cb) => {
        if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
          cb(null, true);
        } else {
          cb(null, false);
        }
  
      }
  
      var upload = multer({
        storage: storage,
        limits: {
          fileSize: 1024 * 1024 * 5
        },
        fileFilter: fileFilter
      });
  
      // image path
      // limit: 5mb
      // filter : png, jpeg,jpg
  
  
      //USER REGISTRATION
      app.post("/register_user", async (req, res) => {
        try {
          var name = req.body.name;
          var email = req.body.email;
          var phone_number = req.body.phone_number;
          var password = req.body.password;
          var confirmPassword = req.body.confirmPassword;
          var pwd = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/;
          var em = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
          var num = /^[0-9]{10}$/;
          var Notebook = [];
          var Starred = [];
          var newuser = {
            name: name,
            email: email,
            phone_number: phone_number,
            password: password,
            Notebook: Notebook,
            Starred: Starred
          }
          var user = await database.db().collection("notebook_users").findOne({ email });
          if (user) {
            return res.status(400).send("User already registered.");
          } else {
            if (name === "") {
              res.json({ status: false, message: "Name can't be blank" });
            } else if (email === "") {
              res.json({ status: false, message: "Email can't be blank" });
            }
            else if (!email.match(em)) {
              res.json({ status: false, message: "Invalid email id" });
            } else if (phone_number === "") {
              res.json({ status: false, message: "Phone number can't be blank" });
            } else if (!phone_number.match(num)) {
              res.json({ status: false, message: "Invalid Phone Number" });
            } else if (!password.match(pwd)) {
              res.json({ status: false, message: "Password should contain: At least one uppercase letter, At least one lowercase letter, At least one digit, At least one special symbol, and should be more than 7 and less than 15" });
            }
            else if (password === confirmPassword) {
              database.db().collection("notebook_users").insertOne(newuser, function (err, doc) {
                res.json({ status: true, message: "User registered" });
              })
            } else {
              res.json({ status: false, message: "Password is not mactching" });
            }
          }
        } catch (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
      })
  
      //USER LOGIN
      app.post("/login_user", async (req, res) => {
        try {
          var email = req.body.email;
          var password = req.body.password;
          var user = await database.db().collection("notebook_users").findOne({ email, password });
          jwt.sign({ user }, "user-token", { expiresIn: "30min" }, function (err, token) {
            if (err) {
              res.json({ status: false, message: "Invalid User Id And Password" });
            } else {
              res.json({ status: true, message: "Login Successfull", result: email, token: token });
            }
          })
        } catch (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
      })
  
      app.post("/api", verifyToken, function (req, res) {
        jwt.verify(req.token, "user-token", function (err, authData) {
          if (err) {
            res.json({ message: "error" });
          } else {
            res.json({ message: "hello", authData });
          }
        })
      })
  
      // MIDDLEWARE
      function verifyToken(req, res, next) {
        const bearerHeader = req.headers['authorization'];
        if (typeof bearerHeader !== 'undefined') {
          const bearer = bearerHeader.split(" ");
          const bearerToken = bearer[1];
          req.token = bearerToken;
          next();
        } else {
          res.json({ status: false, message: "error" })
        }
      }
  
  
      //API TO GET USERS BY FILTERING
      app.post("/getusers", function (req, res) {
        user_module.getusers(req.body.email, function (error, users) {
          if (error == true) {
            res.json({ status: false, message: "error occured" });
          } else {
            res.json({ status: true, result: users });
          }
        })
  
      });
  
  
      // API TO DELETE USERS PERMANENTLY
      app.post("/delete_user_permanently", function (req, res) {
        user_module.delete_user(req.body.email, function (error, result) {
          if (error == true) {
            res.json({ status: false, message: "error occured" });
          } else {
            res.json({ status: true, message: "user deleted" });
          }
        })
      });
  
      app.post("/delete_user", function (req, res) {
        // if(req.body.hasOwnProperty("id")){
        database.db().collection("notebook_users").deleteOne({ unique_id: new ObjectID(req.body.id) }, function (err, obj) {
          if (err) {
            res.json({ status: false, message: "error occured" });
          } else {
            res.json({ status: true, message: "user deleted" });
          }
        })
        // }else{
        //     res.json({status:false, message:"id parameter is missing"});
        // }
      });
  
  
  
  
  
  
      //PUSH DATA WITHIN THE NOTEBOOK ARRAY
      app.post("/push", function (req, res) {
        database.db().collection("notebook_users").updateOne({ email: req.body.email },
          {
            $push: {
              Notebook: {
                unique_id: new ObjectID(),
                subject: req.body.subject,
                paragraph: req.body.paragraph
              }
            }
          }, { upsert: false }, function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error occured" });
            } else {
              if (req.body.subject === "") {
                res.json({ status: false, message: "subject can't be blank" });
              } else if (req.body.paragraph === "") {
                res.json({ status: true, message: "paragraph can't be blank" });
              } else {
                res.json({ status: true, message: "updated" });
              }
            }
          })
      })
  
  
      //TO PUSH DATA IN THE FIRST POSITION
      app.post("/push_position", function (req, res) {
        database.db().collection("notebook_users").updateOne({ email: req.body.email},
          {
            $push: {
              Notebook: {
                $each: [{
                  unique_id: new ObjectID(req.body.id),
                  subject: req.body.subject,
                  paragraph: req.body.paragraph
                }],
                $position: 0
              }
            }
          }, { upsert: false }, function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error occured" });
            } else {
              if (req.body.subject === "") {
                res.json({ status: false, message: "subject can't be blank" });
              } else if (req.body.paragraph === "") {
                res.json({ status: true, message: "paragraph can't be blank" });
              } else {
                res.json({ status: true, message: "position updated" });
              }
            }
          })
      })
  
  
          //TO PUSH DATA IN THE PREVIOUS POSITION
          app.post("/push_previous", function (req, res) {
            database.db().collection("notebook_users").updateOne({ email: req.body.email},
              {
                $push: {
                  Notebook: {
                    $each: [{
                      unique_id: new ObjectID(req.body.id),
                      subject: req.body.subject,
                      paragraph: req.body.paragraph
                    }],
                    $position: req.body.position
                  }
                }
              }, { upsert: false }, function (err, doc) {
                if (err) {
                  res.json({ status: false, message: "error occured" });
                } else {
                  if (req.body.subject === "") {
                    res.json({ status: false, message: "subject can't be blank" });
                  } else if (req.body.paragraph === "") {
                    res.json({ status: true, message: "paragraph can't be blank" });
                  } else {
                    res.json({ status: true, message: "position updated" });
                  }
                }
              })
          })
  
  
           //TO PUSH DATA IN THE NEXT POSITION
           app.post("/push_next", function (req, res) {
            database.db().collection("notebook_users").updateOne({ email: req.body.email},
              {
                $push: {
                  Notebook: {
                    $each: [{
                      unique_id: new ObjectID(req.body.id),
                      subject: req.body.subject,
                      paragraph: req.body.paragraph
                    }],
                    $position: req.body.position
                  }
                }
              }, { upsert: false }, function (err, doc) {
                if (err) {
                  res.json({ status: false, message: "error occured" });
                } else {
                  if (req.body.subject === "") {
                    res.json({ status: false, message: "subject can't be blank" });
                  } else if (req.body.paragraph === "") {
                    res.json({ status: true, message: "paragraph can't be blank" });
                  } else {
                    res.json({ status: true, message: "position updated" });
                  }
                }
              })
          })
  
  
       //PUSH DATA IN THE LAST POSITION OF NOTEBOOK ARRAY
       app.post("/push_last", function (req, res) {
        database.db().collection("notebook_users").updateOne({ email: req.body.email},
          {
            $push: {
              Notebook: {
                $each: [{
                  unique_id: new ObjectID(req.body.id),
                  subject: req.body.subject,
                  paragraph: req.body.paragraph
                }]
              }
            }
          }, { upsert: false }, function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error occured" });
            } else {
              if (req.body.subject === "") {
                res.json({ status: false, message: "subject can't be blank" });
              } else if (req.body.paragraph === "") {
                res.json({ status: true, message: "paragraph can't be blank" });
              } else {
                res.json({ status: true, message: "position updated" });
              }
            }
          })
      })
  
  
  
  
           //PUSH DATA IN THE PREVIOUS POSITION OF NOTEBOOK ARRAY
           app.post("/push_previous", function (req, res) {
            database.db().collection("notebook_users").aggregate([
              {
                "matchedIndex":{
                  "$indexOfArray":["$Notebook", req.body.id]
                },
                $push: {
                  Notebook: {
                    $each: [{
                      unique_id: new ObjectID(req.body.id),
                      subject: req.body.subject,
                      paragraph: req.body.paragraph
                    }],
  
                    $position: "matchedIndex"-1
                  }
                }
              }], { upsert: false }, function (err, doc) {
                console.log(doc)
                // console.log(matchedIndex)
                if (err) {
                  res.json({ status: false, message: "error occured" });
                } else {
                  if (req.body.subject === "") {
                    res.json({ status: false, message: "subject can't be blank" });
                  } else if (req.body.paragraph === "") {
                    res.json({ status: true, message: "paragraph can't be blank" });
                  } else {
                    res.json({ status: true, message: "position updated" });
                  }
                }
              })
          })
  
  
      //PULL DATA FROM THE ARRAY
      app.post("/pull", function (req, res) {
        database.db().collection("notebook_users").updateOne({ email: req.body.email },
          {
            $pull: {
              Notebook: {
                unique_id: new ObjectID(req.body.id)
              }
            }
          }, { upsert: false }, function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error occured" });
            } else {
              res.json({ status: true, message: "updated" });
            }
  
          })
      })
  
  
  
      //PUSH DATA WITHIN THE STARRED ARRAY
      app.post("/push_starred", function (req, res) {
        database.db().collection("notebook_users").updateOne({ email: req.body.email },
          {
            $push: {
              Starred: {
                unique_id: new ObjectID(),
                subject: req.body.subject,
                paragraph: req.body.paragraph
              }
            }
          }, { upsert: false }, function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error occured" });
            } else {
              if (req.body.subject === "") {
                res.json({ status: false, message: "subject can't be blank" });
              } else if (req.body.paragraph === "") {
                res.json({ status: true, message: "paragraph can't be blank" });
              } else {
                res.json({ status: true, message: "Inserted to the Starred Array" });
              }
            }
          })
      })
  
  
      //PULL DATA FROM THE STARRED ARRAY
      app.post("/pull_starred", function (req, res) {
        database.db().collection("notebook_users").updateOne({ email: req.body.email },
          {
            $pull: {
              Starred: {
                unique_id: new ObjectID(req.body.id)
              }
            }
          }, { upsert: false }, function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error occured" });
            } else {
              res.json({ status: true, message: "updated" });
            }
  
          })
      })
  
  
  
      //GET DATA FROM THE ARRAY
      app.post("/get_notes", function (req, res) {
        var user = [];
        database.db().collection("notebook_users").findOne({ email: req.body.email },
          function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error" });
            } else {
              res.json({ status: true, result: doc.Notebook });
            }
          });
        // cursor.forEach(function(doc,err){
        //   if (err) {
        //     res.json({status:false, message:"error"});
        //   }else{
        //     user.push(doc);
        //   }
        // }, function(){
        //   res.json({status:true, result:user});
        // })
      })
  
  
      //GET DATA FROM THE STARRED ARRAY
      app.post("/get_starred", function (req, res) {
        var user = [];
        database.db().collection("notebook_users").findOne({ email: req.body.email },
          function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error" });
            } else {
              res.json({ status: true, result: doc.Starred });
            }
          });
      })
  
  
  
  
  
      //EDIT NOTE
      app.post("/edit_notes", function (req, res) {
        var user = [];
        database.db().collection("notebook_users").updateOne({ email: req.body.email, "Notebook.unique_id": { "$ne": new ObjectID(req.body.id) } },
          {
            $set: {
              unique_id: {
                unique_id: new ObjectID()
              },
              subject: {
                subject: req.body.subject
              },
              paragraph: {
                paragraph: req.body.paragraph
              }
  
  
            }
          }, { upsert: false }, function (err, result) {
            if (err) {
              res.json({ status: false, message: "Error occured" });
            } else {
              res.json({ status: true, message: "Note updated" });
            }
            // function(doc,err){
            //   if(result){
            //     database.db().collection("notebook_users").updateOne({ unique_id: new ObjectID(req.body.id) },
            //       {
            //         $set: {
            //           subject: req.body.subject,
            //           paragraph:req.body.paragraph
            //         }
            //       }, { upsert: false }, function (err, result) {
            //         if (err) {
            //           res.json({ status: false, message: "Error occured" });
            //         } else {
            //           res.json({ status: true, message: "Note updated" });
            //         }
            //       })
            // }
          });
      })
  
  
      // API TO GET FIRST ELEMENT
      app.post("/first", async (req, re) => {
        try {
          var removeElement = database.db().collection("notebook_users").find({ email: req.body.email, "Notebook.unique_id": { "$ne": new ObjectID(req.body.id) } });
          var remove = database.db().collection("notebook_users").find({ email: req.body.email, "Notebook.unique_id": { "$ne": !new ObjectID(req.body.id) } });
          console.log(removeElement);
          // var arrfirstfilter = !database.db().collection("notebook_users").find({ email: req.body.email, "Notebook.unique_id": { "$ne": new ObjectID(req.body.id) } });
          // arrfirstfilter.splice(0,0,removeElement[0]);
          database.db().collection("notebook_users").updateOne({ email: req.body.email },
            {
              $addToSet: {
                $push: {
                  Notebook: {
                    $each: [remove, removeElement],
                    $position: 0
                  }
                }
              }
            }, { upsert: false }, function (err, doc) {
              if (err) {
                res.json({ status: false, message: "error occured" });
              } else {
                res.json({ status: true, message: "updated" });
              }
  
            })
        } catch (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
      })
  
  
      //API TO UPDATE PASSWORD
      app.post("/update_password", async (req, res) => {
        try {
          var pwd = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/;
          var password = req.body.password
          if (password === "") {
            res.json({ status: false, message: "Password can't be blank" });
          } else if (!password.match(pwd)) {
            res.json({ status: false, message: "Password should contain: At least one uppercase letter, At least one lowercase letter, At least one digit, At least one special symbol, and should be more than 7 and less than 15" });
          } else {
            database.db().collection("notebook_users").updateOne({ email: req.body.email },
              {
                $set: {
                  password: password
                }
              }, { upsert: false }, function (err, result) {
                if (err) {
                  res.json({ status: false, message: "Error occured" });
                } else {
                  res.json({ status: true, message: "Password updated" });
                }
              })
          }
        } catch (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
      });
  
      //API TO FORGOR PASSWORD
      app.post("/forgot_password", async (req, res) => {
        try {
          var pwd = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{7,15}$/;
          var password = req.body.password
          if (password === "") {
            res.json({ status: false, message: "Password can't be blank" });
          } else if (!password.match(pwd)) {
            res.json({ status: false, message: "Password should contain: At least one uppercase letter, At least one lowercase letter, At least one digit, At least one special symbol, and should be more than 7 and less than 15" });
          } else {
            var user = await database.db().collection("notebook_users").findOne({ email: req.body.email });
            if (user) {
              database.db().collection("notebook_users").updateOne({ email: req.body.email },
                {
                  $set: {
                    password: password
                  }
                }, { upsert: false }, function (err, result) {
                  if (err) {
                    res.json({ status: false, message: "Error occured" });
                  } else {
                    res.json({ status: true, message: "Password updated" });
                  }
                })
            } else {
              res.json({ status: false, message: "Invalid email id" });
            }
  
          }
        } catch (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
      });
  
  
  
      //API TO UPDATE PROFILE
      app.post("/update_profile", async (req, res) => {
        try {
          var name = req.body.name;
          var phone_number = req.body.phone_number;
          var num = /^[0-9]{10}$/;
          if (name === "") {
            res.json({ status: false, message: "Name can't be blank" });
          } else if (phone_number === "") {
            res.json({ status: false, message: "Phone number can't be blank" });
          } else if (!phone_number.match(num)) {
            res.json({ status: false, message: "Invalid Phone Number" });
          } else {
            database.db().collection("notebook_users").updateOne({ email: req.body.email },
              {
                $set: {
                  name: name,
                  phone_number: phone_number
                }
              }, { upsert: false }, function (err, result) {
                if (err) {
                  res.json({ status: false, message: "Error occured" });
                } else {
                  res.json({ status: true, message: "Profile updated" });
                }
              })
          }
        } catch (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
      });
  
  
      //API TO UPDATE NAME
      app.post("/update_name", async (req, res) => {
        try {
          var name = req.body.name
          if (name === "") {
            res.json({ status: false, message: "Name can't be blank" });
          } else {
            database.db().collection("notebook_users").updateOne({ email: req.body.email },
              {
                $set: {
                  name: name
                }
              }, { upsert: false }, function (err, result) {
                if (err) {
                  res.json({ status: false, message: "Error occured" });
                } else {
                  res.json({ status: true, message: "Name updated" });
                }
              })
          }
        } catch (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
      });
  
      //API TO UPDATE PHONE NUMBER
      app.post("/update_number", async (req, res) => {
        try {
          var num = /^[0-9]{10}$/;
          var phone_number = req.body.phone_number
          if (phone_number === "") {
            res.json({ status: false, message: "Phone number can't be blank" });
          } else if (!phone_number.match(num)) {
            res.json({ status: false, message: "Invalid Phone Number" });
          } else {
            database.db().collection("notebook_users").updateOne({ email: req.body.email },
              {
                $set: {
                  phone_number: phone_number
                }
              }, { upsert: false }, function (err, result) {
                if (err) {
                  res.json({ status: false, message: "Error occured" });
                } else {
                  res.json({ status: true, message: "Phone Number updated" });
                }
              })
          }
        } catch (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
      });
  
      //API TO DO SKIP AND LIMIT OPERATION
      app.post("/getuser", function (req, res) {
        var users = [];
        var cursor = database.db().collection("user").find().skip(parseInt(req.body.skip)).limit(parseInt(req.body.limit));
        cursor.forEach(function (doc, err) {
          if (err) {
            res.json({ status: false, message: "error" });
          } else {
            users.push(doc);
          }
        }, function () {
          res.json({ status: true, result: users });
        });
      });
  
  
  
  
      //API TO UPDATE NOTE
      app.post("/update_note", function (req, res) {
        database.db().collection("notebook_users").updateOne({ email: req.body.email, Notebook: { $elemMatch: { unique_id: new ObjectID(req.body.id) } } },
          {
            $set: {
              "Notebook.$.subject": req.body.subject,
              "Notebook.$.paragraph": req.body.paragraph
            }
          }, { upsert: false }, function (err, results) {
            if (err) {
              res.json({ status: false, message: "Error occured" });
            } else if (req.body.subject === "") {
              res.json({ status: false, message: "Subject can't be blank" });
            } else if (req.body.paragraph === "") {
              res.json({ status: false, message: "Paragraph can't be blank" });
            } else {
              res.json({ status: true, message: "notes updated" });
            }
          })
      })
  
  
      //REMOVE FIRST OBJECT OF AN ARRAY
      app.post("/popfirst", function (req, res) {
        database.db().collection("notebook_users").updateOne({ email: req.body.email },
          {
            $pop: {
              Notebook: -1
            }
          }, { upsert: false }, function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error occured" });
            } else {
              res.json({ status: false, message: "first note deleted" });
            }
          })
      })
  
      //REMOVE LAST OBJECT OF AN ARRAY
      app.post("/poplast", function (req, res) {
        database.db().collection("notebook_users").updateOne({ email: req.body.email },
          {
            $pop: {
              Notebook: 1
            }
          }, { upsert: false }, function (err, doc) {
            if (err) {
              res.json({ status: false, message: "error occured" });
            } else {
              res.json({ status: false, message: "last note deleted" });
            }
          })
      })
  
  
  
      //UPDATE PROFILE
      app.post("/update-profile", upload.single('profileImage'), function (req, res, next) {
  
        var email = req.body.email;
        var profilePic = req.file.path
        database.db().collection("notebook_users").find(email, function (err, data) {
  
          data.profileImage = profilePic ? profileImage : data.profileImage;
  
          data.save()
            .then(doc => {
              res.status(201).json({
                message: "Profile Image Updated Successfully",
                results: doc
              });
            })
            .catch(err => {
              res.json(err);
            })
  
        });
  
      })
  
  
      //UPDATE PROFILE
      app.post("/profile", async (req, res) => {
        try {
          var email = req.body.email;
          var profileImage = req.files.profileImage;
          profileImage.mv("public/" + profileImage.name, function (err) {
            console.log(profileImage);
            if (err) {
              res.json({ status: false, message: "file not uploaded" });
            } else {
              database.db().collection("notebook_users").updateOne({ email: email },
                {
                  $set: {
                    profileImage: profileImage
                  }
                }, { upsert: true }, function (err, result) {
                  if (err) {
                    res.json({ status: false, message: "Error occured" });
                  } else {
                    res.json({ status: true, message: "profile updated", result: profileImage });
                  }
                })
              // res.json({ status: true, message: "file uploaded" });
  
            }
          })
        } catch (err) {
          console.log(err);
          res.status(500).send("Something went wrong");
        }
      });
  
  
  
  
  
  
  
  
  
  
  
    }
  }