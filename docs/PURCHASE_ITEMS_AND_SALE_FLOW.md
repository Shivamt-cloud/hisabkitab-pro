# Purchase Items (JSONB) and Sale Flow

## How purchase data is stored (item-wise)

The **purchases** table stores each purchase with an `items` column as **JSONB**: an array of line items. Each item represents one **article** (e.g. Article A, B, C for the same product).

### Example structure

```json
{
  "id": 513,
  "purchase_date": "2026-01-26",
  "company_id": 3,
  "items": [
    {
      "id": 513000000,
      "product_id": 4335,
      "product_name": "READYMADE SUIT",
      "article": "A",
      "barcode": "8906912368714",
      "quantity": 5,
      "sold_quantity": 0,
      "unit_price": 750,
      "mrp": 1399,
      "sale_price": 1220,
      ...
    },
    {
      "id": 513000001,
      "product_id": 4335,
      "product_name": "READYMADE SUIT",
      "article": "B",
      "barcode": "8906790016080",
      ...
    }
  ]
}
```

### Unique ID per item

- Every item in `items[]` must have a **unique numeric `id`** so that:
  - The sale form can show each article (A, B, C) as a separate row.
  - When the user adds “Article A” then “Article B”, the cart gets two lines, not one line with quantity 2.
- **When saving (create/update):**
  - If the backend or form sends `id: 0` or no `id`, we assign: `id = purchaseId * 1000000 + index`.
  - So for purchase `513`, items get `513000000`, `513000001`, `513000002`, etc.
- **When reading (getAll / getById):**
  - We normalize again: any item with missing or invalid `id` gets the same formula so stored data is always consistent.

So the “bucket” is **one purchase row → one `items` JSONB array → each element is one article with its own unique `id`**.

---

## How the “bucket” works during sale

### 1. Sale form loads data

- **Sale form** calls `purchaseService.getAll(undefined, companyId)`.
- Each purchase comes back with **normalized items** (each item has a unique `id`, and `sold_quantity`).
- The form builds:
  - **productArticleMap** / **productBarcodeMap**: which products have which articles/barcodes.
  - **searchPurchaseItems**: flat list of all purchase items matching the search (by product name, article, or barcode).

So the “bucket” here is: **all purchase items (from all purchases) with stock**, used for search and dropdown.

### 2. User searches and adds to cart

- User types product name, article (e.g. “A”), or barcode.
- **searchPurchaseItems** filters purchase items by that query; each row is one purchase item (one article).
- When user clicks **Add** on a row, we send a **unique identifier** for that row:
  - Either `PURCHASE-{purchaseId}-ITEM-{item.id}` (e.g. `PURCHASE-513-ITEM-513000001`),
  - Or, if `item.id` is missing/0, `PURCHASE-{purchaseId}-INDEX-{rowIndex}`.
- **addProductToSale**:
  - Resolves that identifier to the **exact purchase item** (that article’s object in the JSONB).
  - Pushes a **sale line** with `purchase_id`, `purchase_item_id`, `purchase_item_article`, `purchase_item_barcode`, and `purchase_item_unique_key` (e.g. `P513-I513000001`).

So the “bucket” is used to **pick the exact article** and attach it to one cart line. Each cart line = one purchase item = one article.

### 3. Cart and stock display

- Each **cart line** is tied to one purchase item via `purchase_item_unique_key` (or `purchase_id` + `purchase_item_id`).
- **Remaining stock** for that line = that purchase item’s `quantity - sold_quantity`.
- So the “bucket” (that one object in `items[]`) is the source of truth for:
  - Which article/barcode/MRP/sale price we show.
  - How many are left to sell for that article.

### 4. Saving the sale

- **saleService.create** receives sale lines, each with `purchase_id` and `purchase_item_id`.
- It loads **all purchases** (again with normalized items).
- For each sale line:
  - It finds the purchase and the purchase item: `purchase.items.find(pi => pi.id === item.purchase_item_id)`.
  - It **increments** that purchase item’s `sold_quantity` by the sold qty.
- Updated purchases (with new `sold_quantity` values) are written back to the DB/local storage.

So the “bucket” is **updated in place**: the same JSONB `items[]` entry that was used for search and cart is the one whose `sold_quantity` we increase.

### 5. Summary

| Step              | What uses the “bucket” (purchase items)                    |
|-------------------|------------------------------------------------------------|
| Load purchases    | Normalize so every item has unique `id`; build search maps |
| Search on sale    | Filter purchase items by product/article/barcode            |
| Add to cart       | Resolve one purchase item per line; set prices and stock   |
| Show cart/stock   | Per-line stock = that item’s `quantity - sold_quantity`    |
| Save sale         | Find same item by `purchase_item_id`; add to `sold_quantity` |

So we **store data item-wise** in the purchase table (one JSONB array, one object per article), **assign a unique id** to each item on save and on read, and during sale we **search and update that same item-wise bucket** so each article is treated uniquely and the correct row is used for cart and stock.
