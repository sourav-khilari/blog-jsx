const express=require('express');
const app=express();
const cookieParser = require('cookie-parser');
const userModel=require("./models/user");
const postModel=require("./models/post");
const bcrypt=require('bcrypt');
const jwt=require("jsonwebtoken");
const upload=require("./config/multerconfig")
const path=require('path')

app.set("view engine","ejs");
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname,"public")))

app.get('/',(req,res)=>{
    res.render("index")
    
});
app.get('/login',(req,res)=>{
    res.render("login")
    
});
app.get('/profile/uploads',(req,res)=>{
    res.render("profileupload")
    
});

app.post('/upload',isLoggedIn,upload.single("image"),async(req,res)=>{
    let user=await userModel.findOne({email: req.user.email})
    user.profilepic=req.file.filename;
    await user.save();
    res.redirect("/profile"); 
});

app.post('/register',async (req,res)=>{
    let {email,password,username,name,age}=req.body

    let user=await userModel.findOne({email})
    if(user) 
        return res.status(500).send("User already registered")
    let user_n
    bcrypt.genSalt(10, function(err, salt) {
        bcrypt.hash(password, salt, async function(err, hash) {
            // Store hash in your password DB.
            user=await userModel.create({
                username,
                email,
                age,
                name,
                password:hash
            })

            let token=jwt.sign({email:email,userid:user._id},"shhhhh");
            res.cookie("token",token);
            res.send("registered")

        });
    });
    //console.log(user_n);
    
    
})

app.post('/login',async (req,res)=>{
    let {email,password}=req.body

    let user=await userModel.findOne({email})
    if(!user) 
        return res.status(500).send("1st login Something went wrong")
    bcrypt.compare(password, user.password, function(err, result) {
        // result == true
        if(result)
        {
            let token=jwt.sign({email:email,userid:user._id},"shhhhh");
            console.log(token);
            
            res.cookie("token",token);
            res.status(200).redirect("/profile")
        }
        else{
            res.status(500).send("from login Something went wrong")
        }
    });
    //res.render("login")
    
});

app.get('/profile',isLoggedIn,async (req,res)=>{
    let user=await userModel.findOne({email:req.user.email}).populate("posts")
    let posts=await postModel.find().populate("user")
    console.log("user1\n"+user+"\n");
    
    console.log(posts);
    
    res.render("profile",{user,posts})
    
});

app.get('/like/:id',isLoggedIn,async (req,res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate("user")
    //console.log(req.user);
    if(post.likes.indexOf(req.user.userid)===-1)
        post.likes.push(req.user.userid);
    else{
        post.likes.splice((post.likes.indexOf(req.user.userid)),1);
    }
    await post.save();

    res.redirect("/profile")
    
});

app.get('/edit/:id',isLoggedIn,async (req,res)=>{
    let post=await postModel.findOne({_id:req.params.id}).populate("user")


    res.render("edit",{post})
    
});

app.post('/update/:id',isLoggedIn,async (req,res)=>{
    let post=await postModel.findOneAndUpdate({_id:req.params.id},{content:req.body.content}).populate("user")
    res.redirect("/profile")
    
});

app.post('/post',isLoggedIn,async (req,res)=>{
    let user=await userModel.findOne({email:req.user.email})
    let{content}=req.body

    let post=await postModel.create({
        user:user._id,
        content
    });
    console.log(post);
    
    user.posts.push(post._id);
    await user.save()
    res.redirect("/profile")
});


app.get('/logout',(req,res)=>{
    res.cookie("token","")
    res.redirect("/login")
    
});

function isLoggedIn(req,res,next){
    //console.log(req);
    
    if(!req.cookies || req.cookies.token==="") 
        res.redirect("/login")
    else{
        let data=jwt.verify(req.cookies.token,"shhhhh")
        req.user=data
        next();
    }
    
    // if(req.cookies && req.cookies.token){
    //     let data=jwt.verify(req.cookie.token,"shhhhh")
    //     req.user=data
    // }   
    // else{
    //     res.redirect("/login")
    // }
    // next();
    
}

app.listen(3000);