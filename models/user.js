const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
    cart: {
      items: [
        {
          productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
          },
          quantity: {
            type: Number,
            required: true,
          },
        },
      ],
      totalPrice: {
        type: Number,
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.addToCart = function (productId, productPrice) {
  const existingItemIndex = this.cart.items.findIndex((i) => {
    return i.productId.toString() === productId.toString();
  });
  if (existingItemIndex !== -1) {
    this.cart.items[existingItemIndex].quantity += 1;
  } else {
    this.cart.items.push({
      productId: productId,
      quantity: 1,
    });
  }
  this.cart.totalPrice += Number(productPrice);
  this.cart.totalPrice = this.cart.totalPrice.toFixed(2);
  return this.save();
};

userSchema.methods.removeFromCart = function (productId, productPrice) {
  const itemIndex = this.cart.items.findIndex(
    (i) => i.productId.toString() === productId.toString()
  );
  if (itemIndex === -1) {
    return;
  }
  const productQuantity = this.cart.items[itemIndex].quantity;
  this.cart.items.splice(itemIndex, 1);
  this.cart.totalPrice -= productQuantity * productPrice;
  this.cart.totalPrice = this.cart.totalPrice.toFixed(2);
  return this.save();
};

userSchema.methods.clearCart = function () {
  this.cart = { items: [], totalPrice: 0 };
  return this.save();
};

userSchema.statics.deleteProductFromAllCarts = function (
  productId,
  productPrice
) {
  this.find({ 'cart.items.productId': productId }).then((users) => {
    users.forEach((user) => {
      const quantity = user.cart.items.find(
        (i) => i.productId == productId
      ).quantity;
      user.cart.items = user.cart.items.filter(
        (i) => i.productId.toString() !== productId
      );
      user.cart.totalPrice -= quantity * productPrice;
      user.save();
    });
  });
};

module.exports = mongoose.model('User', userSchema);
