import csv
import json
import datetime
import math

MONTHS = {"January": "01", "February": "02", "March": "03"}

# Official Services
OFFICIAL_SERVICES = [
    {"id": 1, "serviceName": "Classic Refill", "standardPrice": 63.00, "memberPrice": 57.50, "durationMinutes": 60, "linkedMaterials": []},
    {"id": 2, "serviceName": "Classic Full Set", "standardPrice": 119.00, "memberPrice": 119.00, "durationMinutes": 120, "linkedMaterials": []},
    {"id": 3, "serviceName": "Hybrid Refill", "standardPrice": 81.00, "memberPrice": 67.50, "durationMinutes": 60, "linkedMaterials": []},
    {"id": 4, "serviceName": "Hybrid Full Set", "standardPrice": 139.00, "memberPrice": 139.00, "durationMinutes": 120, "linkedMaterials": []},
    {"id": 5, "serviceName": "Volume Refill", "standardPrice": 99.00, "memberPrice": 82.50, "durationMinutes": 60, "linkedMaterials": []},
    {"id": 6, "serviceName": "Volume Full Set", "standardPrice": 165.00, "memberPrice": 165.00, "durationMinutes": 150, "linkedMaterials": []},
    {"id": 7, "serviceName": "Lash Lift", "standardPrice": 74.99, "memberPrice": 74.99, "durationMinutes": 60, "linkedMaterials": []},
    {"id": 8, "serviceName": "Lash Lift w/ Tint", "standardPrice": 92.99, "memberPrice": 92.99, "durationMinutes": 75, "linkedMaterials": []},
    {"id": 9, "serviceName": "Lash Tint", "standardPrice": 35.00, "memberPrice": 35.00, "durationMinutes": 30, "linkedMaterials": []},
    {"id": 10, "serviceName": "Lower Lash Tint", "standardPrice": 15.00, "memberPrice": 15.00, "durationMinutes": 15, "linkedMaterials": []},
    {"id": 11, "serviceName": "Lash Ext. Removal", "standardPrice": 45.00, "memberPrice": 45.00, "durationMinutes": 30, "linkedMaterials": []},
    {"id": 12, "serviceName": "Express Refill (45m)", "standardPrice": 45.00, "memberPrice": 45.00, "durationMinutes": 45, "linkedMaterials": []},
    {"id": 13, "serviceName": "Express Refill (55m)", "standardPrice": 55.00, "memberPrice": 55.00, "durationMinutes": 55, "linkedMaterials": []},
    {"id": 14, "serviceName": "Express Refill (65m)", "standardPrice": 65.00, "memberPrice": 65.00, "durationMinutes": 65, "linkedMaterials": []},
    {"id": 15, "serviceName": "Brow Lift", "standardPrice": 74.00, "memberPrice": 74.00, "durationMinutes": 45, "linkedMaterials": []},
    {"id": 16, "serviceName": "Brow Lift w/ Tint", "standardPrice": 92.00, "memberPrice": 92.00, "durationMinutes": 60, "linkedMaterials": []},
    {"id": 17, "serviceName": "Henna Brows", "standardPrice": 64.00, "memberPrice": 64.00, "durationMinutes": 45, "linkedMaterials": []},
    {"id": 18, "serviceName": "Brow Tint w/ Wax", "standardPrice": 49.00, "memberPrice": 49.00, "durationMinutes": 30, "linkedMaterials": []},
    {"id": 19, "serviceName": "Brow Tint", "standardPrice": 35.00, "memberPrice": 35.00, "durationMinutes": 15, "linkedMaterials": []},
    {"id": 20, "serviceName": "Eyebrow Wax", "standardPrice": 25.00, "memberPrice": 25.00, "durationMinutes": 15, "linkedMaterials": []},
    {"id": 21, "serviceName": "Nose Wax", "standardPrice": 20.00, "memberPrice": 20.00, "durationMinutes": 15, "linkedMaterials": []},
    {"id": 22, "serviceName": "Lip Wax", "standardPrice": 16.00, "memberPrice": 16.00, "durationMinutes": 15, "linkedMaterials": []},
    {"id": 23, "serviceName": "Custom / Other Service", "standardPrice": 0.00, "memberPrice": 0.00, "durationMinutes": 45, "linkedMaterials": []}
]

data = {
    "settings": [
        { "key": "financialModel", "value": "Commission" },
        { "key": "commissionPercentage", "value": 35 },
        { "key": "monthlyRent", "value": 0 },
        { "key": "workingDaysPerMonth", "value": 20 },
        { "key": "currency", "value": "USD" }
    ],
    "serviceCatalog": OFFICIAL_SERVICES,
    "dailyLogs": [],
    "sessions": []
}

