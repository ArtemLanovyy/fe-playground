import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ColDef, GridOptions, RowDoubleClickedEvent } from 'ag-grid-community';
import { debounceTime, filter, Subscription, switchMap } from 'rxjs';
import { ProductDetailComponent } from '../product-detail/product-detail.component';
import { ProductService } from '../product.service';
import { Product } from '../product.model';
import { FormControl } from '@angular/forms';
import { TimerService } from '../timer.service';

const SEARCH_DEBOUNCE_MS = 300;

@Component({
  selector: 'y42-product-list',
  template: `
    <div class='row'>
      <div class='col'>
        <button
          mat-raised-button
          type='button'
          aria-label='Add product'
          (click)='addProduct()'>
          Add Product
        </button>
      </div>
      <div class='col'>
        <mat-form-field class='full-width'>
          <input matInput placeholder='Search' [formControl]='filter' />
        </mat-form-field>
      </div>
      <div class='col'>
        <span>Fetched {{timer$ | async}} seconds ago</span>
      </div>
    </div>

    <ag-grid-angular
      class='ag-theme-alpine'
      [rowData]='products$ | async'
      [gridOptions]='gridOptions'
      [columnDefs]='columnDefs'
      (rowDoubleClicked)='openProduct($event)'
    ></ag-grid-angular>
    <mat-spinner *ngIf='loading$ | async' [diameter]='36' [mode]="'indeterminate'"></mat-spinner> `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        width: 100%;
        position: relative;
      }

      ag-grid-angular {
        display: block;
        width: 100%;
        height: 100%;
      }

      mat-spinner {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
      }

      .mat-raised-button {
        margin-bottom: 1rem;
      }

      .row {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
      }

      .col {
        flex: 1;
        margin-right: 20px;
      }
    `,
  ],
})
export class ProductListComponent implements OnInit, OnDestroy {
  public filter = new FormControl('');
  public filterSubscriber: Subscription | undefined;

  constructor(private productService: ProductService,
              private bottomSheet: MatBottomSheet,
              private timerService: TimerService) {
  }

  readonly products$ = this.productService.filteredProducts$;
  readonly loading$ = this.productService.loading$;
  readonly timer$ = this.timerService.timer$;

  readonly gridOptions: GridOptions<Product> = {
    suppressCellFocus: true,
    animateRows: true,
    stopEditingWhenCellsLoseFocus: true,
    defaultColDef: {
      minWidth: 150,
      sortable: true,
      resizable: true,
    },
  };
  readonly columnDefs: Array<ColDef<Product>> = [
    {
      headerName: 'Title',
      field: 'title',
      sort: 'asc',
    },
    {
      headerName: 'Brand',
      field: 'brand',
    },
    {
      headerName: 'Description',
      field: 'description',
    },
    {
      headerName: 'Stock',
      field: 'stock',
      valueFormatter: (params) => Intl.NumberFormat(undefined).format(params.value),
      editable: true,
      onCellValueChanged: (params) => {
        const data: Product = params.data;
        const newStock: string = params.newValue;
        this.productService.updateStock(data.id, Number(newStock)).subscribe();
      },
      cellStyle: {
        'border-left': '1px dashed #ddd',
        'border-bottom': '1px dashed #ddd',
      },
    },
    {
      headerName: 'Price',
      field: 'price',
      editable: true,
      valueFormatter: (params) =>
        Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(params.value),
      onCellValueChanged: (params) => {
        const data: Product = params.data;
        const newPrice: string = params.newValue;
        this.productService.updatePrice(data.id, Number(newPrice)).subscribe();
      },
      cellStyle: {
        'border-left': '1px dashed #ddd',
        'border-bottom': '1px dashed #ddd',
      },
    },
    {
      headerName: 'Rating',
      field: 'rating',
      valueFormatter: (params) => `${(params.value as number).toFixed(2)}/5`,
    },
  ];

  ngOnInit(): void {
    this.fetchProducts();
    this.dynamicProductSearch();

    this.timerService
      .start(() => {
        this.fetchProducts();
      })
      .subscribe();
  }

  ngOnDestroy() {
    this.filterSubscriber?.unsubscribe();
  }

  fetchProducts() {
    this.productService.getAll().subscribe();
  }

  dynamicProductSearch(): void {
    this.filterSubscriber = this.filter.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        switchMap((query) => this.productService.search(query)),
      )
      .subscribe();
  }

  openProduct(params: RowDoubleClickedEvent<Product>): void {
    if (!params.data) {
      return;
    }

    const target = params.event?.target as HTMLElement;
    if (target.classList.contains('ag-cell-inline-editing')) {
      return;
    }

    const product: Product = params.data;
    const id = product.id;
    this.bottomSheet
      .open<ProductDetailComponent, Product, Product>(ProductDetailComponent, { data: product })
      .afterDismissed()
      .pipe(
        filter(Boolean),
        switchMap((newProduct) => this.productService.updateProduct(id, newProduct)),
      )
      .subscribe();
  }

  addProduct(): void {
    this.bottomSheet
      .open<ProductDetailComponent, Product, Product>(ProductDetailComponent)
      .afterDismissed()
      .pipe(
        filter(Boolean),
        switchMap((newProduct) => this.productService.addProduct(newProduct)),
      )
      .subscribe();
  }
}
