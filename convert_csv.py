import csv
import json
import datetime

MONTHS = {"January": "01", "February": "02", "March": "03"}

data = {
    "settings": [
        { "key": "financialModel", "value": "Commission" },
        { "key": "commissionPercentage", "value": 50 },
        { "key": "monthlyRent", "value": 0 },
        { "key": "workingDaysPerMonth", "value": 20 },
        { "key": "currency", "value": "USD" }
    ],
    "serviceCatalog": [],
    "materialCatalog": [],
    "inventory": [],
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

services = {}
service_id_counter = 1
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
        
        srv = row['Service'].strip()
        l_type = row.get('Lash Type', '').strip()
        service_name = f"{srv} {l_type}".strip()
        if not service_name:
            service_name = "Unknown Service"
            
        if service_name not in services:
            services[service_name] = service_id_counter
            data['serviceCatalog'].append({
                "id": service_id_counter,
                "serviceName": service_name,
                "standardPrice": 0,
                "memberPrice": 0,
                "durationMinutes": 60,
                "linkedMaterials": []
            })
            service_id_counter += 1
            
        serv_id = services[service_name]
        
        try:
            tip_amt = float(row['Tip Amount'].strip())
        except ValueError:
            tip_amt = 0.0
            
        session = {
            "id": session_id_counter,
            "dateStr": dateStr,
            "serviceId": serv_id,
            "timestamp": parse_time_to_ts(dateStr, row['Time'].strip()),
            "isMember": False,
            "isFree": False,
            "hasAccident": False,
            "tipAmount": tip_amt,
            "tipType": row['Tip Method'].strip() if row['Tip Method'].strip() else 'Cash',
            "customRevenue": 0,
            "clientName": row['Client Name'].strip(),
            "details": row['Details'].strip(),
            "notes": row['Notes'].strip()
        }
        data['sessions'].append(session)
        session_id_counter += 1
        
        if dateStr not in daily_logs_map:
            daily_logs_map[dateStr] = {
                "dateStr": dateStr,
                "totalHours": 8, # default 8 hours
                "locationCost": 0,
                "totalGrossRev": 0,
                "netProfit": 0
            }
            
        daily_logs_map[dateStr]["netProfit"] += tip_amt

data['dailyLogs'] = list(daily_logs_map.values())

with open('EstyApp_Backup_Import.json', 'w') as f:
    json.dump(data, f, indent=2)

print("Created EstyApp_Backup_Import.json")
