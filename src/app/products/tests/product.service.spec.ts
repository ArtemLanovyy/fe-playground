import { TestBed } from '@angular/core/testing';

import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProductService } from '../product.service';
import { productInitialState } from '../product.model';
import { scan, switchMap } from 'rxjs';

describe('ProductService', () => {
  let httpTestingController: HttpTestingController;
  let service: ProductService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(ProductService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get all products', (done) => {
    const exampleProducts = [
      { ...productInitialState, id: 1 },
      { ...productInitialState, id: 2 },
    ];

    service.getAll().pipe(
      switchMap(() => service.products$),
    ).subscribe((products) => {
      expect(products.length).toBe(2);
      expect(products).toEqual(exampleProducts);
      done();
    });

    const req = httpTestingController.expectOne(
      '/api/products',
    );
    expect(req.request.method).toEqual('GET');
    req.flush({ products: exampleProducts });
  });

  it('should add new product', (done) => {
    const exampleProduct = { ...productInitialState };

    service.addProduct(exampleProduct)
      .pipe(switchMap(() => service.products$))
      .subscribe((products) => {
        expect(products.length).toBe(1);
        expect(products).toEqual([exampleProduct]);
        done();
      });

    const req = httpTestingController.expectOne(
      '/api/products/add',
    );
    expect(req.request.method).toEqual('POST');
    req.flush(exampleProduct);
  });
});