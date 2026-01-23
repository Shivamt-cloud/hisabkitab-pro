// Run this in the browser console to check if article "V3DJ277A" exists
// Copy and paste this entire script into the browser console

(async () => {
  try {
    console.log('🔍 Checking for article: V3DJ277A');
    console.log('='.repeat(60));
    
    // Open IndexedDB
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open('hisabkitab_db', 13);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Get all purchases
    const purchasesTx = db.transaction('purchases', 'readonly');
    const purchasesStore = purchasesTx.objectStore('purchases');
    const purchasesRequest = purchasesStore.getAll();
    
    const purchases = await new Promise((resolve, reject) => {
      purchasesRequest.onsuccess = () => resolve(purchasesRequest.result);
      purchasesRequest.onerror = () => reject(purchasesRequest.error);
    });
    
    console.log(`\n📦 Total Purchases: ${purchases.length}`);
    
    // Search for article V3DJ277A
    const foundItems = [];
    purchases.forEach(purchase => {
      purchase.items.forEach(item => {
        if (item.article) {
          const articleStr = String(item.article).trim();
          const articleLower = articleStr.toLowerCase();
          
          // Check if matches (exact, contains, case variations)
          if (articleLower === 'v3dj277a' ||
              articleStr === 'V3DJ277A' ||
              articleLower.includes('v3dj277a') ||
              articleStr.includes('V3DJ277A')) {
            foundItems.push({
              purchaseId: purchase.id,
              purchaseDate: purchase.purchase_date,
              itemId: item.id,
              productId: item.product_id,
              productName: item.product_name,
              article: item.article,
              articleType: typeof item.article,
              barcode: item.barcode,
              quantity: item.quantity,
              soldQuantity: item.sold_quantity,
              remainingStock: item.quantity - (item.sold_quantity || 0)
            });
          }
        }
      });
    });
    
    console.log('\n📊 Results:');
    console.log('-'.repeat(60));
    
    if (foundItems.length > 0) {
      console.log(`✅ Found ${foundItems.length} purchase item(s) with article "V3DJ277A":`);
      foundItems.forEach((item, index) => {
        console.log(`\n${index + 1}. Purchase #${item.purchaseId} (${new Date(item.purchaseDate).toLocaleDateString()})`);
        console.log(`   Item ID: ${item.itemId}`);
        console.log(`   Product ID: ${item.productId}`);
        console.log(`   Product Name: ${item.productName || 'N/A'}`);
        console.log(`   Article: "${item.article}" (type: ${item.articleType})`);
        console.log(`   Barcode: ${item.barcode || 'N/A'}`);
        console.log(`   Remaining Stock: ${item.remainingStock}`);
      });
    } else {
      console.log('❌ No purchase items found with article "V3DJ277A"');
      console.log('\n💡 Checking for similar articles...');
      
      // Check for similar articles
      const similarArticles = [];
      purchases.forEach(purchase => {
        purchase.items.forEach(item => {
          if (item.article) {
            const articleStr = String(item.article).trim();
            const articleLower = articleStr.toLowerCase();
            
            // Check if contains similar characters
            if (articleLower.includes('v3') || 
                articleLower.includes('dj') ||
                articleLower.includes('277')) {
              similarArticles.push({
                purchaseId: purchase.id,
                itemId: item.id,
                productId: item.product_id,
                article: articleStr,
                productName: item.product_name
              });
            }
          }
        });
      });
      
      if (similarArticles.length > 0) {
        console.log(`\nFound ${similarArticles.length} similar articles:`);
        similarArticles.slice(0, 10).forEach(item => {
          console.log(`  - "${item.article}" (Product: ${item.productName}, ID: ${item.productId})`);
        });
      }
    }
    
    // Get all products
    const productsTx = db.transaction('products', 'readonly');
    const productsStore = productsTx.objectStore('products');
    const productsRequest = productsStore.getAll();
    
    const products = await new Promise((resolve, reject) => {
      productsRequest.onsuccess = () => resolve(productsRequest.result);
      productsRequest.onerror = () => reject(productsRequest.error);
    });
    
    // Check if products from found items exist
    if (foundItems.length > 0) {
      console.log('\n🔍 Checking if products exist:');
      foundItems.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          console.log(`✅ Product ${item.productId} exists: "${product.name}" (Status: ${product.status})`);
        } else {
          console.log(`❌ Product ${item.productId} NOT FOUND in products table!`);
        }
      });
    }
    
    // Show all unique articles (first 20)
    console.log('\n📋 Sample Articles in Database (first 20):');
    const allArticles = new Set();
    purchases.forEach(purchase => {
      purchase.items.forEach(item => {
        if (item.article) {
          allArticles.add(String(item.article).trim());
        }
      });
    });
    
    Array.from(allArticles).slice(0, 20).forEach(article => {
      console.log(`  - "${article}"`);
    });
    
    console.log(`\n📊 Total unique articles in database: ${allArticles.size}`);
    
    db.close();
    
    console.log('\n💡 Next Steps:');
    console.log('-'.repeat(60));
    if (foundItems.length > 0) {
      console.log('1. Article exists in purchases ✅');
      console.log('2. Check if product exists and is active');
      console.log('3. Check browser console logs when searching to see why it\'s not matching');
    } else {
      console.log('1. Article "V3DJ277A" does not exist in purchases ❌');
      console.log('2. Check if article is spelled correctly');
      console.log('3. Check if article exists with different case or format');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
