const User = require('../models/user');
const bcrypt = require('bcryptjs');
const transporter = require('../util/nodemailer');
const crypto = require('crypto');
const { validationResult } = require('express-validator');

exports.getLogin = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/');
  }
  return res.render('auth/login', {
    pageTitle: 'Login',
    path: '/login',
    oldInput: {
      email: '',
      password: '',
    },
    validationErrors: [],
  });
};
exports.postLogin = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/');
  }
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login', {
      pageTitle: 'Login',
      path: '/login',
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.render('auth/login', {
          pageTitle: 'Login',
          path: '/login',
          oldInput: {
            email: email,
            password: password,
          },
          flash: {
            error: ['Invalid email/password'],
            success: [],
          },
          validationErrors: [],
        });
      }
      bcrypt
        .compare(password, user.password)
        .then((result) => {
          if (!result) {
            return res.render('auth/login', {
              pageTitle: 'Login',
              path: '/login',
              oldInput: {
                email: email,
                password: password,
              },
              flash: {
                error: ['Invalid email/password'],
                success: [],
              },
              validationErrors: [],
            });
          }
          req.session.isAuthenticated = true;
          req.session.userId = user._id;
          req.session.save((err) => {
            if (err) console.log(err);
            return res.redirect('/');
          });
        })
        .catch(next);
    })
    .catch(next);
};
exports.getSignup = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/');
  }
  res.render('auth/signup', {
    pageTitle: 'Signup',
    path: '/signup',
    oldInput: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationErrors: [],
  });
};
exports.postSignup = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/');
  }
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/signup', {
      pageTitle: 'Signup',
      path: '/signup',
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }

  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      return User.create({
        email: email,
        password: hashedPassword,
        cart: {
          items: [],
          totalPrice: 0,
        },
      });
    })
    .then(() => {
      req.flash(
        'success',
        'Account created successfully. Please Login to continue'
      );
      return res.redirect('/login');
    })
    .catch(next);
};
exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) console.log(err);
    res.redirect('/login');
  });
};

exports.getReset = (req, res, next) => {
  if (req.session.isAuthenticated) {
    return res.redirect('/');
  }
  return res.render('auth/reset', {
    pageTitle: 'Reset Password',
    path: '/reset',
    oldInput: {
      email: '',
    },
    validationErrors: [],
  });
};
exports.postReset = (req, res, next) => {
  const email = req.body.email;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/reset', {
      pageTitle: 'Reset Password',
      path: '/reset',
      oldInput: {
        email: email,
      },
      validationErrors: errors.array(),
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash(
          'error',
          'Email id not registered. Please <a href="/signup">Signup</a>'
        );
        return res.redirect('back');
      }
      crypto.randomBytes(32, (err, buffer) => {
        if (err) {
          console.log(err);
          return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 600000;
        user
          .save()
          .then(() => {
            req.flash(
              'success',
              'Email with reset password link has been sent to your registered email address'
            );
            res.redirect('back');
            return transporter.sendMail({
              to: user.email,
              from: "'Ecommerce Store' <aman.manocha97@gmail.com>",
              subject: 'Reset Password',
              html: `Please clink on this <a href="http://localhost:3500/reset/${token}">link</a> to reset password. Link is valid for 10 minutes`,
            });
          })
          .catch(next);
      });
    })
    .catch(next);
};
exports.getUpdatePassword = (req, res, next) => {
  const resetToken = req.params.resetToken;
  User.findOne({
    resetPasswordToken: resetToken,
    resetPasswordExpires: {
      $gt: Date.now(),
    },
  })
    .then((user) => {
      if (!user) {
        req.flash(
          'error',
          'Reset password link has expired. Kindly request a new one here'
        );
        return res.redirect('/reset');
      }
      res.render('auth/new-pass', {
        pageTitle: 'Reset Password',
        path: '/reset',
        userId: user._id,
        resetToken: resetToken,
        oldInput: {
          password: '',
          confirmPassword: '',
        },
        validationErrors: [],
      });
    })
    .catch(next);
};
exports.postUpdatePassword = (req, res, next) => {
  const resetToken = req.body.resetToken;
  const userId = req.body.userId;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('auth/new-pass', {
      pageTitle: 'Reset Password',
      path: '/reset',
      userId: userId,
      resetToken: resetToken,
      oldInput: {
        password: password,
        confirmPassword: confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }
  User.findOne({
    _id: userId,
    resetPasswordToken: resetToken,
    resetPasswordExpires: {
      $gt: Date.now(),
    },
  })
    .then((user) => {
      if (!user) {
        console.log('No user found');
        req.flash(
          'error',
          'Reset password link has expired. Kindly request a new one here'
        );
        return res.redirect('/reset');
      }
      bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          user.password = hashedPassword;
          user.resetPasswordToken = undefined;
          user.resetPasswordExpires = undefined;
          return user.save();
        })
        .then(() => {
          req.flash('success', 'Password updated, Login to continue');
          res.redirect('/login');
          transporter.sendMail({
            from: "'Ecommerce Shop' <aman.manocha97@gmail.com>",
            to: user.email,
            subject: 'Password updated successfully',
            html: "If you didn't request this, kindly let us know",
          });
        })
        .catch(next);
    })
    .catch(next);
};
