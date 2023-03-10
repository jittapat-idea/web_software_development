const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const items = require('../model/items.js')
const fs = require('fs')
const users = require('../model/users.js')

const storage = multer.diskStorage({
  destination:"./public/uploads/",
  filename: function(req,file,cb){
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    )
  }
})

const upload = multer({
  storage: storage,
  limits:{fileSize:5000000},
  fileFilter: function(req, file, cb){
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if(mimetype && extname){
      return cb(null,true)
    }
    cb("Error: File upload only supports the following filetypes - " + filetypes);
  }
}).single("image")

userLinks = [
  { href: '/home', label: 'Home'  },
  { href: '/items', label: 'Items'},
  { href:'/logout',label:'logout'}
];
adminLinks = [
  { href: '/home', label: 'Home'  },
  { href: '/items', label: 'Items' },
  { href: '/add-item', label: 'Add Item' },
  { href:'/logout',label:'logout'},
];
  var currentYear=(new Date().getFullYear())

exports.Additems = async(req, res)=>{
    session = req.session;
    const username = session.userid
    const user = await users.findOne({name:username})
    if(session.userid){
      if(user.role == 'admin'){
        res.render("add_item",{
            navLinks:adminLinks,
            userName:session.userid,
            currentYear,
            userRole:user.role
        })
      }else{
          res.render("add_item",{
            navLinks:userLinks,
            userName:session.userid,
            currentYear,
            userRole:user.role
          })
      }
    }else
    res.render("login")
}

exports.Additems_db = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.render("error", { message: err });
    }
    if(!req.file){
      return res.render("error",{ message: "not file upload or incomplete information" })
    }
    const { itemname, description, quantity } = req.body;
    try {
      console.log("you try");
      const check = await items.findOne({ itemname: itemname });
      if (!check && itemname != "" && description != "" && quantity != "") {
        sharp(req.file.path)
        .resize(200)
        .toFile("./public/uploads/resized-" + req.file.filename, async(err) =>{
          if(err){
            return res.render("error", { message: err });
          }
          const data = {
            itemname,
            description,
            quantity,
            imageURL:"resized-" + req.file.filename,
          };
          await items.insertMany([data]);
          res.redirect("/home");
        })
      } else if (itemname == "" && description == "" && quantity == "") {
        res.render("error", { message: "incomplete information" });
      } else {
        res.render("error", { message: "you already have this item" });
      }
    } catch(error){
      res.render("error", { message: error });
    }
  });
};


exports.edititem =async (req, res)=>{
  session = req.session;
  const username = session.userid
  const user = await users.findOne({name:username})
  if(session.userid){
      items.findById(req.params.id).then(data =>{
        if(!data){
          return res.render("error", {message: "No record found with ID: " + req.params.userID});
        }
        if(user.role == 'admin'){
          res.render("edit_item",{
            navLinks:adminLinks,
            userName:session.userid,
            currentYear,
            id: req.params.id,
            item: data,
            userRole:user.role
          })
        }else{
          res.render("edit_item",{
            navLinks:userLinks,
            userName:session.userid,
            currentYear,
            id: req.params.id,
            item: data,
            userRole:user.role
          })
        }

      }).catch(err => {
        return res.render("error", {message: "An error occurred: " + err.message});
      })
  }else
  res.render("login")
}

exports.edititem_db = async (req, res) => {
  const {itemname , description , quantity} = req.body;
  const id = req.params.id
  try {
    console.log(req.params.id);
    const item = await items.findById(id);
    if (!item) {
      return res.status(404).send("Item not found");
    }
    else if(itemname != ''&& description != '' && quantity != ''){
      item.itemname = itemname;
      item.description = description;
      item.quantity = quantity;
      
      await item.save();
      res.redirect('/items');
    }
    else if(itemname == ''|| description == '' || quantity == ''){
      res.render("error", {message: 'incomplete information'})
    }
  } catch (error) {
    res.render("error", {message: err.message});
  }
};
exports.deletez = (req, res) => {
  console.log(req.params.id)
  items.findById(req.params.id)
    .then(data => {
      if (!data) {
        return res.render("error", {message: "No record found with ID: " + req.params.id});
      }
      console.log(`data.imageURL:${data.imageURL}`)
      
      fs.unlink(`./public/uploads/${data.imageURL}`, (err) => {
        if (err) {
          console.error(err);
        }
        const originalFilename = data.imageURL.replace('resized-','');
        fs.unlink(`./public/uploads/${originalFilename}`, (err) => {
          if (err) {
            console.error(err);
          }
          items.findByIdAndDelete(req.params.id)
            .then(() => {
              res.redirect("/items");
            });
        });
      });
    })
    .catch(err => {
      return res.render("error", {message: "An error occurred: " + err.message});
    });
};


