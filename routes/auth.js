const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const User = require("../models/user");

const authController = require("../controllers/auth");
const isAuth = require("../middlewares/is-auth");

router.get("/login", authController.getLogin);
router.post(
  "/login",
  [
    body("email")
      .normalizeEmail({ gmail_remove_dots: false })
      .isEmail()
      .withMessage("Please enter a valid email address"),
    body("password")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Password cannot be empty"),
  ],
  authController.postLogin
);
router.get("/signup", authController.getSignup);
router.post(
  "/signup",
  [
    body("email")
      .normalizeEmail({ gmail_remove_dots: false })
      .isEmail()
      .withMessage("Please enter a valid email address")
      .custom((value) => {
        return User.findOne({ email: value }).then((user) => {
          if (user) {
            return Promise.reject("Email already exists.");
          }
        });
      }),
    body("password")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Password cannot be empty")
      .matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%*]).{6,20}/)
      .withMessage(
        "Password must contain atleast 6 characters which should include atleast one digit, one upper case letter, one lower case letter and one special symbol (@#$%*)"
      ),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  ],
  authController.postSignup
);

router.post("/logout", isAuth, authController.postLogout);

router.get("/reset", authController.getReset);
router.post(
  "/reset",
  body("email", "Please Enter a valid email address")
    .normalizeEmail({ gmail_remove_dots: false })
    .isEmail(),
  authController.postReset
);

router.get("/reset/:resetToken", authController.getUpdatePassword);

router.post(
  "/update-password",
  [
    body("password")
      .trim()
      .not()
      .isEmpty()
      .withMessage("Password cannot be empty")
      .matches(/(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%*]).{6,20}/)
      .withMessage(
        "Password must contain atleast 6 characters which should include atleast one digit, one upper case letter, one lower case letter and one special symbol (@#$%*)"
      ),
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),
  ],
  authController.postUpdatePassword
);

module.exports = router;
