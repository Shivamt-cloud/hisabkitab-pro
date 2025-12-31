# Migration Scripts

Scripts to help migrate data from SQL databases to HisabKitab-Pro.

## Prerequisites

```bash
pip install mysql-connector-python
```

(Optional - only needed if connecting directly to MySQL database)

## Scripts

### 1. `analyze-sql-structure.py`

Analyzes SQL files or databases to identify tables and columns.

**Usage:**
```bash
# Analyze SQL dump file
python analyze-sql-structure.py --input database.sql --type sql

# Analyze SQLite database
python analyze-sql-structure.py --input database.db --type sqlite

# Save analysis to file
python analyze-sql-structure.py --input database.sql --type sql --output analysis.txt
```

**Output:**
- Lists all tables
- Shows column names and types
- Suggests entity mappings

---

### 2. `sql-to-json-converter.py`

Converts CSV exports or SQLite databases to HisabKitab-Pro JSON format.

**Usage:**
```bash
# Convert products from CSV
python sql-to-json-converter.py \
  --input products.csv \
  --type csv \
  --entity products \
  --output products.json \
  --company-id 1

# Convert customers from SQLite
python sql-to-json-converter.py \
  --input database.db \
  --type sqlite \
  --table customers \
  --entity customers \
  --output customers.json \
  --company-id 1
```

**Supported Entities:**
- `products`
- `customers`
- `suppliers`
- `categories`

**Options:**
- `--input, -i`: Input file (CSV, SQL, or SQLite DB)
- `--type, -t`: File type (`csv`, `sql`, `sqlite`)
- `--table`: Table name (required for SQLite)
- `--entity, -e`: Entity type (`products`, `customers`, `suppliers`, `categories`)
- `--output, -o`: Output JSON file (default: `migration_output.json`)
- `--company-id`: Company ID for imported data (default: 1)

---

## Example Workflow

```bash
# Step 1: Analyze your database
python analyze-sql-structure.py -i database.sql -t sql

# Step 2: Export tables to CSV (using database tool)

# Step 3: Convert each table
python sql-to-json-converter.py -i products.csv -t csv -e products -o products.json
python sql-to-json-converter.py -i customers.csv -t csv -e customers -o customers.json

# Step 4: Import JSON files into HisabKitab-Pro
```

---

## Notes

- The converter automatically maps common column names
- Dates are converted to ISO format
- Missing fields are filled with defaults
- IDs must be unique integers

---

## Troubleshooting

**Error: "No module named 'mysql.connector'"**
- Install: `pip install mysql-connector-python`
- Or use CSV export instead

**Error: "Table not found"**
- Check table name spelling
- Use `analyze-sql-structure.py` to list all tables

**Error: "Invalid CSV format"**
- Ensure CSV has headers
- Check encoding (should be UTF-8)

---

For more details, see:
- `../SQL_MIGRATION_GUIDE.md` - Complete guide
- `../SQL_MIGRATION_QUICK_START.md` - Quick reference



