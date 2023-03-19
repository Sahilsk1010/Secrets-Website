/*jshint esversion: 6 */
require('dotenv').config();
const express = require('express');
const bodyparser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
GoogleStrategy = require('passport-google-oauth20').Strategy;
const passportlocalmongoose = require('passport-local-mongoose');



const app = express();



app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyparser.urlencoded({extended:true}));


app.use(session({
    secret:"Sahil Sanjeev Kulkarni",
    resave:false,
    saveUninitialized:false
}));


app.use(passport.initialize());
app.use(passport.session());





mongoose.connect("mongodb://127.0.0.1:27017/visitorDB")

const visiterschema = new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secrets:String
});

visiterschema.plugin(passportlocalmongoose);



const Visitor = mongoose.model("Visitor",visiterschema);

passport.use(Visitor.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
function(accessToken, refreshToken, profile, cb){
    console.log(profile);
    Visitor.findOne({googleId:profile.id}).then(function(user){
        if(user){
            return cb(null,user);
        }else{
            const newvisiter = new Visitor({
                googleId:profile.id,
                username: profile.displayName
            });
            newvisiter.save().then(function(user){
                return cb(null,user);
            }).catch(function(err){
                console.log(err);
            })
        }
    }).catch(function(err){
        console.log(err);
    })
}



));
  
   

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/",(req,res)=>{
    res.render("home");
});
app.get("/login",(req,res)=>{
    res.render("login");
});
app.get("/register",(req,res)=>{
    res.render("register");
});

app.post("/register", function(req, res){
    if (!req.body.username) {
        res.redirect("/register");
        return;
      }
      
      Visitor.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
          console.log(err);
          res.redirect("/register");
        } else {
          passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets");
          });
        }
      });
    });

//     Visitor.register({username: req.body.username}, req.body.password, function(err, user){
//       if (err) {
//         console.log(err);
//         res.redirect("/register");
//       } else {
//         passport.authenticate("local")(req, res, function(){
//           res.redirect("/secrets");
//         });
//       }
//     });
  
//   });



  
  
  
  
  
  
  
  

app.post("/login",(req,res)=>{
    const visiter = new Visitor({
        username:req.body.username,
        password:req.body.password
    });
    req.login(visiter,function(err){
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets")
            })
           
        }
    })

});

app.get("/logout",(req,res)=>{
    req.logout((function(err){
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    }));
    
})

app.get("/secrets",function(req,res){
    Visitor.find({"secrets":{$ne:null}}).then(function(founduser){
        if(founduser){
            res.render("secrets",{userwithsecrets:founduser});
        }
    }).catch(function(err){
        console.log(err);
    })
    
});

app.get("/submit",function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }

});

app.post("/submit",function(req,res){
    
    const submittedrequest = req.body.secret;
    Visitor.findById({_id:req.user.id}).then(function(founduser){
        if(founduser){
            founduser.secrets = submittedrequest
            founduser.save().then(function(){
                res.redirect("/secrets");
            })
        }

    })
})




app.listen(3000,()=>{
    console.log("Server is listening at port 3000");
});










