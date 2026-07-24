import zipfile
import xml.etree.ElementTree as ET

zip_path = 'd:/NeprasPro/backend/templates/reports/سجل_الطلاب_المدمجين.xltx'

with zipfile.ZipFile(zip_path, 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for elem in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t'):
            shared_strings.append(elem.text)
    
    print("SHARED STRINGS FOUND:")
    for idx, s in enumerate(shared_strings):
        print(f"  [{idx}] {s}")

    sheet_xml = z.read('xl/worksheets/sheet1.xml')
    tree = ET.fromstring(sheet_xml)
    
    print("\nROW DATA (First 15 rows):")
    for row in tree.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        r_num = row.attrib.get('r')
        if int(r_num) <= 15:
            cells = []
            for c in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                c_ref = c.attrib.get('r')
                c_type = c.attrib.get('t')
                v_elem = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                val = v_elem.text if v_elem is not None else ''
                if c_type == 's' and val.isdigit():
                    s_idx = int(val)
                    val = shared_strings[s_idx] if s_idx < len(shared_strings) else val
                cells.append(f"{c_ref}:{val}")
            print(f"Row {r_num}: {', '.join(cells)}")
