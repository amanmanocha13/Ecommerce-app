const deleteProduct = function (btn) {
  console.log(btn);
  const csrfToken = btn.parentNode.querySelector('[name=_csrf]').value;
  const prodId = btn.parentNode.querySelector('[name=productId]').value;
  const productElement = btn.closest('article');
  const totalProducts = document.querySelectorAll('article').length;
  fetch('/admin/product/' + prodId, {
    method: 'DELETE',
    headers: {
      'csrf-token': csrfToken,
    },
  })
    .then((response) => {
      if (response.status !== 200) {
        console.log(
          'Product deletion failed. Status Code : ' + response.status
        );
        return;
      }
      return response.json().then((data) => {
        console.log(data);
        productElement.remove();
        if (totalProducts == 1) {
          const e = document.createElement('h1');
          e.innerText = 'No Products Found!';
          document.querySelector('main').appendChild(e);
        }
      });
    })
    .catch((err) => console.log(err));
};
