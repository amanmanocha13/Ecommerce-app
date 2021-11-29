const { validationResult } = require('express-validator');
const Product = require('../models/product');
const User = require('../models/user');
const fs = require('fs');
const path = require('path');
const fileHelper = require('../util/file');
exports.getAdminProducts = (req, res, next) => {
  Product.find({ userId: req.user._id }).then((products) => {
    res.render('admin/products', {
      pageTitle: 'Admin | Products',
      path: '/admin/products',
      prods: products,
    });
  });
};
exports.getAddProduct = (req, res, next) => {
  return res.render('admin/edit-product', {
    editing: false,
    pageTitle: 'Admin | Add Product',
    path: '/admin/add-product',
    hasError: false,
    validationErrors: [],
  });
};
exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const price = req.body.price;
  const description = req.body.description;
  const image = req.file;
  console.log(image);
  const errors = validationResult(req);
  const errorArray = errors.array();
  if (!req.file) {
    errorArray.push({
      param: 'image',
      msg: 'Attached file must be an image',
    });
  }
  if (!errors.isEmpty() || !req.file) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Admin | Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
      },
      validationErrors: errorArray,
    });
  }
  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: req.file.path,
    userId: req.user._id,
  });
  product
    .save()
    .then(() => {
      req.flash('success', 'Product added successfully');
      res.redirect('/admin/products');
    })
    .catch(next);
};
exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit === 'true';
  if (!editMode) {
    return res.redirect('/admin/products');
  }
  const productId = req.params.productId;
  Product.findOne({ _id: productId, userId: req.user._id })
    .then((product) => {
      if (!product) {
        throw new Error('Product not found!');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Admin | Edit Product',
        path: '/admin/edit-product',
        product: product,
        editing: true,
        hasError: false,
        validationErrors: [],
      });
    })
    .catch(next);
};
exports.postEditProduct = (req, res, next) => {
  const productId = req.body.productId;
  const title = req.body.title;
  const price = req.body.price;
  const description = req.body.description;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Admin | Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description,
        _id: productId,
      },
      validationErrors: errors.array(),
    });
  }
  Product.findOne({ _id: productId, userId: req.user.id })
    .then((product) => {
      if (!product) {
        throw new Error('Product not found!');
      }
      product.title = title;
      product.price = price;
      product.description = description;
      if (req.file) {
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = req.file.path;
      }
      return product
        .save()
        .then(() => {
          req.flash('success', 'Product updated successfully');
          return res.redirect('/admin/products');
        })
        .catch(next);
    })
    .catch(next);
};
exports.deleteProduct = (req, res, next) => {
  const productId = req.params.productId;
  Product.findOneAndDelete({ _id: productId, userId: req.user._id })
    .then((product) => {
      if (!product) {
        throw new Error('Product not found!');
      }
      fileHelper.deleteFile(product.imageUrl);

      // res.redirect('/admin/products');

      User.deleteProductFromAllCarts(product.id, product.price);
      return res.status(200).json({
        message: 'Success!',
      });
    })
    .catch((err) => {
      return res.status(500).json({
        message: 'Deleting product failed',
      });
    });
};
