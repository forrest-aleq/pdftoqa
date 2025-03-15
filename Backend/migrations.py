import sqlite3

# Connect to the database
conn = sqlite3.connect('pdf_qa.db')
cursor = conn.cursor()

# Check if the progress column exists
cursor.execute("PRAGMA table_info(pdfs)")
columns = cursor.fetchall()
column_names = [column[1] for column in columns]

# Add progress column if it doesn't exist
if 'progress' not in column_names:
    print("Adding progress column to pdfs table...")
    cursor.execute("ALTER TABLE pdfs ADD COLUMN progress INTEGER DEFAULT 0")
    conn.commit()
    print("Column added successfully!")
else:
    print("Progress column already exists.")

# Close the connection
conn.close()
