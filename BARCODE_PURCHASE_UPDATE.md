# Barcode Generation During Purchase Entry - Implementation Notes

This file documents the changes needed to move barcode generation from product entry to purchase entry.

## Changes Made:

1. ✅ Removed barcode generation from ProductForm
2. ✅ Added barcode field to PurchaseItem interface
3. 🔄 Need to add barcode generation UI to GSTPurchaseForm
4. 🔄 Need to add barcode generation UI to SimplePurchaseForm  
5. 🔄 Need to update purchase service to assign barcodes to products

## Remaining Work:

Continue implementation in the purchase forms to add:
- Auto-generate barcode checkbox
- Manual barcode input field
- "Generate Barcode" button for all items
- Update purchase service to save barcodes to products

