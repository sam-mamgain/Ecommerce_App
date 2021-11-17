var express = require('express');
var router = express.Router();
const { database } = require('../config/helpers');
/* GET orders listing. */
router.get('/', function (req, res, next) {
  database.table('orders_details as od')
    .join([
      {
        table: 'orders as o',
        on: 'o.id = od.order_id'
      },
      {
        table: 'products as p',
        on: 'p.id = od.product_id'
      },
      {
        table: 'users as u',
        on: 'u.id = o.user_id'
      }
    ]).
    withFields(['o.id', 'p.title as name', 'p.description', 'p.price', 'u.username'])
    .sort({ 'id': 1 })
    .getAll()
    .then(orders => {
      if (orders) {
        res.status(200).json(orders)
      } else {
        res.json({
          message: 'No orders found'
        })
      }
    }).catch(error => console.log(error));
});

// Get single order with id
router.get('/:orderId', (req, res) => {
  const orderId = req.params.orderId;

  database.table('orders_details as od')
    .join([
      {
        table: 'orders as o',
        on: 'o.id = od.order_id'
      },
      {
        table: 'products as p',
        on: 'p.id = od.product_id'
      },
      {
        table: 'users as u',
        on: 'u.id = o.user_id'
      }
    ])
    .withFields(['o.id', 'p.title as name', 'p.description', 'p.price', 'p.image', 'od.quantity as quantityOrdered', 'u.username'])
    .filter({ 'o.id': orderId })
    .getAll()
    .then(orders => {
      if (orders.length > 0) {
        res.status(200).json(orders)
      } else {
        res.json({
          message: `No orders found with orderId ${orderId}`
        })
      }
    }).catch(error => console.log(error));
});

// place a new order
router.post('/new', (req, res) => {
  let { userId, products } = req.body;

  if (userId != null && userId > 0 && !isNaN(userId)) {
    database.table('orders')
      .insert({
        'user_id': userId
      })
      .then(newOrderId => {
        if (newOrderId.insertId > 0) {
          products.forEach(async (p) => {
            let data = await database.table('products').filter({ id: p.id }).withFields(['quantity']).get();
            let inCart = p.incart;

            if (data.quantity > 0) {
              data.quantity = data.quantity - inCart;
            } else {
              data.quantity = 0;
            }

            database.table('orders_details')
              .insert({
                order_id: newOrderId.insertId,
                product_id: p.id,
                quantity: inCart
              }).then(newId => {
                database.table('products')
                  .filter({ id: p.id })
                  .update({
                    quantity: data.quantity
                  }).then(success => { }).catch(error => console.log(error));
              }).catch(error => console.log(error))

          });
        } else {
          res.json({ message: 'New order failed while adding order details', success: false });
        }
        res.json({
          message: `Order successfully placed with order id ${newOrderId.insertId}`,
          success: true,
          order_id: newOrderId.insertId
        });
      })
  }

})

router.post('/payment', (req, res) => {
  setTimeout(() => {
    res.status(200).json({ success: true });
  }, 3000);
})

module.exports = router;
