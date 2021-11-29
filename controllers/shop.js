const Product = require('../models/product');
const Order = require('../models/order');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const ITEMS_PER_PAGE = 1;

exports.getIndex = (req, res, next) => {
  let page = +req.query.page || 1;
  let totalProducts, lastPage;
  Product.countDocuments()
    .then((numProducts) => {
      totalProducts = numProducts;
      if (totalProducts) {
        lastPage = Math.ceil(totalProducts / ITEMS_PER_PAGE);
        if (page > lastPage) {
          page = lastPage;
        }
      }
      return Product.find({}, '-userId')
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      return res.render('shop/index', {
        pageTitle: 'Shop',
        path: '/',
        prods: products,
        currentPage: page,
        hasNextPage: page * ITEMS_PER_PAGE < totalProducts,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: lastPage,
      });
    })
    .catch(next);
};
exports.getProducts = (req, res, next) => {
  let page = +req.query.page || 1;
  let totalProducts, lastPage;
  Product.countDocuments()
    .then((numProducts) => {
      totalProducts = numProducts;
      if (totalProducts) {
        lastPage = Math.ceil(totalProducts / ITEMS_PER_PAGE);
        if (page > lastPage) {
          page = lastPage;
        }
      }
      return Product.find({}, '-userId')
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      return res.render('shop/products', {
        pageTitle: 'Products',
        path: '/products',
        prods: products,
        currentPage: page,
        hasNextPage: page * ITEMS_PER_PAGE < totalProducts,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: lastPage,
      });
    })
    .catch(next);
};
exports.getProduct = (req, res, next) => {
  const productId = req.params.productId;
  Product.findById(productId)
    .select('-userId')
    .then((product) => {
      if (!product) {
        return res.redirect('/');
      }
      return res.render('shop/product-detail', {
        path: '/products',
        pageTitle: product.title,
        product: product,
      });
    })
    .catch(next);
};
exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId', '-userId')
    .then((user) => {
      console.log(user.cart.items);
      return res.render('shop/cart', {
        pageTitle: 'Your cart',
        path: '/cart',
        items: user.cart.items,
        totalPrice: user.cart.totalPrice,
      });
    })
    .catch(next);
};
exports.postAddToCart = (req, res, next) => {
  const productId = req.body.productId;
  Product.findById(productId)
    .then((product) => {
      if (!product) {
        return res.redirect('back');
      }
      console.log(req.user);
      req.user
        .addToCart(productId, product.price)
        .then(() => {
          return res.redirect('/cart');
        })
        .catch(next);
    })
    .catch(next);
};
exports.postRemoveFromCart = (req, res, next) => {
  const productId = req.body.productId;
  Product.findById(productId)
    .then((product) => {
      if (!product) {
        return res.redirect('back');
      }
      req.user
        .removeFromCart(productId, product.price)
        .then(() => {
          return res.redirect('/cart');
        })
        .catch(next);
    })
    .catch(next);
};
exports.getOrders = (req, res, next) => {
  Order.find({ userId: req.user._id })
    .then((orders) => {
      return res.render('shop/orders', {
        pageTitle: 'Your Orders',
        path: '/orders',
        orders: orders,
      });
    })
    .catch(next);
};

exports.getCheckout = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then((user) => {
      return res.render('shop/checkout', {
        pageTitle: 'Checkout',
        path: '/checkout',
        items: user.cart.items,
        totalPrice: user.cart.totalPrice,
      });
    })
    .catch(next);
};

exports.postCreateOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .then((user) => {
      const items = user.cart.items.map((i) => {
        return {
          title: i.productId.title,
          price: i.productId.price,
          description: i.productId.description,
          imageUrl: i.productId.imageUrl,
          productId: i.productId._id,
          quantity: i.quantity,
        };
      });
      return Order.create({
        items: items,
        userId: req.user._id,
        totalPrice: req.user.cart.totalPrice,
      });
    })
    .then((order) => {
      console.log(order);
      req.flash('success', 'Order place successfully');
      return req.user.clearCart();
    })
    .then(() => {
      return res.redirect('/orders');
    })
    .catch(next);
};

exports.getInvoice = (req, res, next) => {
  const userId = req.user.id;
  const orderId = req.params.orderId;
  Order.findOne({ userId: userId, _id: orderId })
    .then((order) => {
      if (!order) {
        throw new Error('Order not found!');
      }
      const invoiceName = 'invoice-' + orderId + '.pdf';
      const invoicePath = path.join('data', 'invoices', invoiceName);
      // fs.readFile(invoicePath, (err, data) => {
      //   res.setHeader('Content-Type', 'application/pdf');
      //   res.setHeader(
      //     'Content-Disposition',
      //     `inline;filename="${invoiceName}"`
      //   );
      //   res.send(data);
      // });
      // const file = fs.createReadStream(invoicePath);
      // res.setHeader('Content-Type', 'application/pdf');
      // res.setHeader(
      //   'Content-Disposition',
      //   `attachment;filename="${invoiceName}"`
      // );
      // file.pipe(res);
      // res.download(invoicePath);

      const doc = new PDFDocument();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline;filename="${invoiceName}"`);
      doc.pipe(fs.createWriteStream(invoicePath));
      doc.pipe(res);
      doc.fontSize(26).text('Invoice', {
        underline: true,
      });
      doc.moveDown(2);
      // doc.text('--------------------------');
      let startX = doc.x;
      const y = doc.y;
      let x = startX;
      doc.fontSize(20);
      doc.text('Title', x, y);
      x += 300;
      doc.text('Price', x, y);
      x += 80;
      doc.text('Quantity', x, y);
      x += 100;
      doc.text('Total', x, y);
      doc.moveDown(2);
      doc.fontSize(18);
      order.items.forEach((item) => {
        x = startX;
        let y = doc.y;
        const title = item.title;
        doc.text(title, x, y, { align: 'left' });
        x += 300;
        doc.text(item.price, x, y);
        x += 80;
        doc.text(item.quantity, x, y);
        x += 100;
        doc.text(item.price * item.quantity, x, y);
        doc.moveDown(1);
      });
      doc.moveDown(2);
      doc.text(`Total Price : ${order.totalPrice}`, startX, doc.y, {
        align: 'center',
      });
      doc.end();
    })
    .catch(next);
};
