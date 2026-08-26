#!/usr/bin/env python3
"""E2E цикла склада ERPilot: 2 поступления (скользящая средняя) -> реализация
(списание по средней, guard строки, печать УПД, сторно) -> перемещение между
складами -> списание -> нехватка остатка -> guard отмены поступления в минус.

Запуск: python3 e2e_stock.py  (сервер на :3000, workspace ERP Dev, dev-логин).
Скрипт самонастраивается: имена мутаций workspace-схемы берёт интроспекцией.
По образцу e2e_sales.py / e2e_purchases.py (см. соседний бриф task-5-brief.md).
"""
import json
import random
import string
import sys
import urllib.error
import urllib.request

BASE = 'http://localhost:3000'
EMAIL, PASSWORD = 'tim@apple.dev', 'DevLocal2026!erp'


def gql(path, query, variables=None, token=None):
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(BASE + path, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(req) as r:
        out = json.loads(r.read())
    if out.get('errors'):
        raise RuntimeError(json.dumps(out['errors'], ensure_ascii=False)[:600])
    return out['data']


def gql_raw(path, query, variables=None, token=None):
    """Как gql, но возвращает errors вместо исключения (для негативных проверок)."""
    body = json.dumps({'query': query, 'variables': variables or {}}).encode()
    req = urllib.request.Request(BASE + path, data=body, method='POST')
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', 'Bearer ' + token)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def login():
    d = gql('/metadata', '''mutation L($e: String!, $p: String!) {
      getLoginTokenFromCredentials(email: $e, password: $p, origin: "http://localhost:3001") {
        loginToken { token } } }''', {'e': EMAIL, 'p': PASSWORD})
    lt = d['getLoginTokenFromCredentials']['loginToken']['token']
    d = gql('/metadata', '''mutation T($t: String!) {
      getAuthTokensFromLoginToken(loginToken: $t, origin: "http://localhost:3001") {
        tokens { accessOrWorkspaceAgnosticToken { token } } } }''', {'t': lt})
    return d['getAuthTokensFromLoginToken']['tokens']['accessOrWorkspaceAgnosticToken']['token']


def mutation_names(token):
    d = gql('/graphql', '{ __type(name: "Mutation") { fields { name } } }', token=token)
    return [f['name'] for f in d['__type']['fields']]


def find_name(names, exact):
    for n in names:
        if n.lower() == exact.lower():
            return n
    raise RuntimeError(f'no mutation named {exact}; have: {[x for x in names if exact[6:12].lower() in x.lower()]}')


def money(rub):
    return f'{{ amountMicros: "{int(round(rub * 1000000))}", currencyCode: "RUB" }}'


def get_extension_message(err_response):
    """userFriendlyMessage (русский, с именами) лежит в extensions, а не в message —
    сырой английский message с UUID-ами кладётся GraphQL error handler'ом
    отдельно (см. generate-graphql-error-from-error.util.ts)."""
    errors = err_response.get('errors') or []
    assert errors, f'expected GraphQL errors, got {err_response}'
    ext = errors[0].get('extensions') or {}
    msg = ext.get('userFriendlyMessage') or errors[0].get('message', '')
    return msg


def main():
    token = login()
    print('auth ok')
    names = mutation_names(token)

    create_org = find_name(names, 'createOrganization')
    create_warehouse = find_name(names, 'createWarehouse')
    create_item = find_name(names, 'createItem')
    create_gr = find_name(names, 'createGoodsReceipt')
    create_gr_line = find_name(names, 'createGoodsReceiptLine')
    create_ss = find_name(names, 'createSalesShipment')
    create_ss_line = find_name(names, 'createSalesShipmentLine')
    update_ss_line = find_name(names, 'updateSalesShipmentLine')
    update_ss = find_name(names, 'updateSalesShipment')
    create_tr = find_name(names, 'createStockTransfer')
    create_tr_line = find_name(names, 'createStockTransferLine')
    create_wo = find_name(names, 'createGoodsWriteOff')
    create_wo_line = find_name(names, 'createGoodsWriteOffLine')
    print('mutations:', create_gr, create_ss, create_tr, create_wo)

    # уникальный суффикс на прогон — записи разных запусков не смешиваются
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

    # 1. Организация + 2 склада + товар
    org = gql('/graphql', f'''mutation {{ {create_org}(data: {{
      name: "ООО Склад-Тест (e2e {suffix})", inn: "7728168971", kpp: "772801001",
      bankName: "ПАО Сбербанк", bik: "044525225",
      settlementAccount: "40702810438000012345", corrAccount: "30101810400000000225",
      directorName: "Петров П. П.", accountantName: "Сидорова А. В."
    }}) {{ id }} }}''', token=token)[create_org]
    print('org:', org['id'])

    w1 = gql('/graphql', f'''mutation {{ {create_warehouse}(data: {{
      name: "Склад №1 (e2e {suffix})"
    }}) {{ id name }} }}''', token=token)[create_warehouse]
    w2 = gql('/graphql', f'''mutation {{ {create_warehouse}(data: {{
      name: "Склад №2 (e2e {suffix})"
    }}) {{ id name }} }}''', token=token)[create_warehouse]
    print('warehouses:', w1['id'], w2['id'])

    item_name = f'Товар А (e2e {suffix})'
    item = gql('/graphql', f'''mutation {{ {create_item}(data: {{
      name: "{item_name}", itemType: "GOODS", unit: "PIECE"
    }}) {{ id }} }}''', token=token)[create_item]
    print('item:', item['id'])

    def item_balance(warehouse_id):
        d = gql('/graphql', f'''{{ itemBalance(filter: {{
          itemId: {{ eq: "{item['id']}" }}, warehouseId: {{ eq: "{warehouse_id}" }}
        }}) {{ actualQty avgCost {{ amountMicros }} }} }}''', token=token)['itemBalance']
        return d

    def ledger_entries(warehouse_id=None, voucher_id=None):
        parts = [f'itemId: {{ eq: "{item["id"]}" }}']
        if warehouse_id:
            parts.append(f'warehouseId: {{ eq: "{warehouse_id}" }}')
        if voucher_id:
            parts.append(f'voucherId: {{ eq: "{voucher_id}" }}')
        d = gql('/graphql', f'''{{ stockLedgerEntries(filter: {{ {', '.join(parts)} }}) {{
          edges {{ node {{ actualQty qtyAfter valuationRate {{ amountMicros }}
            voucherType voucherId isCancelled isCancellation }} }} }} }}''', token=token)['stockLedgerEntries']
        return [e['node'] for e in d['edges']]

    # 2. Поступление 1: 10 x 100 -> остаток 10, средняя 100
    gr1 = gql('/graphql', f'''mutation {{ {create_gr}(data: {{
      organizationId: "{org['id']}", warehouseId: "{w1['id']}"
    }}) {{ id docStatus }} }}''', token=token)[create_gr]
    gql('/graphql', f'''mutation {{ {create_gr_line}(data: {{
      name: "{item_name}", itemId: "{item['id']}", quantity: 10,
      price: {money(100)}, goodsReceiptId: "{gr1['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "goodsReceipt", recordId: "{gr1["id"]}") }}', token=token)
    gr1q = gql('/graphql', f'''{{ goodsReceipt(filter: {{ id: {{ eq: "{gr1['id']}" }} }}) {{
      number docStatus total {{ amountMicros }} }} }}''', token=token)['goodsReceipt']
    assert gr1q['number'].startswith('GR-'), gr1q
    assert gr1q['docStatus'] == 'POSTED', gr1q
    assert int(gr1q['total']['amountMicros']) / 1e6 == 1000, gr1q
    bal = item_balance(w1['id'])
    assert bal['actualQty'] == 10, bal
    assert int(bal['avgCost']['amountMicros']) / 1e6 == 100, bal
    print(f"GR1 {gr1q['number']} POSTED, total=1000, w1: qty=10 avg=100 ok")

    # Регистр движений (не только остаток): ровно одна строка по GR1, +10,
    # qtyAfter 10, себестоимость за ед. 100, ссылается на GR1.
    gr1_rows = ledger_entries(warehouse_id=w1['id'], voucher_id=gr1['id'])
    assert len(gr1_rows) == 1, gr1_rows
    gr1_row = gr1_rows[0]
    assert gr1_row['actualQty'] == 10, gr1_row
    assert gr1_row['qtyAfter'] == 10, gr1_row
    assert int(gr1_row['valuationRate']['amountMicros']) / 1e6 == 100, gr1_row
    assert gr1_row['voucherType'] == 'goodsReceipt', gr1_row
    assert gr1_row['voucherId'] == gr1['id'], gr1_row
    assert gr1_row['isCancellation'] is False, gr1_row
    print('stockLedgerEntry GR1: 1 row, +10, qtyAfter=10, valuationRate=100 ok')

    # 3. Поступление 2: 10 x 200 -> остаток 20, средняя (1000+2000)/20=150
    gr2 = gql('/graphql', f'''mutation {{ {create_gr}(data: {{
      organizationId: "{org['id']}", warehouseId: "{w1['id']}"
    }}) {{ id }} }}''', token=token)[create_gr]
    gql('/graphql', f'''mutation {{ {create_gr_line}(data: {{
      name: "{item_name}", itemId: "{item['id']}", quantity: 10,
      price: {money(200)}, goodsReceiptId: "{gr2['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "goodsReceipt", recordId: "{gr2["id"]}") }}', token=token)
    bal = item_balance(w1['id'])
    assert bal['actualQty'] == 20, bal
    assert int(bal['avgCost']['amountMicros']) / 1e6 == 150, bal
    print('GR2 POSTED, w1: qty=20 avg=150 ok')

    # 4. Реализация 4 шт по продажной цене 610 (с НДС 22%) -> списание по
    # средней 150: costAmount=600, остаток w1=16
    ss1 = gql('/graphql', f'''mutation {{ {create_ss}(data: {{
      organizationId: "{org['id']}", warehouseId: "{w1['id']}"
    }}) {{ id }} }}''', token=token)[create_ss]
    ss1_line = gql('/graphql', f'''mutation {{ {create_ss_line}(data: {{
      name: "{item_name}", itemId: "{item['id']}", quantity: 4,
      price: {money(610)}, amount: {money(2440)}, vatRate: "VAT_22",
      salesShipmentId: "{ss1['id']}"
    }}) {{ id }} }}''', token=token)[create_ss_line]
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "salesShipment", recordId: "{ss1["id"]}") }}', token=token)
    ss1q = gql('/graphql', f'''{{ salesShipment(filter: {{ id: {{ eq: "{ss1['id']}" }} }}) {{
      number docStatus totalCost {{ amountMicros }} }} }}''', token=token)['salesShipment']
    assert ss1q['number'].startswith('SH-'), ss1q
    assert int(ss1q['totalCost']['amountMicros']) / 1e6 == 600, ss1q
    line_q = gql('/graphql', f'''{{ salesShipmentLine(filter: {{ id: {{ eq: "{ss1_line['id']}" }} }}) {{
      costAmount {{ amountMicros }} amount {{ amountMicros }} }} }}''', token=token)['salesShipmentLine']
    assert int(line_q['costAmount']['amountMicros']) / 1e6 == 600, line_q
    assert int(line_q['amount']['amountMicros']) / 1e6 == 2440, line_q
    bal = item_balance(w1['id'])
    assert bal['actualQty'] == 16, bal
    print(f"SS1 {ss1q['number']} POSTED, costAmount=600, sale amount=2440, w1: qty=16 ok")

    # 5. Перемещение 5 шт w1 -> w2: остатки 11 / 5, средняя переносится (150)
    tr = gql('/graphql', f'''mutation {{ {create_tr}(data: {{
      organizationId: "{org['id']}", warehouseFromId: "{w1['id']}", warehouseToId: "{w2['id']}"
    }}) {{ id }} }}''', token=token)[create_tr]
    gql('/graphql', f'''mutation {{ {create_tr_line}(data: {{
      name: "{item_name}", itemId: "{item['id']}", quantity: 5, stockTransferId: "{tr['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "stockTransfer", recordId: "{tr["id"]}") }}', token=token)
    bal1, bal2 = item_balance(w1['id']), item_balance(w2['id'])
    assert bal1['actualQty'] == 11, bal1
    assert bal2['actualQty'] == 5, bal2
    assert int(bal2['avgCost']['amountMicros']) / 1e6 == 150, bal2
    print('Transfer POSTED, w1: qty=11, w2: qty=5 avg=150 ok')

    # 6. Списание 2 шт с w1 -> остаток 9
    wo = gql('/graphql', f'''mutation {{ {create_wo}(data: {{
      organizationId: "{org['id']}", warehouseId: "{w1['id']}"
    }}) {{ id }} }}''', token=token)[create_wo]
    gql('/graphql', f'''mutation {{ {create_wo_line}(data: {{
      name: "{item_name}", itemId: "{item['id']}", quantity: 2, reason: "Порча (e2e)",
      goodsWriteOffId: "{wo['id']}"
    }}) {{ id }} }}''', token=token)
    gql('/graphql', f'mutation {{ postDocument(objectNameSingular: "goodsWriteOff", recordId: "{wo["id"]}") }}', token=token)
    bal = item_balance(w1['id'])
    assert bal['actualQty'] == 9, bal
    print('WriteOff POSTED, w1: qty=9 ok')

    # 7. Попытка реализовать 100 шт с w1 (доступно 9) -> RU-ошибка нехватки
    # с именем товара и склада
    ss2 = gql('/graphql', f'''mutation {{ {create_ss}(data: {{
      organizationId: "{org['id']}", warehouseId: "{w1['id']}"
    }}) {{ id }} }}''', token=token)[create_ss]
    gql('/graphql', f'''mutation {{ {create_ss_line}(data: {{
      name: "{item_name}", itemId: "{item['id']}", quantity: 100,
      price: {money(610)}, amount: {money(61000)}, vatRate: "VAT_22",
      salesShipmentId: "{ss2['id']}"
    }}) {{ id }} }}''', token=token)
    fail = gql_raw('/graphql', f'mutation {{ postDocument(objectNameSingular: "salesShipment", recordId: "{ss2["id"]}") }}', token=token)
    fail_msg = get_extension_message(fail)
    assert item_name in fail_msg, fail_msg
    assert w1['name'] in fail_msg, fail_msg
    assert '9' in fail_msg and '100' in fail_msg, fail_msg
    print('insufficient stock (100 > 9) blocked:', fail_msg[:140])

    # 8. Отмена ПЕРВОГО поступления невозможна: списать бы пришлось 10, а на
    # складе после операций 9 (20-4-5-2) -> ушло бы в минус
    fail = gql_raw('/graphql', f'mutation {{ cancelDocument(objectNameSingular: "goodsReceipt", recordId: "{gr1["id"]}") }}', token=token)
    fail_msg = get_extension_message(fail)
    assert item_name in fail_msg, fail_msg
    assert '9' in fail_msg and '10' in fail_msg, fail_msg
    print('cancel GR1 blocked (would go negative):', fail_msg[:140])
    bal = item_balance(w1['id'])
    assert bal['actualQty'] == 9, 'GR1 cancel attempt must not have side effects: ' + str(bal)

    # 9. Guard: правка документа и строки проведённой реализации -> ошибка
    guard_doc = gql_raw('/graphql', f'''mutation {{ {update_ss}(id: "{ss1['id']}", data: {{ comment: "hack" }}) {{ id }} }}''', token=token)
    assert guard_doc.get('errors'), 'guard DID NOT block edit of POSTED salesShipment!'
    print('guard blocks edit of POSTED salesShipment ok:', get_extension_message(guard_doc)[:80])

    guard_line = gql_raw('/graphql', f'''mutation {{ {update_ss_line}(id: "{ss1_line['id']}", data: {{ quantity: 999 }}) {{ id }} }}''', token=token)
    assert guard_line.get('errors'), 'guard DID NOT block edit of a line of POSTED salesShipment!'
    print('guard blocks edit of line of POSTED salesShipment ok:', get_extension_message(guard_line)[:80])

    # 10. Печать УПД: 200 (status по умолчанию 2), status=1, невалидный статус -> 4xx
    def fetch_upd(status_qs=''):
        req = urllib.request.Request(f"{BASE}/rest/erp/sales-shipments/{ss1['id']}/print-upd{status_qs}")
        req.add_header('Authorization', 'Bearer ' + token)
        return urllib.request.urlopen(req)

    with fetch_upd() as r:
        html_default = r.read().decode()
        assert r.status == 200, r.status
    assert item_name in html_default, 'УПД must contain item name'
    gross_total_ru = '2 440,00'
    assert gross_total_ru in html_default, f'УПД must contain gross total {gross_total_ru!r}'
    print(f'print-upd status=2 (default): 200, contains item + total {gross_total_ru} ({len(html_default)} bytes)')

    with fetch_upd('?status=1') as r:
        assert r.status == 200, r.status
    print('print-upd status=1: 200 ok')

    try:
        fetch_upd('?status=9')
        raise AssertionError('print-upd with invalid status must NOT return 200')
    except urllib.error.HTTPError as e:
        assert 400 <= e.code < 500, f'invalid status must be 4xx, got {e.code}'
        print(f'print-upd status=9 (invalid): HTTP {e.code} ok')

    # 11. Сторно реализации -> остаток w1 возвращается 9+4=13
    gql('/graphql', f'mutation {{ cancelDocument(objectNameSingular: "salesShipment", recordId: "{ss1["id"]}") }}', token=token)
    ss1_after = gql('/graphql', f'''{{ salesShipment(filter: {{ id: {{ eq: "{ss1['id']}" }} }}) {{ docStatus cancelledAt }} }}''', token=token)['salesShipment']
    assert ss1_after['docStatus'] == 'CANCELLED', ss1_after
    assert ss1_after['cancelledAt'] is not None, ss1_after
    bal = item_balance(w1['id'])
    assert bal['actualQty'] == 13, bal
    assert int(bal['avgCost']['amountMicros']) / 1e6 == 150, bal
    print('storno SS1 ok: docStatus=CANCELLED, w1: qty=13 (9+4) avg=150 ok')

    # Регистр движений после сторно: исходная строка (-4) + реверс-строка
    # (isCancellation=true, +4) по одному и тому же voucherId; сумма = 0.
    ss1_rows = ledger_entries(warehouse_id=w1['id'], voucher_id=ss1['id'])
    originals = [r for r in ss1_rows if not r['isCancellation']]
    reversals = [r for r in ss1_rows if r['isCancellation']]
    assert len(originals) == 1 and len(reversals) == 1, ss1_rows
    assert originals[0]['actualQty'] == -4, originals
    assert reversals[0]['actualQty'] == 4, reversals
    assert all(r['voucherId'] == ss1['id'] for r in ss1_rows), ss1_rows
    assert sum(r['actualQty'] for r in ss1_rows) == 0, ss1_rows
    print('stockLedgerEntry SS1 storno: original -4 + reversal +4, sum=0 ok')

    print('\n=== E2E ЦИКЛ СКЛАДА ПРОЙДЕН ===')


if __name__ == '__main__':
    try:
        main()
    except AssertionError as e:
        print('ASSERT FAIL:', e)
        sys.exit(1)
    except Exception as e:
        print('FAIL:', e)
        sys.exit(2)
