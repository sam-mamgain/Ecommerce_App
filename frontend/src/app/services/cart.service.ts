import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { CartModelPublic, CartModelServer } from '../models/cart.model';
import { ProductModelServer } from '../models/product.model';
import { OrderService } from './order.service';
import { ProductService } from './product.service';

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private serverURL = environment.SERVER_URL;

  // Data variable to store the cart information on the client's local storate
  private cartDataClient: CartModelPublic = {
    total: 0,
    prodData: [
      {
        incart: 0,
        id: 0,
      },
    ],
  };

  // Data variable to store cart information on the server
  private cartDataServer: CartModelServer = {
    total: 0,
    data: [
      {
        numInCart: 0,
        product: undefined,
      },
    ],
  };

  cartTotal$ = new BehaviorSubject<number>(0);
  cartData$ = new BehaviorSubject<CartModelServer>(this.cartDataServer);

  constructor(
    private http: HttpClient,
    private productService: ProductService,
    private orderService: OrderService,
    private router: Router,
    private toastService: ToastrService,
    private spinner: NgxSpinnerService
  ) {
    this.cartTotal$.next(this.cartDataServer.total);
    this.cartData$.next(this.cartDataServer);
    //  Get the information from local storage (if any)
    let info: CartModelPublic = JSON.parse(
      localStorage.getItem('cart') || 'null'
    );

    if (info != null && info != undefined && info.prodData[0].incart != 0) {
      this.cartDataClient = info;

      this.cartDataClient.prodData.forEach((p) => {
        this.productService
          .getSingleProduct(p.id)
          .subscribe((actualProductInfo: ProductModelServer) => {
            if (this.cartDataServer.data[0].numInCart === 0) {
              this.cartDataServer.data[0].numInCart = p.incart;
              this.cartDataServer.data[0].product = actualProductInfo;
              this.calculateTotal();

              this.cartDataClient.total = this.cartDataServer.total;
              localStorage.setItem('cart', JSON.stringify(this.cartDataClient));
            } else {
              this.cartDataServer.data.push({
                numInCart: p.incart,
                product: actualProductInfo,
              });
              this.calculateTotal();

              this.cartDataClient.total = this.cartDataServer.total;
              localStorage.setItem('cart', JSON.stringify(this.cartDataClient));
            }
            this.cartData$.next({ ...this.cartDataServer });
          });
      });
    }
  }

  addProductToCart(id: number, quantity?: number) {
    this.productService.getSingleProduct(id).subscribe((prod) => {
      //  1. if the cart is empty
      console.log(this.cartDataServer);

      if (this.cartDataServer.data[0].product === undefined) {
        this.cartDataServer.data[0].product = prod;
        this.cartDataServer.data[0].numInCart =
          quantity !== undefined ? quantity : 1;
        this.calculateTotal();
        this.cartDataClient.prodData[0].incart =
          this.cartDataServer.data[0].numInCart;
        this.cartDataClient.prodData[0].id = prod.id;
        this.cartDataClient.total = this.cartDataServer.total;
        localStorage.setItem('cart', JSON.stringify(this.cartDataClient));
        console.log(this.cartDataServer);

        this.cartData$.next({ ...this.cartDataServer });
        this.toastService.success(
          `${prod.name} is added to the cart`,
          'Product Added',
          {
            timeOut: 1500,
            progressBar: true,
            progressAnimation: 'increasing',
            positionClass: 'toast-top-right',
          }
        );
      }
      // 2. if cart has some items
      else {
        let index = this.cartDataServer.data.findIndex(
          (p) => p.product?.id === prod.id
        );

        // a. if that item is already in the cart => index is positive value
        if (index !== -1) {
          if (quantity !== undefined && quantity <= prod.quantity) {
            this.cartDataServer.data[index].numInCart =
              this.cartDataServer.data[index].numInCart < prod.quantity
                ? quantity
                : prod.quantity;
          } else {
            this.cartDataServer.data[index].numInCart =
              this.cartDataServer.data[index].numInCart < prod.quantity
                ? ++this.cartDataServer.data[index].numInCart
                : prod.quantity;
          }

          this.cartDataClient.prodData[index].incart =
            this.cartDataServer.data[index].numInCart;

          this.calculateTotal();
          this.cartDataClient.total = this.cartDataServer.total;
          localStorage.setItem('cart', JSON.stringify(this.cartDataClient));
          this.cartData$.next({ ...this.cartDataServer });
          this.toastService.info(
            `${prod.name} quantity updated in the cart`,
            'Product Updated',
            {
              timeOut: 1500,
              progressBar: true,
              progressAnimation: 'increasing',
              positionClass: 'toast-top-right',
            }
          );
        }
        // b. if that item is not in the cart
        else {
          this.cartDataServer.data.push({
            numInCart: 1,
            product: prod,
          });

          this.cartDataClient.prodData.push({
            incart: 1,
            id: prod.id,
          });

          this.toastService.success(
            `${prod.name} is added in the cart`,
            'Product Added',
            {
              timeOut: 1500,
              progressBar: true,
              progressAnimation: 'increasing',
              positionClass: 'toast-top-right',
            }
          );

          this.calculateTotal();
          this.cartDataClient.total = this.cartDataServer.total;
          localStorage.setItem('cart', JSON.stringify(this.cartDataClient));
          this.cartData$.next({ ...this.cartDataServer });
        }
      }
    });
  }

  updateCartItems(index: number, increase: boolean) {
    let data = this.cartDataServer.data[index];

    if (increase) {
      data.numInCart < (data.product?.quantity ?? 0)
        ? data.numInCart++
        : data.product?.quantity;
      this.cartDataClient.prodData[index].incart = data.numInCart;
      this.calculateTotal();
      this.cartDataClient.total = this.cartDataServer.total;
      localStorage.setItem('cart', JSON.stringify(this.cartDataClient));
      this.cartData$.next({ ...this.cartDataServer });
    } else {
      data.numInCart--;

      if (data.numInCart < 1) {
        //  Todo delete the product from cart
        this.cartData$.next({ ...this.cartDataServer });
      } else {
        this.cartData$.next({ ...this.cartDataServer });
        this.cartDataClient.prodData[index].incart = data.numInCart;
        this.calculateTotal();
        this.cartDataClient.total = this.cartDataServer.total;
        localStorage.setItem('cart', JSON.stringify(this.cartDataClient));
      }
    }
  }

  deleteProductFromCart(index: number) {
    if (window.confirm('Are you sure you want to remove the item?')) {
      this.cartDataServer.data.splice(index, 1);
      this.cartDataClient.prodData.splice(index, 1);
      this.calculateTotal();
      this.cartDataClient.total = this.cartDataServer.total;

      if (this.cartDataClient.total === 0) {
        this.cartDataClient = {
          total: 0,
          prodData: [
            {
              id: 0,
              incart: 0,
            },
          ],
        };
      }
      localStorage.setItem('cart', JSON.stringify(this.cartDataClient));
    } else {
      localStorage.setItem('cart', JSON.stringify(this.cartDataClient));
    }

    if (this.cartDataServer.total === 0) {
      this.cartDataServer = {
        total: 0,
        data: [
          {
            numInCart: 0,
            product: undefined,
          },
        ],
      };
    } else {
      // if user click the cancel button
      return;
    }
  }

  private calculateTotal() {
    let total = 0;

    this.cartDataServer.data.forEach((p) => {
      const { numInCart } = p;
      const { price } = p.product ?? { price: 0 };
      total += numInCart * price;
    });
    this.cartDataServer.total = total;
    this.cartTotal$.next(this.cartDataServer.total);
  }

  checkoutFromCart(userId: number) {
    this.http
      .post<{ success: boolean }>(`${this.serverURL}/orders/payment`, null)
      .subscribe((res) => {
        if (res.success) {
          this.resetServerData();
          this.http
            .post<OrderResponse>(`${this.serverURL}/orders/new`, {
              userId: userId,
              products: this.cartDataClient.prodData,
            })
            .subscribe((data) => {
              this.orderService.getSingleOrder(data.order_id).then((prods) => {
                if (data.success) {
                  const navigationExtras: NavigationExtras = {
                    state: {
                      message: data.message,
                      products: prods,
                      orderId: data.order_id,
                      total: this.cartDataClient.total,
                    },
                  };

                  this.spinner.hide().then();
                  this.router
                    .navigate(['/thankyou'], navigationExtras)
                    .then((p) => {
                      this.cartDataClient = {
                        total: 0,
                        prodData: [
                          {
                            id: 0,
                            incart: 0,
                          },
                        ],
                      };
                      this.cartTotal$.next(0);
                      localStorage.setItem(
                        'cart',
                        JSON.stringify(this.cartDataClient)
                      );
                    });
                }
              });
            });
        } else {
          this.spinner.hide().then();
          this.router.navigateByUrl('/checkout').then();
          this.toastService.error(
            `Sorry, failed to book the order`,
            'Order Status',
            {
              timeOut: 1500,
              progressBar: true,
              progressAnimation: 'increasing',
              positionClass: 'toast-top-right',
            }
          );
        }
      });
  }

  calculateSubTotal(index: number): number {
    let subTotal = 0;
    const p = this.cartDataServer.data[index];
    subTotal = (p.product?.price ?? 0) * p.numInCart;

    return subTotal;
  }

  private resetServerData() {
    this.cartDataServer = {
      total: 0,
      data: [
        {
          numInCart: 0,
          product: undefined,
        },
      ],
    };
  }
}

interface OrderResponse {
  message: string;
  order_id: number;
  success: boolean;
}
