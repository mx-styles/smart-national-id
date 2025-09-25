"""
Migration script to add separate opening and closing time columns to service_centers table
and populate them from existing operating_hours data.
"""

import sqlite3
from datetime import time
import re

def parse_operating_hours(operating_hours_str):
    """Parse operating hours string like '08:00-16:30' into opening and closing times."""
    try:
        # Match pattern like "08:00-16:30" or "8:00-16:30"
        match = re.match(r'(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})', operating_hours_str)
        if match:
            open_hour, open_min, close_hour, close_min = map(int, match.groups())
            opening_time = time(open_hour, open_min)
            closing_time = time(close_hour, close_min)
            return opening_time, closing_time
        else:
            # Default times if parsing fails
            return time(8, 0), time(16, 30)
    except Exception:
        # Default times if parsing fails
        return time(8, 0), time(16, 30)

def migrate_database():
    """Add opening_time and closing_time columns and populate them."""
    conn = sqlite3.connect('queue_management.db')
    cursor = conn.cursor()
    
    try:
        # Add the new columns
        cursor.execute('''
            ALTER TABLE service_centers 
            ADD COLUMN opening_time TEXT DEFAULT '08:00:00'
        ''')
        
        cursor.execute('''
            ALTER TABLE service_centers 
            ADD COLUMN closing_time TEXT DEFAULT '16:30:00'
        ''')
        
        print("Added opening_time and closing_time columns")
        
        # Get all existing service centers
        cursor.execute('SELECT id, operating_hours FROM service_centers')
        centers = cursor.fetchall()
        
        # Update each service center with parsed times
        for center_id, operating_hours in centers:
            opening_time, closing_time = parse_operating_hours(operating_hours)
            
            cursor.execute('''
                UPDATE service_centers 
                SET opening_time = ?, closing_time = ? 
                WHERE id = ?
            ''', (opening_time.strftime('%H:%M:%S'), closing_time.strftime('%H:%M:%S'), center_id))
            
            print(f"Updated service center {center_id}: {operating_hours} -> {opening_time} to {closing_time}")
        
        conn.commit()
        print("Migration completed successfully!")
        
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            print("Columns already exist, skipping migration")
        else:
            print(f"Error during migration: {e}")
            conn.rollback()
    except Exception as e:
        print(f"Unexpected error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database()