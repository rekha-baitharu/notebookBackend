module.exports = function (database) {
    var ObjectID = require("mongodb").ObjectID;
    var user_module = {
  
      //API TO GET USERS BY FILTERING
      getusers: function (email, callBack) {
        var users = [];
        var cursor = database.db().collection("notebook_users").find({ email });
        cursor.forEach(function (doc, err) {
          if (err) {
            callBack(true, null);
          } else {
            users.push(doc);
          }
        }, function () {
          callBack(false, users)
        });
      },
  
  
      //API TO DELETE USER PERMANENTLY
      delete_user: function (email, callBack) {
        database.db().collection("notebook_users").deleteOne({email: email}, function (err, result) {
          if (err) {
            callBack(true, null);
          } else {
            callBack(false, result);
          }
        })
      },
  
  
  
  
  
  
  
  
  
    };
    return user_module;
  };