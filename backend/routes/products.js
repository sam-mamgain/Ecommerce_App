const express = require('express');
const router = express.Router();
const {database} = require('../config/helpers')

/* GET All products. */
router.get('/', function(req, res, next) {
  let page = (req.query.page != undefined && req.query.page != 0) ? req.query.page : 1; // set the current page number
  const limit = (req.query.limit != undefined && req.query.limit != 0) ? req.query.limit : 10; // set the limit of items per page

  let startValue;
  let endValue;

  if(page > 0) {
    startValue = (page * limit) - limit; // 0, 10, 20
    endValue = page * limit;
  } else {
    startValue = 0;
    endValue = 10;
  }

  database.table('products as p')
  .join([{
    table: 'categories as c',
    on: 'p.cat_id = c.id'
  }])
  .withFields([
    'c.title as category',
    'p.title as name',
    'p.price',
    'p.quantity',
    'p.image',
    'p.id'
  ])
  .slice(startValue, endValue)
  .sort({id: .1})
  .getAll()
  .then(prods => {
    if(prods.length > 0) {
      res.status(200).json({
        count: prods.length,
        products: prods
      });
    } else {
      res.json({
        message: 'No products found'
      })
    }
  }).catch(error => console.log(error));
});

router.get('/:prodId',(req,res) => {
  let productId = req.params.prodId;

  database.table('products as p')
  .join([{
    table: 'categories as c',
    on: 'p.cat_id = c.id'
  }]).
  withFields([
    'c.title as category',
    'p.title as name',
    'p.price',
    'p.quantity',
    'p.image',
    'p.images',
    'p.id'
  ])
  .filter({'p.id': productId})
  .get()
  .then(prod => {
    if(prod) {
      res.status(200).json(prod);
    } else {
      res.json({
        message: `No product found with product id ${productId}`
      })
    }
  }).catch(error => console.log(error));

})

router.get('/category/:catName', (req, res) => {
  let page = (req.query.page != undefined && req.query.page != 0) ? req.query.page : 1; // set the current page number
  const limit = (req.query.limit != undefined && req.query.limit != 0) ? req.query.limit : 10; // set the limit of items per page

  let startValue;
  let endValue;

  if(page > 0) {
    startValue = (page * limit) - limit; // 0, 10, 20
    endValue = page * limit;
  } else {
    startValue = 0;
    endValue = 10;
  }

  let cat_title = req.params.catName;

  database.table('products as p')
  .join([{
    table: 'categories as c',
    on: `p.cat_id = c.id Where c.title Like '%${cat_title}%'`
  }])
  .withFields([
    'c.title as category',
    'p.title as name',
    'p.price',
    'p.quantity',
    'p.image',
    'p.id'
  ])
  .slice(startValue, endValue)
  .sort({id: .1})
  .getAll()
  .then(prods => {
    if(prods.length > 0) {
      res.status(200).json({
        count: prods.length,
        products: prods
      });
    } else {
      res.json({
        message: `No categories found with the ${catName}`
      })
    }
  }).catch(error => console.log(error));
})

module.exports = router;