def parse_time_to_ts(date_str, time_str):
    if not time_str:
        return int(datetime.datetime.strptime(date_str, "%Y-%m-%d").timestamp() * 1000)
    time_str = time_str.replace(" ", "").lower()
    try:
        if ":" in time_str:
            dt = datetime.datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M%p")
        else:
            dt = datetime.datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I%p")
        return int(dt.timestamp() * 1000)
    except Exception:
        return int(datetime.datetime.strptime(date_str, "%Y-%m-%d").timestamp() * 1000)

def match_service(srv_str, type_str):
    combined = (srv_str + " " + type_str).lower()
    
    if 'exp' in combined and 'refill' in combined:
        return 12 # Express 45m default
        
    if 'hybrid' in combined:
        if 'full' in combined: return 4
        return 3 # default refill
    if 'volume' in combined:
        if 'full' in combined: return 6
        return 5
    if 'classic' in combined:
        if 'full' in combined: return 2
        return 1
        
    if 'lift w/tint' in combined or 'lift w/ tint' in combined:
        return 8
    if 'lash lift' in combined:
        return 7
    if 'lash tint' in combined:
        return 9
    if 'ext. removal' in combined:
        return 11
        
    if 'henna brows' in combined:
        return 17
    if 'brow wax + tint' in combined or 'brow tint + wax' in combined:
        return 18
    if 'brow lift w/ tint' in combined:
        return 16
    if 'brow lift' in combined:
        return 15
    if 'brow wax' in combined or 'eyebrow wax' in combined:
        return 20
    if 'brow tint' in combined:
        return 19

    return 23 # Custom / Other

session_id_counter = 1
daily_logs_map = {}

with open('database.csv', 'r') as f:
    reader = csv.DictReader(f)
    for row in reader:
        month_str = row['Month'].strip()
        if month_str not in MONTHS:
            continue
        month = MONTHS[month_str]
        date_val = row['Date'].strip().zfill(2)
        dateStr = f"2026-{month}-{date_val}"
        
        matched_id = match_service(row['Service'].strip(), row.get('Lash Type', '').strip())
        
        # Calculate revenue based on tip + standard service cost
        tip_str = row['Tip Amount'].strip()
        try:
            tip_amt = float(tip_str)
            if math.isnan(tip_amt): tip_amt = 0.0
        except ValueError:
            tip_amt = 0.0
            
        base_price = next(s for s in OFFICIAL_SERVICES if s['id'] == matched_id)['standardPrice']
        
        is_free = False
        custom_rev = base_price
        
        if 'no show' in (row['Service'] + row.get('Notes', '')).lower() or tip_str == '0.00':
            if 'cancelled' in row['Tip Method'].lower() or 'no show' in row.get('Notes', '').lower() or 'moved' in row.get('Notes', '').lower() or 'sick' in row.get('Notes', '').lower():
                is_free = True
                custom_rev = 0
            
        session = {
            "id": session_id_counter,
            "dateStr": dateStr,
            "serviceId": matched_id,
            "timestamp": parse_time_to_ts(dateStr, row['Time'].strip()),
            "isMember": False,
            "isFree": is_free,
            "hasAccident": False,
            "tipAmount": tip_amt,
            "tipType": row['Tip Method'].strip() if row['Tip Method'].strip() else 'Cash',
            "customRevenue": custom_rev,
            "clientName": row['Client Name'].strip(),
            "details": f"{row['Service']} {row.get('Lash Type', '')} {row['Details']}".strip(),
            "notes": row['Notes'].strip()
        }
        data['sessions'].append(session)
        session_id_counter += 1
        
        if dateStr not in daily_logs_map:
            daily_logs_map[dateStr] = {
                "dateStr": dateStr,
                "totalHours": 8,
                "locationCost": 0,
                "totalGrossRev": 0,
                "netProfit": 0
            }
            
        # Assuming Commission defaults to 35% split for the net profit calculation
        commission_take_home = custom_rev * 0.35
        
        daily_logs_map[dateStr]["totalGrossRev"] += custom_rev
        daily_logs_map[dateStr]["netProfit"] += commission_take_home + tip_amt

data['dailyLogs'] = list(daily_logs_map.values())

with open('EstyApp_Backup_Import_V4_FullData.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Created upgraded EstyApp_Backup_Import_V4_FullData.json")
