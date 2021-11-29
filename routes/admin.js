const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/admin');
const isAuth = require('../middlewares/is-auth');

router.get('/add-product', isAuth, adminController.getAddProduct);
router.post(
  '/add-product',
  [
    body('title')
      .trim()
      .escape()
      .isLength({ min: 3 })
      .withMessage('Title must be atleast 3 characters long')
      .isString(),
    body('price')
      .trim()
      .escape()
      .not()
      .isEmpty()
      .withMessage('Price cannot be empty')
      .isDecimal(),
    body('description')
      .trim()
      .escape()
      .isLength({ min: 5, max: 400 })
      .withMessage('Description must contain atleast 5 characters'),
    // body('imageUrl')
    //   .trim()
    //   .not()
    //   .isEmpty()
    //   .withMessage('Image url cannot be empty')
    //   .isURL(),
  ],
  isAuth,
  adminController.postAddProduct
);
router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);
router.post(
  '/edit-product',
  isAuth,
  [
    body('title')
      .trim()
      .escape()
      .isLength({ min: 3 })
      .withMessage('Title must be atleast 3 characters long')
      .isString(),
    body('price')
      .trim()
      .escape()
      .not()
      .isEmpty()
      .withMessage('Price field cannot be empty')
      .isDecimal(),
    body('description')
      .trim()
      .escape()
      .isLength({ min: 5, max: 400 })
      .withMessage('Description must contain atleast 5 characters'),
  ],
  adminController.postEditProduct
);
router.get('/products', isAuth, adminController.getAdminProducts);
router.delete('/product/:productId', isAuth, adminController.deleteProduct);

module.exports = router;
