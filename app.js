const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongodDbStore = require('connect-mongodb-session')(session);
const csrfProtection = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.hxsi0.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?authSource=admin&replicaSet=atlas-g53b1e-shard-0&readPreference=primary&appname=MongoDB%20Compass&ssl=true`;

const store = new MongodDbStore({
  uri: MONGODB_URI,
  collection: 'sessions',
});

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products');
  },
  filename: function (req, file, cb) {
    cb(
      null,
      req.body.title + '-' + Date.now() + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  //or path.extname
  console.log(file.mimetype);
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    return cb(null, true);
  } else return cb(null, false);
};

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

const app = express();

app.set('view engine', 'ejs');

app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.use(express.urlencoded({ extended: false }));

app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
);
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const errorController = require('./controllers/error');
const User = require('./models/user');

app.use(
  session({
    resave: false,
    saveUninitialized: false,
    secret: 'sdf52fdsghfdc23534hxvxc',
    store: store,
  })
);

app.use(csrfProtection());

app.use(flash());

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isAuthenticated;
  res.locals.csrfToken = req.csrfToken();
  res.locals.flash = {
    error: req.flash('error'),
    success: req.flash('success'),
  };
  next();
});

app.use((req, res, next) => {
  if (!req.session.isAuthenticated) {
    return next();
  }
  User.findById(req.session.userId)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      return next();
    })
    .catch(next);
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log(error);
  return res.status(500).render('500', {
    pageTitle: 'Error occured',
    path: '/500',
  });
});

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    app.listen(process.env.PORT || 3000, '0.0.0.0');
  })
  .catch((err) => console.log(err));
